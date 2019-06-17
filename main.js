import { Graph, Node } from "./graph.js";
import {
    svgCanvas,
    selectNode,
    deSelectNode,
    clearGraphArea,
    drawGraph
} from "./svgRenderer.js";

let activeGraph = new Graph();
let lastSelection = null;
let clickedEdge = null;
let clickedEl = null;

// tool bar
const saveGraph = document.querySelector("#saveGraphLink"),
    fileSelector = document.querySelector("#fileSelector"),
    loadGraph = document.querySelector("#loadGraph"),
    clearGraph = document.querySelector("#clearGraph");

clearGraph.addEventListener("click", () => clearGraphArea());
saveGraph.addEventListener("click", event => {
    let d = new Date();
    let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}`;
    let json = JSON.stringify(activeGraph);
    let blob = new Blob([json], { type: "text/plain" });
    let url = window.URL.createObjectURL(blob);
    event.target.setAttribute("download", date);
    let link = document.querySelector("#saveGraphLink");
    link.setAttribute("href", url);
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
        activeGraph = new Graph();
        Object.assign(activeGraph, JSON.parse(content));
        fileSelector.value = "";
        drawGraph(activeGraph);
    };

    reader.readAsText(files[0]);
});


// events
svgCanvas.addEventListener("mousedown", event => {
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
        let p1 = {
            x: parseInt(event.target.getAttribute("x1")),
            y: parseInt(event.target.getAttribute("y1"))
        };
        let p2 = {
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
// import graph from file



// test
{
    console.log("testing");
    let n = [
        new Node(281, 378),
        new Node(650, 287),
        new Node(421, 230),
        new Node(588, 455)
    ];

    let g = new Graph();
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
