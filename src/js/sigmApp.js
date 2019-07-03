var N = 10,
    E = N * (N - 1),
    graph = {
        nodes: [],
        edges: []
    };

// graph module extensions

// get an object of all adjacent nodes to the given node
sigma.classes.graph.addMethod("allNeighbors", function(node) {
    return this.allNeighborsIndex[node.id];
});

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

let sigmaMouse = document.querySelector("#container");
let cam = sig.camera;
// Generate a random graph:
let r = Math.min(sigmaMouse.offsetWidth, sigmaMouse.offsetHeight);
for (let i = 0; i < N; i++) {
    let x = 0;
    let y = 0;

    let p1 = cam.cameraPosition(x, y);
    sig.graph.addNode({
        id: "n" + i,
        label: "Node " + i,
        x: p1.x,
        y: p1.y,
        size: 10,
        color: "#921"
    });
}
let c = 0;
for (let i of sig.graph.nodes()) {
    for (let j of sig.graph.nodes()) {
        sig.graph.addEdge({
            id: c++,
            source: i.id,
            target: j.id,
            size: 3,
            color: "#ccc"
        });
    }
}

// events

// track selected node
let selectedNode = null;

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
// drag events
var dragListener = sigma.plugins.dragNodes(sig, sig.renderers[0]);
dragListener.bind("startdrag", function(event) {});
dragListener.bind("drag", function(event) {
    console.log(event);
});
dragListener.bind("drop", function(event) {
    // console.log(event);
});
dragListener.bind("dragend", function(event) {
    // console.log(event);
});

sig.bind("clickNode", e => {
    let node = e.data.node;
    if (selectedNode && selectedNode.id !== node.id) {
        // create an edge if non existed between them
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
    // toggle node if no selection exist
    toggleNode(selectedNode || node);
});

// reset selection
sig.bind("clickStage rightClickStage", e => {
    if (selectedNode) toggleNode(selectedNode);
});

let nodeId = 0;
sig.bind("rightClickStage", e => {
    // the camera starts at the center of the canvas
    // it is treated as the origin and the coordinates are added to it when the nodes are rendered (when autoRescale is false)
    // to get the desired position we subtract away the initial coordinate of the camera
    let x = event.offsetX - sigmaMouse.offsetWidth / 2;
    let y = event.offsetY - sigmaMouse.offsetHeight / 2;

    // get x,y after applying the same transformation that were applied to the camera
    let p = cam.cameraPosition(x, y);

    let n = {
        label: "click" + nodeId++,
        id: "click" + nodeId++,
        x: p.x,
        y: p.y,
        size: 10,
        color: "#021"
    };

    sig.graph.addNode(n);
    sig.refresh();
});

sigmaMouse.addEventListener("contextmenu", event => event.preventDefault());

// Configure the noverlap layout:
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

// tool bar
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
