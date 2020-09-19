import { Graph, generateGraph } from "./graph.js";
import {
    refreshScreen,
    distance,
    getEdgeId,
    cleanId,
    deepCopy
} from "./util.js";
import * as evaluator from "./metrics.js";

import { CircularLayout } from "./circularLayout.js";
import { HillClimbing } from "./hillClimbing.js";
import { Table } from "./table";
import { FileModal } from "./components/fileModal.js";
import {ZNormalization} from "./normalization.js";
const headers = [
    { id: "filename", title: "Filename", visible: true },
    { id: "status", title: "Status", visible: true },
    { id: "executionTime", title: "execution time", visible: true },
    { id: "evaluatedSolutions", title: "evaluated solutions", visible: true },
    { id: "layout", title: "Layout", visible: true },
    { id: "nodes", title: "Nodes", visible: true },
    { id: "edges", title: "Edges", visible: true },
    { id: "density", title: "Density", visible: true },
    { id: "nodeOcclusion", title: "Node occlusion", visible: true },
    { id: "nodeEdgeOcclusion", title: "Edge-Node occlusion", visible: true },
    { id: "edgeLength", title: "Edge length", visible: true },
    { id: "edgeCrossing", title: "Edge crossing", visible: true },
    { id: "angularResolution", title: "Angular Resolution", visible: true },
    { id: "objective", title: "Objective", visible: true },
    { id: "action", title: "Action", visible: true }
];
let modalOffset = 0;
const digits = 3;
let lastTabNum = 1;
const layouts = {
    hillClimbing: {
        name: "hillClimbing",
        displayName: "Hill Climbing",
        params: [
            {
                type: "number",
                name: "iterations",
                value: 500,
                displayName: "Max Iterations"
            },
            {
                type: "number",
                name: "squareSize",
                value: 512,
                displayName: "Square Size"
            },
            {
                type: "number",
                name: "squareReduction",
                value: 4,
                displayName: "Square Reduction"
            },
            {
                type: "list",
                name: "moveStrategy",
                displayName: "Move Strategy",
                options: [
                    { name: "delayed", displayName: "Delayed" },
                    { name: "immediate", displayName: "Immediate" }
                ],
                selectedOptionIndex: 0
            }
        ]
    },
    tabu: {
        name: "tabu",
        displayName: "Tabu Search",
        params: [
            {
                type: "number",
                name: "iterations",
                value: 40,
                displayName: "Max Iterations"
            },
            {
                type: "number",
                name: "squareSize",
                value: 512,
                displayName: "Square Size"
            },
            {
                type: "number",
                name: "squareReduction",
                value: 4,
                displayName: "Square Reduction"
            },
            {
                type: "number",
                name: "intensifyIt",
                value: 5,
                displayName: "Intensify Iteration"
            },
            {
                type: "number",
                name: "cutoff",
                value: 4,
                displayName: "Initial Cutoff"
            },
            {
                type: "number",
                name: "cutoffReduction",
                value: 0.005,
                displayName: "Cutoff Reduction"
            },
            {
                type: "number",
                name: "duration",
                value: 5,
                displayName: "Duration"
            },
            {
                type: "list",
                name: "selectionStrategy",
                displayName: "Selection Strategy",
                options: [
                    { name: "bestWorst", displayName: "Best and Worst" },
                    { name: "bestSecond", displayName: "Best and Second Best" },
                    { name: "random", displayName: "Random" },
                    { name: "mostDistance", displayName: "Most Distance" }
                ],
                selectedOptionIndex: 2
            }
        ]
    },
    circular: {
        name: "circular",
        displayName: "Circular",
        params: [
            {
                type: "number",
                name: "maxIterations",
                value: 1000,
                displayName: "Max Iterations"
            },
            {
                type: "number",
                name: "radius",
                value: 450,
                displayName: "Radius"
            }
        ]
    }
};

