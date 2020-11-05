import {Graph, generateGraph} from "./graph.js";
import {
  refreshScreen,
  distance,
  getEdgeId,
  cleanId,
  deepCopy,
  loadPage,
} from "./util.js";
import * as evaluator from "./metrics.js";
import {CircularLayout} from "./circularLayout.js";
import {HillClimbing} from "./hillClimbing.js";
import {Table} from "./table.js";
import {FileModal} from "./components/fileModal.js";
import {ZNormalization} from "./normalization.js";
import {Tabu} from "./tabu.js";

import {SummaryPage} from "./summary.js";
import {MainPage} from "./main.js";

console.log("BatchRunPage module loaded");

export async function BatchRunPage() {
    const PAGE = await loadPage("batchRun", document);
    sessionStorage.setItem("lastPage", "BatchRunPage");

    let tabs = [];
    let ACTIVE_TAB_ID = null;

    const metricsParam = {
        requiredEdgeLength: 100,
    };
    // eslint-disable-next-line no-undef
    const sig = new sigma();
    const weights = {
        nodeOcclusion: 1,
        nodeEdgeOcclusion: 1,
        edgeLength: 1,
        edgeCrossing: 1,
        angularResolution: 1,
    };

    const fileStatus = {
        LOADED: 0,
        RUNNING: 1,
        COMPUTED: 2,
        DIRTY: 3,
    };

    const headers = [
        {id: "filename", title: "Filename", visible: true},
        {id: "nodes", title: "Nodes", visible: true},
        {id: "edges", title: "Edges", visible: true},
        {id: "density", title: "Density", visible: true},
        {id: "status", title: "Status", visible: true},
        {id: "executionTime", title: "execution time", visible: true},
        {
            id: "evaluatedSolutions",
            title: "evaluated solutions",
            visible: true,
        },
        {id: "layout", title: "Layout", visible: true},
        {id: "nodeOcclusion", title: "Node occlusion", visible: true},
        {
            id: "nodeEdgeOcclusion",
            title: "Edge-Node occlusion",
            visible: true,
        },
        {id: "edgeLength", title: "Edge length", visible: true},
        {id: "edgeCrossing", title: "Edge crossing", visible: true},
        {id: "angularResolution", title: "Angular Resolution", visible: true},
        {id: "objective", title: "Objective", visible: true},
        {id: "action", title: "Action", visible: true},
    ];
    let modalOffset = 0;
    const DIGITS = 7;
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
                    displayName: "Max Iterations",
                },
                {
                    type: "number",
                    name: "squareSize",
                    value: 512,
                    displayName: "Square Size",
                },
                {
                    type: "number",
                    name: "squareReduction",
                    value: 4,
                    displayName: "Square Reduction",
                },
                {
                    type: "list",
                    name: "moveStrategy",
                    displayName: "Move Strategy",
                    options: [
                        {name: "immediate", displayName: "Immediate"},
                        {name: "delayed", displayName: "Delayed"},
                    ],
                    selectedOptionIndex: 0,
                },
            ],
        },
        tabu: {
            name: "tabu",
            displayName: "Tabu Search",
            params: [
                {
                    type: "number",
                    name: "iterations",
                    value: 40,
                    displayName: "Max Iterations",
                },
                {
                    type: "number",
                    name: "squareSize",
                    value: 512,
                    displayName: "Square Size",
                },
                {
                    type: "number",
                    name: "squareReduction",
                    value: 4,
                    displayName: "Square Reduction",
                },
                {
                    type: "number",
                    name: "intensifyIt",
                    value: 5,
                    displayName: "Intensify Iteration",
                },
                {
                    type: "number",
                    name: "cutoff",
                    value: 4,
                    displayName: "Initial Cutoff",
                },
                {
                    type: "number",
                    name: "cutoffReduction",
                    value: 0.005,
                    displayName: "Cutoff Reduction",
                },
                {
                    type: "number",
                    name: "duration",
                    value: 5,
                    displayName: "Duration",
                },
                {
                    type: "list",
                    name: "selectionStrategy",
                    displayName: "Selection Strategy",
                    options: [
                        {name: "bestWorst", displayName: "Best and Worst"},
                        {
                            name: "bestSecond",
                            displayName: "Best and Second Best",
                        },
                        {name: "random", displayName: "Random"},
                        {name: "mostDistance", displayName: "Most Distance"},
                    ],
                    selectedOptionIndex: 2,
                },
            ],
        },
        circular: {
            name: "circular",
            displayName: "Circular",
            params: [
                {
                    type: "number",
                    name: "maxIterations",
                    value: 1000,
                    displayName: "Max Iterations",
                },
                {
                    type: "number",
                    name: "radius",
                    value: 450,
                    displayName: "Radius",
                },
            ],
        },
    };


    function showTabSpinner(tab) {
        let tabEl = PAGE.querySelector(`#tab-${tab.id}`);
        let spinnerEl = tabEl.querySelector(".tab-spinner");
        spinnerEl.classList.add("tab-spinner-active");
    }
    function hideTabSpinner(tab) {
        let tabEl = PAGE.querySelector(`#tab-${tab.id}`);
        let spinnerEl = tabEl.querySelector(".tab-spinner");
        spinnerEl.classList.remove("tab-spinner-active");
    }

    // Assume that id is after the last -
    function getTabIdFromElId(id) {
        return id.split("-").pop();
    }

    function addLayoutParam(layoutParam) {
        let layoutParamSec = PAGE.querySelector("#menu-sec-layout-param");
        layoutParamSec.innerHTML = "";
        layoutParamSec.insertAdjacentHTML(
            "beforeend",
            createLayoutParam(layoutParam)
        );
    }

    function renderTabs() {
        PAGE.querySelector("#tab-list").innerHTML = "";
        console.log("render tabs", tabs.map(e => e.status));
        for (let tab of tabs) {
            let tabListEl = PAGE.querySelector("#tab-list");
            tabListEl.insertAdjacentHTML(
                "beforeend",
                createTabEl(tab.title, tab.id)
            );
            if (tab.runCount > 0)
                showTabSpinner(tab);
            else
                hideTabSpinner(tab);

        }

        let activeTab = tabs.find(t => t.id === ACTIVE_TAB_ID);
        if (activeTab == null) activeTab = tabs[0];

        let tabEl = PAGE.querySelector(`#tab-${activeTab.id}`);
        if (!tabEl) throw `no tab with id tab-${activeTab.id}`;
        tabEl.classList.add("tab-active");
        addTabContentEl(activeTab);

    }

    function addTabContentEl(tab) {
        let tabContainer = PAGE.querySelector("#tab-container");
        tabContainer.innerHTML = "";
        tabContainer.insertAdjacentHTML("beforeend", createTabContent(tab));

        const contentEl = PAGE.querySelector(`#tab-content-${tab.id}`);

        if (Object.keys(tab.files).length === 0) {
            tab.status = Tab.status.FRESH;
        }

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
                evaluatedSolutions: file.info
                    ? file.info.evaluatedSolutions
                    : "-",
                executionTime: file.info ? file.info.executionTime : "-",
            };

            let metrics = null;
            if (graph.status === Graph.status.COMPUTED) {
                metrics = graph.normalMetrics();
            }


            let row = {
                status: {value: file.status, type: "text"},
                filename: {
                    value: `<a href=# class="row-delete" data-filename="${filename}" >${filename}</a>`,
                    type: "html",
                    onClick: (e) => {
                        if (
                            PAGE.querySelector(
                                `[filename="${file.name}"][tab-id="${tab.id}"]`
                            ) === null
                        ) {
                            let fileModal = new FileModal();
                            fileModal.file = file;
                            fileModal.tab = tab;
                            modalOffset += 10;
                            fileModal.initOffset = modalOffset;
                            PAGE.appendChild(fileModal);
                        }
                    },
                },
                layout: {
                    value: file.status !== "-" ? tab.layout : "-",
                    type: "text",
                },
                nodes: {value: graph.nodes().length, type: "text"},
                edges: {value: graph.edges().length / 2, type: "text"},
                executionTime: {value: info.executionTime, type: "text"},
                evaluatedSolutions: {
                    value: info.evaluatedSolutions,
                    type: "text",
                },
                density: {
                    value: graph.density().toFixed(DIGITS),
                    type: "text",
                },
                nodeOcclusion: {
                    value: metrics?metrics.nodeOcclusion.toFixed(DIGITS):"-",
                    type: "text",
                },
                nodeEdgeOcclusion: {
                    value: metrics?metrics.nodeEdgeOcclusion.toFixed(DIGITS):"-",
                    type: "text",
                },
                edgeLength: {value: metrics?metrics.edgeLength.toFixed(DIGITS):"-", type: "text"},
                edgeCrossing: {
                    value: metrics?metrics.edgeCrossing.toFixed(DIGITS):"-",
                    type: "text",
                },
                angularResolution: {
                    value: metrics?metrics.angularResolution.toFixed(DIGITS):"-",
                    type: "text",
                },
                objective: {
                    value: metrics?graph.objective().toFixed(DIGITS):"-",
                    type: "text",
                },
                action: {
                    value: `<a href=# class="row-delete" data-filename="${filename}" >Delete</a>`,
                    type: "html",
                    onClick: (e) => {
                        // kill any running web worker
                        let worker = tab.files[filename].worker;
                        if (worker) {
                            tab.runCount--;
                            if (tab.runCount === 0) {
                                tab.status = Tab.status.DONE;
                                hideTabSpinner(tab);
                            }
                            worker.terminate();
                        }
                        delete tab.files[filename];
                        renderTabs();
                    },
                },
            };

            table.addRow(row);
        }
        if (tab.sortHeader && tab.sortDirection !== "sort-neutral") {
            tab.table.sort(tab.sortHeader, tab.sortDirection === "sort-asc");
        }

        table.refresh();
        // update play button state
        let runTestEl = PAGE.querySelector("#batchRunTest");
        if (tab.status === Tab.status.RUNNING) {
            runTestEl.classList.add("fa-stop");
            runTestEl.classList.remove("fa-play");
        } else {
            runTestEl.classList.add("fa-play");
            runTestEl.classList.remove("fa-stop");
        }

        // construct side menu
        createSideMenu(tab);
        addLayoutParam(tab.layoutParam);

        // add event listener to layout algorithm list to update parameters on change
        let layoutAlgList = contentEl.querySelector("#layoutAlgList");
        layoutAlgList.onchange = ({target}) => {
            currentTab().status = Tab.status.DIRTY;
            tab.layout = target.value;
            tab.layoutParam = deepCopy(layouts[tab.layout].params);
            addLayoutParam(currentTab().layoutParam);
        };

        // add event listener for the table
        tabContainer.querySelector("table").onclick = ({target}) => {
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


    function currentTab() {
        return tabs.find(t => t.id === ACTIVE_TAB_ID);
    }
    // Assumes to be created in a loaded batchRun page (with side menu)
    // TODO: add option to save tab to disk (save the run)

    class Tab {
        constructor(title, otherTab) {
            let d = new Date();
            let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
            this.creationDate = date;
            this.table = new Table().deserialize(otherTab ? otherTab.table : null);
            this.id = `${date + Math.floor(Math.random() * 1000)}`;
            this.headers = deepCopy(otherTab ? otherTab.headers : headers);
            this.sortHeader = otherTab ? otherTab.sortHeader : null;
            this.active = false;
            this.status = Tab.status.FRESH;
            this.sortDirection = otherTab
                ? otherTab.sortDirection
                : "sort-neutral";
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
                    let originalGraph = new Graph().restoreFrom(
                        file.originalGraph
                    );
                    console.timeEnd("Tab-constructor-restoring-graph");
                    this.files[filename] = {
                        graph: graph,
                        originalGraph: originalGraph,
                        status: "-",
                        name: file.name,
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
            let content = PAGE.querySelector(`#tab-content-${this.id}`);
            return content;
        }
        // shallow copy save into the current object
        restoreFrom(saved) {
            Object.assign(this, saved);
            // resote graph objects
            let tab = this;
            for (const [filename, file] of Object.entries(tab.files)) {
                file.graph = new Graph().restoreFrom(file.graph);
                file.originalGraph = new Graph().restoreFrom(
                    file.originalGraph
                );
            }

            console.log(`restoring from save \n${saved}`, this);
            return this;
        }

        runTest(filename) {
            this.status = Tab.status.RUNNING;
            showTabSpinner(this);
            let options = {
                weights: this.weights,
                metricsParam: this.metricsParam,
                layoutParam: {},
            };
            // copy the UI layout param into options.layoutParam
            // TODO: turn this into a function
            for (let p of this.layoutParam) {
                if (p.type === "number") {
                    options.layoutParam[p.name] = p.value;
                } else if (p.type === "list") {
                    let value = p.options[p.selectedOptionIndex].name;
                    options.layoutParam[p.name] = value;
                }
            }
            let graph = currentTab().files[filename].originalGraph;
            let layout = currentTab().layout;
            let layoutParam = options.layoutParam;
            let layoutAlg = getLayoutAlg(graph, layout, null);

            let worker = new Worker("build/layoutWorker.js");
            worker.postMessage({
                layoutAlg: layoutAlg,
                layoutAlgName: layout,
                command: "run",
            });
            currentTab().files[filename].status = "running";
            currentTab().files[filename].worker = worker;

            worker.onmessage = function (e) {
                console.time("onmessage time");
                console.log("e: ", e);
                let graph = new Graph().deserialize(e.data.layoutAlg.graph);

                this.files[filename].graph = graph;
                this.files[filename].layout = e.data.layoutAlg.name;
                this.files[filename].status = "done";
                this.files[filename].info = {
                    executionTime: e.data.layoutAlg.executionTime,
                    evaluatedSolutions: e.data.layoutAlg.evaluatedSolutions,
                };
                this.files[filename].worker = null;

                this.files[filename].objective = graph.objective();

                // TODO: Make sure the options are in sync with the ui

                this.runCount--;

                if (this.runCount === 0) {
                    this.status = Tab.status.DONE;
                    hideTabSpinner(this);
                }
                if (PAGE.id === "#batchRun"){
                    renderTabs();
                }
                worker.terminate();

                console.timeEnd("onmessage time");

                renderTabs();
            


            }.bind(this);
        }
        runBatch() {
            // every batch run starts over
            this.runCount = 0;
            for (let filename in this.files) {
                this.runCount++;
                this.runTest(filename);
            }
        }
        clearBatch() {
            if (this.status !== Tab.status.RUNNING) {
                this.files = {};
                this.status = Tab.status.FRESH;
                renderTabs();
            } else {
                alert("some tabs are still running!");
            }
        }
    }
    Tab.status = {
        FRESH: 0, // tab was just created
        LOADING: 1, // still loading files
        LOADED: 2, // all files have been loaded
        RUNNING: 3, // running on files
        PAUSED: 4, // paused after a run
        DONE: 5, // Done running
        DIRTY: 6, // Something is out of sync (ex param changed but no run was triggered yet)
    };
    function loadFile(filename, data) {
        // TODO: do this in a web worker to avoid blocking the ui
        try {
            let graph = new Graph().import(data);
            let originalGraph = new Graph().restoreFrom(graph);

            currentTab().files[filename] = {
                graph: graph,
                originalGraph: originalGraph,
                status: "-",
                info: null,
                name: filename,
                objective: "-",
            };

            currentTab().status = Tab.status.LOADED;
            renderTabs();
        } catch (err) {
            console.warn(
                `Can't parse ${filename}\n`,
                "file content:\n",
                data,
                "error: ",
                err
            );
        }
    }
    function removeTab(tabId) {
        // update the state of tabs
        let index = tabs.findIndex((e) => e.id === tabId);
        if (tabs[index].Active) {
            let successorIndex = index > 0 ? index - 1 : 0;
            tabs[successorIndex].active;
        }
        tabs.splice(index, 1);
        // re render tab list 




    }
    function setupTabs(savedTabs) {
        // TODO: handle default tab when restoring
        if (savedTabs) {
            console.log("restroing from ", savedTabs);
            let newTabs = [];
            for (const tab of savedTabs) {
                let nTab = new Tab("new one");
                nTab.restoreFrom(tab);
                newTabs.push(nTab);
            }
            tabs = newTabs;
            ACTIVE_TAB_ID = tabs[0].id;

        } else {
            let defaultTab = new Tab("Run 0");
            ACTIVE_TAB_ID = defaultTab.id;
            tabs.push(defaultTab);
        }
        renderTabs();

    }
    setupTabs(window.tabs);

    let tabList = PAGE.querySelector(".tab-list");
    tabList.addEventListener("click", (event) => {
        let el = event.target;
        // TODO: Limit how far you can click to create a new type to avoid miss-clicks
        if (el.classList.contains("tab-item")) {
            const selectedTab = tabs.find(
                (t) => t.id === getTabIdFromElId(el.id)
            );
            ACTIVE_TAB_ID = selectedTab.id;
        } else if (el.id === "new-tab") {
            let prevTab = null;
            if (tabs.length > 0) prevTab = tabs[tabs.length - 1];
            let tab = new Tab(`Run ${lastTabNum++}`, prevTab);
            ACTIVE_TAB_ID = tab.id;
            tabs.push(tab);
        } else if (el.classList.contains("tab-close-icon")) {
            let id = getTabIdFromElId(el.parentNode.parentNode.id);
            removeTab(id);

        }

        renderTabs();
    });

    // Add headers to show/hide side menu
    // TODO: How will this interact with every table in every run?
    //

    function createSideMenu(tab) {
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
            let el = PAGE.querySelector("#menu-sec-columns");
            el.innerHTML = "";
            el.appendChild(menuColSecFrag);
        }

        function createSideMenuMetricSec(tab) {
            const {weights, metricsParam} = tab;
            const {
                nodeOcclusion,
                nodeEdgeOcclusion,
                edgeLength,
                edgeCrossing,
                angularResolution,
            } = tab.weights;
            const {requiredEdgeLength} = tab.metricsParam;
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
            let el = PAGE.querySelector("#menu-sec-metrics");
            el.innerHTML = "";
            el.insertAdjacentHTML("beforeend", createSideMenuMetricSec(tab));
        }

        addSideMenuColSec(tab);
        addSideMenuMetricSec(tab);
    }

    // tool bar
    const toolbar = PAGE.querySelector(".toolbar-container"),
        sideMenu = PAGE.querySelector("#side-menu");

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
            case "saveBatch":
                saveBatch();
                break;
            case "loadFile":
                openFileDialog(loadFile);
                break;
            case "loadBatch":
                openFileDialog(loadBatch);
                break;
            case "batchRunTest":
                // TODO: move this to rendertabs
                if (target.classList.contains("fa-play")) {
                    target.classList.remove("fa-play");
                    target.classList.add("fa-stop");
                    currentTab().runBatch();
                } else {
                    target.classList.remove("fa-stop");
                    target.classList.add("fa-play");
                    let tab = currentTab();
                    hideTabSpinner(tab);
                    tab.status = Tab.status.FRESH;
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
                }
                renderTabs();
                break;
            case "backToMain":
                MainPage();
                window.tabs = tabs;
                break;
            case "clearTest":
                let canClear = true;
                for (const tab of tabs) {
                    if (tab.status === Tab.status.RUNNING) {
                        canClear = false;
                        break;
                    }
                }
                if (canClear) {
                    localStorage.removeItem("runs");
                    localStorage.removeItem("lastTabNum");

                    //window.location.replace("batchRun.html");
                    currentTab().clearBatch();
                } else {
                    alert("some tabs are still running!");
                }
                break;
            case "summary-page":
                let completeBatch = true;
                for (const tab of tabs) {
                    if (tab.status !== Tab.status.DONE) {
                        completeBatch = false;
                        if (tab.status === Tab.status.DIRTY) {
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

                    window.tabs = tabs;
                    SummaryPage(tabs);
                }
                break;
            default:
                break;
            case "exportBatch":
                exportBatchToCSV(tabs);
                break;
        }
    }
    function getWeights() {
        return {
            nodeOcclusion: parseFloat(
                PAGE.querySelector("#node-occlusion-weight").value
            ),
            nodeEdgeOcclusion: parseFloat(
                PAGE.querySelector("#edge-node-occlusion-weight").value
            ),
            edgeLength: parseFloat(
                PAGE.querySelector("#edge-length-weight").value
            ),
            edgeCrossing: parseFloat(
                PAGE.querySelector("#edge-crossing-weight").value
            ),
            angularResolution: parseFloat(
                PAGE.querySelector("#angular-resolution-weight").value
            ),
        };
    }

    const genModal = PAGE.querySelector("#gen-modal"),
        genMode = PAGE.querySelector("#gen-mode"),
        nodeNumMinEl = PAGE.querySelector("#node-num-min"),
        nodeNumMaxEl = PAGE.querySelector("#node-num-max"),
        nodeError = PAGE.querySelector("#node-error"),
        edgeNumMinEl = PAGE.querySelector("#edge-num-min"),
        edgeNumMaxEl = PAGE.querySelector("#edge-num-max"),
        testNumEl = PAGE.querySelector("#test-num"),
        edgeError = PAGE.querySelector("#edge-error");

    genModal.addEventListener("click", (event) => {
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
                    edgeError.innerHTML = `Can't have less than ${
                        nodeNumMin - 1
                        } edges `;
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

    genMode.addEventListener("change", (event) => {
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
        .addEventListener("change", ({target}) => {
            let table = currentTab().table;
            let colId = target.getAttribute("data-col");

            // sync ui with data
            let header = currentTab().headers.find(({id}) => id === colId);
            header.visible = target.checked;

            renderTabs();
        });

    sideMenu
        .querySelector("#menu-sec-metrics")
        .addEventListener("change", (event) => {
            currentTab().status = Tab.status.DIRTY;
            currentTab().weights = getWeights();
            currentTab().metricsParam = {
                requiredEdgeLength: parseFloat(
                    PAGE.querySelector("#edge-length-required").value
                ),
            };
        });

    sideMenu
        .querySelector("#menu-sec-layout-param")
        .addEventListener("change", ({target}) => {
            currentTab().status = Tab.status.DIRTY;
            let type = target.nodeName;
            let param = currentTab().layoutParam.find(
                (e) => e.name === target.name
            );

            if (type === "INPUT") {
                param.value = Number(target.value);
            } else {
                let index = param.options.findIndex(
                    (e) => e.name === target.value
                );
                param.selectedOptionIndex = index;
            }
        });

    let toggleEl = PAGE.querySelectorAll(".menu-section-label");
    for (const e of toggleEl) {
        e.onclick = function () {
            let secId = this.getAttribute("data-section");
            let secEl = PAGE.querySelector(`#${secId}`);
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

        let d = new Date();
        for (let i = 0; i < testNum; i++) {
            let G = generateGraph(nMin, nMax, eMin, eMax, height, width);
            let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
            let exportedGraph = G.export();

            // eslint-disable-next-line no-undef
            saveFile(exportedGraph, `${date}-randomGraph-${i}`);
            loadFile(`${date}-randomGraph-${i}`,exportedGraph);
        }
    }

    function exportBatchToCSV(tabs) {
        let csv =
            "set,filename,execution time,evaluated solution,layout,nodes,edges,density,node occlusion,edge-node occlusion,edge length,edge crossing,angular resolution,node occlusion weight,edge-node occlusion weight,edge length weight,edge crossing weight,angular resolution weight,required edge length,objective\n";

        for (let tab of tabs) {
            for (let key of Object.keys(tab.files)) {
                let file = tab.files[key];
                let graph = file.graph;
                let metrics = graph.normalMetrics();
                let info = file.info;
                let executionTime, evaluatedSolutions;
                let w = graph.weights;
                if (info != null) {
                    executionTime = info.executionTime;
                    evaluatedSolutions = info.evaluatedSolutions;
                }

                let row = `${tab.title},${key},${executionTime},${evaluatedSolutions},${
                    tab.layout
                    },${graph.nodes().length},${
                    graph.edges().length
                    },${graph.density()},${metrics.nodeOcclusion},${
                    metrics.nodeEdgeOcclusion
                    },${metrics.edgeLength},${metrics.edgeCrossing},${
                    metrics.angularResolution
                    },${w.nodeOcclusion},${w.nodeEdgeOcclusion},${w.edgeLength},${
                    w.edgeCrossing
                    },${w.angularResolution},${
                    graph.requiredEdgeLength
                    },${graph.objective()}\n`;

                csv += row;
            }
        }

        saveFileDialog(csv, "csv");
    }

    function saveBatch() {
        console.time("tabToString");
        let batch = JSON.stringify(tabs, null, 4);
        saveFileDialog(batch, "batch.json");
        console.timeEnd("tabToString");
    }

    function loadBatch(filename, data) {
        try {
            data = JSON.parse(data);
            setupTabs(data);
        } catch (err) {
            console.warn(
                `Can't parse ${filename}\n`,
                "file content:\n",
                data,
                "error: ",
                err
            );
        }
    }

    // TODO: refactor this to be shared between main and batchrun
    function getLayoutAlg(graph, layoutAlgName, layoutParam) {
        graph.resetZn();
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











    //====================================================HTML====================================================


    function createLayoutList(selectedLayout) {
        let htmlOptions = "";
        for (const [name, {displayName}] of Object.entries(layouts)) {
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

        function createInputParam({name, displayName, value}) {
            let inputHtml = `<div class=param-input-label>${displayName}</div>
              <input type="number" name="${name}" class="param-input" id="${name}" value="${value}" </input>
              `;
            return inputHtml;
        }
        function createSelectParam({
            name,
            displayName,
            selectedOptionIndex,
            options,
        }) {
            let htmlOptions = "";
            for (let i = 0; i < options.length; i++) {
                const {name, displayName} = options[i];
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
            else if (param.type === "list")
                paramHtml = createSelectParam(param);
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

    function createTabContent({id, layout}) {
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
            Object.keys(tabs.find((e) => e.id === id).files).length
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
}
