export let svgCanvas = document.querySelector("svg");
let svgNodes = svgCanvas.querySelector("#nodes");
let svgEdges = svgCanvas.querySelector("#edges");
svgCanvas.setAttribute("width", `${window.innerWidth * 0.8}`);
svgCanvas.setAttribute("height", `${window.innerHeight * 0.8}`);

// generate html id for nodes and edges
export function htmlNodeId(node) {
    return `n${node.id}`;
}
export function htmlEdgeId([n1, n2]) {
    return `${htmlNodeId(n1)}-${htmlNodeId(n2)}`;
}

export function drawNode(node) {
    let { x, y, r } = node;
    let circle = `<circle id="${htmlNodeId(
        node
    )}" cx="${x}" cy="${y}" r="${r}" fill="black" 
                        style="stroke: black;"/>`;
    svgNodes.innerHTML += circle;
}

export function drawGraph(graph) {
    clearGraphArea();

    for (let nodeId in graph.nodes) {
        drawNode(graph.nodes[nodeId]);
        graph.edges[nodeId].forEach(n2Id => {
            let n1 = graph.nodes[nodeId];
            let n2 = graph.nodes[n2Id];
            let edge = [n1, n2];

            // make sure to not draw an undirected edge twice
            let edgeEl = document.querySelector(`#${htmlEdgeId([n2, n1])}`);
            if (!edgeEl) {
                drawEdge(edge);
            }
        });
    }
}

export function clearGraphArea() {
    svgNodes.innerHTML = "";
    svgEdges.innerHTML = "";
    console.log("svg", svgCanvas);
}

export function drawEdge(edge, directed = false) {
    if (!directed) {
        let [n1, n2] = edge;
        let line = `<line id=${htmlEdgeId(edge)} x1="${n1.x}" x2="${
            n2.x
        }" y1="${n1.y}" y2="${n2.y}" stroke="black" stroke-width="4"/>`;

        svgEdges.innerHTML += line;
    }
    // add tip to directed edge
}
export function clearNode(node) {
    document.querySelector(`#${htmlNodeId(node)}`).remove();
}
export function clearEdge([n1, n2]) {
    let edgeEl = document.querySelector(`#${htmlEdgeId([n1, n2])}`);
    // in case we had an undirected edge  that was not drawn
    if (!edgeEl) {
        edgeEl = document.querySelector(`#${htmlEdgeId([n2, n1])}`);
    }
    edgeEl.remove();
}

export function selectNode(node) {
    let selection = document.querySelector(`#${htmlNodeId(node)}`);
    selection.setAttribute("fill", "pink");
}
export function deSelectNode(node) {
    let selection = document.querySelector(`#${htmlNodeId(node)}`);
    selection.setAttribute("fill", "black");
}
