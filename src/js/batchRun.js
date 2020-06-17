import { ConcreteGraph, generateGraph } from "./graph.js";
import { refreshScreen, distance, getEdgeId, cleanId, deepCopy } from "./util.js";
import * as evaluator from "./metrics.js";

import { CircularLayout } from "./circularLayout.js";
import { HillClimbing } from "./hillClimbing.js";

import { Table } from "./table";
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
    { id: "objective", title: "Objective" }
];

// Tab stuff
let tabNum = 1;
let tabs = [];
// Assume that id is after the last -
function getTabIdFromElId(id) {
    return id.split("-").pop();
}

// TODO: double check when taking title as input
function addTabEl(title, tabId) {
    let elHtml = `
            <div class="tab-item" id="tab-${tabId}">
                ${title}
             </div> 
            `;
    let newTab = document.querySelector("#new-tab");
    newTab.insertAdjacentHTML("beforebegin", elHtml);
}
// TODO: make the layout more dynamic
function createTabContentEl(id) {
    let html = `
            <div class="tab-content" id="tab-content-${id}">
                <div class="param-container">
                    <div class="dropdown" id="layoutAlg">
                        <span>Layout Algorithm: </span>
                        <select name="layoutAlg" id="layoutAlgList">
                            <option value="hillClimbing">Hill Climbing</option>
                            <option value="circular"> Circular</option>
                        </select>
                    </div>

                    <div class="param-list">
                    </div>

                </div>

            <div class="h-divider">

            </div>
                <div class="table-container">
                    <table class="run-table" id="table-${id}"><thead><tr></tr></thead><tbody></tbody></table>
                </div>
            </div>
   `;
    let tabContainer = document.querySelector("#tab-container");
    tabContainer.insertAdjacentHTML("beforeend", html);
    return document.querySelector(`tab-content-${id}`);
}

function currentTab() {
    let activeTabElId = document.querySelector(".tab-active").id;
    return tabs.find(t => t.id === getTabIdFromElId(activeTabElId));
}

// requires this
function addParamEl(label, defaultValue) {
    function options(defaultValue) {
        let r = "";
        for (const v of defaultValue) {
            r += `<option value="${v}">${v}</option>\n`;
        }
        return r;
    }

    let id = cleanId(label);

    if (isFinite(Number(defaultValue))) {
        defaultValue = Number(defaultValue);
        var inputHtml = `<input class="param-input" type="number" value="${defaultValue}">`;
    } else {
        inputHtml = `
                    <select name="layoutAlg" class="param-input" id="layoutAlgList">
                        ${options(defaultValue)}
                    </select>
                    `;
    }
    let html = `
                <div class="param-item" id="${id}">
                    <p class="param-label"> ${label}</p>
                    ${inputHtml}
                </div>
                `;
    console.log(this.getTabContent());

    this.getTabContent()
        .querySelector(".param-list")
        .insertAdjacentHTML("beforeend", html);
}

