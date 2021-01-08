// sigam.js imports
/*global sigma*/
import { Graph, generateGraph } from "./graph.js";
import { refreshScreen, distance, getEdgeId ,loadPage} from "./util.js";
import { CircularLayout } from "./circularLayout.js";
import { HillClimbing } from "./hillClimbing.js";
import { Tabu } from "./tabu.js";
import { BatchRunPage } from "./batchRun.js";


export async function MainPage() {
    const PAGE = await loadPage("main", document);
    sessionStorage.setItem("lastPage", "MainPage");

    // TODO: restore state

    let container = PAGE.querySelector("#container");
    const DIGITS = 7;

    let canvasRenderer = {
        container: "container",
        type: "canvas",
        camera: "cam1",
        settings: {
            enableEdgeHovering: true,
            edgeHoverColor: "edge",
            edgeHoverSizeRatio: 1.6,
        },
    };
    let worker = new Worker("build/layoutWorker.js");
    let webglRenderer = {
        type: "webgl",
        camera: "cam1",
        container: "container",
    };

    const edgeSize = 1.5;
    const nodeSize = 10;

    let sigDefaults = {
        renderer: webglRenderer,
        settings: {
            doubleClickEnabled: false,
            autoRescale: false,
            enableCamera: true,
        },
    };
    // create the main sigma instance
    let sig = new sigma(sigDefaults);
    let cam = sig.cameras.cam1;
    // create the main graph instance
    let GRAPH = new Graph();
    //
    let CURRENT_LAYOUT_ALG = null;
    let CURRENT_LAYOUT_ALG_NAME = null;

    let layoutAlgOptions;

    // create an object to use to track select and drag operations
    // using constructor function so we can selectively expose methods
    let graphUiModes = (function () {
        let selectedNode = null;
        let selectedEdge = null;
        let dragStartPos = null;
        let dragEndPos = null;
        let dragThreshold = 5;

        function selectNode(node) {
            node.color = "#c52";
            selectedNode = node;

            refreshScreen(sig, updateMetrics);
        }
        function deSelectNode(node) {
            if (node) {
                selectedNode.color = "#921";
                selectedNode = null;
                refreshScreen(sig, updateMetrics, updateSigGraph);
            }
        }

        function dragSupport(state) {
            if (state) {
                let dragListener = sigma.plugins.dragNodes(sig, sig.renderers[0]);
                dragListener.bind("startdrag", (e) => {
                    dragEndPos = null;
                    dragStartPos = {
                        x: e.data.node.x,
                        y: e.data.node.y,
                    };
                });
                dragListener.bind("dragend", (e) => {
                    dragEndPos = {
                        x: e.data.node.x,
                        y: e.data.node.y,
                    };
                    // pass the updated node so we can update its metrics calculation
                    if (dragEndPos) {
                        let N = GRAPH.nodes(e.data.node.id);
                        N.x = dragStartPos.x;
                        N.y = dragStartPos.y;

                        GRAPH.setNodePos(e.data.node.id, dragEndPos);
                    }
                    updateMetrics(sig);
                });
            } else {
                sigma.plugins.killDragNodes(sig);
            }
        }

        let clickCount = 0;
        function clickStageHandler() {
            // the camera starts at the center of the canvas
            // it is treated as the origin and the coordinates are added to it when the nodes are rendered (when autoRescale is false)
            // to get the desired position we subtract away the initial coordinate of the camera
            let x = event.offsetX - container.offsetWidth / 2;
            let y = event.offsetY - container.offsetHeight / 2;

            // get x,y after applying the same transformation that were applied to the camera
            let p = cam.cameraPosition(x, y);

            let id = GRAPH.nextId;
            let n = {
                label: id,
                id: id,
                x: p.x,
                y: p.y,
                size: nodeSize,
                color: "#921",
            };

            GRAPH.addNode(n);
            refreshScreen(sig, updateMetrics, updateSigGraph);
        }
        function nodeSelectHandler(e) {
            let node = e.data.node;
            if (!selectedNode) {
                selectNode(node);
            } else if (selectedNode.id !== node.id) {
                // create an edge if non existed between them
                if (!GRAPH.hasEdge(node.id, selectedNode.id)) {
                    GRAPH.addEdge(node.id, selectedNode.id);

                    deSelectNode(selectedNode);
                } else {
                    // jump to the other node
                    deSelectNode(selectedNode);
                    selectNode(node);
                }
            }
        }
        function nodeEraseHandler(e) {
            let clickedNode = e.data.node;
            GRAPH.removeNode(clickedNode.id);
            refreshScreen(sig, updateMetrics, updateSigGraph);
        }
        function edgeEraseHandler(e) {
            let clickedEdge = e.data.edge;
            console.log(clickedEdge);
            GRAPH.removeEdge(clickedEdge.source, clickedEdge.target);
            refreshScreen(sig, updateMetrics, updateSigGraph);
        }

        if (selectedEdge) GRAPH.removeEdge(selectedEdge.id);

        // expose public methods
        // map each mode item id to their activation method (toggle edit mode on and off)
        return {
            moveNode(state = true) {
                if (state) {
                    dragSupport(true);
                    moveNodeItem.classList.add("active");
                } else {
                    dragSupport(false);
                    moveNodeItem.classList.remove("active");
                }
            },
            addNode(state = true) {
                if (state) {
                    sig.settings("enableCamera", false);
                    sig.bind("clickStage", clickStageHandler);
                    addNodeItem.classList.add("active");
                } else {
                    sig.unbind("clickStage");
                    sig.settings("enableCamera", true);
                    addNodeItem.classList.remove("active");
                }
            },
            addEdge(state = true) {
                if (state) {
                    sig.bind("clickNode", nodeSelectHandler);
                    addEdgeItem.classList.add("active");
                } else {
                    sig.unbind("clickNode");
                    addEdgeItem.classList.remove("active");
                    if (selectedNode) deSelectNode(selectedNode);
                }
            },
            erase(state = true) {
                sig.killRenderer("0");
                if (state) {
                    sig.unbind("clickStage");
                    sig.unbind("clickEdge");
                    sig.unbind("clickNode");
                    sig.bind("clickNode", nodeEraseHandler);
                    sig.bind("clickEdge", edgeEraseHandler);
                    sig.settings("enableEdgeHovering", true);
                    eraseItem.classList.add("active");
                    sig.addRenderer(canvasRenderer);
                } else {
                    sig.settings("enableEdgeHovering", false);
                    sig.addRenderer(webglRenderer);
                    eraseItem.classList.remove("active");
                    sig.unbind("clickNode");
                }
                refreshScreen(sig, updateMetrics, updateSigGraph);
            },
        };
    })(); // immediately execute the function to return the object

    // tool bar
    const genGraph = PAGE.querySelector("#genGraph"),
        saveGraph = PAGE.querySelector("#saveGraph"),
        loadGraph = PAGE.querySelector("#loadGraph"),
        fileSelector = PAGE.querySelector("#fileSelector"),
        deleteGraph = PAGE.querySelector("#deleteGraph"),
        moveNodeItem = PAGE.querySelector("#moveNode"),
        addNodeItem = PAGE.querySelector("#addNode"),
        addEdgeItem = PAGE.querySelector("#addEdge"),
        eraseItem = PAGE.querySelector("#erase"),
        randomLayout = PAGE.querySelector("#randomLayout"),
        runLayout = PAGE.querySelector("#runLayout"),
        stepLayout = PAGE.querySelector("#stepLayout"),
        toolbar = PAGE.querySelector(".toolbar-container"),
        sideMenu = PAGE.querySelector("#side-menu");

    // used to insure we save the graph before running the layout algorithm
    let beforeLayoutRun = true;

    function setGraphCache() {
        if (beforeLayoutRun) {
            localStorage.setItem("graph", GRAPH.serialize());
            beforeLayoutRun = false;
        }
    }
    function clearGraphCache() {
        localStorage.clear();
        beforeLayoutRun = true;
    }

    toolbar.addEventListener("click", toolbarClickHandler);

    const genModal = PAGE.querySelector("#gen-modal"),
        warnModal = PAGE.querySelector("#warn-modal"),
        genMode = PAGE.querySelector("#gen-mode"),
        nodeNumMinEl = PAGE.querySelector("#node-num-min"),
        nodeNumMaxEl = PAGE.querySelector("#node-num-max"),
        nodeError = PAGE.querySelector("#node-error"),
        edgeNumMinEl = PAGE.querySelector("#edge-num-min"),
        edgeNumMaxEl = PAGE.querySelector("#edge-num-max"),
        edgeError = PAGE.querySelector("#edge-error");
    genModal.addEventListener("click", (event) => {
        const target = event.target;

        switch (target.id) {
            case "generate":
                let maxEdges = null;
                let nodeNumMin = parseInt(nodeNumMinEl.value),
                    edgeNumMin = parseInt(edgeNumMinEl.value),
                    nodeNumMax = parseInt(nodeNumMaxEl.value),
                    edgeNumMax = parseInt(edgeNumMaxEl.value);

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
                let G = generateGraph(
                    nodeNumMin,
                    nodeNumMax,
                    edgeNumMin,
                    edgeNumMax,
                    container.offsetWidth,
                    container.offsetHeight
                );
                cleanup();
                GRAPH.clear();
                clearGraphCache();
                // extract the nodes and edges from the created graph and update the current instance with it
                console.log(G);
                GRAPH.readGraph(G);
                refreshScreen(sig, updateMetrics, updateSigGraph);
                genModal.style.display = "none";
                break;
            case "dismiss":
                genModal.style.display = "none";
                break;
        }
    });
    warnModal.addEventListener("click", (event) => {
        const target = event.target;

        switch (target.id) {
            case "save":
                warnModal.style.display = "none";
                saveCurrentGraph();
                GRAPH.clear();
                refreshScreen(sig, updateMetrics, updateSigGraph);
                genModal.style.display = "flex";
                break;
            case "delete":
                cleanup();
                warnModal.style.display = "none";
                GRAPH.clear();
                refreshScreen(sig, updateMetrics, updateSigGraph);
                genModal.style.display = "flex";
                break;
        }
    });

    fileSelector.addEventListener("change", function handleFiles(event) {
        let files = event.target.files;
        let reader = new FileReader();

        // eslint-disable-next-line no-undef
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
    sideMenu.addEventListener("change", (event) => {
        // only required edge length will update metrics
        updateObjective();
        // only required edge length will update metrics
        if (event.target.id === "edge-length-required") updateMetrics();
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

    function saveCurrentGraph() {
        // eslint-disable-next-line no-undef
        saveFileDialog(GRAPH.export());
    }

    refreshScreen(sig, updateMetrics, updateSigGraph);

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
    function updateObjective() {
        GRAPH.setWeights(getWeights());
        PAGE.querySelector(
            "#objective-function"
        ).innerHTML = GRAPH.objective().toFixed(DIGITS);
    }

    function updateSigGraph() {
        sig.graph.clear();
        sig.graph.read(GRAPH.toSigGraph());
    }
    function updateMetrics() {
        // get the needed parameters for edge length
        let c = PAGE.querySelector(".sigma-scene");
        let maxEdgeLength = Math.sqrt(c.width * c.width + c.height * c.height);

        let requiredEdgeLength = parseFloat(
            PAGE.querySelector("#edge-length-required").value
        );

        // TODO: enable this after fixing the normalization bug
        //GRAPH.setMetricParam({
        //maxEdgeLength,
        //requiredEdgeLength
        //});

        let metrics = GRAPH.normalMetrics();

        // update ui
        PAGE.querySelector("#node-num").innerHTML = GRAPH.nodes().length;
        PAGE.querySelector("#edge-num").innerHTML = GRAPH.edges().length / 2;
        PAGE.querySelector("#density").innerHTML = GRAPH.density().toFixed(
            DIGITS
        );
        PAGE.querySelector(
            "#node-occlusion"
        ).innerHTML = metrics.nodeOcclusion.toFixed(DIGITS);
        PAGE.querySelector(
            "#edge-node-occlusion"
        ).innerHTML = metrics.nodeEdgeOcclusion.toFixed(DIGITS);

        PAGE.querySelector(
            "#edge-length"
        ).innerHTML = metrics.edgeLength.toFixed(DIGITS);
        PAGE.querySelector(
            "#edge-cross"
        ).innerHTML = metrics.edgeCrossing.toFixed(DIGITS);
        PAGE.querySelector(
            "#angular-resolution"
        ).innerHTML = metrics.angularResolution.toFixed(DIGITS);

        updateObjective();
    }

    function getLayoutAlg() {
        GRAPH.resetZn();
        console.log("reset graph zn");
        let list = PAGE.querySelector("#layoutAlgList");
        let requiredEdgeLength = parseFloat(
            PAGE.querySelector("#edge-length-required").value
        );
        let layoutAlgName = list.value;
        let layoutAlg;
        // TODO: add this when it's added to the UI
        let layoutParam = {};

        switch (layoutAlgName) {
            case "hillClimbing":
                layoutAlg = new HillClimbing(GRAPH, layoutParam);
                break;
            case "circular":
                layoutAlg = new CircularLayout(GRAPH, layoutParam);
                break;
            case "tabu":
                layoutAlg = new Tabu(GRAPH, layoutParam);
                break;
        }
        CURRENT_LAYOUT_ALG_NAME = layoutAlgName;

        return layoutAlg;
    }
    function updateLayoutInfo(data) {
        let layout = data.layoutAlgName;

        let layoutInfoSec = PAGE.querySelector("#menu-sec-layout-info");
        layoutInfoSec.querySelector("#layout").innerHTML = layout;
        layoutInfoSec.querySelector(
            "#execution-time"
        ).innerHTML = `${data.layoutAlg.executionTime.toFixed(3)} ms`;
        layoutInfoSec.querySelector("#evaluated-solutions").innerHTML = data
            .layoutAlg.evaluatedSolutions
            ? data.layoutAlg.evaluatedSolutions
            : "-";
    }

    function disableToolbar(init) {
        let elements = PAGE.querySelectorAll(
            ".toolbar-container .icon:not(#menu)"
        );
        let dropdown = PAGE.querySelector("#layoutAlgList");
        dropdown.disabled = true;
        for (let e of elements) {
            e.style = "color:gray;pointer-events:none";
        }

        // change play to pause icon
        let initEl = PAGE.querySelector(`#${init}`);
        let icon = init === "runLayout" ? "fa-play" : "fa-step-forward";
        initEl.classList.remove(icon);
        initEl.classList.add("fa-pause");
        initEl.style = "color:black";
        toolbar.removeEventListener("click", toolbarClickHandler);
        initEl.addEventListener("click", enableToolbar, {once: true});
    }

    function enableToolbar(init) {
        if (!(typeof init === "string")) {
            init = init.target.id;
        }

        let elements = PAGE.querySelectorAll(
            ".toolbar-container .icon:not(#menu)"
        );
        for (let e of elements) {
            e.style = "color:black";
        }

        let dropdown = PAGE.querySelector("#layoutAlgList");
        dropdown.disabled = false;
        let initEl = PAGE.querySelector(`#${init}`);
        initEl.classList.remove("fa-pause");
        let icon = init === "runLayout" ? "fa-play" : "fa-step-forward";
        initEl.classList.add(icon);
        setTimeout(() => {
            toolbar.addEventListener("click", toolbarClickHandler);
        }, 0);
    }

    function toolbarClickHandler(event) {
        let target = event.target;
        // handle mode change
        let modes = graphUiModes;
        let isActive = target.classList.contains("active");
        if (!isActive) {
            // deactivate any active mode
            let active = toolbar.querySelector(".active");
            if (active) {
                modes[active.id](false);
            }
            // select its a mode item
            if (target.id in modes) modes[target.id](true);
        } else {
            modes[target.id](false);
        }

        switch (target.id) {
            case "menu":
                sideMenu.classList.toggle("hidden");
                break;
            case "genGraph":
                if (!GRAPH.nodes().length) genModal.style.display = "flex";
                else {
                    warnModal.style.display = "flex";
                }
                break;
            case "saveGraph":
                saveCurrentGraph();

                break;
            case "loadGraph":
                // eslint-disable-next-line no-undef
                openFileDialog((filename, data) => {
                    try {
                        GRAPH.import(data);
                    } catch (err) {
                        //TODO: show message in ui
                        console.warn(
                            `Can't parse ${filename}\n`,
                            "file content:\n",
                            data,
                            "error: ",
                            err
                        );
                    }
                    refreshScreen(sig, updateMetrics, updateSigGraph);
                    cleanup();
                    clearGraphCache();
                });
                break;
            case "deleteGraph":
                cleanup();
                GRAPH.clear();
                refreshScreen(sig, updateMetrics, updateSigGraph);
                clearGraphCache();

                break;
            case "randomLayout":
                cleanup();
                setGraphCache();
                const x = container.offsetWidth;
                const y = container.offsetHeight;
                for (let n of GRAPH.nodes()) {
                    GRAPH.setNodePos(n.id, {
                        x: (0.5 - Math.random()) * x,
                        y: (0.5 - Math.random()) * y,
                    });
                }

                sig.graph.clear();
                refreshScreen(sig, updateMetrics, updateSigGraph);

                break;
            case "runLayout":
                setGraphCache();
                disableToolbar("runLayout");
                console.log("GRAPH", GRAPH);
                CURRENT_LAYOUT_ALG = getLayoutAlg();
                let runStart = performance.now();

                worker.postMessage({
                    layoutAlgName: CURRENT_LAYOUT_ALG_NAME,
                    layoutAlg: CURRENT_LAYOUT_ALG,
                    command: "run",
                });

                worker.onmessage = (e) => {
                    let runEnd = performance.now();
                    console.log("normal run time: ", runEnd - runStart);
                    console.log("onmessage: ", e);
                    GRAPH.deserialize(e.data.layoutAlg.graph);
                    refreshScreen(sig, updateMetrics, updateSigGraph);
                    enableToolbar("runLayout");
                    updateLayoutInfo(e.data);
                    cleanup();
                };
                break;

            case "runLayoutAnim":
                setGraphCache();
                disableToolbar("runLayout");
                console.log("GRAPH", GRAPH);
                CURRENT_LAYOUT_ALG = getLayoutAlg();

                let runStart2 = performance.now();
                worker.postMessage({
                    layoutAlgName: CURRENT_LAYOUT_ALG_NAME,
                    layoutAlg: CURRENT_LAYOUT_ALG,
                    command: "run",
                    emitOnMove: true,
                    //emitOnStep: true,
                });

                worker.onmessage = (e) => {
                    //console.log("onmessage: ", e);
                    GRAPH.deserialize(e.data.layoutAlg.graph);
                    refreshScreen(sig, updateMetrics, updateSigGraph);
                    if (e.data.type === "run") {
                        enableToolbar("runLayout");
                        let runEnd2 = performance.now();
                        console.log("animated run time: ", runEnd2 - runStart2);
                        cleanup();
                    }

                    updateLayoutInfo(e.data);
                };
                break;
            case "stepLayout":
                setGraphCache();
                disableToolbar("stepLayout");
                if (CURRENT_LAYOUT_ALG === null) {
                    CURRENT_LAYOUT_ALG = getLayoutAlg();
                }
                worker.postMessage({
                    layoutAlgName: CURRENT_LAYOUT_ALG_NAME,
                    layoutAlg: CURRENT_LAYOUT_ALG,
                    command: "step",
                });

                worker.onmessage = (e) => {
                    GRAPH.deserialize(e.data.layoutAlg.graph);

                    // no need to restore the layoutAlg methods here
                    CURRENT_LAYOUT_ALG = e.data.layoutAlg;
                    CURRENT_LAYOUT_ALG_NAME = e.data.layoutAlgName;

                    refreshScreen(sig, updateMetrics, updateSigGraph);
                    enableToolbar("stepLayout");
                };
                break;
            case "resetLayout":
                cleanup();
                // restore old layout from local storage
                let originalGraph = localStorage.getItem("graph");
                if (originalGraph) {
                    GRAPH.clear();
                    GRAPH.deserialize(originalGraph);
                    refreshScreen(sig, updateMetrics, updateSigGraph);
                    clearGraphCache();
                }
                break;
            case "batchRunPage":
                BatchRunPage();
                break;

            default:
                break;
        }
    }

    // make sure to clean global state when resetting or deleting a graph
    function cleanup() {
        // restart the worker
        worker.terminate();
        worker = new Worker("build/layoutWorker.js");
        CURRENT_LAYOUT_ALG = null;
        CURRENT_LAYOUT_ALG_NAME = null;
    }

    window.graph = GRAPH;
}