function createLayoutList(selectedLayout) {
    let htmlOptions = "";
    for (const [name, { displayName }] of Object.entries(layouts)) {
        htmlOptions += `<option value="${name}" ${
            name === selectedLayout ? "selected" : ""
        }>${displayName}</option>`;
    }
    let selectHtml = `
        <select name="layoutAlg" id="layoutAlgList">
        ${htmlOptions}
        </select>
    `;
    return selectHtml;
}
function createLayoutParam(params) {
    function createItemWrapper(item) {
        return `<div class="menu-item-group">
            <div class="menu-item">
                ${item}
            </div>
        </div>`;
    }

    function createInputParam({ name, displayName, value }) {
        let inputHtml = `<div class=param-input-label>${displayName}</div>
            <input type="number" name="${name}" class="param-input" id="${name}" value="${value}" </input>
            `;
        return inputHtml;
    }
    function createSelectParam({
        name,
        displayName,
        selectedOptionIndex,
        options
    }) {
        let htmlOptions = "";
        for (let i = 0; i < options.length; i++) {
            const { name, displayName } = options[i];
            htmlOptions += `<option value="${name}" ${
                selectedOptionIndex === i ? "selected" : ""
            }>${displayName}</option>`;
        }

        let selectHtml = `<div class=param-input-label>${displayName}</div>
            <select name="${name}">${htmlOptions}</select>

            `;

        return selectHtml;
    }

    let html = "";
    for (const param of params) {
        let paramHtml = "";
        if (param.type === "number") paramHtml = createInputParam(param);
        else if (param.type === "list") paramHtml = createSelectParam(param);
        html += createItemWrapper(paramHtml);
    }
    return html;
}

function createTabEl(title, tabId) {
    let html = `
            <div class="tab-item" id="tab-${tabId}">
                <div class="tab-title">
                    ${title}
                </div>

                <div class="tab-control">
                    ${createSpinner()}
                    ${
                        // prevent the default tab from being deleted
                        tabId !== tabs[0].id
                            ? `<span class="fas fa-times tab-close-icon"></span>`
                            : ``
                    }

                </div> 
             </div> 
            `;
    return html;
}

function createTabContent({ id, layout }) {
    let html = `
            <div class="tab-content" id="tab-content-${id}">
                <div class="param-container">
                    <div class="dropdown" id="layoutAlg">
                        <span>Layout Algorithm: </span>
                        ${createLayoutList(layout)}

                    </div>

                    <div class="param-list">
                    </div>
                    <div class="file-number">
                    
                    <span>Number of files: </span>
                    ${
                        Object.keys(tabs.find(e => e.id === id).files).length
                    }</div>
                </div>

            <div class="h-divider">

            </div>
                <div class="table-container">
                    <table class="run-table" id="table-${id}"><thead><tr></tr></thead><tbody></tbody></table>
                </div>
            </div>
   `;
    return html;
}

function createSpinner() {
    console.log("create spinner");
    return `
       <div class="lds-ring tab-spinner">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
       </div>
`;
}

function showTabSpinner(tab) {
    let tabEl = document.querySelector(`#tab-${tab.id}`);
    let spinnerEl = tabEl.querySelector(".tab-spinner");
    spinnerEl.classList.add("tab-spinner-active");
}
function hideTabSpinner(tab) {
    let tabEl = document.querySelector(`#tab-${tab.id}`);
    let spinnerEl = tabEl.querySelector(".tab-spinner");
    spinnerEl.classList.remove("tab-spinner-active");
}

// Assume that id is after the last -
function getTabIdFromElId(id) {
    return id.split("-").pop();
}

function layoutParamHandler({ target }) {}

function addLayoutParam(layoutParam) {
    let layoutParamSec = document.querySelector("#menu-sec-layout-param");
    layoutParamSec.innerHTML = "";
    layoutParamSec.insertAdjacentHTML(
        "beforeend",
        createLayoutParam(layoutParam)
    );
    function onSelectChange({ target }) {
        let name = target.getAttribute("name");
        let type = target.nodeName;
        if (type === "INPUT") {
            let tab = currentTab();
            let options = tab.layoutParam[name].options;
            let index = options.find(e => e.name === name);
            tab.layoutParam[name].selectedOptionIndex = index;
        }
    }

    // add param layout event listener
    // layoutParamSec.addEventListener("change", onSelectChange);
}

