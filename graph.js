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
    }" y2="${n2.y}" stroke="black" stroke-width="4"/>`;

    svg.innerHTML += line;
}
function clearNode(n) {
    document.querySelector(`#${nodeId(n)}`).remove();
}
function clearEdge(e) {
    document.querySelector(`#${edgeId(e)}`).remove();
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
    deleteNode(n) {
        // delete all connected edges

        // get all edges that need to be delete
        let toDelete = this.edges.filter(([n1, n2]) => {
            return n === n1 || n === n2;
        });
        // clear them from drawing
        toDelete.map(e => {
            this.deleteEdge(e);
        });

        // delete node
        clearNode(n);
        this.nodes = this.nodes.filter(node => {
            return node !== n;
        });
    }
    deleteEdge(e) {
        clearEdge(e);
        this.edges = this.edges.filter(edge => {
            return edge !== e;
        });
        console.log("after delete", this.edges);
    }

    findNode({ x, y }) {
        return this.nodes.find(n => {
            let xRange = x >= n.x - n.r && x < n.x + n.r;
            let yRange = y >= n.y - n.r && y < n.y + n.r;
            return xRange && yRange;
        });
    }

    findEdge(p1, p2) {
        console.log(p1, p2);
        return this.edges.find(([n1, n2]) => {
            console.log(n1, n2);
            console.log(p1, p2);
            let node1 = n1.x === p1.x && n1.y === p1.y;
            let node2 = n2.x === p2.x && n2.y === p2.y;
            return node1 && node2;
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
    let clickedEdge = null;
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
        } else if (event.target.tagName === "line") {
            console.log("event", event.target);
            p1 = {
                x: parseInt(event.target.getAttribute("x1")),
                y: parseInt(event.target.getAttribute("y1"))
            };
            p2 = {
                x: parseInt(event.target.getAttribute("x2")),
                y: parseInt(event.target.getAttribute("y2"))
            };
            clickedEdge = activeGraph.findEdge(p1, p2);
            activeGraph.deleteEdge(clickedEdge);
            console.log("clicked edge: ", clickedEdge);
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

    window.addEventListener("keypress", event => {
        if (event.key === "d" || event.key === "Delete") {
            if (lastSelection !== null) {
                activeGraph.deleteNode(lastSelection);
                console.log("after node delete", activeGraph);
                lastSelection = null;
            }
            console.log(event);
        }
    });

    // test
    {
        console.log("testing");

        console.log("graph:", activeGraph);

        n = [
            new Node(378, 381),
            new Node(281, 378),
            new Node(650, 287),
            new Node(421, 230),
            new Node(588, 455)
        ];
        e = [
            [n[0], n[1]],
            [n[1], n[2]],
            [n[2], n[3]],
            [n[0], n[3]],
            [n[4], n[0]]
        ];
        g = new Graph(n, e);

        // attach graph
        activeGraph = g;
        drawGraph(g);

        f = g.edges.filter(([n1, n2]) => {
            return n[0] !== n1 && n[0] !== n2;
        });

        console.log(activeGraph.edges, n[0]);
    }
}
