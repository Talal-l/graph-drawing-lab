

var N = 6,
    E = N * (N - 1),
    graph = {
        nodes: [],
        edges: []
    };

var sig = new sigma({
    renderer: {
        type: "webgl",
        container: "container"
    },
    settings: {
        autoRescale: false
    }
});

let sigmaMouse = document.querySelector(".sigma-mouse");
let cam = sig.camera;
// Generate a random graph:
for (let i = 0; i < N; i++) {
    let x = (Math.random() - 0.5) * sigmaMouse.offsetWidth;
    let y = (Math.random() - 0.5) * sigmaMouse.offsetHeight;
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

// animation loop
function frame() {
    // redraw the graph
    sig.refresh();
    requestAnimationFrame(frame);
}
frame();

// drag events
var dragListener = sigma.plugins.dragNodes(sig, sig.renderers[0]);
dragListener.bind("startdrag", function(event) {
    // console.log(event);
});
dragListener.bind("drag", function(event) {
    // console.log(event);
});
dragListener.bind("drop", function(event) {
    // console.log(event);
});
dragListener.bind("dragend", function(event) {
    // console.log(event);
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
});

sigmaMouse.addEventListener("contextmenu", event => event.preventDefault());