function addNewTab(tabList, tab) {
    console.log("adding new tab", tab);
    // add the tab to the list of tabs
    tabList.push(tab);
    // add it to html tab list
    addTabEl(tab);
    // add html content
    addTabContentEl(tab);
}

// add new tab element and add it's tab before the new tab icon
// TODO: find a better name. This name conflicts with addNewTab
function addTabEl(tab) {
    let newTab = document.querySelector("#new-tab");
    newTab.insertAdjacentHTML("beforebegin", createTabEl(tab.title, tab.id));
}

function addTabContentEl(tab) {
    let tabContainer = document.querySelector("#tab-container");
    tabContainer.innerHTML = "";
    tabContainer.insertAdjacentHTML("beforeend", createTabContent(tab));

    const contentEl = document.querySelector(`#tab-content-${tab.id}`);

    if (Object.keys(tab.files).length === 0) {
        tab.status = tabStatus.FRESH;
    }

    addTable(tab);
    addSideMenuColSec(tab);
    addSideMenuMetricSec(tab);
    addLayoutParam(tab.layoutParam);

    // add event listener to layout algorithm list to update parameters on change
    let layoutAlgList = contentEl.querySelector("#layoutAlgList");
    layoutAlgList.onchange = ({ target }) => {
        currentTab().status = tabStatus.DIRTY;
        tab.layout = target.value;
        tab.layoutParam = deepCopy(layouts[tab.layout].params);
        addLayoutParam(currentTab().layoutParam);
    };

    // add event listener for the table
    tabContainer.querySelector("table").onclick = ({ target }) => {
        let btn = null;
        let h = null;
        if (target.nodeName === "TH") {
            btn = target.querySelector("button");
            h = target.id;
        } else if (target.nodeName === "BUTTON") {
            btn = target;
            h = target.parentNode.id;
        }
        if (tab.table.getHeader(h)) {
            tab.table.sort(h, !(tab.table.sortClass === "sort-asc"));
            tab.table.refresh();
            tab.sortDirection = tab.table.sortClass;
            tab.sortHeader = h;
        }
    };
}

function addTable(tab) {
    let table = new Table(`table-${tab.id}`);
    tab.table = table;

    for (const h of tab.headers) {
        table.addHeader(h);
        if (h.visible === false) table.hideHeader(h.id);
    }

    for (const [filename, file] of Object.entries(tab.files)) {
        // TODO: make sure the weights are up to date when we reach this step
        let graph = file.graph;
        let info = {
            evaluatedSolutions: file.info ? file.info.evaluatedSolutions : "-",
            executionTime: file.info ? file.info.executionTime : "-"
        };

        let metrics = graph.normalMetrics();
        let objective = graph.objective();
        let {
            nodeOcclusion,
            nodeEdgeOcclusion,
            edgeLength,
            edgeCrossing,
            angularResolution
        } = metrics;
        let row = {
            status: { value: file.status, type: "text" },
            filename: {
                value: `<a href=# class="row-delete" data-filename="${filename}" >${filename}</a>`,
                type: "html",
                onClick: e => {
                    if (
                        document.querySelector(
                            `[filename="${file.name}"][tab-id="${tab.id}"]`
                        ) === null
                    ) {
                        let fileModal = new FileModal();
                        fileModal.file = file;
                        fileModal.tab = tab;
                        modalOffset += 10;
                        fileModal.initOffset = modalOffset;
                        document.body.appendChild(fileModal);
                    }
                }
            },
            layout: {
                value: file.status !== "-" ? tab.layout : "-",
                type: "text"
            },
            nodes: { value: graph.nodes().length, type: "text" },
            edges: { value: graph.edges().length, type: "text" },
            executionTime: { value: info.executionTime, type: "text" },
            evaluatedSolutions: {
                value: info.evaluatedSolutions,
                type: "text"
            },
            density: { value: graph.density().toFixed(digits), type: "text" },
            nodeOcclusion: {
                value: nodeOcclusion.toFixed(digits),
                type: "text"
            },
            nodeEdgeOcclusion: {
                value: nodeEdgeOcclusion.toFixed(digits),
                type: "text"
            },
            edgeLength: { value: edgeLength.toFixed(digits), type: "text" },
            edgeCrossing: { value: edgeCrossing.toFixed(digits), type: "text" },
            angularResolution: {
                value: angularResolution.toFixed(digits),
                type: "text"
            },
            objective: {
                value: graph.objective().toFixed(digits),
                type: "text"
            },
            action: {
                value: `<a href=# class="row-delete" data-filename="${filename}" >Delete</a>`,
                type: "html",
                onClick: e => {
                    // delete file from all tabs
                    console.log("delete file", filename);
                    for (let tab of tabs) {
                        // kill any running web worker
                        let worker = tab.files[filename].worker;
                        if (worker) {
                            tab.runCount--;
                            if (tab.runCount === 0) {
                                tab.status = tabStatus.DONE;
                                hideTabSpinner(tab);
                            }
                            worker.terminate();
                        }
                        delete tab.files[filename];
                    }
                    addTabContentEl(tab);
                }
            }
        };

        table.addRow(row);
    }
    if (tab.sortHeader && tab.sortDirection !== "sort-neutral") {
        tab.table.sort(tab.sortHeader, tab.sortDirection === "sort-asc");
    }

    table.refresh();
    // update play button state
    let runTestEl = document.querySelector("#batchRunTest");
    if (tab.status === tabStatus.RUNNING) {
        runTestEl.classList.add("fa-stop");
        runTestEl.classList.remove("fa-play");
    } else {
        runTestEl.classList.add("fa-play");
        runTestEl.classList.remove("fa-stop");
    }
}

