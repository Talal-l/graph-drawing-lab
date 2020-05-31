// sigam.js imports
/*global sigma*/
import { ConcreteGraph, generateGraph } from "./graph.js";
import { refreshScreen, distance, getEdgeId } from "./util.js";

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
let worker = new Worker("build/layoutWorker.js");
let webglRenderer = {
    type: "webgl",
    camera: "cam1",
    container: "container"
};

const edgeSize = 1.5;
const nodeSize = 10;

let sigDefaults = {
    renderer: webglRenderer,
    settings: {
        doubleClickEnabled: false,
        autoRescale: false,
        enableCamera: true
    }
};
// create the main sigma instance
let sig = new sigma(sigDefaults);
let cam = sig.cameras.cam1;
// create the main graph instance
let GRAPH = new ConcreteGraph(null, { sigGraph: sig.graph });

let selectedLayoutAlg;
let layoutAlgOptions;
updateLayoutAlg();

// create an object to use to track select and drag operations
// using constructor function so we can selectively expose methods
let graphUiModes = (function() {
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
            refreshScreen(sig, updateMetrics);
        }
    }

    function dragSupport(state) {
        if (state) {
            let dragListener = sigma.plugins.dragNodes(sig, sig.renderers[0]);
            dragListener.bind("startdrag", e => {
                dragEndPos = null;
                dragStartPos = {
                    x: e.data.node.x,
                    y: e.data.node.y
                };
            });
            dragListener.bind("dragend", e => {
                dragEndPos = {
                    x: e.data.node.x,
                    y: e.data.node.y
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
            color: "#921"
        };

        GRAPH.addNode(n);
        refreshScreen(sig, updateMetrics);
    }
    function nodeSelectHandler(e) {
        let node = e.data.node;
        if (!selectedNode) {
            selectNode(node);
        } else if (selectedNode.id !== node.id) {
            // create an edge if non existed between them
            if (!GRAPH.neighbors(node.id)[selectedNode.id]) {
                GRAPH.addEdge({
                    id: getEdgeId(selectedNode.id, node.id),
                    source: selectedNode.id,
                    target: node.id,
                    size: edgeSize,
                    color: "#ccc"
                });

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
        refreshScreen(sig, updateMetrics);
    }
    function edgeEraseHandler(e) {
        let clickedEdge = e.data.edge;
        GRAPH.removeEdge(clickedEdge.id);
        refreshScreen(sig, updateMetrics);
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
            refreshScreen(sig, updateMetrics);
        }
    };
})(); // immediately execute the function to return the object

// tool bar
const genGraph = document.querySelector("#genGraph"),
    saveGraph = document.querySelector("#saveGraph"),
    loadGraph = document.querySelector("#loadGraph"),
    fileSelector = document.querySelector("#fileSelector"),
    deleteGraph = document.querySelector("#deleteGraph"),
    moveNodeItem = document.querySelector("#moveNode"),
    addNodeItem = document.querySelector("#addNode"),
    addEdgeItem = document.querySelector("#addEdge"),
    eraseItem = document.querySelector("#erase"),
    randomLayout = document.querySelector("#randomLayout"),
    runLayout = document.querySelector("#runLayout"),
    stepLayout = document.querySelector("#stepLayout"),
    toolbar = document.querySelector(".toolbar-container"),
    sideMenu = document.querySelector("#side-menu");

// used to insure we save the graph before running the layout algorithm
let beforeLayoutRun = true;

function setGraphCache() {
    if (beforeLayoutRun) {
        localStorage.setItem("graph", JSON.stringify(GRAPH.graph.toJSON()));
        beforeLayoutRun = false;
    }
}
function clearGraphCache() {
    localStorage.clear();
    beforeLayoutRun = true;
}

toolbar.addEventListener("click", toolbarClickHandler);

const genModal = document.querySelector("#gen-modal"),
    warnModal = document.querySelector("#warn-modal"),
    genMode = document.querySelector("#gen-mode"),
    nodeNumMinEl = document.querySelector("#node-num-min"),
    nodeNumMaxEl = document.querySelector("#node-num-max"),
    nodeError = document.querySelector("#node-error"),
    edgeNumMinEl = document.querySelector("#edge-num-min"),
    edgeNumMaxEl = document.querySelector("#edge-num-max"),
    edgeError = document.querySelector("#edge-error");
genModal.addEventListener("click", event => {
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
            let G = generateGraph(
                nodeNumMin,
                nodeNumMax,
                edgeNumMin,
                edgeNumMax,
                container.offsetWidth,
                container.offsetHeight
            );

            GRAPH.clear();
            clearGraphCache();
            // extract the nodes and edges from the created graph and update the current instance with it
            GRAPH.read(G);
            refreshScreen(sig, updateMetrics);
            genModal.style.display = "none";
            break;
        case "dismiss":
            genModal.style.display = "none";
            break;
    }
});
warnModal.addEventListener("click", event => {
    const target = event.target;

    switch (target.id) {
        case "save":
            warnModal.style.display = "none";
            saveCurrentGraph();
            GRAPH.clear();
            refreshScreen(sig, updateMetrics);
            genModal.style.display = "flex";
            break;
        case "delete":
            warnModal.style.display = "none";
            GRAPH.clear();
            refreshScreen(sig, updateMetrics);
            genModal.style.display = "flex";
            break;
    }
});

fileSelector.addEventListener("change", function handleFiles(event) {
    let files = event.target.files;
    let reader = new FileReader();

    // eslint-disable-next-line no-undef
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
sideMenu.addEventListener("change", event => {
    // only required edge length will update metrics
    updateObjective();
    // only required edge length will update metrics
    if (event.target.id === "edge-length-required") updateMetrics();
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

function saveCurrentGraph() {
    let obj = { graph: GRAPH.graph.toJSON() }; // eslint-disable-next-line no-undef
    saveFileDialog(JSON.stringify(obj));
}

refreshScreen(sig, updateMetrics);

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
function updateObjective() {
    GRAPH.setWeights(getWeights());
    document.querySelector(
        "#objective-function"
    ).innerHTML = GRAPH.objective().toFixed(3);
}

function updateMetrics() {
    // get the needed parameters for edge length
    let c = document.querySelector(".sigma-scene");
    let maxEdgeLength = Math.sqrt(c.width * c.width + c.height * c.height);

    let requiredEdgeLength = parseFloat(
        document.querySelector("#edge-length-required").value
    );

    GRAPH.setMetricParam({
        maxEdgeLength,
        requiredEdgeLength
    });

    let metrics = GRAPH.metrics();

    // update ui
    document.querySelector("#node-num").innerHTML = GRAPH.nodes().length;
    document.querySelector("#edge-num").innerHTML = GRAPH.edges().length;
    document.querySelector("#density").innerHTML = GRAPH.density().toFixed(3);
    document.querySelector(
        "#node-occlusion"
    ).innerHTML = metrics.nodeOcclusion.toFixed(3);
    document.querySelector(
        "#edge-node-occlusion"
    ).innerHTML = metrics.edgeNodeOcclusion.toFixed(3);

    document.querySelector(
        "#edge-length"
    ).innerHTML = metrics.edgeLength.toFixed(3);
    document.querySelector(
        "#edge-cross"
    ).innerHTML = metrics.edgeCrossing.toFixed(3);
    document.querySelector(
        "#angular-resolution"
    ).innerHTML = metrics.angularResolution.toFixed(3);

    updateObjective();
}

function updateLayoutAlg() {
    let list = document.querySelector("#layoutAlgList");

    let requiredEdgeLength = parseFloat(
        document.querySelector("#edge-length-required").value
    );
    layoutAlgOptions = {
        metricsParam: { requiredEdgeLength },
        weights: getWeights()
    };

    switch (list.value) {
        case "hillClimbing":
            selectedLayoutAlg = "hillClimbing";
            layoutAlgOptions.squareSize = 100;
            break;

        case "circular":
            selectedLayoutAlg = "circular";
            layoutAlgOptions.radius = 500;
            break;
    }
}

function disableToolbar(init) {
    let elements = document.querySelectorAll(
        ".toolbar-container .icon:not(#menu)"
    );
    let dropdown = document.querySelector("#layoutAlgList");
    dropdown.disabled = true;
    for (let e of elements) {
        e.style = "color:gray;pointer-events:none";
    }

    // change play to pause icon
    let initEl = document.querySelector(`#${init}`);
    let icon = init === "runLayout" ? "fa-play" : "fa-step-forward";
    initEl.classList.remove(icon);
    initEl.classList.add("fa-pause");
    initEl.style = "color:black";
    toolbar.removeEventListener("click", toolbarClickHandler);
    initEl.addEventListener("click", enableToolbar, { once: true });
}

function enableToolbar(init) {
    if (!(typeof init === "string")) {
        init = init.target.id;
    }

    let elements = document.querySelectorAll(
        ".toolbar-container .icon:not(#menu)"
    );
    for (let e of elements) {
        e.style = "color:black";
    }

    let dropdown = document.querySelector("#layoutAlgList");
    dropdown.disabled = false;
    let initEl = document.querySelector(`#${init}`);
    initEl.classList.remove("fa-pause");
    let icon = init === "runLayout" ? "fa-play" : "fa-step-forward";
    initEl.classList.add(icon);
    setTimeout(() => {
        toolbar.addEventListener("click", toolbarClickHandler);
    }, 0);

    worker.terminate();
    worker = new Worker("build/layoutWorker.js");
}

function toolbarClickHandler(event) {
    let target = event.target;
    // handle mode change
    let modes = graphUiModes;
    let isActive = target.classList.contains("active");
    if (!isActive) {
        // deactivate any active mode
        let active = document.querySelector(".active");
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
                GRAPH.clear();
                GRAPH.read(JSON.parse(data).graph);
                refreshScreen(sig, updateMetrics);
                clearGraphCache();
            });
            break;
        case "deleteGraph":
            GRAPH.clear();
            refreshScreen(sig, updateMetrics);
            clearGraphCache();
            break;
        case "randomLayout":
            setGraphCache();
            const x = container.offsetWidth;
            const y = container.offsetHeight;
            for (let nId of GRAPH.nodes()) {
                GRAPH.setNodePos(nId, {
                    x: (0.5 - Math.random()) * x,
                    y: (0.5 - Math.random()) * y
                });
            }

            refreshScreen(sig, updateMetrics);

            break;
        case "runLayout":
            updateLayoutAlg();
            setGraphCache();
            disableToolbar("runLayout");
            worker.postMessage([
                GRAPH.graph.toJSON(),
                selectedLayoutAlg,
                layoutAlgOptions,
                "run"
            ]);
            worker.onmessage = e => {
                GRAPH.read(e.data[0]);
                refreshScreen(sig, updateMetrics);
                enableToolbar("runLayout");
            };
            break;
        case "stepLayout":
            updateLayoutAlg();
            setGraphCache();
            disableToolbar("stepLayout");
            worker.postMessage([
                GRAPH.graph.toJSON(),
                selectedLayoutAlg,
                layoutAlgOptions,
                "step"
            ]);
            worker.onmessage = e => {
                GRAPH.read(e.data[0]);
                refreshScreen(sig, updateMetrics);
                enableToolbar("stepLayout");
            };
            break;
        case "resetLayout":
            // restore old layout from local storage
            let originalGraph = localStorage.getItem("graph");
            originalGraph = JSON.parse(originalGraph);
            if (originalGraph) {
                GRAPH.clear();
                GRAPH.read(originalGraph);
                refreshScreen(sig, updateMetrics);
                clearGraphCache();
            }
            break;
        case "batchRunPage":
            window.location.replace("batchRun.html");

            break;

        default:
            break;
    }
}

window.graph = GRAPH;