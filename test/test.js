window.log = {};
let halt = 0;
let drawCount = 0;
import { Graph } from "/src/js/graph.js";
import {ZNormalization} from "/src/js/normalization.js";
import {
    nodeOcclusion,
    nodeEdgeOcclusion,
    nodeEdgeOcclusionSlow,
    edgeLength,
    angularResolution,
    angularResolutionFast,
    nodeOcclusionN,
    nodeEdgeOcclusionN,
    edgeLengthN,
    edgeCrossingN,
    angularResolutionN
} from "/src/js/metrics2.js";
import { deepCopy } from "/src/js/util.js";
import { HillClimbing } from "/src/js/hillClimbing.js";
import {Tabu} from "/src/js/tabu.js";
import {CircularLayout} from "/src/js/circularLayout.js";

let container = document.querySelector("#container");

let canvasRenderer = {
    container: "container",
    type: "canvas",
    camera: "cam1",
    settings: {
        enableEdgeHovering: true,
        edgeHoverColor: "edge",
        edgeHoverSizeRatio: 1.6
    }
};
let webglRenderer = {
    type: "webgl",
    camera: "cam1",
    container: "container"
};

const edgeSize = 1.5;
const nodeSize = 10;

let graphId = 0;

// create the main sigma instance
// load n50 graph
let filesToLoad = [
    "n150_dens0050_20Cases_case0.json",
    //"2nodeOcclusionTest.json",

    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case0.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case10.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case11.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case12.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case13.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case14.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case15.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case16.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case17.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case18.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case19.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case1.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case2.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case3.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case4.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case5.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case6.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case7.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case8.json",
    //"dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case9.json",
     //"test2-1.json",
     //"202029291443371.json",
     //"666-2.json",
     //"150anim.json",
    //"dataSet/TS_SA_HC/Category II/n100_dens0115_20cases_case0.json",
    //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case0.json",
    //"dataSet/TS_SA_HC/Category II/n200_dens0100_20cases_case0.json",
    //"dataSet/Scalability/largeGraphs_case0.json",
];
let graphs = [];
let nodeOcclusionTime = [];

log.importTimes = [];
async function loadGraph() {
    let hcRuns = [];
    let tsRuns = [];
    log.hcRuns = hcRuns;
    log.tsRuns = tsRuns;
    let i = 0;
    for (const file of filesToLoad) {
        console.log("working with: ", file)
        let graphData = null;
        if (typeof window !== "undefined") {
            let response = await fetch(`data/${file}`);
            window.nodeOcclusionTime = nodeOcclusionTime;
            graphData = await response.json();
        } else {
            let fs = await import("fs");
            //var { performance } = await import("perf_hooks");
            graphData = await fs.promises.readFile(`../data/${file}`, "utf-8");
        }
        let originalGraph = new Graph().import(graphData);
        log.og = originalGraph;

        let graph = new Graph().import(graphData);
        graphs.push(originalGraph,graph);


        let importStatrTime = performance.now();
        graph = new Graph().import(graphData);
        let importTime = performance.now() - importStatrTime;
        log.importTimes.push(importTime)

        graph.weights.nodeOcclusion = 1;
        graph.weights.nodeEdgeOcclusion = 0;
        graph.weights.edgeLength = 0;
        graph.weights.edgeCrossing = 0;
        graph.weights.angularResolution = 0;
        



        let hc = new HillClimbing(graph);


        //hc.run();
        displayGraph(hc,"graph1");
        //let g2 = new Graph().restoreFrom(graph);

        //let hc = await runLayoutPromise(g1,"hillClimbing");
        //console.log(nodeOcclusion(graph));
        //hcRuns.push(hc);
        //let ts = await runLayoutPromise(g2,"tabu");
        //tsRuns.push(ts);

        //let hcAveObj = d3.median(hcRuns.map(e => e.graph.objective()))
        //let tsAveObj = d3.median(tsRuns.map(e => e.graph.objective()))
        

        //// redraw graph with new data
        //document.querySelector("#chart-avg-objective").innerHTML = "";
        //barChart(
            //"chart-avg-objective",
            //"run",
            //"Average objective",
            //[{x:"hc",y:hcAveObj},{x:"ts",y:tsAveObj}]
        //);

    }

    

}