function currentTab() {
    let activeTabElId = document.querySelector(".tab-active").id;
    return tabs.find(t => t.id === getTabIdFromElId(activeTabElId));
}

function switchTab(tab) {
    let tabEl = document.querySelector(`#tab-${tab.id}`);
    if (!tabEl) throw `no tab with id tab-${tab.id}`;

    let oldTabEl = document.querySelector(".tab-active");
    if (oldTabEl && oldTabEl !== tabEl) {
        let oldTabId = getTabIdFromElId(oldTabEl.id);
        oldTabEl.classList.remove("tab-active");
    }

    tabEl.classList.add("tab-active");

    addTabContentEl(tab);
}

let tabNum = 1;
let tabs = [];

const metricsParam = {
    requiredEdgeLength: 0.5
};
const weights = {
    nodeOcclusion: 1,
    nodeEdgeOcclusion: 1,
    edgeLength: 1,
    edgeCrossing: 1,
    angularResolution: 1
};

const tabStatus = {
    FRESH: 0, // tab was just created
    LOADING: 1, // still loading files
    LOADED: 2, // all files have been loaded
    RUNNING: 3, // running on files
    PAUSED: 4, // paused after a run
    DONE: 5, // Done running
    DIRTY: 6 // Something is out of sync (ex param changed but no run was triggered yet)
};
const fileStatus = {
    LOADED: 0,
    RUNNING: 1,
    COMPUTED: 2,
    DIRTY: 3
};

// Assumes to be created in a loaded batchRun page (with side menu)
// TODO: add option to save tab to disk (save the run)
class Tab {
    constructor(title, otherTab) {
        let d = new Date();
        let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
        this.creationDate = date;
        this.table = null; // mainly used to control the sort
        this.id = `${date + Math.floor(Math.random() * 1000)}`;
        this.headers = deepCopy(otherTab ? otherTab.headers : headers);
        this.sortHeader = otherTab ? otherTab.sortHeader : null;
        this.status = tabStatus.FRESH;
        this.sortDirection = otherTab ? otherTab.sortDirection : "sort-neutral";
        this.weights = deepCopy(otherTab ? otherTab.weights : weights);
        this.metricsParam = deepCopy(
            otherTab ? otherTab.metricsParam : metricsParam
        );

        this.files = {};
        if (otherTab) {
            // remove the computed graph from the current tab
            for (let [filename, file] of Object.entries(otherTab.files)) {
                console.time("Tab-constructor-restoring-graph");
                let graph = new Graph().restoreFrom(file.originalGraph);
                let originalGraph = new Graph().restoreFrom(file.originalGraph);
                console.timeEnd("Tab-constructor-restoring-graph");
                this.files[filename] = {
                    graph: graph,
                    originalGraph: originalGraph,
                    status: "-",
                    name: file.name
                };
            }
        }

        this.runCount = 0;
        this.title = title;
        this.layoutParam = deepCopy(
            otherTab ? otherTab.layoutParam : layouts["hillClimbing"].params
        );
        this.metricsParam = deepCopy(
            otherTab ? otherTab.metricsParam : metricsParam
        );
        this.layout = otherTab ? otherTab.layout : "hillClimbing";
    }
    getTabContent() {
        let content = document.querySelector(`#tab-content-${this.id}`);
        return content;
    }
    // shallow copy save into the current object
    restoreFrom(saved) {
        Object.assign(this, saved);
        // resote graph objects
        let tab = this;
        for (const [filename, file] of Object.entries(tab.files)) {
            file.graph = new Graph().restoreFrom(file.graph);
            file.originalGraph = new Graph().restoreFrom(file.graph);
        }

        console.log(`restoring from save \n${saved}`, this);
        return this;
    }

