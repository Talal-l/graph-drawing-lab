var N = 10,
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

let sigmaMouse = document.querySelector("#container");
let cam = sig.camera;
console.log(sig.renderers);
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

// drag events
var dragListener = sigma.plugins.dragNodes(sig, sig.renderers[0]);
dragListener.bind("startdrag", function(event) {
    console.log(event);
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
console.log(sig.graph);

sigmaMouse.addEventListener("contextmenu", event => event.preventDefault());

// Configure the noverlap layout:
let customLayout = new sigma.CustomLayout(sig, { extra: 12 });
console.log(customLayout);
function run() {
    customLayout.run();
}
function runStep() {
    customLayout.step();
}


// animation loop
function frame() {
    customLayout.step(true);
    requestAnimationFrame(frame);
}
frame();
