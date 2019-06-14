// graphic variables and functions
const PI = Math.PI;

let canvas = document.createElement("canvas");
let ctx = canvas.getContext("2d");
// create the canvas
canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;
document.body.appendChild(canvas);

function drawNode(node) {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.r, 0, 2 * PI, false);
    // TODO: make this customizable
    ctx.fill();
    ctx.closePath();
}

function drawGraph(graph) {
    ctx.clearRect(0, 0, canvas.innerWidth, canvas.innerHeight);
    graph.nodes.forEach(n => drawNode(n));
    graph.edges.forEach(e => drawEdge(e));
}

function drawEdge([n1, n2]) {
    {
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.stroke();
        ctx.closePath();
    }
}

function selectNode(n) {
    ctx.fillStyle = "#5ccdc9";
    drawNode(n);
    ctx.fillStyle = "#000000";
}
function deSelectNode(n) {
    ctx.fillStyle = "#000000";
    drawNode(n);
}
class Node {
    constructor(x, y, radius = 20) {
        this.x = x;
        this.y = y;
        this.r = radius;
    }
}
class Graph {
    // depends on the draw methods
    constructor(nodes = [], edges = []) {
        this.nodes = nodes;
        this.edges = edges;
    }
    addNode(node) {
        if (!this.findNode(node)) {
            this.nodes.push(node);

            drawNode(node);
        }
    }

    addEdge(n1, n2) {
        if (n1 !== n2) {
            let e = [n1, n2];
            this.edges.push(e);

            drawEdge(e);
        }
    }
    deleteNode() {}
    deleteEdge() {}

    findNode({ x, y }) {
        return this.nodes.find(n => {
            let xRange = x >= n.x - n.r && x < n.x + n.r;
            let yRange = y >= n.y - n.r && y < n.y + n.r;
            return xRange && yRange;
        });
    }
}

// util

function distance(p1, p2) {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    return Math.hypot(dy, dx);
}

// main
{
    let activeGraph = new Graph();
    let lastSelection = null;

    // events
    canvas.addEventListener("mousedown", event => {
        console.log(event.x, event.y);
        let clickedNode = activeGraph.findNode(event);

        if (clickedNode) {
            if (lastSelection === null) {
                selectNode(clickedNode);
                lastSelection = clickedNode;
            } else if (clickedNode === lastSelection) {
                deSelectNode(clickedNode);
                lastSelection = null;
            } else {
                activeGraph.addEdge(lastSelection, clickedNode);
                deSelectNode(lastSelection);
                lastSelection = null;
            }
        } else {
            // remove previous selection before creating new node
            if (lastSelection === null) {
                activeGraph.addNode(new Node(event.x, event.y));
            } else {
                deSelectNode(lastSelection);
            }

            lastSelection = null;
        }
        console.log("activeGraph", activeGraph);
        console.log("lastSelection", lastSelection);
    });

    // test
    {
        console.log("testing");

        console.log("graph:", activeGraph);

        n = [
            new Node(378, 381),
            new Node(650, 287),
            new Node(421, 230),
            new Node(588, 455)
        ];
        e = [[n[0], n[1]], [n[1], n[2]], [n[2], n[3]], [n[0], n[3]]];
        g = new Graph(n, e);

        // attach graph
        activeGraph = g;
        drawGraph(g);
    }
}
