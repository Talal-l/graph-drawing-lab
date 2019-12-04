/*global sigma*/

import { random, shuffle, deepCopy, getEdgeId, Vec, defaults } from "./util.js";

import { Evaluator } from "./metrics.js";

export { generateGraph, ConcreteGraph };
// extend the sigma graph class
sigma.classes.graph.addMethod("allNeighbors", function(node) {
    return this.allNeighborsIndex[node.id];
});

sigma.classes.graph.addMethod("allNeighborNodes", function(node) {
    let neighbors = [];
    let obj = this.allNeighborsIndex[node.id];
    for (const id of Object.keys(obj)) {
        neighbors.push(this.nodes(id));
    }
    return neighbors;
});
sigma.classes.graph.addMethod("edgeExist", function(n1, n2) {
    return (
        this.edgesIndex[getEdgeId(n1, n2)] || this.edgesIndex[getEdgeId(n2, n1)]
    );
});

sigma.classes.graph.addIndex("nodesCount", {
    constructor: function() {
        this.nodesCount = 0;
    },
    addNode: function() {
        this.nodesCount++;
    },
    clear: function() {
        this.nodesCount = 0;
    }
});

// return the number of nodes as a string
sigma.classes.graph.addMethod("getNodesCount", function() {
    return this.nodesCount + "";
});

//TODO: add options for size and color instead of hard coding them
/**
 * Creates a random spanning tree for the given sigma graph.
 *
 * @param {object} G  Sigma graph object
 * @returns {undefined}
 *
 */
function ranSpanningTree(G) {
    // TODO: Extract rendering details
    const edgeSize = 1.5;
    const nodeSize = 10;
    // deep copy of the existing nodes
    let outTree = Array.from(G.nodes());
    // select the root
    let inTree = [outTree.pop()];

    while (outTree.length) {
        // pick a node from outside the tree
        let source = outTree.pop();
        // pick a random node from the tree
        let target = inTree[random(0, inTree.length - 1)];
        // create an edge
        let edge = {
            id: getEdgeId(source, target),
            size: edgeSize,
            source: source.id,
            target: target.id,
            color: "#ccc"
        };
        G.addEdge(edge);
        // add node to tree
        inTree.push(source);
    }
}
/**
 *
 * @param {number} nMin  Minimum number of nodes
 * @param {number} nMax  Maximum number of nodes
 * @param {number} eMin  Minimum number of edges
 * @param {number} eMax  Maximum number of edges
 * @param {object} width Width of the HTML canvas element
 * @param {object} height Height of the HTML canvas element
 * @returns {object} a Sigma graph object
 */
function generateGraph(nMin, nMax, eMin, eMax, width, height) {
    // TODO: Extract rendering details
    const edgeSize = 1.5;
    const nodeSize = 10;
    const x = width;
    const y = height;

    let G = new sigma.classes.graph();
    const N = random(nMin, nMax);
    const eLimit = (N * (N - 1)) / 2;
    let E = random(Math.min(eMin, eLimit), Math.min(eMax, eLimit));

    for (let i = 0; i < N; i++) {
        let id = G.getNodesCount();
        let n = {
            label: id,
            id: id,
            x: (0.5 - Math.random()) * x,
            y: (0.5 - Math.random()) * y,
            size: nodeSize,
            color: "#921"
        };
        G.addNode(n);
    }
    let nodes = G.nodes();

    // randomize the nodes order to ensure we get random edges
    shuffle(nodes);

    // create a random spanning tree (ST) to guarantee that the graph is connected
    ranSpanningTree(G);
    // subtract edges created by the ST
    E = E - (N - 1);

    // loop until the desired number of edges is reached
    for (let i = 0; E > 0; i = (i + 1) % N) {
        // determine the number of edges allowed for this node in this iteration
        let nEdge = random(0, Math.min(E, N - 1));
        for (let j = 0; j < N && nEdge > 0; j++) {
            // pick a random node to connect to
            let edges = G.edges();

            if (j !== i && !G.edgeExist(nodes[j], nodes[i])) {
                let edge = {
                    id: getEdgeId(nodes[j], nodes[i]),
                    size: edgeSize,
                    source: nodes[i].id,
                    target: nodes[j].id,
                    color: "#ccc"
                };
                G.addEdge(edge);
                nEdge--;
                // update total edge count
                E--;
            }
        }
    }
    return G;
}

function ConcreteGraph(initGraph, options) {
    this.options = options || defaults;
    this.useCache = this.options.useCache || defaults.useCache;

    let metricsParams = this.options.metricsParams || defaults.metricsParams;
    this.evaluator = new Evaluator(metricsParams);

    this.graph = initGraph;
    this.changes = [];
    this.metricsCache = null;

    ConcreteGraph.prototype.objective = function(weights) {
        return this.evaluator.objective(this.metrics(), weights);
    };

    ConcreteGraph.prototype.metrics = function(params) {
        this.metricsCache =
            // invalidate cache if we have params
            this.useCache && this.metricsCache && !params
                ? this.metricsCache
                : this.evaluator.metrics(this.graph, params);
        return this.metricsCache;
    };

    ConcreteGraph.prototype.moveNode = function(node, vec) {
        node = this.graph.nodes(node);
        let nodeV = new Vec();
        let { x, y } = nodeV.add(vec);

        // make sure the values are within range
        if (x > 1) x = 1;
        if (y > 1) y = 1;
        if (x < -1) x = -1;
        if (y < -1) y = -1;

        node.x = x;
        node.y = y;
        return node;
    };
    ConcreteGraph.prototype.setNodePos = function(node, { x, y }) {
        node = this.graph.nodes(node);
        // make sure the values are within range
        if (x > 1) x = 1;
        if (y > 1) y = 1;
        if (x < -1) x = -1;
        if (y < -1) y = -1;
        node.x = x;
        node.y = y;

        return node;
    };

    ConcreteGraph.prototype.setGraph = function(sigGraph) {
        this.metricsCache = null;
        this.graph = sigGraph;
    };

    // return array of nodes in the graph
    ConcreteGraph.prototype.nodes = function() {
        // invalidate the graph and changes array
        return this.graph.nodes();
    };

    // return array of edges in the graph
    ConcreteGraph.prototype.edges = function() {
        // invalidate the graph and changes array
        return this.graph.edges();
    };

    ConcreteGraph.prototype.density = function() {
        let V = this.graph.nodes().length;
        let E = this.graph.edges().length;
        let D = (2 * E) / (V * (V - 1)) || 0;
        return D;
    };
}
