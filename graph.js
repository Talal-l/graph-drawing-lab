// graphic variables and functions
const PI = Math.PI;

let svg = document.querySelector("svg");
let svgNodes = svg.querySelector("#nodes");
let svgEdges = svg.querySelector("#edges");
svg.setAttribute("width", `${window.innerWidth * 0.8}`);
svg.setAttribute("height", `${window.innerHeight * 0.8}`);

// generate html id for nodes and edges
function htmlNodeId(node) {
    return `n${node.id}`;
}
function htmlEdgeId([n1, n2]) {
    return `${htmlNodeId(n1)}-${htmlNodeId(n2)}`;
}

function drawNode(node) {
    let { x, y, r } = node;
    let circle = `<circle id="${htmlNodeId(
        node
    )}" cx="${x}" cy="${y}" r="${r}" fill="black" 
                        style="stroke: black;"/>`;
    svgNodes.innerHTML += circle;
}

function drawGraph(graph) {
    clearGraphArea();

    for (let nodeId in graph.nodes) {
        drawNode(graph.nodes[nodeId]);
        graph.edges[nodeId].forEach(n2Id => {
            n1 = graph.nodes[nodeId];
            n2 = graph.nodes[n2Id];
            edge = [n1, n2];

            // make sure to not draw an undirected edge twice
            edgeEl = document.querySelector(`#${htmlEdgeId([n2, n1])}`);
            if (!edgeEl) {
                drawEdge(edge);
            }
        });
    }
}

function clearGraphArea() {
    svgNodes.innerHTML = "";
    svgEdges.innerHTML = "";
    console.log("svg", svg);
}

function drawEdge(edge, directed = false) {
    if (!directed) {
        let [n1, n2] = edge;
        let line = `<line id=${htmlEdgeId(edge)} x1="${n1.x}" x2="${
            n2.x
        }" y1="${n1.y}" y2="${n2.y}" stroke="black" stroke-width="4"/>`;

        svgEdges.innerHTML += line;
    }
    // add tip to directed edge
}
function clearNode(node) {
    document.querySelector(`#${htmlNodeId(node)}`).remove();
}
function clearEdge([n1, n2]) {
    edgeEl = document.querySelector(`#${htmlEdgeId([n1, n2])}`);
    // in case we had an undirected edge  that was not drawn
    if (!edgeEl) {
        edgeEl = document.querySelector(`#${htmlEdgeId([n2, n1])}`);
    }
    edgeEl.remove();
}

function selectNode(node) {
    selection = document.querySelector(`#${htmlNodeId(node)}`);
    selection.setAttribute("fill", "pink");
}
function deSelectNode(node) {
    selection = document.querySelector(`#${htmlNodeId(node)}`);
    selection.setAttribute("fill", "black");
}
class Node {
    constructor(x, y, radius = 20, id = null) {
        this.x = x;
        this.y = y;
        this.r = radius;
        this.id = id;
    }
}
class Graph {
    constructor() {
        this.nodes = {};
        this.edges = {};
        this.nextSeqId = 0;
    }

    isAdj(n1, n2) {
        return this.edges[n1.id].includes(n2.id);
    }
    addAdj(n1, n2) {
        this.edges[n1.id].push(n2.id);
    }
    removeAdj(n1, n2) {
        this.edges[n1.id] = this.edges[n1.id].filter(nId => {
            return nId !== n2.id;
        });
    }
    getAdjList(n) {
        return this.edges[n.id];
    }

