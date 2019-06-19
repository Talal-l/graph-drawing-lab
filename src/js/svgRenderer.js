export class SvgRenderer {
    constructor(svg) {
        this.svgCanvas = svg;
        this.svgNodes = this.svgCanvas.querySelector("#nodes");
        this.svgEdges = this.svgCanvas.querySelector("#edges");
    }
    // generate html id for nodes and edges
    htmlNodeId(node) {
        return `n${node.id}`;
    }
    htmlEdgeId([n1, n2]) {
        return `${this.htmlNodeId(n1)}-${this.htmlNodeId(n2)}`;
    }

    drawNode(node) {
        let { x, y, r } = node;
        let circle = `<circle id="${this.htmlNodeId(
            node
        )}" cx="${x}" cy="${y}" r="${r}" fill="black" 
                        style="stroke: black;"/>`;
        this.svgNodes.innerHTML += circle;
    }

    drawGraph(graph) {
        this.clearGraphArea();

        for (let nodeId in graph.nodes) {
            this.drawNode(graph.nodes[nodeId]);
            graph.edges[nodeId].forEach(n2Id => {
                let n1 = graph.nodes[nodeId];
                let n2 = graph.nodes[n2Id];
                let edge = [n1, n2];

                // make sure to not draw an undirected edge twice
                let edgeEl = document.querySelector(
                    `#${this.htmlEdgeId([n2, n1])}`
                );
                if (!edgeEl) {
                    this.drawEdge(edge);
                }
            });
        }
    }

    clearGraphArea() {
        this.svgNodes.innerHTML = "";
        this.svgEdges.innerHTML = "";
        console.log("svg", this.svgCanvas);
    }

    drawEdge(edge, directed = false) {
        if (!directed) {
            let [n1, n2] = edge;
            let line = `<line id=${this.htmlEdgeId(edge)} x1="${n1.x}" x2="${
                n2.x
            }" y1="${n1.y}" y2="${n2.y}" stroke="black" stroke-width="4"/>`;

            this.svgEdges.innerHTML += line;
        }
        // add tip to directed edge
    }
    clearNode(node) {
        document.querySelector(`#${this.htmlNodeId(node)}`).remove();
    }
    clearEdge([n1, n2]) {
        let edgeEl = document.querySelector(`#${this.htmlEdgeId([n1, n2])}`);
        // in case we had an undirected edge  that was not drawn
        if (!edgeEl) {
            edgeEl = document.querySelector(`#${this.htmlEdgeId([n2, n1])}`);
        }
        edgeEl.remove();
    }

    selectNode(node) {
        let selection = document.querySelector(`#${this.htmlNodeId(node)}`);
        selection.setAttribute("fill", "pink");
    }
    deSelectNode(node) {
        let selection = document.querySelector(`#${this.htmlNodeId(node)}`);
        selection.setAttribute("fill", "black");
    }
}
