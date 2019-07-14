// graph module extensions
// get an object of all adjacent nodes to the given node
sigma.classes.graph.addMethod("allNeighbors", function(node) {
    return this.allNeighborsIndex[node.id];
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

// create the main sigma instance
var sig = new sigma({
    renderer: webglRenderer,
    settings: {
        doubleClickEnabled: false,
        autoRescale: false
    }
});

let cam = sig.cameras.cam1;

// generate a random graph:
let N = 10;
let r = Math.min(container.offsetWidth, container.offsetHeight);

// create graph layout
let customLayout = new sigma.CustomLayout(sig);
console.log(customLayout);
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// graph events

// track selected node
let selectedNode = null;
let selectedEdge = null;
let dragStartPos = null;
let dragEndPos = null;
let dragThreshold = 5;
let drag = null;

// add drag support
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
// dragSupport(true);

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

function selectEdge(edge) {
    if (edge) {
        edge.color = "#c8f";
        selectedEdge = edge;

        sig.refresh();
    }
}
function deSelectEdge(edge) {
    if (edge) {
        selectedEdge.color = "#ccc";
        selectedEdge = null;

        sig.refresh();
    }
}

sig.bind("clickNode", e => {
    // exit if it's a drag operation and not a click
    console.log(e);
    if (drag) return;

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
                size: 3,
                color: "#ccc"
            });

            deSelectNode(selectedNode);
        } else {
            // jump to the other node
            deSelectNode(selectedNode);
            selectNode(node);
        }
    }

    // remove any selected edge
    deSelectEdge(selectedEdge);
});

sig.bind("clickEdge", e => {
    let edge = e.data.edge;
    if (!selectedEdge) {
        selectEdge(edge);
    } else {
        deSelectEdge(selectedEdge);
    }

    // remove any selected node
    deSelectNode(selectedNode);
});

// reset selection
sig.bind("clickStage rightClickStage", e => {
    deSelectEdge(selectedEdge);
    deSelectNode(selectedNode);
});

let clickCount = 0;

// keyboard events
window.addEventListener("keypress", event => {
    if (event.key === "d" || event.key === "Delete") {
        if (selectedNode) {
            sig.graph.dropNode(selectedNode.id);
            selectedNode = null;
        }
        if (selectedEdge) sig.graph.dropEdge(selectedEdge.id);
        sig.refresh();
    }
});

// tool bar
const genGraph = document.querySelector("#genGraph"),
    saveGraph = document.querySelector("#saveGraph"),
    loadGraph = document.querySelector("#loadGraph"),
    fileSelector = document.querySelector("#fileSelector"),
    deleteGraph = document.querySelector("#deleteGraph"),
    addNodeItem = document.querySelector("#addNode"),
    addEdgeItem = document.querySelector("#addEdge"),
    runLayout = document.querySelector("#runLayout"),
    stepLayout = document.querySelector("#stepLayout"),
    eraseItem = document.querySelector("#erase"),
    toolbar = document.querySelector(".toolbar-container");

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

// add stage click listener
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
        size: 10,
        color: "#921"
    };

    sig.graph.addNode(n);
    sig.refresh();
}

// map each mode item id to their activation method (toggle edit mode on and off)
let modes = {
    addNode(state = true) {
        if (state) {
            sig.settings("enableCamera", false);
            sig.bind("clickStage", clickStageHandler);
            addNodeItem.classList.add("active");
        } else {
            sig.unbind("clickStage", clickStageHandler);
            sig.settings("enableCamera", true);
            addNodeItem.classList.remove("active");
        }
    },
    addEdge(state = true) {
        if (state) {
            addEdgeItem.classList.add("active");
        } else {
            addEdgeItem.classList.remove("active");
        }
    },
    erase(state = true) {
        sig.killRenderer("0");
        console.log(sig);
        if (state) {
            sig.settings("enableEdgeHovering", true);
            eraseItem.classList.add("active");
            sig.addRenderer(canvasRenderer);
            console.log("switching to canvas");
            console.log(sig.renderers);
        } else {
            sig.settings("enableEdgeHovering", false);
            sig.addRenderer(webglRenderer);
            console.log("switching to webgl");
            eraseItem.classList.remove("active");
        }
        console.log(sig.renderers[0]);
        // need to re-enable the drag plugin when switching renderer
        dragSupport(false);
        dragSupport(true);

        sig.refresh();
    }
};

toolbar.addEventListener("click", event => {
    let target = event.target;

    // handle mode change
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
            break;
        case "saveGraph":
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
sig.refresh();