    addNode(node) {
        // add id to node
        node.id = this.nextSeqId++;

        // add it to node map
        this.nodes[node.id] = node;
        // add it to edge map
        this.edges[node.id] = [];

        drawNode(node);
    }
    addEdge([n1, n2], directed = false) {
        if (n1 !== n2 && !this.isAdj(n1, n2)) {
            this.addAdj(n1, n2);
            if (!directed) {
                this.addAdj(n2, n1);
            }
            drawEdge([n1, n2]);
        }
    }
    deleteNode(node) {
        // delete all connected edges

        // get all edges that need to be delete
        let toDelete = this.getAdjList(node);
        // clear them from drawing
        toDelete.forEach(nId => {
            this.deleteEdge([node, this.nodes[nId]]);
        });

        // delete node
        clearNode(node);
        delete this.edges[node.id];
        delete this.nodes[node.id];
    }
    deleteEdge([n1, n2], directed = false) {
        this.removeAdj(n1, n2);
        clearEdge([n1, n2]);
        if (!directed) {
            this.removeAdj(n2, n1);
        }
    }

    findNode({ x, y }) {
        for (let nodeId in this.nodes) {
            n = this.nodes[nodeId];
            let xRange = x >= n.x - n.r && x < n.x + n.r;
            let yRange = y >= n.y - n.r && y < n.y + n.r;
            xRange && yRange;
            if (xRange && yRange) {
                return n;
            }
        }
    }

    findEdge(p1, p2) {
        return [this.findNode(p1), this.findNode(p2)];
    }
}
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
    let clickedEl = null;
    // events
    svg.addEventListener("mousedown", event => {
        switch (event.target.tagName) {
        case "circle":
            clickedEl = {
                x: parseInt(event.target.getAttribute("cx")),
                y: parseInt(event.target.getAttribute("cy"))
            };
            let clickedNode = activeGraph.findNode(clickedEl);
            if (lastSelection === null) {
                selectNode(clickedNode);
                lastSelection = clickedNode;
            } else if (clickedNode === lastSelection) {
                deSelectNode(clickedNode);
                lastSelection = null;
            } else {
                activeGraph.addEdge([lastSelection, clickedNode]);
                deSelectNode(lastSelection);
                lastSelection = null;
            }

            break;
        case "line":
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

            break;
        case "svg":
            // translate ot svg viewport coordinate
            let rect = event.target.getBoundingClientRect();
            let x = Math.floor(event.clientX - rect.left);
            let y = Math.floor(event.clientY - rect.top);

            if (lastSelection === null) {
                activeGraph.addNode(new Node(x, y));
            } else {
                deSelectNode(lastSelection);
            }

            lastSelection = null;

            break;
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

    // export to JSON file
    let link = document.querySelector("#save-graph");
    link.addEventListener("click", event => {
        let d = new Date();
        let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
        let json = JSON.stringify(activeGraph);
        let blob = new Blob([json], { type: "text/plain" });
        let url = window.URL.createObjectURL(blob);
        event.target.setAttribute("download", date);
        link.setAttribute("href", url);
    });

    // import graph from file

    function importGraph(json) {
        let obj = JSON.parse(json);
        activeGraph = new Graph();
        activeGraph.nodes = obj.nodes;
        activeGraph.edges = obj.edges;
        activeGraph.nextSeqId = obj.nextSeqId;
        console.log("importing graph");
        console.log(activeGraph);

        drawGraph(activeGraph);
    }

    const fileSelect = document.getElementById("fileSelect"),
        fileElem = document.getElementById("fileElem");

    function handleFiles(files) {
        let reader = new FileReader();
        console.log(files);

        reader.onload = e => {
            let content = e.target.result;
            importGraph(content);
            fileElem.value = "";
        };

        reader.readAsText(files[0]);
    }
    fileSelect.addEventListener("click", e => {
        fileElem.click();
    });

    // test
    {
        console.log("testing");
        n = [
            new Node(281, 378),
            new Node(650, 287),
            new Node(421, 230),
            new Node(588, 455)
        ];

        g = new Graph();
        g.addNode(n[0]);
        g.addNode(n[1]);
        g.addNode(n[2]);
        g.addNode(n[3]);

        g.addEdge([n[0], n[1]]);
        g.addEdge([n[0], n[3]]);
        g.addEdge([n[2], n[3]]);
        g.addEdge([n[1], n[3]]);

        activeGraph = g;

        console.log("active graph");
        console.log(activeGraph);
        // attach graph
    }
}