    runTest(filename) {
        this.status = tabStatus.RUNNING;
        showTabSpinner(this);
        let options = {
            weights: this.weights,
            metricsParam: this.metricsParam,
            layoutParam: {}
        };
        for (let p of this.layoutParam) {
            if (p.type === "number") {
                options.layoutParam[p.name] = p.value;
            } else if (p.type === "list") {
                let value = p.options[p.selectedOptionIndex].name;
                options.layoutParam[p.name] = value;
            }
        }
        let graphData = currentTab().files[filename].originalGraph.serialize(false);
        console.log("graphData", graphData);

        let worker = new Worker("build/layoutWorker.js");
        worker.postMessage([graphData, currentTab().layout, options, "run"]);

        currentTab().files[filename].status = "running";
        currentTab().files[filename].worker = worker;

        worker.onmessage = function(e) {
            console.time("onmessage time");
            let graph = new Graph().deserialize(e.data[0]);
            this.files[filename].graph = graph;
            this.files[filename].layout = e.data[1];
            this.files[filename].status = "done";
            this.files[filename].info = e.data[4];
            this.files[filename].worker = null;

            this.files[filename].objective = graph.objective();
            this.files[filename].originalObjective = this.files[
                filename
            ].originalGraph.objective();

            // TODO: Make sure the options are in sync with the ui
            currentTab().options = e.data[2];

            this.runCount--;

            if (this.runCount === 0) {
                this.status = tabStatus.DONE;
                hideTabSpinner(this);
            }
            addTable(currentTab());
            worker.terminate();

            console.timeEnd("onmessage time");
        }.bind(this);
    }
    runBatch() {
        // every batch run starts over
        this.runCount = 0;
        for (let filename in this.files) {
            this.runCount++;
            this.runTest(filename);
        }
        //addTable(this);
    }
    clearBatch() {
        console.log(this.status);
        if (this.status !== tabStatus.RUNNING) {
            this.files = {};
            this.status = tabStatus.FRESH;
            addTable(this);
        } else {
            alert("some tabs are still running!");
        }
    }
}
function loadFile(filename, data) {
    // TODO: do this in a web worker to avoid blocking the ui
    console.time("loadFile createGraph time");
    let graph = new Graph().import(data);
    console.timeEnd("loadFile createGraph time");
    console.time("loadFile createCopy time");
    let originalGraph = new Graph().restoreFrom(graph);
    console.timeEnd("loadFile createCopy time");

    currentTab().files[filename] = {
        graph: graph,
        data: data,
        originalGraph: originalGraph,
        status: "-",
        info: null,
        name: filename,
        objective: graph.objective(),
        originalObjective: originalGraph.objective()
    };

    currentTab().status = tabStatus.LOADED;
    addTabContentEl(currentTab());
}
// setup tab bar
let savedTabs = JSON.parse(localStorage.getItem("runs"));
lastTabNum = JSON.parse(localStorage.getItem("lastTabNum")) || 1;

