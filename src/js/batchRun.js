import { ConcreteGraph, generateGraph } from "./graph.js";
import { refreshScreen, distance, getEdgeId } from "./util.js";
import * as evaluator from "./metrics.js";

import { CircularLayout } from "./circularLayout.js";
import { HillClimbing } from "./hillClimbing.js";

import { Table } from "./table";

let table = new Table("table");
let headers = [
    { id: "status", title: "Status" },
    { id: "filename", title: "Filename" },
    { id: "layout", title: "Layout" },
    { id: "nodes", title: "Nodes" },
    { id: "edges", title: "Edges" },
    { id: "density", title: "Density" },
    { id: "nodeOcclusion", title: "Node occlusion" },
    { id: "edgeNodeOcclusion", title: "Edge-Node occlusion" },
    { id: "edgeLength", title: "Edge length" },
    { id: "edgeCrossing", title: "Edge crossing" },
    { id: "angularResolution", title: "Angular Resolution" },
    { id: "objective", title: "Objective" },
];
for (const h of headers) {
    table.addHeader(h);
}
table.refresh();

// Add headers to show/hide side menu
let menuColSecFrag = document.createDocumentFragment();
    for (const h of headers) {
        let item = document.createElement("div");
        item.classList.add("menu-item-checkbox");
        let checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.checked = true;
        checkbox.setAttribute("data-col", h.id);
        let label = document.createElement("p");
        label.innerHTML = h.title;

        item.appendChild(checkbox);
        item.appendChild(label);
        menuColSecFrag.appendChild(item);
    }
document.querySelector("#menu-sec-columns").appendChild(menuColSecFrag);


// eslint-disable-next-line no-undef
const sig = new sigma();
const digits = 3;

let loadedTests = {};
let runCount = 0;

// tool bar
const toolbar = document.querySelector(".toolbar-container"),
    sideMenu = document.querySelector("#side-menu");

toolbar.addEventListener("click", toolbarClickHandler);

function getWeights() {
    return {
        nodeOcclusion: parseFloat(
            document.querySelector("#node-occlusion-weight").value
        ),
        edgeNodeOcclusion: parseFloat(
            document.querySelector("#edge-node-occlusion-weight").value
        ),
        edgeLength: parseFloat(
            document.querySelector("#edge-length-weight").value
        ),
        edgeCrossing: parseFloat(
            document.querySelector("#edge-crossing-weight").value
        ),
        angularResolution: parseFloat(
            document.querySelector("#angular-resolution-weight").value
        )
    };
}

const genModal = document.querySelector("#gen-modal"),
    genMode = document.querySelector("#gen-mode"),
    nodeNumMinEl = document.querySelector("#node-num-min"),
    nodeNumMaxEl = document.querySelector("#node-num-max"),
    nodeError = document.querySelector("#node-error"),
    edgeNumMinEl = document.querySelector("#edge-num-min"),
    edgeNumMaxEl = document.querySelector("#edge-num-max"),
    testNumEl = document.querySelector("#test-num"),
    edgeError = document.querySelector("#edge-error");

genModal.addEventListener("click", event => {
    const target = event.target;

    switch (target.id) {
        case "generate":
            let maxEdges = null;
            let nodeNumMin = parseInt(nodeNumMinEl.value),
                edgeNumMin = parseInt(edgeNumMinEl.value),
                nodeNumMax = parseInt(nodeNumMaxEl.value),
                edgeNumMax = parseInt(edgeNumMaxEl.value),
                testNum = parseInt(testNumEl.value);

            // toggle any existing error messages
            nodeError.innerHTML = "";
            nodeError.style.display = "none";
            edgeError.innerHTML = "";
            edgeError.style.display = "none";

            if (genMode.value === "range") {
                maxEdges = (nodeNumMax * (nodeNumMax - 1)) / 2;
                if (nodeNumMax < nodeNumMin || !nodeNumMin || !nodeNumMax) {
                    nodeError.innerHTML = "Max is less than min!";
                    nodeError.style.display = "block";
                    break;
                }
                if (edgeNumMax < edgeNumMin || !edgeNumMin || !edgeNumMax) {
                    edgeError.innerHTML = "Max is less than min!";
                    edgeError.style.display = "block";
                    break;
                }
            } else {
                maxEdges = (nodeNumMin * (nodeNumMin - 1)) / 2;
                nodeNumMax = nodeNumMin;
                edgeNumMax = edgeNumMin;
            }

            if (nodeNumMin < 1 || !nodeNumMin) {
                nodeError.innerHTML = "Can't have less than 1 nodes";
                nodeError.style.display = "block";
                break;
            }
            if (edgeNumMin < nodeNumMin - 1 || !edgeNumMin) {
                edgeError.innerHTML = `Can't have less than ${nodeNumMin -
                    1} edges `;
                edgeError.style.display = "block";
                break;
            }
            if (edgeNumMax > maxEdges || !edgeNumMin) {
                edgeError.innerHTML = `Can't have more than ${maxEdges} edges`;
                edgeError.style.display = "block";
                break;
            }
            // TODO: Remove hardcoded values
            let G = genTest(
                testNum,
                nodeNumMin,
                nodeNumMax,
                edgeNumMin,
                edgeNumMax,
                1900,
                1300
            );
            genModal.style.display = "none";
            break;
        case "dismiss":
            genModal.style.display = "none";
            break;
    }
});