// Assumes to be created in a loaded batchRun page (with side menu)
// TODO: add option to delete tab. Make sure to clean the data
// TODO: add option to save tab to disk (save the run)
class Tab {
    constructor(title) {
        let d = new Date();
        let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
        this.creationDate = date;
        this.id = `${date + Math.floor(Math.random() * 1000)}`;
        // get visible and hidden headers
        this.headerStates = document.querySelectorAll(".menu-item-checkbox");
        this.loadedFiles = {};
        this.runCount = 0;
        // create tab outside and use the tab array to get the content
        this.title = title;
        this.layoutParam = null;
    }
    getTabContent() {
        let content = document.querySelector(`#tab-content-${this.id}`);
        // if (content === null){
        //     console.log("creating new tab content");
        //     content = createTabContentEl(this.id);
        // }
        return content;
    }
    restoreFrom(saved) {
        this.creationDate = saved.creationDate;
        this.id = saved.id;
        this.title = saved.title;
        // copy param
        this.layoutParam = saved.layoutParam;
        this.layoutAlgName = saved.layoutAlgName;
        this.loadedFiles = saved.loadedFiles;

        this.setupUi();
        // copy table
        console.log(saved);

        for (const row of saved.table.table.rows) {
            this.table.addRow(row);
        }
        this.table.refresh();

        return this;
    }
    // setup ui element interactions and default values that can't be set in the constructor
    setupUi() {
        console.log("setupUi");

        createTabContentEl(this.id);
        this.table = new Table(`table-${this.id}`);
        for (const h of headers) {
            this.table.addHeader(h);
        }
        this.table.refresh();
        // init setup
        let addParamEl2 = addParamEl.bind(this);
        // add event listener to layout algorithm list to update parameters on change
        let layoutAlgList = this.getTabContent().querySelector(
            "#layoutAlgList"
        );
        if (this.layoutParam) {
            console.log("restoring param");

            this.getTabContent().querySelector(".param-list").innerHTML = "";
            switch (this.layoutAlgName) {
                case "hillClimbing":
                    addParamEl2("iterations", this.layoutParam.iterations);
                    addParamEl2("squareSize", this.layoutParam.squareSize);
                    addParamEl2("moveStrategy", [
                        this.layoutParam.moveStrategy
                    ]);
                    layoutAlgList.value = "hillClimbing";

                    break;
                case "Tabu":
                    break;
                case "circular":
                    addParamEl2(
                        "maxIterations",
                        this.layoutParam.maxIterations
                    );
                    addParamEl2("radius", this.layoutParam.radius);
                    layoutAlgList.value = "circular";
                    break;
            }
        } else {
            addParamEl2("iterations", 500);
            addParamEl2("squareSize", 100);
            addParamEl2("moveStrategy", ["immediate", "delayed"]);
            this.layoutAlgName = "hillClimbing";
            this.layoutParam = {
                iterations: 500,
                squareSize: 100,
                moveStrategy: "immediate"
            };
        }

        layoutAlgList.addEventListener("change", ({ target }) => {
            console.log(`this in listener = `);
            console.log(this);

            this.layoutAlgName = target.value;
            this.getTabContent().querySelector(".param-list").innerHTML = "";
            switch (this.layoutAlgName) {
                case "hillClimbing":
                    addParamEl2("iterations", 500);
                    addParamEl2("squareSize", 100);
                    addParamEl2("moveStrategy", ["immediate", "delayed"]);
                    this.layoutParam = {
                        iterations: 500,
                        squareSize: 100,
                        moveStrategy: "immediate"
                    };
                    break;
                case "Tabu":
                    break;
                case "circular":
                    this.layoutParam = { maxIterations: 1000, radius: 450 };
                    addParamEl2("maxIterations", 1000);
                    addParamEl2("radius", 450);
                    break;
            }
        });

        this.table.refresh();
        return this;
    }
    // add the ui and populated with the correct data
    // run layout for a single graph
    runTest(filename) {
        let metricsParam = {
            requiredEdgeLength: parseFloat(
                document.querySelector("#edge-length-required").value
            )
        };
        let layoutParam = {};
        let paramInputs = Array.from(
            this.getTabContent().querySelectorAll(".param-item")
        );
        for (const el of paramInputs) {
            let label = el.querySelector(".param-label").innerText;
            let param = el.querySelector(".param-input").value;

            if (isFinite(Number(param))) param = Number(param);

            layoutParam[label] = param;
        }

        let options = { weights: getWeights(), metricsParam, layoutParam };
        this.layoutParam = layoutParam;

        let layoutAlgName = this.layoutAlgName;
        let graphData = this.loadedFiles[filename];
        this.showIndicator(filename);
        let row = this.table.getRowByHeader("filename", filename);
        row.layout.value = layoutAlgName;
        this.table.refresh();
        let worker = new Worker("build/layoutWorker.js");
        worker.postMessage([graphData.graph, layoutAlgName, options, "run"]);

        worker.onmessage = function(e) {
            console.log(this.loadedFiles);

            this.loadedFiles[filename].originalGraph = deepCopy(this.loadedFiles[filename].graph); 
            this.loadedFiles[filename].graph = e.data[0];
            this.loadedFiles[filename].layout = e.data[1];
            this.loadedFiles[filename].options = e.data[2];
            this.updateTableEntry(filename);

            this.hideIndicator(filename);
            this.table.refresh();
            this.runCount--;

            if (!this.runCount) {
                // TODO: make this into a general event
            }
            worker.terminate();
        }.bind(this);
    }
    runBatch() {
        for (let filename in this.loadedFiles) {
            this.runCount++;
            this.runTest(filename);
        }
    }
    clearBatch() {
        if (!this.runCount) {
            this.table.clear();
            this.table.refresh();
            this.loadedFiles = {};
        }
    }

