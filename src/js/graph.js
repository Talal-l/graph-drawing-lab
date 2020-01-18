/*global sigma*/

import {
    distance,
    random,
    shuffle,
    deepCopy,
    getEdgeId,
    Vec,
    edgeIntersection
} from "./util.js";
import * as evaluator from "./metrics.js";

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

// the counter is not decremented to avoid using an existing id
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

// get all edges coming from the given node
sigma.classes.graph.addMethod("outEdges", function(node) {
    let outEdges = [];
    let obj = this.outNeighborsIndex[node.id];
    if (obj)
        for (const nId of Object.keys(obj)) {
            for (const eId of Object.keys(obj[nId])) {
                outEdges.push(obj[nId][eId]);
            }
        }
    return outEdges;
});

// all edges connected to the given node
sigma.classes.graph.addMethod("allEdges", function(node) {
    let allEdges = [];
    let obj = this.allNeighborsIndex[node.id];
    if (obj)
        for (const nId of Object.keys(obj)) {
            for (const eId of Object.keys(obj[nId])) {
                allEdges.push(obj[nId][eId]);
            }
        }
    return allEdges;
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

class ConcreteGraph {
    constructor(initGraph, options) {
        options = options || {};
        this.graph = initGraph || new sigma.classes.graph();
        this.metricsParam = options.metricsParam || {
            requiredEdgeLength: 1000,
            maxEdgeLength: 4400
        };
        this.weights = options.weights || {
            nodeOcclusion: 1,
            edgeNodeOcclusion: 1,
            edgeLength: 1,
            edgeCrossing: 1,
            angularResolution: 1
        };
        this.metricsCache = {
            nodeOcclusion: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0
        };
        this.metricsPerNode = {};
        this.edgeCrossingCahce = {};
    }
    objective() {
        this.weights;
        let wSum = 0;
        for (let key in this.metricsCache)
            wSum += this.metricsCache[key] * this.weights[key];
        if (!Number.isFinite(wSum)) {
            throw `invalid weights or metrics\nmetrics:\n ${JSON.stringify(
                this.metricsCache
            )}\nweights:\n ${JSON.stringify(this.weights)}`;
        }
        return wSum;
    }

    metrics() {
        return this.metricsCache;
    }
    setMetricParam(metricsParam) {
        this.metricsParam = metricsParam;
        recalculateMetrics.call(this);
    }
    setWeights(weights) {
        this.weights = weights;
    }
    testMove(node, vec) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        node = this.graph(nodeId);
        let objective = this.moveNode(node, vec);
        // reset the node movement
        this.moveNode(node, vec.scale(-1));
        return objective;
    }
    moveNode(node, vec) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        node = this.graph.nodes(nodeId);
        let oldPos = { x: node.x, y: node.y };
        node.x += vec.x;
        node.y += vec.y;

        updateMetrics.call(this, node, oldPos);

        // recalculate metrics that are hard to update
        this.metricsCache.edgeNodeOcclusion = 0;
        for (let e of this.graph.edges()) {
            this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                this.graph,
                e
            );
        }
        return this.objective();
    }
    setNodePos(node, { x, y }) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        let oldPos = { x: node.x, y: node.y };

        node = this.graph.nodes(nodeId);
        node.x = x;
        node.y = y;

        updateMetrics.call(this, node, oldPos);

        // recalculate metrics that are hard to update
        this.metricsCache.edgeNodeOcclusion = 0;
        for (let e of this.graph.edges()) {
            this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                this.graph,
                e
            );
        }

        return this.objective();
    }

    setGraph(sigGraph) {
        recalculateMetrics.call(this);
        this.graph = sigGraph;
    }

    density() {
        let V = this.graph.nodes().length;
        let E = this.graph.edges().length;
        let D = (2 * E) / (V * (V - 1)) || 0;
        return D;
    }

    nodes() {
        return this.graph.nodes();
    }

    addNode(node) {
        this.graph.addNode(node);
        recalculateMetrics.call(this);
        return this.objective();
    }
    removeNode(nodeId) {
        this.graph.dropNode(nodeId);
        recalculateMetrics.call(this);
        return this.objective();
    }

    addEdge(edge) {
        this.graph.addEdge(edge);
        recalculateMetrics.call(this);
        return this.objective();
    }
    removeEdge(edgeId) {
        let edge = this.graph.edges(edgeId);
        this.graph.dropEdge(edgeId);
        recalculateMetrics.call(this);
        return this.objective();
    }

    edges() {
        return this.graph.edges();
    }

    clear() {
        this.graph.clear();
        return this;
    }

    read(obj) {
        this.graph.read(obj);
        recalculateMetrics.call(this);
        return this.objective();
    }

    neighbors(node) {
        return this.graph.allNeighbors(node);
    }

    nextNodeId() {
        return this.graph.getNodesCount();
    }
}