genMode.addEventListener("change", event => {
    // toggle any existing error messages
    nodeError.innerHTML = "";
    nodeError.style.display = "none";
    edgeError.innerHTML = "";
    edgeError.style.display = "none";

    if (event.target.value === "range") {
        nodeNumMaxEl.style.display = "inline";
        edgeNumMaxEl.style.display = "inline";
    } else {
        nodeNumMaxEl.style.display = "none";
        edgeNumMaxEl.style.display = "none";
        nodeNumMaxEl.value = null;
        edgeNumMaxEl.value = null;
    }
});

// side menu events
sideMenu
    .querySelector("#menu-sec-columns")
    .addEventListener("change", event => {
        let colId = event.target.getAttribute("data-col");
        if (event.target.checked) table.showHeader(colId);
        else table.hideHeader(colId);
        table.refresh();
    });

sideMenu
    .querySelector("#menu-sec-metrics")
    .addEventListener("change", event => {
        let metricsParam = {
            requiredEdgeLength: parseFloat(
                document.querySelector("#edge-length-required").value
            )
        };

        let options = { weights: getWeights(), metricsParam };

        if (event.target.classList.contains("weight-input")) {
            // recalculate objective for all rows
            for (let filename in loadedTests) {
                let graph = new ConcreteGraph(
                    loadedTests[filename].graph,
                    options
                );
                let row = table.getRowByHeader("filename", filename);
                row.objective.value = graph.objective().toFixed(digits);
            }
        }

        if (event.target.id === "edge-length-required") {
            for (let filename in loadedTests) {
                let graph = new ConcreteGraph(
                    loadedTests[filename].graph,
                    options
                );

                graph.setMetricParam(metricsParam);
                let { edgeLength } = graph.metrics();

                let row = table.getRowByHeader("filename", filename);

                row.edgeLength.value = edgeLength.toFixed(digits);
                row.objective.value = graph.objective().toFixed(digits);
           }
        }
        table.refresh();
    });

let toggleEl = document.querySelectorAll(".menu-section-label");
for (const e of toggleEl) {
    e.onclick = function() {
        let secId = this.getAttribute("data-section");
        let secEl = document.querySelector(`#${secId}`);
        let t = this.querySelector(".menu-section-toggle");
        if (t.classList.contains("arrow-right")) {
            t.classList.remove("arrow-right");
            t.style.animationDirection = "reverse";
            t.classList.add("arrow-down");
            secEl.style.display = "block";
        } else {
            t.classList.remove("arrow-down");
            t.style.animationDirection = "normal";
            t.style.animationPlayState = "running";
            t.classList.add("arrow-right");
            secEl.style.display = "none";
        }
        var newOne = t.cloneNode(true);
        t.parentNode.replaceChild(newOne, t);
    };
}

function genTest(testNum, nMin, nMax, eMin, eMax, width, height) {
    // TODO: Make this async

    while (testNum--) {
        let G = generateGraph(nMin, nMax, eMin, eMax, height, width);
        let obj = {
            graph: G.toJSON()
        };
        let json = JSON.stringify(obj);
        // eslint-disable-next-line no-undef
        saveFile(json);
    }
}


