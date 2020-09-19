window.log = {};

import { Graph } from "./js/graph.js";
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
} from "./js/metrics2.js";
import { deepCopy } from "./js/util.js";
import { HillClimbing } from "./js/hillClimbing.js";
import {Tabu} from "./js/tabu.js";

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

// create the main sigma instance
// load n50 graph
let filesToLoad = [
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
     "test1-2.json",
    //"dataSet/TS_SA_HC/Category II/n100_dens0115_20cases_case0.json",
    //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case0.json",
    //"dataSet/TS_SA_HC/Category II/n200_dens0100_20cases_case0.json",
];
let graphs = [];
let nodeOcclusionTime = [];

function average(arr) {
    let sum = 0;
    for (const e of arr) {
        sum += e;
    }
    let avg = sum / arr.length;
    return avg;
}

async function loadGraph() {
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


        graph = new Graph().import(graphData);
        displayGraph(graph, i++)

        graph.weights.nodeOcclusion = 1;
        graph.weights.nodeEdgeOcclusion = 1;
        graph.weights.edgeLength = 1;
        graph.weights.edgeCrossing = 1;
        graph.weights.angularResolution = 1;

        let g1 = new Graph().restoreFrom(graph);
        let g2 = new Graph().restoreFrom(graph);





        displayGraph(tsTest(g2), i++);
        serializeTest(graph);
        //let hc1 = hillClimbingRelaxedTest(g1, true, "immediate");
        //displayGraph(hc1, i++);
        //console.log(graph._zn);

        //window.log.step = step("ts",new Graph().restoreFrom(graph));




         //metricsTimeTest(graph);
        //testEdgesMethod(graph);

    }
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
    graph.objective();
    log.metricsBefore = { ...graph._metrics };
    let hc = new HillClimbing(graph);
    hc.strategy = strategy;
    hc.effectBounds = effectBounds;
    let s = performance.now();

    hc.run();

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
function* step(alg,graph){
    let i = 100;
    while (i++) {
        graph.metricsParam.requiredLength = 100;
        let tsTimeStart = performance.now();
        if (alg === "ts") {
            let ts = new Tabu(graph);
            ts.usePR = false;
            ts.step();
        } else {
            let hc = new hillClimbing(graph);
            hc.step();

        }


        displayGraph(graph, i++)
        window.scrollTo(0,document.body.scrollHeight);
        yield i;
    }
}

function displayGraph(graph, desc){
    let box = document.querySelector(".box")
    let graphContainer = document.createElement("div");
    let id = `graph-${desc}`;

    let wrapper = document.createElement("div");
    wrapper.setAttribute("class", "wrapper");
    graphContainer.setAttribute("id", id)
    graphContainer.setAttribute("class", "container")

    let details = document.createElement("h3");

    wrapper.appendChild(graphContainer);
    details.innerText = `Objective: ${graph.objective()}`;
    wrapper.appendChild(details);



    box.appendChild(wrapper);
    updateSigGraph(graph, id);

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
            enableCamera: true
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

loadGraph();
