import {Graph} from "./graph.js";
import {ZNormalization} from "./normalization.js";
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
} from "./metrics2.js";
import {deepCopy, loadPage} from "./util.js";
import {HillClimbing} from "./hillClimbing.js";
import {Tabu} from "./tabu.js";
import {CircularLayout} from "./circularLayout.js";
import {SummaryPage} from "./summary.js";

export async function TestingPage() {
    console.log("testpage");
    const PAGE = await loadPage("testingPage", document);
    window.log = {};

    let drawCount = 0;
    let container = PAGE.querySelector("#container");

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
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case0.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case10.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case11.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case12.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case13.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case14.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case15.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case16.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case17.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case18.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case19.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case1.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case2.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case3.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case4.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case5.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case6.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case7.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case8.json",
        "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case9.json",
        //"test2-1.json",
        //"202029291443371.json",
        //"666-2.json",
        //"150anim.json",
        //"dataSet/TS_SA_HC/Category II/n100_dens0115_20cases_case0.json",
        //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case0.json",
        //"dataSet/TS_SA_HC/Category II/n200_dens0100_20cases_case0.json",
        //"dataSet/Scalability/largeGraphs_case0.json",
    ];
    let nodeOcclusionTime = [];

    async function loadGraphs(paths) {
        let graphs = [];
        for (const file of filesToLoad) {
            let graphData = null;
            let response = await fetch(`data/${file}`);
            if (response.ok){
            graphData = await response.json();
            let graph = new Graph().import(graphData);
            graphs.push(graph);
            }else{
                throw `file not found ${file}`;
            }

        }
        return graphs;
    }


    async function loadTestResults(path) {
        let response = await fetch(`data/${path}`);
        if (response.ok) {
            let testResults = await response.json();
            return testResults;
        } else {
            throw `file not found data/${path}`;
        }
    }
    async function loadGraph(path) {
        let graph = null;
        let graphData = null;
        let response = await fetch(`data/${path}`);
        if (response.ok) {
            graphData = await response.json();
            graph = new Graph().import(graphData);
        } else {
            throw `file not found data/${path}`;
        }

        return graph;
    }
    function barChart(id, xLabel, yLabel, data) {
        console.log(id, data);
        const margin = {top: 60, right: 60, bottom: 40, left: 60};
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

    function testTestMove(graph) {
        let nId = 0;
        let move = {x: 100000, y: -100};
        let c1 = graph.testMove(nId, move);

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
    function testEdgesMethod(graph) {
        let edgeCount = 0;

        let adj = graph.adjList();
        for (let i = 0; i < adj.length; i++) {
            edgeCount += (adj[i].length);

        }
        console.log("edgeCount", edgeCount, graph.edges().length);
    }

    function hillClimbingRelaxedTest(graph, effectBounds, strategy = "immediate") {
        graph.metricsParam.requiredLength = 100;
        graph.resetZn();
        log.metricsBefore = {...graph._metrics};
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

    function tsTest(graph) {
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

    function displayGraph(layoutAlg, gId) {
        let id = `graph-${gId}`;
        let box = PAGE.querySelector(".box")
        let wrapper;
        let details;
        let graphContainer = PAGE.querySelector(`#${id}`);
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
        details.innerText = `Alog: ${layoutAlg.layoutAlgName},\n Objective: ${layoutAlg.graph.objective()},\n it: ${layoutAlg.it},\n execution: ${layoutAlg.executionTime}`;


        return updateSigGraph(layoutAlg.graph, id);

    }
    function updateSigGraph(graph, container) {
        let sigDefaults = {
            renderer: {
                type: "canvas",
                container: container
            },
            settings: {
                doubleClickEnabled: false,
                autoRescale: true,
                enableCamera: true,
                defaultLabelColor: "#FF0000"
            }
        };
        PAGE.querySelector(`#${container}`).innerHTML = "";
        let sig = new sigma(sigDefaults);
        sig.graph.clear();
        sig.graph.read(graph.toSigGraph());
        sig.refresh();
        return sig;
    }

    function serializeTest(graph) {
        // copy graph
        let og = graph;
        let copy = new Graph().deserialize(og);
        window.log.og = og;
        window.log.copy = copy;

    }

    function runLayout(graph, layoutAlgName, display = false, animate = false) {
        let currentGraphId = graphId++;
        let worker = getWorker();
        worker.postMessage({
            layoutAlgName: layoutAlgName,
            layoutAlg: getLayoutAlg(layoutAlgName, graph),
            command: "run",
            //emitOnMove: true,
            emitOnStep: animate,
        });

        worker.onmessage = e => {
            let layoutAlg = getLayoutAlg(layoutAlgName, new Graph()).deserialize(e.data.layoutAlg);
            if (display)
                displayGraph(layoutAlg, currentGraphId);
            worker.terminate();
        };
    }

    function runLayoutPromise(graph, layoutAlgName, display = false, animate = false) {
        return new Promise((resolve, reject) => {
            let currentGraphId = graphId++;
            let worker = getWorker();
            worker.postMessage({
                layoutAlgName: layoutAlgName,
                layoutAlg: getLayoutAlg(layoutAlgName, graph),
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

    function getLayoutAlg(layoutAlgName, graph, layoutParam = {}) {
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
    function getWorker() {
        return new Worker("./src/js/layoutWorker.js", {type: "module"});

    }
    let setA = [
        [
            "dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case0.json",
            "dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case10.json",
            "dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case11.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case12.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case13.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case14.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case15.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case16.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case17.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case18.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case19.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case1.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case2.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case3.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case4.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case5.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case6.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case7.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case8.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0050_20Cases_case9.json",
        ],
        [
            "dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case0.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case10.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case11.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case12.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case13.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case14.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case15.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case16.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case17.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case18.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case19.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case1.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case2.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case3.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case4.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case5.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case6.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case7.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case8.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0100_20Cases_case9.json",
        ],
        [
            "dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case0.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case10.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case11.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case12.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case13.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case14.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case15.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case16.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case17.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case18.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case19.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case1.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case2.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case3.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case4.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case5.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case6.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case7.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case8.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0150_20Cases_case9.json",
        ],
        [
            "dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case0.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case10.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case11.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case12.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case13.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case14.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case15.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case16.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case17.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case18.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case19.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case1.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case2.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case3.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case4.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case5.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case6.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case7.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case8.json",
            //"dataSet/TS_SA_HC/Category I/n150_dens0200_20Cases_case9.json",
        ]

    ];


    let data = await loadTestResults("test.json");
    console.log("data", data);
    phase1(data);

    window.log.resultsList = [];
    async function processSet(dataSet) {
        let algorithms = ["hillClimbing", "tabu"];
        let results = [];
        for (let algName of algorithms) {
            let layoutObj = {
                name: algName,
                objectiveList: [],
                evaluatedSolutionsList: [],
                executionTimeList: [],
                iterationsList: []
            };
            for (let path of dataSet) {
                let graph = await loadGraph(path);
                console.log(algName, path);
                let alg = getLayoutAlg(algName, new Graph().restoreFrom(graph));
                //alg.run();
                layoutObj.objectiveList.push(alg.graph.objective());
                layoutObj.evaluatedSolutionsList.push(alg.evaluatedSolutions);
                layoutObj.executionTimeList.push(alg.executionTime);
                layoutObj.iterationsList.push(alg.it);

            }
            results.push(layoutObj);
        }
        window.log.resultsList.push(results);

        return results;
    }

    
    async function phase1(setList) {
        //let resultsList = [];
        let resultsList = setList;

        //for (let set of setList){
            //let results = await processSet(set);
            //resultsList.push(results);
        //}



        //let data = resultsList.flat().map((e,i) => ({x: e.name + i, y: d3.mean(e.objectiveList)}));
        let data  = [];
        for (let i = 0; i < resultsList.length;i++){
            let results = resultsList[i];
            for (let j = 0; j < results.length; j++){
                let e = results[j];
                data.push({x:e.name + i, y: d3.median(e.evaluatedSolutionsList)})
            }
        }

        barChart("chart-avg-objective", "layoutAlg", "objective",
            data
        );
    }
    function phase2(testParameters) {
        let testResults;

        return testResults;
    }
    function phase3(testParameters){
        let testResults;

        return testResults;
    }
function plotTestResults(results) {


    for (let setResult of results) {
        // objective per set per layout
        let objectives = [0, 0];
        for (let entry of setResult) {
            objectives[0] += entry["hillClimbing"].objective;
            objectives[0] += entry["tabu"].objective;
        }
        objectives.map(e => e / setResult.length);
    }

        
        barChart("chart-avg-objective", "layoutAlg", "objective",
            [{x: "hillClimbing", y: d3.median(results.hillClimbing)}, {x: "tabu", y: d3.median(results.tabu)}]
        );
    }
    window.log.runA1 = async () => {
        let testWithDefaultParam = {
            files: set1A,
            layoutAlg: [{name: "hillClimbing"}, {name: "tabu"}],
        };

        let results = await phase1(testWithDefaultParam);
        barChart("chart-avg-objective", "layoutAlg", "objective",
            [{x: "hillClimbing", y: d3.median(results.hillClimbing)}, {x: "tabu", y: d3.median(results.tabu)}]
        );
    }

    
    window.log.runA2 = async () => {
        let testWithDefaultParam = {
            set:"2A",
            files: set2A,
            layoutAlg: [{name: "hillClimbing"}, {name: "tabu"}],
        };

        let results = await phase1(testWithDefaultParam);
        console.log("testing A1");
        console.log("done testing A1", results);

        barChart("chart-avg-objective", "layoutAlg", "objective",
            [{x: "hillClimbing", y: d3.median(results.hillClimbing)}, {x: "tabu", y: d3.median(results.tabu)}]
        );
    }

    window.log.runA3 = async () => {
        let testWithDefaultParam = {
            set:"3A",
            files: set3A,
            layoutAlg: [{name: "hillClimbing"}, {name: "tabu"}],
        };

        let results = await phase1(testWithDefaultParam);
        console.log("testing A1");
        console.log("done testing A1", results);

        barChart("chart-avg-objective", "layoutAlg", "objective",
            [{x: "hillClimbing", y: d3.median(results.hillClimbing)}, {x: "tabu", y: d3.median(results.tabu)}]
        );
    }

    window.log.runA4 = async () => {
        let testWithDefaultParam = {
            set:"4A",
            files: set4A,
            layoutAlg: [{name: "hillClimbing"}, {name: "tabu"}],
        };

        let results = await phase1(testWithDefaultParam);
        console.log(results);

        barChart("chart-avg-objective", "layoutAlg", "objective",
            [{x: "hillClimbing", y: d3.median(results.hillClimbing)}, {x: "tabu", y: d3.median(results.tabu)}]
        );
    }
}