if (savedTabs) {
    for (const tab of savedTabs) {
        let nTab = new Tab("new one");
        nTab.restoreFrom(tab);
        addNewTab(tabs, nTab);
    }

    switchTab(tabs[0]);
} else {
    let defaultTab = new Tab("Run 0");
    addNewTab(tabs, defaultTab);
    switchTab(defaultTab);
}

let tabList = document.querySelector(".tab-list");
tabList.addEventListener("click", event => {
    let el = event.target;
    // TODO: Limit how far you can click to create a new type to avoid miss-clicks
    if (el.classList.contains("tab-item")) {
        const selectedTab = tabs.find(t => t.id === getTabIdFromElId(el.id));
        switchTab(selectedTab);
    } else if (el.id === "new-tab") {
        let prevTab = null;
        if (tabs.length > 0) prevTab = tabs[tabs.length - 1];
        let tab = new Tab(`Run ${lastTabNum++}`, prevTab);
        addNewTab(tabs, tab);
        switchTab(tab);
    } else if (el.classList.contains("tab-close-icon")) {
        let id = getTabIdFromElId(el.parentNode.parentNode.id);
        let index = tabs.findIndex(e => e.id === id);
        tabs.splice(index, 1);
        index = index > 0 ? index - 1 : 0;
        el.parentNode.parentNode.remove();
        if (el.parentNode.parentNode.classList.contains("tab-active"))
            switchTab(tabs[index]);
    }
});

// Add headers to show/hide side menu
// TODO: How will this interact with every table in every run?
//

function addSideMenuColSec(tab) {
    let menuColSecFrag = document.createDocumentFragment();
    for (const h of tab.headers) {
        let item = document.createElement("div");
        item.classList.add("menu-item-checkbox");
        let checkbox = document.createElement("input");
        checkbox.setAttribute("type", "checkbox");
        checkbox.checked = h.visible;
        checkbox.setAttribute("data-col", h.id);
        let label = document.createElement("p");
        label.innerHTML = h.title;

        item.appendChild(checkbox);
        item.appendChild(label);
        menuColSecFrag.appendChild(item);
    }
    let el = document.querySelector("#menu-sec-columns");
    el.innerHTML = "";
    el.appendChild(menuColSecFrag);
}

function createSideMenuMetricSec(tab) {
    const { weights, metricsParam } = tab;
    const {
        nodeOcclusion,
        nodeEdgeOcclusion,
        edgeLength,
        edgeCrossing,
        angularResolution
    } = tab.weights;
    const { requiredEdgeLength } = tab.metricsParam;
    let html = `
    <div class="menu-item-group">
        <div class="menu-item">
            <p>Node occlusion</p>
        </div>

        <div class="menu-item">
            <p>Weight</p>
            <input type="number" class="weight-input" id="node-occlusion-weight" value="${nodeOcclusion}" step="0.01"
                min="0" max="1" />
        </div>

    </div>
    <div class="menu-item-group">
        <div class="menu-item">
            <p>Edge node occlusion:</p>
        </div>
        <div class="menu-item">
            <p>Weight</p>
            <input type="number" class="weight-input" id="edge-node-occlusion-weight" value="${nodeEdgeOcclusion}" step="0.01"
                min="0" max="1" />
        </div>

    </div>
    <div class="menu-item-group">
        <div class="menu-item">
            <p>Edge length</p>
        </div>

        <div class="menu-item">
            <p>Weight</p>
            <input type="number" class="weight-input" id="edge-length-weight" value="${edgeLength}" step="0.01" min="0"
                max="1" />
        </div>

        <div class="menu-item">
            <p>Required length</p>
            <input type="number" id="edge-length-required" value="${requiredEdgeLength}" step="0.01" min="0" max="1" />
        </div>

    </div>

    <div class="menu-item-group">
        <div class="menu-item">
            <p>Edge crossing</p>
        </div>
        <div class="menu-item">
            <p>Weight</p>
            <input type="number" class="weight-input" id="edge-crossing-weight" value="${edgeCrossing}" step="0.01"
                min="0" max="1" />
        </div>

    </div>
    <div class="menu-item-group">
        <div class="menu-item">
            <p>Angular resolution</p>
        </div>
        <div class="menu-item">
            <p>Weight</p>
            <input type="number" class="weight-input" id="angular-resolution-weight" value="${angularResolution}" step="0.01"
                min="0" max="1" />
        </div>
    </div>
    `;
    return html;
}