    showIndicator(filename) {
        let row = this.table.getRowByHeader("filename", filename);
        row.status.value = "Running";
    }
    hideIndicator(filename) {
        let row = this.table.getRowByHeader("filename", filename);
        row.status.value = "Done";
    }
    updateTableEntry(filename) {
        let metricsParam = {
            requiredEdgeLength: parseFloat(
                document.querySelector("#edge-length-required").value
            )
        };

        let options = { weights: getWeights(), metricsParam };
        let graph = new ConcreteGraph(
            this.loadedFiles[filename].graph,
            options
        );
        if (!graph) throw `${filename} not loaded`;
        let layout = this.loadedFiles[filename].layout || "-";
        let metrics = graph.metrics();

        if (this.loadedFiles[filename].originalMetrics === null) {
            this.loadedFiles[filename].originalGraph = deepCopy(this.loadedFiles[filename].graph); 
            this.loadedFiles[filename].originalMetrics = metrics;
            this.loadedFiles[filename].originalObjective = graph.objective();
            this.loadedFiles[filename].originalOptions = options;
        } else {
            this.loadedFiles[filename].metrics = metrics;
            this.loadedFiles[filename].objective = graph.objective();
            this.loadedFiles[filename].options = options;
        }

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
            edgeLength: {
                value: metrics.edgeLength.toFixed(digits),
                type: "text"
            },
            edgeCrossing: {
                value: metrics.edgeCrossing.toFixed(digits),
                type: "text"
            },
            angularResolution: {
                value: metrics.angularResolution.toFixed(digits),
                type: "text"
            },
            objective: {
                value: graph.objective().toFixed(digits),
                type: "text"
            }
        };
        let row = this.table.getRowByHeader("filename", filename);

        if (!row) {
            this.table.addRow(newRow);
        } else {
            console.log("Copying to row");

            // copy values from newRow to row
            for (const key in row) {
                if (key !== "status") {
                    row[key].value = newRow[key].value;
                }
            }
        }
        console.log(this.table);

        this.table.refresh();
    }
    loadFile(filename, data) {
        console.log(this);

        /*
        loadedTests = {
            filename: {
                graph: origianlGraph,
                layout: layoutAlgUsed, // default is null
                originalMetrics:{),
                metrics:{}
                options:{
                    weights:{},
                    metricParam:{},
                    layoutParam:{}
                }

            }
        }
    */
        let parsedData = JSON.parse(data);
        console.log(this.loadedFiles[filename]);

        if (this.loadedFiles[filename]) {

            let rowIndex = this.table
                .getRows()
                .findIndex(e => e.filename.value === filename);
            this.table.removeRow(rowIndex);
            this.table.refresh();
        }

        this.loadedFiles[filename] = parsedData;
        this.loadedFiles[filename].layout = null;
        this.loadedFiles[filename].metrics = null;
        this.loadedFiles[filename].objective = null;
        this.loadedFiles[filename].options = null;
        this.loadedFiles[filename].originalMetrics = null;
        this.loadedFiles[filename].originalObjective = null;
        this.loadedFiles[filename].originalOptions = null;

        this.updateTableEntry(filename);
    }
}

function switchTab(tabElId) {
    let tabId = getTabIdFromElId(tabElId);
    let tabEl = document.querySelector(`#${tabElId}`);
    let tabContent = document.querySelector(`#tab-content-${tabId}`);

    let oldTabEl = document.querySelector(".tab-active");
    if (oldTabEl && oldTabEl !== tabEl) {
        let oldTabId = getTabIdFromElId(oldTabEl.id);
        let oldTabContent = document.querySelector(`#tab-content-${oldTabId}`);
        oldTabEl.classList.remove("tab-active");
        oldTabContent.classList.remove("tab-content-active");
    }

    tabEl.classList.add("tab-active");
    tabContent.classList.add("tab-content-active");
}

// setup tab bar
let savedTabs = JSON.parse(localStorage.getItem("runs"));
console.log(savedTabs);

