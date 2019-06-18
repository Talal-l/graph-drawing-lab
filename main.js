import { Graph, Node } from "./graph.js";
import {
    svgCanvas,
    selectNode,
    deSelectNode,
    clearGraphArea,
    drawGraph,
    htmlEdgeId,
    htmlNodeId
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

// util
function getCanvasXy(event) {
    // any object with x,y properties
    let rect = svgCanvas.getBoundingClientRect();
    let x = Math.floor(event.clientX - rect.left);
    let y = Math.floor(event.clientY - rect.top);
    return [x, y];
}

// events

svgCanvas.addEventListener("mousedown", event => {
    switch (event.target.tagName) {
    case "circle":
        // prepare node to be moved

        // get clicked node by id
        let clickedNodeEl = event.target;
        let nodeId = parseInt(
            clickedNodeEl.getAttribute("id").split("n")[1]
        );
        let clickedNode = activeGraph.nodes[nodeId];

        // get connected edges
        let adjNodes = activeGraph.getAdjList(clickedNode);
        let edgeElList = adjNodes.map(n2Id => {
            let n2 = activeGraph.nodes[n2Id];
            let edgeEl = document.querySelector(
                `#${htmlEdgeId([clickedNode, n2])}`
            );
            if (!edgeEl) {
                edgeEl = document.querySelector(
                    `#${htmlEdgeId([n2, clickedNode])}`
                );
            }
            return edgeEl;
        });
            // register move event for the node
        function onMove(event) {
            // get xy inside canvas
            let [x, y] = getCanvasXy(event);

            // update svg elements
            clickedNodeEl.setAttribute("cx", x);
            clickedNodeEl.setAttribute("cy", y);

            // update each edge first node coordinate
            edgeElList.forEach(el => {
                // HACK: check if an undirected edge was drawn in reverse (n2 to n1) in html
                let coordinate = 1;
                let first = parseInt(
                    el
                        .getAttribute("id")
                        .split("-")[0]
                        .split("n")[1]
                );
                if (clickedNode.id !== first) {
                    coordinate = 2;
                }

                el.setAttribute(`x${coordinate}`, x);
                el.setAttribute(`y${coordinate}`, y);
            });

            // update node
            clickedNode.x = x;
            clickedNode.y = y;
        }
        svgCanvas.addEventListener("mousemove",onMove);

        clickedNodeEl.addEventListener("mouseup", () =>
            svgCanvas.removeEventListener("mousemove", onMove)
        );

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
        let [x, y] = getCanvasXy(event);

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
