// Graph module extensions
// Get an object of all adjacent nodes to the given node
sigma.classes.graph.addMethod("allNeighbors", function(node) {
    return this.allNeighborsIndex[node.id];
});

// Create the main sigma instance
var sig = new sigma({
    renderer: {
        type: "webgl",
        container: "container"
    },
    settings: {
        doubleClickEnabled: false,
        autoRescale: false
    }
});

let cam = sig.camera;
let container = document.querySelector("#container");

// Generate a random graph:
let N = 10;
let r = Math.min(container.offsetWidth, container.offsetHeight);

// Create graph layout
let customLayout = new sigma.CustomLayout(sig);
console.log(customLayout);
function run() {
    customLayout.run();
    sig.refresh();
}
function runStep() {
    customLayout.step();
    sig.refresh();
}

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Graph events

// Track selected node
let selectedNode = null;
let dragStartPos = null;
let dragEndPos = null;
let dragThreshold = 5;
let drag = null;

// Add drag support
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
    // Register the movement as a drag operation
    if (distance(dragStartPos, dragEndPos) >= dragThreshold) drag = true;
});

function toggleNode(node) {
    if (selectedNode === node) {
        selectedNode.color = "#921";
        selectedNode = null;
    } else {
        node.color = "#c52";
        selectedNode = node;
    }
    sig.refresh();
}

sig.bind("clickNode", e => {
    let node = e.data.node;
    if (selectedNode && selectedNode.id !== node.id) {
        // Create an edge if non existed between them
        if (!sig.graph.allNeighbors(node)[selectedNode.id]) {
            sig.graph.addEdge({
                id: `e${selectedNode.id}${node.id}`,
                source: selectedNode.id,
                target: node.id,
                size: 3,
                color: "#ccc"
            });
        }
    }
    if (!drag) toggleNode(selectedNode || node);
});

// Reset selection
sig.bind("clickStage rightClickStage", e => {
    if (selectedNode) toggleNode(selectedNode);
});

let clickCount = 0;
// Disable right click in the graph area
container.addEventListener("contextmenu", event => event.preventDefault());
sig.bind("rightClickStage", e => {
    // The camera starts at the center of the canvas
    // It is treated as the origin and the coordinates are added to it when the nodes are rendered (when autoRescale is false)
    // To get the desired position we subtract away the initial coordinate of the camera
    let x = event.offsetX - container.offsetWidth / 2;
    let y = event.offsetY - container.offsetHeight / 2;

    // Get x,y after applying the same transformation that were applied to the camera
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
});

// Tool bar
const saveGraph = document.querySelector("#saveGraph"),
    fileSelector = document.querySelector("#fileSelector"),
    loadGraph = document.querySelector("#loadGraph"),
    clearGraph = document.querySelector("#clearGraph");

clearGraph.addEventListener("click", () => {
    sig.graph.clear();
    sig.refresh();
});
saveGraph.addEventListener("click", event => {
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
});
loadGraph.addEventListener("click", () => {
    fileSelector.click();
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

sig.refresh();