if (savedTabs) {
    for (const tab of savedTabs) {
        let nTab = new Tab("new one");
        nTab.restoreFrom(tab);
        addTabEl(nTab.title, nTab.id);
        tabs.push(nTab);
    }

    switchTab(`tab-${tabs[0].id}`);
} else {
    let defaultTab = new Tab("Run 0").setupUi();
    addTabEl(defaultTab.title, defaultTab.id);
    switchTab(`tab-${defaultTab.id}`);
    tabs.push(defaultTab);
}

let tabList = document.querySelector(".tab-list");
tabList.addEventListener("click", event => {
    let el = event.target;
    // TODO: Limit how far you can click to create a new type to avoid miss-clicks
    if (el.classList.contains("tab-item")) {
        switchTab(el.id);
    } else {
        // TODO: change this when you can delete tabs
        console.log("Adding new tab");
        let tab = new Tab(`Run ${tabs.length}`);
        let prevTab = null;
        if (tabs.length > 0) {
            prevTab =  tabs[tabs.length - 1];
            tab.loadedFiles = prevTab.loadedFiles;

        }
        tab.setupUi();
        addTabEl(tab.title, tab.id);
        switchTab(`tab-${tab.id}`);
        tabs.push(tab);

        // set param
        let layoutAlgList = tab.getTabContent().querySelector("#layoutAlgList");
        if (prevTab.layoutParam) {
            console.log("restoring param from prev");
            console.log(prevTab);

            let addParamEl2 = addParamEl.bind(tab);
            tab.getTabContent().querySelector(".param-list").innerHTML = "";
            tab.layoutAlgName = prevTab.layoutAlgName;
            tab.layoutParam = prevTab.layoutParam;
            switch (prevTab.layoutAlgName) {
                case "hillClimbing":
                    addParamEl2("iterations", prevTab.layoutParam.iterations);
                    addParamEl2("squareSize", prevTab.layoutParam.squareSize);
                    addParamEl2("moveStrategy", [
                        prevTab.layoutParam.moveStrategy
                    ]);
                    layoutAlgList.value = "hillClimbing";
                    break;
                case "Tabu":
                    break;
                case "circular":
                    addParamEl2(
                        "maxIterations",
                        prevTab.layoutParam.maxIterations
                    );
                    addParamEl2("radius", prevTab.layoutParam.radius);
                    layoutAlgList.value = "circular";
                    break;
            }
        }
            
            for (const filename in prevTab.loadedFiles) {
                tab.loadedFiles[filename].graph = prevTab.loadedFiles[filename].originalGraph;
                tab.loadedFiles[filename].layout = null;
                tab.updateTableEntry(filename);
            }
    }
});

// end of tap stuff

// Add headers to show/hide side menu
// TODO: How will this interact with every table in every run?
//
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
        let table = currentTab().table;
        let colId = event.target.getAttribute("data-col");
        if (event.target.checked) table.showHeader(colId);
        else table.hideHeader(colId);
        table.refresh();
    });

sideMenu
    .querySelector("#menu-sec-metrics")
    .addEventListener("change", event => {
        let table = currentTab().table;
        let metricsParam = {
            requiredEdgeLength: parseFloat(
                document.querySelector("#edge-length-required").value
            )
        };

        let options = { weights: getWeights(), metricsParam };

        if (event.target.classList.contains("weight-input")) {
            // recalculate objective for all rows
            for (let filename in currentTab().loadedFiles) {
                let graph = new ConcreteGraph(
                    currentTab().loadedFiles[filename].graph,
                    options
                );
                let row = table.getRowByHeader("filename", filename);
                row.objective.value = graph.objective().toFixed(digits);
            }
        }

        if (event.target.id === "edge-length-required") {
            for (let filename in currentTab().loadedFiles) {
                let graph = new ConcreteGraph(
                    currentTab().loadedFiles[filename].graph,
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
            // TODO: Will loadTest retain its this?
            let callback = currentTab().loadFile.bind(currentTab());
            console.log(callback);

            openFileDialog(callback);
            break;
        case "batchRunTest":
            currentTab().runBatch();
            break;
        case "backToMain":
            window.location.replace("index.html");
            break;
        case "clearTest":
            localStorage.removeItem("runs");
            window.location.replace("batchRun.html");
            break;
        case "summary":
            // save tabs to local storage
            localStorage.setItem("runs", JSON.stringify(tabs));
            window.location.replace("summary.html");
            break;
        default:
            break;
    }
}

window.tabs = tabs;