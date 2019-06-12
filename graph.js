class Graph {
    constructor(nodes = [], edges = []) {
        this.nodes = nodes;
        this.edges = edges;
    }
}

// create the canvas
let CANVAS = document.createElement("canvas");
CANVAS.width = window.innerWidth * 0.8;
CANVAS.height = window.innerHeight * 0.8;
document.body.appendChild(CANVAS);

let CTX = CANVAS.getContext("2d");
let GRAPH = new Graph();
let SELECTION_BUFFER = [];

const PI = Math.PI;

// util function
function distance(p1, p2) {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    return Math.hypot(dy, dx);
}

function selectedNode() {
    targetNode = null;

    GRAPH.nodes.forEach(node => {
        if (distance(node, event) <= node.radius) {
            targetNode = node;
        }
    });
    return targetNode;
}

function drawEdge(edge) {
    let [n1, n2] = edge;
    CTX.beginPath();
    CTX.moveTo(n1.x, n1.y);
    CTX.lineTo(n2.x, n2.y);
    CTX.closePath();
    CTX.stroke();
    console.log("edge created");
}

class Node {
    // canvas node
    constructor(x, y, radius = 20) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.adjNodes = [];
    }
    draw() {
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, 2 * PI, false);
        // todo: Make this customizable
        CTX.fill();
        CTX.closePath();
    }

    update() {
        this.draw();
    }
}

CANVAS.addEventListener("mousedown", event => {
    // create new node where mouse was clicked
    clickedNode = selectedNode();
    if (!clickedNode) {
        const newnode = new Node(event.x, event.y);
        GRAPH.nodes.push(newnode);
        newnode.draw();
    } else {
        SELECTION_BUFFER.push(clickedNode);

        console.log(SELECTION_BUFFER);
        if (SELECTION_BUFFER.length === 2) {
            n1 = SELECTION_BUFFER[0];
            n2 = SELECTION_BUFFER[1];
            edge = [n1, n2];
            GRAPH.edges.push(edge);

            // draw the edge
            drawEdge(edge);

            SELECTION_BUFFER = [];
        }
    }
});
