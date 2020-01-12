import { ConcreteGraph, generateGraph } from "./graph.js";
import { refreshScreen, distance, getEdgeId } from "./util.js";
import * as evaluator from "./metrics.js";

// eslint-disable-next-line no-undef
const sig = new sigma();

let loadedTests = {};

// tool bar
const toolbar = document.querySelector(".toolbar-container"),
    sideMenu = document.querySelector("#side-menu");

toolbar.addEventListener("click", event => {
    let target = event.target;
    switch (target.id) {
        case "menu":
            if (sideMenu.style.display === "flex") {
                sideMenu.style.display = "none";
            } else {
                sideMenu.style.display = "flex";
            }
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
});
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

function createRow(name) {
    let row = document.createElement("TR");
    row.setAttribute("id", `filename-${name}`);

    //
    row.add = function(data) {
        let td = document.createElement("TD");
        td.innerHTML = data;
        row.appendChild(td);

        // sync the state of the cell with its header
        td.hidden = getCellHeader(td).hidden;
        return row;
    };

    return row;
}

// modifies the global variable loadedTests
function runBatch() {
    // TODO: apply the selected layout algorithm
    //let layout = document.querySelector("#layout-alg").value;
    let layout = "Random";
    let requiredEdgeLength = parseFloat(
        document.querySelector("#edge-length-required").value
    );

    for (let filename in loadedTests) {
        let digits = 3;
        let table = document.querySelector("table");
        let obj = JSON.parse(loadedTests[filename].data);

        let graph = new ConcreteGraph(sig.graph.read(obj.graph), {
            requiredEdgeLength,
            weights: getWeights()
        });
        graph.evaluator = evaluator;

        let metrics = {};
        // TODO: Don't recalculate the metrics if only the weights have changed
        if (loadedTests[filename].metrics && !loadedTests[filename].modified) {
            metrics = loadedTests[filename].metrics;
        } else {
            metrics = graph.metrics();
            loadedTests[filename].modified = false;
        }

        //  must be added following the order in the table
        let row = createRow(filename)
            .add(filename)
            .add(layout)
            .add(graph.nodes().length)
            .add(graph.edges().length)
            .add(graph.density().toFixed(digits))
            .add(metrics.nodeOcclusion.toFixed(digits))
            .add(metrics.edgeNodeOcclusion.toFixed(digits))
            .add(metrics.edgeLength.toFixed(digits))
            .add(metrics.edgeCrossing.toFixed(digits))
            .add(metrics.angularResolution.toFixed(digits))
            .add(graph.objective().toFixed(digits))
            // TODO: draw the graph in the container
            .add(`<div class="graph-container"></div>`);

        let oldRow = document.querySelector(`#filename-${filename}`);
        table.replaceChild(row, oldRow);

        // clean the sig instance so we can load the next test
        sig.graph.clear();
        // TODO: remove original data?
        loadedTests[filename].metrics = metrics;
    }
}

// callback method called after a file has been read it process the data and adds the graph with the test filename to an array
function loadTest(name, data) {
    let table = document.querySelector("table");
    if (!loadedTests[name]) {
        //  must be added following the order in the table
        let row = createRow(name)
            .add(name)
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-")
            .add("-");
        table.appendChild(row);
        loadedTests[name] = {};
        loadedTests[name].data = data;
        loadedTests[name].modified = true;
    }
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
        // show if checked
        showCol(colId, event.target.checked);
    });

sideMenu
    .querySelector("#menu-sec-metrics")
    .addEventListener("change", event => {
        // reset current tests
        if (event.target.classList.contains("weight-input")) {
            //reset objective for all rows
            modifyCol("objective", "-");
        }
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
            graph: {
                nodes: G.nodes(),
                edges: G.edges()
            }
        };
        let json = JSON.stringify(obj);
        // eslint-disable-next-line no-undef
        saveFile(json);
    }
}

// TODO: Better methods for dealing with columns
function showCol(colId, show = true) {
    let index = document.querySelector(`#${colId}`).cellIndex;
    let rows = document.querySelectorAll("tr");
    for (let r of rows) {
        r.querySelector(`:nth-child(${index + 1})`).hidden = !show;
    }
}
function modifyCol(headerId, data) {
    let index = document.querySelector(`#${headerId}`).cellIndex;
    let rows = document.querySelectorAll("tr");

    if (!index) throw `${headerId} doesn't exist`;
    for (let r of rows) {
        // ignore header row
        if (r.id !== "") {
            // TODO: Find a better way to get the filename
            let filename = r.id.split("-")[1];
            r.querySelector(`:nth-child(${index + 1})`).innerHTML = data;
            loadedTests[filename].modified = true;
        }
    }
}

function getCellHeader(cell) {
    let index = cell.cellIndex;
    let colHeader = document
        .querySelector("tr")
        .querySelector(`:nth-child(${index + 1})`);
    return colHeader;
}

function clearBatch() {
    document.querySelectorAll("thead ~ tr").forEach(e => e.remove());
    loadedTests = {};
}