// internal methods that must be called with a ConcreteGraph object as the context
function recalculateMetrics() {
    this.metricsPerNode = {};
    this.metricsCache = {
        nodeOcclusion: 0,
        edgeNodeOcclusion: 0,
        edgeLength: 0,
        edgeCrossing: 0,
        angularResolution: 0
    };
    this.edgeCrossingCahce = {};

    for (let n of this.graph.nodes()) {
        let nodeMetrics = {
            nodeOcclusion: 0,
            angularResolution: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0
        };

        // recalculate nodeOcclusion
        if (this.weights.nodeOcclusion > 0) {
            nodeMetrics.nodeOcclusion = evaluator.nodeNodeOcclusion(
                this.graph,
                n
            );
        }

        // recalculate angularResolution
        if (this.weights.angularResolution > 0) {
            nodeMetrics.angularResolution += evaluator.angularResolution(
                this.graph,
                n
            );
        }

        // recalculate edge metrics
        for (let e of this.graph.outEdges(n)) {
            if (this.weights.edgeLength > 0) {
                nodeMetrics.edgeLength += evaluator.edgeLength(
                    this.graph,
                    e,
                    this.metricsParam.requiredEdgeLength
                );
            }

            // recalculate edgeCrossing
            if (this.weights.edgeCrossing > 0) {
                // what edges does this edge cross?
                let cross = evaluator.edgeCrossing(this.graph, e);

                for (let ec in cross) {
                    // first time we are tracking this edge?
                    if (!this.edgeCrossingCahce[e.id])
                        this.edgeCrossingCahce[e.id] = {};

                    // did we account for this intersection before?
                    if (!this.edgeCrossingCahce[e.id][ec]) {
                        // add to own entry
                        this.edgeCrossingCahce[e.id][ec] = 1;
                        // let the other edge know that it has a new intersection
                        if (!this.edgeCrossingCahce[ec])
                            this.edgeCrossingCahce[ec] = {};

                        this.edgeCrossingCahce[ec][e.id] = 1;
                        // update the total count
                        this.metricsCache.edgeCrossing++;
                    }
                }
            }
            // recalculate edgeNodeOcclusion
            if (this.weights.edgeNodeOcclusion > 0) {
                this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                    this.graph,
                    e
                );
            }
        }
        this.metricsPerNode[n.id] = nodeMetrics;
        for (let m in this.metricsCache)
            this.metricsCache[m] += this.metricsPerNode[n.id][m];
    }
}
function updateMetrics(node, oldPos) {
    this.metricsPerNode[node.id].nodeOcclusion = 0;
    // HACK: small number to use if the distance is 0
    const EPS = 0.000009;
    for (let n of this.graph.nodes()) {
        if (node.id !== n.id) {
            // remove old value from other node sum
            let oldD = distance(oldPos, n);
            if (!oldD) oldD = EPS;
            this.metricsPerNode[n.id].nodeOcclusion -= 1 / oldD ** 2;
            // add the new distance
            let newD = distance(node, n);
            if (!newD) newD = EPS;
            this.metricsPerNode[n.id].nodeOcclusion += 1 / newD ** 2;

            this.metricsPerNode[node.id].nodeOcclusion += 1 / newD ** 2;
        }
    }

    // update edge metrics
    let nodeMetrics = this.metricsPerNode[node.id];
    nodeMetrics.angularResolution = evaluator.angularResolution(
        this.graph,
        node
    );
    nodeMetrics.edgeLength = 0;
    nodeMetrics.edgeCrossing = 0;
    for (let e of this.graph.outEdges(node)) {
        nodeMetrics.edgeLength += evaluator.edgeLength(
            this.graph,
            e,
            this.metricsParam.requiredEdgeLength
        );
        let target = this.graph.nodes(e.target);
        this.metricsPerNode[
            target.id
        ].angularResolution = evaluator.angularResolution(this.graph, target);

        if (this.edgeCrossingCahce[e.id]) {
            // remove the current edge from the total
            this.metricsCache.edgeCrossing -= Object.keys(
                this.edgeCrossingCahce[e.id]
            ).length;

            // remove current edge from the other crossed edges
            // needed when those edges get modified
            for (let ec in this.edgeCrossingCahce[e.id]) {
                delete this.edgeCrossingCahce[ec][e.id];
            }
        }
        // get new intersections and update other edges
        this.edgeCrossingCahce[e.id] = evaluator.edgeCrossing(this.graph, e);

        for (let ec in this.edgeCrossingCahce[e.id]) {
            if (!this.edgeCrossingCahce[ec]) this.edgeCrossingCahce[ec] = {};
            this.edgeCrossingCahce[ec][e.id] = 1;
            this.metricsCache.edgeCrossing++;
        }
    }
}