function barChart(id, xLabel, yLabel, data) {
    console.log(id, data);
    const margin = { top: 60, right: 60, bottom: 40, left: 60 };
    const width = 1000;
    const height = 600;
    const innerWidth = width - margin.right - margin.left;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(`#${id}`);
    console.log(svg);

    const chart = svg
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const yScale = d3
        .scaleLinear()
        .range([innerHeight, 0])
        .domain([0, d3.max(data.map(e => e.y))]);
    chart.append("g").call(d3.axisLeft(yScale));

    const xScale = d3
        .scaleBand()
        .range([0, innerWidth])
        .domain(data.map(e => e.x))
        .padding(0.2);

    const myColor = d3.scaleOrdinal(d3.schemeAccent);

    chart
        .append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

    chart
        .selectAll()
        .data(data)
        .enter()
        .append("rect")
        .attr("fill", (_, i) => myColor(i))
        .attr("x", s => xScale(s.x))
        .attr("y", s => yScale(s.y))
        .attr("height", s => innerHeight - (yScale(s.y) || 0))
        .attr("width", xScale.bandwidth());

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height)
        .attr("text-anchor", "middle")
        .text(xLabel);

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .text(yLabel);
}






function average(arr) {
    let sum = 0;
    for (const e of arr) {
        sum += e;
    }
    let avg = sum / arr.length;
    return avg;
}

function testTestMove(graph){
    let nId = 0;
    let move = {x: 100000, y: -100};
    let c1 = graph.testMove(nId,move);

    graph.moveNode(nId, move);
    let c2 = graph.objective();
    console.log(c1, c2);
}
function metricsTimeTest(graph) {
    console.group("metrics time tests");
    let cases = 100;

    nodeOcclusionTime = timeTest(cases, nodeOcclusion, [graph]);
    window.nodeOcclusionTime = nodeOcclusionTime;
    console.log(
        "nodeOcclusion average time = " + average(nodeOcclusionTime)
    );

    let edgeCrossingTime = timeTest(cases, edgeCrossing, [graph]);
    window.edgeCrossingTime = edgeCrossingTime;
    console.log("edgeCrossingTime average time = " + average(edgeCrossingTime));

    let requiredLength = 100;
    let edgeLengthTime = timeTest(cases, edgeLength, [graph, requiredLength]);
    window.edgeLengthTime = edgeLengthTime;
    console.log("edgeLengthTime average time = " + average(edgeLengthTime));

    let angularResolutionTime = timeTest(cases, angularResolution, [graph]);
    window.angularResolutionTime = angularResolutionTime;
    console.log(
        "angularResolution average time = " + average(angularResolutionTime)
    );

    let angularResolutionFastTime = timeTest(cases, angularResolutionFast, [
        graph
    ]);
    window.angularResolutionfastTime = angularResolutionFastTime;
    console.log(
        "angularResolutionFast average time = " +
            average(angularResolutionFastTime)
    );

    let nodeEdgeOcclusionTime = timeTest(cases, nodeEdgeOcclusion, [graph]);
    window.nodeEdgeOcclusionTime = nodeEdgeOcclusionTime;
    console.log(
        "nodeEdgeOcclusion average time = " + average(nodeEdgeOcclusionTime)
    );

    let nodeEdgeOcclusionSlowTime = timeTest(cases, nodeEdgeOcclusionSlow, [
        graph
    ]);
    window.nodeEdgeOcclusionSlowTime = nodeEdgeOcclusionSlowTime;
    console.log(
        "nodeEdgeOcclusionSlow average time = " +
            average(nodeEdgeOcclusionSlowTime)
    );

    console.groupEnd("metrics time tests");
}
function timeTest(cases, fn, args) {
    let times = [];
    for (let i = 0; i < cases; i++) {
        let startTime = performance.now();
        fn.apply(null, args);
        let duration = performance.now() - startTime;
        times.push(duration);
    }
    return times;
}
function testEdgesMethod(graph){
    let edgeCount = 0;

    let adj = graph.adjList();
    for(let i = 0; i < adj.length; i++){
        edgeCount+= (adj[i].length);

    }
    console.log("edgeCount", edgeCount, graph.edges().length);
}

function hillClimbingRelaxedTest(graph,effectBounds,strategy="immediate") {
    graph.metricsParam.requiredLength = 100;
    graph.resetZn();
    log.metricsBefore = { ...graph._metrics };
    let hc = new HillClimbing(graph);
    hc.strategy = strategy;
    hc.effectBounds = effectBounds;
    let s = performance.now();

    //hc.run();

    console.group("hc");
    console.log("hc evaluatedSolutions = ", hc.evaluatedSolutions);
    console.log("hc iterations", hc.it)
    console.log("hc time", performance.now() - s);
    console.groupEnd("hc");
    return graph;
}