function addSideMenuMetricSec(tab) {
    let el = document.querySelector("#menu-sec-metrics");
    el.innerHTML = "";
    el.insertAdjacentHTML("beforeend", createSideMenuMetricSec(tab));
}

// eslint-disable-next-line no-undef
const sig = new sigma();

// tool bar
const toolbar = document.querySelector(".toolbar-container"),
    sideMenu = document.querySelector("#side-menu");

toolbar.addEventListener("click", toolbarClickHandler);
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
            openFileDialog(loadFile);
            break;
        case "batchRunTest":
            if (target.classList.contains("fa-play")) {
                target.classList.remove("fa-play");
                target.classList.add("fa-stop");
                currentTab().runBatch();
            } else {
                target.classList.remove("fa-stop");
                target.classList.add("fa-play");
                let tab = currentTab();
                hideTabSpinner(tab);
                tab.status = tabStatus.FRESH;
                tab.runCount = 0;
                for (const [filename, file] of Object.entries(tab.files)) {
                    file.status = "-";

                    file.graph.clear();
                    file.graph.restoreFrom(file.originalGraph);

                    file.layout = null;
                    if (file.info) {
                        file.info.evaluatedSolutions = null;
                        file.info.executionTime = null;
                    }

                    if (file.worker) file.worker.terminate();
                }
                addTabContentEl(tab);
            }
            break;
        case "backToMain":
            window.location.replace("index.html");
            break;
        case "clearTest":
            let canClear = true;
            for (const tab of tabs) {
                if (tab.status === tabStatus.RUNNING) {
                    canClear = false;
                    break;
                }
            }
            if (canClear) {
                localStorage.removeItem("runs");
                localStorage.removeItem("lastTabNum");
                window.location.replace("batchRun.html");
            } else {
                alert("some tabs are still running!");
            }
            break;
        case "summary":
            // don't switch if we have no data

            let completeBatch = true;
            for (const tab of tabs) {
                if (tab.status !== tabStatus.DONE) {
                    completeBatch = false;
                    if (tab.status === tabStatus.DIRTY) {
                        alert(
                            `Parameter changed without a re-run in ${tab.title}`
                        );
                    } else {
                        alert(`Incomplete run in:  ${tab.title}`);
                    }
                    break;
                }
            }
            if (completeBatch) {
                // save tabs to local storage
                localStorage.setItem("runs", JSON.stringify(tabs));
                localStorage.setItem("lastTabNum", JSON.stringify(lastTabNum));
                window.location.replace("summary.html");
            }
            break;
        default:
            break;
    }
}
function getWeights() {
    return {
        nodeOcclusion: parseFloat(
            document.querySelector("#node-occlusion-weight").value
        ),
        nodeEdgeOcclusion: parseFloat(
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
    .addEventListener("change", ({ target }) => {
        let table = currentTab().table;
        let colId = target.getAttribute("data-col");

        // sync ui with data
        let header = currentTab().headers.find(({ id }) => id === colId);
        header.visible = target.checked;

        addTable(currentTab());
    });

sideMenu
    .querySelector("#menu-sec-metrics")
    .addEventListener("change", event => {
        currentTab().status = tabStatus.DIRTY;
        currentTab().weights = getWeights();
        currentTab().metricsParam = {
            requiredEdgeLength: parseFloat(
                document.querySelector("#edge-length-required").value
            )
        };
    });

sideMenu
    .querySelector("#menu-sec-layout-param")
    .addEventListener("change", ({ target }) => {
        currentTab().status = tabStatus.DIRTY;
        let type = target.nodeName;
        let param = currentTab().layoutParam.find(e => e.name === target.name);

        if (type === "INPUT") {
            param.value = Number(target.value);
        } else {
            let index = param.options.findIndex(e => e.name === target.value);
            param.selectedOptionIndex = index;
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
            graph: G.toJSON()
        };
        let json = JSON.stringify(obj);
        // eslint-disable-next-line no-undef
        saveFile(json);
    }
}

window.tabs = tabs;
