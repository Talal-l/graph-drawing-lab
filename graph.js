// graphic variables and functions
const PI = Math.PI;

let svg = document.querySelector("svg");
svg.setAttribute("width", `${window.innerWidth * 0.8}`);
svg.setAttribute("height", `${window.innerHeight * 0.8}`);
console.log(svg);

// generate html id for nodes and edges
function nodeId({ x, y }) {
    return `x${x}y${y}`;
}
function edgeId([n1, n2]) {
    return `x${n1.x}y${n1.y}x${n2.x}y${n2.y}`;
}

function drawNode(n) {
    let { x, y } = n;
    let circle = `<circle id="${nodeId(n)}" cx="${x}" cy="${y}" r="${
        n.r
    }" fill="black" 
                        style="stroke: black;"/>`;
    svg.innerHTML += circle;

    console.log(circle);
}

function drawGraph(graph) {
    graph.nodes.forEach(n => drawNode(n));
    graph.edges.forEach(e => drawEdge(e));
}

function drawEdge(e) {
    let [n1, n2] = e;
    let line = `<line id=${edgeId(e)} x1="${n1.x}" x2="${n2.x}" y1="${
        n1.y
    }" y2="${n2.y}" stroke="black" stroke-width="1"/>`;

    svg.innerHTML += line;
}
function clearNode(n) {
    let { x, y } = n;
    document.querySelector();
}
function clearEdge(e) {
    [n1, n1] = e;
}

function selectNode(n) {
    selection = document.querySelector(`#${nodeId(n)}`);
    selection.setAttribute("fill", "pink");
}
function deSelectNode(n) {
    selection = document.querySelector(`#${nodeId(n)}`);
    selection.setAttribute("fill", "black");
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
    svg.addEventListener("mousedown", event => {
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