function clearBatch() {
    if (!runCount) {
        table.clear();
        table.refresh();
        loadedTests = {};
    }
}

function toolbarClickHandler(event) {
    let target = event.target;
    switch (target.id) {
        case "menu":
            sideMenu.classList.toggle("hidden");
            break;
        case "genTest":
            genModal.style.display = "flex";
            break;
        case "saveTest":
            break;
        case "loadFile":
            // eslint-disable-next-line no-undef
            openFileDialog(loadTest);
            break;
        case "batchRunTest":
            runBatch(loadedTests);
            break;
        case "backToMain":
            window.location.replace("index.html");
            break;
        case "clearTest":
            clearBatch();
            break;
        default:
            break;
    }
}

function runBatch() {
    for (let filename in loadedTests) {
        runCount++;
        runTest(filename);
    }
}

// run layout for a single graph
function runTest(filename) {
    let metricsParam = {
        requiredEdgeLength: parseFloat(
            document.querySelector("#edge-length-required").value
        )
    };

    let options = { weights: getWeights(), metricsParam };

    let layoutAlgName = document.querySelector("#layoutAlgList").value;
    let graphData = loadedTests[filename];
    showIndicator(filename);
    let row = table.getRowByHeader("filename", filename);
    row.layout.value = layoutAlgName;
    table.refresh();
    let worker = new Worker("build/layoutWorker.js");
    worker.postMessage([graphData.graph, layoutAlgName, options, "run"]);


    worker.onmessage = function(e) {
        // TODO: store original data before replacing it?
        loadedTests[filename].graph = e.data[0];
        loadedTests[filename].layout = e.data[1];
        displayGraphInfo(filename);

        hideIndicator(filename);
    table.refresh();
        runCount--;

        if (!runCount) {
            // TODO: make this into a general event
        }
        worker.terminate();
    };
}

function showIndicator(filename) {
    let row = table.getRowByHeader("filename", filename);
    row.status.value = "Running";
}
function hideIndicator(filename) {
    let row = table.getRowByHeader("filename", filename);
    row.status.value = "Done";
}

// get test from file to memory
function loadTest(filename, data) {
    /*
        loadedTests = {
            filename: {
                graph: origianlGraph,
                layout: layoutAlgUsed, // default is null
            }
        }
    */
    let parsedData = JSON.parse(data);
    if (!loadedTests[filename]) {
        loadedTests[filename] = parsedData;
        loadedTests[filename].layout = null;
        displayGraphInfo(filename);
    }
}

function displayGraphInfo(filename) {
    let metricsParam = {
        requiredEdgeLength: parseFloat(
            document.querySelector("#edge-length-required").value
        )
    };

    let options = { weights: getWeights(), metricsParam };
    let graph = new ConcreteGraph(loadedTests[filename].graph, options);
    if (!graph) throw `${filename} not loaded`;
    let layout = loadedTests[filename].layout || "-";
    let metrics = graph.metrics();

    let newRow = {
        status: { value: "-", type: "text" },
        filename: { value: filename, type: "text" },
        layout: { value: layout, type: "text" },
        nodes: { value: graph.nodes().length, type: "text" },
        edges: { value: graph.edges().length, type: "text" },
        density: { value: graph.density().toFixed(digits), type: "text" },
        nodeOcclusion: {
            value: metrics.nodeOcclusion.toFixed(digits),
            type: "text"
        },
        edgeNodeOcclusion: {
            value: metrics.edgeNodeOcclusion.toFixed(digits),
            type: "text"
        },
        edgeLength: { value: metrics.edgeLength.toFixed(digits), type: "text" },
        edgeCrossing: {
            value: metrics.edgeCrossing.toFixed(digits),
            type: "text"
        },
        angularResolution: {
            value: metrics.angularResolution.toFixed(digits),
            type: "text"
        },
        objective: { value: graph.objective().toFixed(digits), type: "text" }
    };
    let row = table.getRowByHeader("filename", filename);
    
    if (!row) {
        table.addRow(newRow);
    } else {
        console.log("Copying to row");
        
        // copy values from newRow to row
        for (const key in row) {
            if (key !== "status") {
                row[key].value = newRow[key].value;
            }
        }
    }
    table.refresh();
}

window.table = table;
