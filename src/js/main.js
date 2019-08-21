// graph module extensions
// get an object of all adjacent nodes to the given node
sigma.classes.graph.addMethod("allNeighbors", function(node) {
    return this.allNeighborsIndex[node.id];
});
sigma.classes.graph.addMethod("edgeExist", function(n1Id, n2Id) {
    return (
        this.edgesIndex["e" + n1Id + n2Id] || this.edgesIndex["e" + n2Id + n1Id]
    );
});

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

let sigDefaults = {
    renderer: webglRenderer,
    settings: {
        doubleClickEnabled: false,
        autoRescale: false
    }
};
// create the main sigma instance
let sig = new sigma(sigDefaults);

let cam = sig.cameras.cam1;

let r = Math.min(container.offsetWidth, container.offsetHeight);

// create graph layout
let customLayout = new sigma.CustomLayout(sig);
console.log(customLayout);

// util

/**
 * 
 * @param {object} p1 First point object with x and y as properties
 * @param {object} p2 Second point object with x and y as properties
 * @return {number} distance between the two points
 */
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
/**
 * Generate a random integer between min and max inclusive
 * @param {number} min
 * @param {number} max 
 * @return {number}
 */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * 
 * @param {array} array
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// UI events

// create an object to use to track select and drag operations
// using constructor function so we can selectively expose methods
let graphUiModes = (function() {
    let selectedNode = null;
    let selectedEdge = null;
    let dragStartPos = null;
    let dragEndPos = null;
    let dragThreshold = 5;
    let drag = null;

    function selectNode(node) {
        node.color = "#c52";
        selectedNode = node;

        sig.refresh();
    }
    function deSelectNode(node) {
        if (node) {
            selectedNode.color = "#921";
            selectedNode = null;
            sig.refresh();
        }
    }

    function dragSupport(state) {
        if (state) {
            let dragListener = sigma.plugins.dragNodes(sig, sig.renderers[0]);

            dragListener.bind("startdrag", e => {
                drag = false;
                dragStartPos = {
                    x: e.data.node.x,
                    y: e.data.node.y
                };
            });

            dragListener.bind("drag", e => {
                dragEndPos = {
                    x: e.data.node.x,
                    y: e.data.node.y
                };
                // register the movement as a drag operation
                if (distance(dragStartPos, dragEndPos) >= dragThreshold)
                    drag = true;
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

        let n = {
            label: "click" + clickCount++,
            id: "click" + clickCount++,
            x: p.x,
            y: p.y,
            size: nodeSize,
            color: "#921"
        };

        sig.graph.addNode(n);
        sig.refresh();
    }
    function nodeSelectHandler(e) {
        let node = e.data.node;
        if (!selectedNode) {
            selectNode(node);
        } else if (selectedNode.id !== node.id) {
            // create an edge if non existed between them
            if (!sig.graph.allNeighbors(node)[selectedNode.id]) {
                sig.graph.addEdge({
                    id: `e${selectedNode.id}${node.id}`,
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
        sig.graph.dropNode(clickedNode.id);
        sig.refresh();
    }
    function edgeEraseHandler(e) {
        let clickedEdge = e.data.edge;
        sig.graph.dropEdge(clickedEdge.id);
        sig.refresh();
    }
    if (selectedEdge) sig.graph.dropEdge(selectedEdge.id);

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
            console.log(sig);
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
            sig.refresh();
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
    runLayout = document.querySelector("#runLayout"),
    stepLayout = document.querySelector("#stepLayout"),
    toolbar = document.querySelector(".toolbar-container");

toolbar.addEventListener("click", event => {
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
        // select it if was a mode item
        if (target.id in modes) modes[target.id](true);
    } else {
        modes[target.id](false);
    }

    switch (target.id) {
        case "menu":
            break;
        case "genGraph":
            console.log(sig.graph.nodes());
            if (!sig.graph.nodes().length) genModal.style.display = "flex";
            else {
                warnModal.style.display = "flex";
            }
            break;
        case "saveGraph":
            saveCurrentGraph();

            break;
        case "loadGraph":
            fileSelector.click();
            break;
        case "deleteGraph":
            sig.graph.clear();
            sig.refresh();
            break;
        case "runLayout":
            customLayout.run();
            sig.refresh();

            break;
        case "stepLayout":
            customLayout.step();
            sig.refresh();
            break;
        case "resetLayout":
            break;

        default:
            break;
    }
});

// warning modal
const genModal = document.querySelector("#gen-modal"),
    warnModal = document.querySelector("#warn-modal"),
    genMode = document.querySelector("#gen-mode"),
    nodeNumMinEl = document.querySelector("#node-num-min"),
    nodeNumMaxEl = document.querySelector("#node-num-max"),
    edgeNumMinEl = document.querySelector("#edge-num-min"),
    edgeNumMaxEl = document.querySelector("#edge-num-max");

genModal.addEventListener("click", event => {
    const target = event.target;

    switch (target.id) {
        case "generate":
            const nodeNumMin = parseInt(nodeNumMinEl.value);
            const edgeNumMin = parseInt(edgeNumMinEl.value);
            const nodeNumMax = parseInt(nodeNumMaxEl.value) || nodeNumMin;
            const edgeNumMax = parseInt(edgeNumMaxEl.value) || edgeNumMin;
            let G = generateGraph(
                nodeNumMin,
                nodeNumMax,
                edgeNumMin,
                edgeNumMax
            );
            sig.graph.clear();
            // extract the nodes and edges from the created graph and update the current instance with it
            sig.graph.read({ nodes: G.nodes(), edges: G.edges() });
            sig.refresh();
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
            sig.graph.clear();
            sig.refresh();
            genModal.style.display = "flex";
            break;
        case "delete":
            warnModal.style.display = "none";
            sig.graph.clear();
            sig.refresh();
            genModal.style.display = "flex";
            break;
    }
});

fileSelector.addEventListener("change", function handleFiles(event) {
    console.log("file");
    let files = event.target.files;
    let reader = new FileReader();

    reader.onload = e => {
        let content = e.target.result;
        console.log(content);
        sig.graph.clear();
        sig.graph.read(JSON.parse(content));
        fileSelector.value = "";
        sig.refresh();
    };

    reader.readAsText(files[0]);
});
genMode.addEventListener("change", event => {
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

/**
 * Creates a random minimum spanning tree for the given sigma graph.
 *
 * @param {object} G  A sigma graph object
 * @return {undefined}
 *
 */
function minSpanningTree(G) {
    // deep copy of the existing nodes
    let outTree = Array.from(G.nodes());
    // select the root
    let inTree = [outTree.pop()];

    while (outTree.length) {
        // pick a node from outside the tree
        let source = outTree.pop();
        // pick a random node from the tree
        let target = inTree[random(0, inTree.length - 1)];
        // create an edge
        let edge = {
            id: "e" + source.id + target.id,
            size: edgeSize,
            source: source.id,
            target: target.id,
            color: "#ccc"
        };
        G.addEdge(edge);
        // add node to tree
        inTree.push(source);
    }
}
/**
 *
 * @param {number} nMin  Minimum number of nodes
 * @param {number} nMax  Maximum number of nodes
 * @param {number} eMin  Minimum number of edges
 * @param {number} eMax  Maximum number of edges
 * @return {object} A Sigma graph object
 */
function generateGraph(nMin, nMax, eMin, eMax) {
    const x = container.offsetWidth / 2;
    const y = container.offsetHeight / 2;

    let G = new sigma.classes.graph();
    console.log(G);
    const N = random(nMin, nMax);
    const eLimit = (N * (N - 1)) / 2;
    let E = random(Math.min(eMin, eLimit), Math.min(eMax, eLimit));

    for (let i = 0; i < N; i++) {
        let n = {
            label: "r" + i,
            id: "r" + i,
            x: (0.5 - Math.random()) * x + nodeSize,
            y: (0.5 - Math.random()) * y + nodeSize,
            size: nodeSize,
            color: "#921"
        };
        G.addNode(n);
    }
    let nodes = G.nodes();

    // create a random minimum spanning tree (MST) to guarantee that the graph is connected
    minSpanningTree(G);
    // subtract edges created by the MST
    E = E - (N - 1);

    // loop until the desired number fo edges is reached
    while (E > 0) {
        for (let i = nodes.length - 1; i >= 0; i--) {
            // determine how many edges to allow for this node in this iteration
            let nEdgeCount = random(1, Math.min(E, N - 1));
            for (
                let j = i + 1, eCount = 0;
                j < nodes.length && eCount < nEdgeCount;
                j++
            ) {
                if (j !== i) {
                    let edge = {
                        id: "e" + nodes[j].label + nodes[i].label,
                        size: edgeSize,
                        source: nodes[i].label,
                        target: nodes[j].label,
                        color: "#ccc"
                    };
                    if (!G.edgeExist(nodes[j].label, nodes[i].label)) {
                        G.addEdge(edge);
                        eCount++;
                        // update total edge count
                        E--;
                        // return as soon as the edge limit is reached
                        if (E === 0) {
                            console.log(
                                "Final number of edges: " + G.edges().length
                            );
                            return;
                        }
                    }
                }
            }
        }
    }

    return G;
}

function saveCurrentGraph() {
    let saveGraphLink = document.querySelector("#saveGraphLink");
    let d = new Date();
    let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
    let json = JSON.stringify({
        nodes: sig.graph.nodes(),
        edges: sig.graph.edges()
    });
    let blob = new Blob([json], { type: "text/plain" });
    let url = window.URL.createObjectURL(blob);
    saveGraphLink.setAttribute("download", date);
    saveGraphLink.setAttribute("href", url);
    saveGraphLink.click();
}
sig.refresh();
