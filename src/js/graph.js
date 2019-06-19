import * as svg from  "./svgRenderer.js";
export class Node {
    constructor(x, y, radius = 20, id = null) {
        this.x = x;
        this.y = y;
        this.r = radius;
        this.id = id;
    }
}
export class Graph {
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

        svg.drawNode(node);
    }
    addEdge([n1, n2], directed = false) {
        if (n1 !== n2 && !this.isAdj(n1, n2)) {
            this.addAdj(n1, n2);
            if (!directed) {
                this.addAdj(n2, n1);
            }
            svg.drawEdge([n1, n2]);
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
        svg.clearNode(node);
        delete this.edges[node.id];
        delete this.nodes[node.id];
    }
    deleteEdge([n1, n2], directed = false) {
        this.removeAdj(n1, n2);
        svg.clearEdge([n1, n2]);
        if (!directed) {
            this.removeAdj(n2, n1);
        }
    }

    findNode({ x, y }) {
        for (let nodeId in this.nodes) {
            let n = this.nodes[nodeId];
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