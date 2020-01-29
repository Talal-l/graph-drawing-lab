/*global sigma*/

import {
    distance,
    random,
    shuffle,
    deepCopy,
    getEdgeId,
    Vec,
    minMaxNorm
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
    constructor(graph, options) {
        options = options || {};
        this.graph = graph || new sigma.classes.graph();
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
        this.normalMetrics = {
            nodeOcclusion: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0
        };
        this.metricsPerNode = {};
        this.edgeCrossingCache = {};
        this.minDist = 10;
        this.maxDist = -Infinity;

        // keep track of number of nodes with deg > 1
        // used to calculate the max value for angularResolution
        this.nodesWithAngles = 0;

        this.bounds = this.getBoundaries();
        updateBounds.call(this);
    }

    objective() {
        let wSum = 0;
        // normalize the metrics

        let N = this.graph.nodes().length;
        let E = this.graph.edges().length;

        // node node nodeOcclusion
        if (N > 1) {
            this.normalMetrics.nodeOcclusion = minMaxNorm(
                this.metricsCache.nodeOcclusion,
                (N * (N - 1)) / this.maxDist ** 2,
                (N * (N - 1)) / this.minDist ** 2
            );
        }

        if (E > 0) {
            // edge node occlusion

            // number of connected nodes (part of an edge) and edge
            let EE = 2 * E * (E - 1);
            // number of disccounted nodes (not part of an edge) and edge
            let NE = (N - 2 * E) * E;
            let total = EE + NE;

            this.normalMetrics.edgeNodeOcclusion = minMaxNorm(
                this.metricsCache.edgeNodeOcclusion,
                total / this.maxDist ** 2,
                total / this.minDist ** 2
            );

            // edge length
            let len = this.metricsParam.requiredEdgeLength;
            let max = Math.max(len ** 2, (len - this.maxDist) ** 2);
            this.normalMetrics.edgeLength = minMaxNorm(
                this.metricsCache.edgeLength,
                0,
                E * max
            );
        }

        // edge crossing
        if (E > 1) {
            this.normalMetrics.edgeCrossing = minMaxNorm(
                this.metricsCache.edgeCrossing,
                0,
                (E * (E - 1)) / 2
            );
        }

        // angular resolution
        if (E > 1) {
            this.normalMetrics.angularResolution = minMaxNorm(
                this.metricsCache.angularResolution,
                0,
                // largest value when all nodes have > 1 edge with 0 deg between them
                this.nodesWithAngles * 360
            );
        }

        for (let key in this.normalMetrics)
            wSum += this.normalMetrics[key] * this.weights[key];
        if (!Number.isFinite(wSum)) {
            throw `invalid weights or metrics\nmetrics:\n ${JSON.stringify(
                this.normalMetrics
            )}\nweights:\n ${JSON.stringify(this.weights)}`;
        }
        return wSum;
    }

    metrics() {
        // to make sure the normalized metrics are up to date
        this.objective();

        return this.normalMetrics;
    }
    setMetricParam(metricsParam) {
        this.metricsParam = metricsParam;
        recalculateMetrics.call(this);
    }
    setWeights(weights) {
        this.weights = weights;
    }
    // returns the score generated by the move or null if out of bound
    // it doesn't move the node
    testMove(node, vec) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        node = this.graph.nodes(nodeId);
        let newPos = this.moveNode(node, vec);
        let objective = this.objective();

        // move is out of bound
        if (!newPos) return null;

        // reset the node movement
        this.moveNode(node, vec.scale(-1));
        return objective;
    }
    // effectBounds will determine whether moving outside the bounds will expand them
    // or return an error
    moveNode(node, vec, effectBounds = false) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        node = this.graph.nodes(nodeId);
        let oldPos = { x: node.x, y: node.y };

        let x = node.x + vec.x;
        let y = node.y + vec.y;

        if (!effectBounds && !this.withinBounds(x, y)) {
            return null;
        }

        node.x = x;
        node.y = y;

        updateMetrics.call(this, node, oldPos);
        // recalculate metrics that are hard to update
        this.metricsCache.edgeNodeOcclusion = 0;
        for (let e of this.graph.edges()) {
            this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                this.graph,
                e,
                this.minDist
            );
        }
        if (effectBounds) {
            updateBounds.call(this);
        }
        return { x: node.x, y: node.y };
    }
    // defaults to true since it's mostly used in the ui and we want to
    // always change the bounds there
    setNodePos(node, vec, effectBounds = true) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;
        node = this.graph.nodes(nodeId);

        // make sure we have a Vec instance
        let a = new Vec(node);
        let b = new Vec(vec);
        this.moveNode(node, b.sub(a), true);
    }

    withinBounds(x, y) {
        let { xMax, yMax, xMin, yMin, maxNodeSize } = this.bounds;
        return x <= xMax && x >= xMin && y <= yMax && y >= yMin;
    }
    getBoundaries() {
        let b = {
            xMax: -Infinity,
            yMax: -Infinity,
            xMin: Infinity,
            yMin: Infinity
        };
        let nodes = this.graph.nodes();
        for (let n of nodes) {
            b.xMax = Math.max(b.xMax, n.x);
            b.xMin = Math.min(b.xMin, n.x);
            b.yMax = Math.max(b.yMax, n.y);
            b.yMin = Math.min(b.yMin, n.y);
        }
        return b;
    }
    setGraph(sigGraph) {
        updateBounds.call(this);
        recalculateMetrics.call(this);
        this.graph = sigGraph;
    }

    density() {
        let V = this.graph.nodes().length;
        let E = this.graph.edges().length;
        let D = (2 * E) / (V * (V - 1)) || 0;
        return D;
    }

    nodes(node) {
        if (node) return this.graph.nodes(node);
        else return this.graph.nodes();
    }

    addNode(node) {
        this.graph.addNode(node);
        updateBounds.call(this);
        recalculateMetrics.call(this);
    }
    removeNode(nodeId) {
        this.graph.dropNode(nodeId);
        updateBounds.call(this);
        recalculateMetrics.call(this);
    }

    addEdge(edge) {
        this.graph.addEdge(edge);
        recalculateMetrics.call(this);
    }
    removeEdge(edgeId) {
        let edge = this.graph.edges(edgeId);
        this.graph.dropEdge(edgeId);
        recalculateMetrics.call(this);
    }

    edges() {
        return this.graph.edges();
    }

    clear() {
        this.graph.clear();
        updateBounds.call(this);
        return this;
    }

    read(obj) {
        this.graph.read(obj);
        updateBounds.call(this);
        recalculateMetrics.call(this);
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
    this.edgeCrossingCache = {};
    this.nodesWithAngles = 0;

    for (let n of this.graph.nodes()) {
        let nodeMetrics = {
            nodeOcclusion: 0,
            angularResolution: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0
        };
        // update indexes
        this.nodesWithAngles +=
            this.graph.allNeighborNodes(n).length > 1 ? 1 : 0;

        // recalculate nodeOcclusion
        if (this.weights.nodeOcclusion > 0) {
            nodeMetrics.nodeOcclusion = evaluator.nodeNodeOcclusion(
                this.graph,
                n,
                this.minDist
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
                    if (!this.edgeCrossingCache[e.id])
                        this.edgeCrossingCache[e.id] = {};

                    // did we account for this intersection before?
                    if (!this.edgeCrossingCache[e.id][ec]) {
                        // add to own entry
                        this.edgeCrossingCache[e.id][ec] = 1;
                        // let the other edge know that it has a new intersection
                        if (!this.edgeCrossingCache[ec])
                            this.edgeCrossingCache[ec] = {};

                        this.edgeCrossingCache[ec][e.id] = 1;
                        // update the total count
                        this.metricsCache.edgeCrossing++;
                    }
                }
            }
            // recalculate edgeNodeOcclusion
            if (this.weights.edgeNodeOcclusion > 0) {
                this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                    this.graph,
                    e,
                    this.minDist
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
    this.metricsCache.nodeOcclusion = 0;
    this.nodesWithAngles = 0;

    for (let n of this.graph.nodes()) {
        // update indexes
        this.nodesWithAngles +=
            this.graph.allNeighborNodes(n).length > 1 ? 1 : 0;

        if (node.id !== n.id) {
            // remove old value from other node sum
            let oldD = distance(oldPos, n);
            oldD = Math.max(oldD, this.minDist);
            this.metricsPerNode[n.id].nodeOcclusion -= 1 / oldD ** 2;

            // add the new distance
            let newD = distance(node, n);
            newD = Math.max(newD, this.minDist);
            this.metricsPerNode[n.id].nodeOcclusion += 1 / newD ** 2;
            // update the total sum for nodeOcclusion
            this.metricsCache.nodeOcclusion += this.metricsPerNode[
                n.id
            ].nodeOcclusion;

            // update it's own contribution
            this.metricsPerNode[node.id].nodeOcclusion += 1 / newD ** 2;
            // update the total sum for nodeOcclusion
            this.metricsCache.nodeOcclusion += this.metricsPerNode[
                node.id
            ].nodeOcclusion;
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

        if (this.edgeCrossingCache[e.id]) {
            // remove the current edge from the total
            this.metricsCache.edgeCrossing -= Object.keys(
                this.edgeCrossingCache[e.id]
            ).length;

            // remove current edge from the other crossed edges
            // needed when those edges get modified
            for (let ec in this.edgeCrossingCache[e.id]) {
                delete this.edgeCrossingCache[ec][e.id];
            }
        }
        // get new intersections and update other edges
        this.edgeCrossingCache[e.id] = evaluator.edgeCrossing(this.graph, e);

        for (let ec in this.edgeCrossingCache[e.id]) {
            if (!this.edgeCrossingCache[ec]) this.edgeCrossingCache[ec] = {};
            this.edgeCrossingCache[ec][e.id] = 1;
            this.metricsCache.edgeCrossing++;
        }
    }
}

function updateBounds() {
    let b = this.getBoundaries();

    if (
        !this.withinBounds(b.xMax, b.yMax) ||
        !this.withinBounds(b.xMin, b.yMin)
    ) {
        this.bounds = b;
        this.maxDist = distance(
            { x: b.xMax, y: b.yMax },
            { x: b.xMin, y: b.yMin }
        );
    }
}