function tsTest(graph){
    graph.metricsParam.requiredLength = 100;
    let tsTimeStart = performance.now();
    let ts = new Tabu(graph);
    ts.usePR = false;

    ts.run();
    console.group("ts");
    console.log("ts evaluatedSolutions = ", ts.evaluatedSolutions);
    console.log("ts iterations", ts.it)
    console.log("ts time: ", performance.now() - tsTimeStart);
    console.groupEnd("ts");

    return graph;
}

function displayGraph(layoutAlg,gId){
    let id = `graph-${gId}`;
    let box = document.querySelector(".box")
    let wrapper;
    let details;
    let graphContainer = document.querySelector(`#${id}`);
    if (graphContainer == null) {
        wrapper = document.createElement("div");
        details = document.createElement("h3");
        graphContainer = document.createElement("div");
        wrapper.setAttribute("class", "wrapper");
        graphContainer.setAttribute("id", id)
        graphContainer.setAttribute("class", "container")
        wrapper.appendChild(graphContainer);
        wrapper.appendChild(details);
        box.appendChild(wrapper);
    } else {

        let parentNode = (graphContainer.parentNode);
        details = parentNode.querySelector("h3");
    }
        details.innerText = `Alog: ${layoutAlg?.layoutAlgName},\n Objective: ${layoutAlg?.graph?.objective()},\n it: ${layoutAlg?.it},\n execution: ${layoutAlg?.executionTime/1000}`;


    return updateSigGraph(layoutAlg?.graph, id);

    }
function updateSigGraph(graph,container) {
    let sigDefaults = {
        renderer: {
            type: "canvas",
            container:container 
        },
        settings: {
            doubleClickEnabled: false,
            autoRescale: true,
            enableCamera: true,
            defaultLabelColor:"#FF0000"
        }
    };
    document.querySelector(`#${container}`).innerHTML = "";
    let sig = new sigma(sigDefaults);
    sig.graph.clear();
    sig.graph.read(graph.toSigGraph());
    sig.refresh();
    return sig;
}

function serializeTest(graph){
    // copy graph
    let og =  graph;
    let copy = new Graph().deserialize(og);
    window.log.og = og;
    window.log.copy = copy;

}


log.displayGraph = displayGraph;
loadGraph();



function runLayout(graph, layoutAlgName, display = false, animate = false) {
    let currentGraphId = graphId++;
    let worker = getWorker();
    worker.postMessage({
        layoutAlgName: layoutAlgName,
        layoutAlg: getLayoutAlg(layoutAlgName,graph),
        command: "run",
        //emitOnMove: true,
        emitOnStep: animate,
    });

    worker.onmessage = e => {
        let layoutAlg = getLayoutAlg(layoutAlgName, new Graph()).deserialize(e.data.layoutAlg);
        if (display)
            displayGraph(layoutAlg,currentGraphId);
        worker.terminate();
    };
}

function runLayoutPromise(graph, layoutAlgName, display = false, animate = false) {
    return new Promise((resolve,reject) =>{
        let currentGraphId = graphId++;
        let worker = getWorker();
        worker.postMessage({
            layoutAlgName: layoutAlgName,
            layoutAlg: getLayoutAlg(layoutAlgName,graph),
            command: "run",
            //emitOnMove: true,
            emitOnStep: animate,
        });

        worker.onmessage = e => {
            let layoutAlg = getLayoutAlg(layoutAlgName, new Graph()).deserialize(e.data.layoutAlg);
            resolve(layoutAlg);
            worker.terminate();
        };
    });
}

function getLayoutAlg(layoutAlgName, graph,layoutParam = {}) {
    let layoutAlg = null;

    switch (layoutAlgName) {
        case "hillClimbing":
            layoutAlg = new HillClimbing(graph, layoutParam);
            break;
        case "circular":
            layoutAlg = new CircularLayout(graph, layoutParam);
            break;
        case "tabu":
            layoutAlg = new Tabu(graph, layoutParam);
            break;
    }
    return layoutAlg;
}
function getWorker(){
    return  new Worker("./src/js/layoutWorker.js", { type: "module" });
 
}
