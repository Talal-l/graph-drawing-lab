const Graph = require("graphology");
import { UndirectedGraph } from "graphology";

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

//TODO: add options for size and color instead of hard coding them
/**
 * Creates a random spanning tree for the given sigma graph.
 *
 * @param {object} G -  ConcreteGraph instance
 * @returns {undefined}
 *
 */
function ranSpanningTree(G) {
    // TODO: Extract rendering details
    const edgeSize = 1.5;
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
            source: source,
            target: target,
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

    let G = new ConcreteGraph();
    const N = random(nMin, nMax);
    const eLimit = (N * (N - 1)) / 2;
    let E = random(Math.min(eMin, eLimit), Math.min(eMax, eLimit));

    for (let i = 0; i < N; i++) {
        let id = G.nextId;
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

            if (j !== i && !G.hasEdge(nodes[j], nodes[i])) {
                let edge = {
                    id: getEdgeId(nodes[j], nodes[i]),
                    size: edgeSize,
                    source: nodes[i],
                    target: nodes[j],
                    color: "#ccc"
                };
                G.addEdge(edge);
                nEdge--;
                // update total edge count
                E--;
            }
        }
    }
    return G.graph;
}

class ConcreteGraph {
    constructor(graph, options) {
        options = options || {};
        // HACK: Temp solution to keep things up to date with the sigma graph
        // needed until the edge quad tree is ported to v2
        this.sigGraph = options.sigGraph || null;

        this.nextId = 0;
        this.graph = graph || new Graph({});
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
            let minSum = (N * (N - 1)) / this.maxDist ** 2;
            let maxSum = (N * (N - 1)) / this.minDist ** 2;
            this.normalMetrics.nodeOcclusion = minMaxNorm(
                this.metricsCache.nodeOcclusion || minSum,
                minSum,
                maxSum
            );
        }

        if (E > 0) {
            // edge node occlusion

            // number of connected nodes (part of an edge) and edge
            let EE = 2 * E * (E - 1);
            // number of disconnected nodes (not part of an edge) and edge
            let NE = (N - 2 * E) * E;
            let total = EE + NE;

            let minSum = total / this.maxDist ** 2;
            let maxSum = total / this.minDist ** 2;
            this.normalMetrics.edgeNodeOcclusion = minMaxNorm(
                this.metricsCache.edgeNodeOcclusion || minSum,
                minSum,
                maxSum
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
        if (!Number.isFinite(wSum) || wSum < 0) {
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
    testMove(nodeId, vec) {
        let newPos = this.moveNode(nodeId, vec);
        // move is out of bound
        if (!newPos) return null;

        let objective = this.objective();

        // reset the node movement
        this.moveNode(nodeId, vec.scale(-1));
        return objective;
    }
    // effectBounds will determine whether moving outside the bounds will expand them
    // or return an error
    moveNode(nodeId, vec, effectBounds = false) {
        let node = this.graph.getNodeAttributes(nodeId);
        let oldPos = { x: node.x, y: node.y };

        let x = node.x + vec.x;
        let y = node.y + vec.y;

        if (!effectBounds && !this.withinBounds(x, y)) {
            return null;
        }

        if (this.sigGraph) {
            let sigNode = this.sigGraph.nodes(nodeId);
            sigNode.x = x;
            sigNode.y = y;
        }
        this.graph.setNodeAttribute(nodeId, "x", x);
        this.graph.setNodeAttribute(nodeId, "y", y);

        updateMetrics.call(this, nodeId, oldPos);
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
    setNodePos(nodeId, newPos, effectBounds = true) {
        let node = this.graph.getNodeAttributes(nodeId);
        let a = new Vec(node);
        let b = new Vec(newPos);
        this.moveNode(nodeId, b.sub(a), effectBounds);
    }

    withinBounds(x, y) {
        let { xMax, yMax, xMin, yMin } = this.bounds;
        return x <= xMax && x >= xMin && y <= yMax && y >= yMin;
    }
    getBoundaries() {
        let b = {
            xMax: -Infinity,
            yMax: -Infinity,
            xMin: Infinity,
            yMin: Infinity
        };
        for (let nId of this.graph.nodes()) {
            let n = this.graph.getNodeAttributes(nId);
            b.xMax = Math.max(b.xMax, n.x);
            b.xMin = Math.min(b.xMin, n.x);
            b.yMax = Math.max(b.yMax, n.y);
            b.yMin = Math.min(b.yMin, n.y);
        }
        return b;
    }

    density() {
        let V = this.graph.nodes().length;
        let E = this.graph.edges().length;
        let D = (2 * E) / (V * (V - 1)) || 0;
        return D;
    }

    nodes() {
        return this.graph.nodes.apply(this.graph, arguments);
    }

    getNodeAttributes() {
        return this.graph.getNodeAttributes.apply(this.graph, arguments);
    }
    // TODO: add option to provide id as parameter?
    addNode(node) {
        node.id = this.nextId;
        this.graph.addNode(this.nextId, node);
        if (this.sigGraph) {
            node.label = node.label + "";
            this.sigGraph.addNode(node);
        }
        this.nextId++;
        updateBounds.call(this);
        recalculateMetrics.call(this);
    }
    removeNode(nodeId) {
        this.graph.dropNode(nodeId);
        if (this.sigGraph) this.sigGraph.dropNode(nodeId);
        updateBounds.call(this);
        recalculateMetrics.call(this);
    }

    addEdge(edge) {
        this.graph.addEdgeWithKey(edge.id, edge.source, edge.target, edge);
        if (this.sigGraph) this.sigGraph.addEdge(edge);
        recalculateMetrics.call(this);
    }
    removeEdge(edgeId) {
        this.graph.dropEdge(edgeId);
        if (this.sigGraph) this.sigGraph.dropEdge(edgeId);
        recalculateMetrics.call(this);
    }

    edges() {
        return this.graph.edges.apply(this.graph, arguments);
    }

    clear() {
        this.graph.clear();
        if (this.sigGraph) this.sigGraph.clear();
        this.nextId = 0;
        updateBounds.call(this);
        recalculateMetrics.call(this);
        return this;
    }

    read(obj) {
        this.clear();
        this.graph.import(obj);

        for (let nId of this.graph.nodes()) {
            this.nextId = Math.max(this.nextId + 1, Number(nId));
            if (this.sigGraph) {
                let node = this.graph.getNodeAttributes(nId);
                node.label = node.label + "";
                this.sigGraph.addNode(node);
            }
        }
        if (this.sigGraph) {
            for (let eId of this.graph.edges()) {
                let [sourceId, targetId] = this.graph.extremities(eId);
                let edge = this.graph.getEdgeAttributes(eId);
                let sigEdge = {
                    id: eId,
                    source: Number(sourceId),
                    target: Number(targetId),
                    size: edge.size,
                    color: edge.color
                };
                this.sigGraph.addEdge(sigEdge);
            }
        }

        updateBounds.call(this);
        recalculateMetrics.call(this);
    }

    neighbors() {
        return this.graph.neighbors.apply(this.graph, arguments);
    }
    hasEdge(sourceId, targetId) {
        return (
            this.graph.hasEdge(sourceId, targetId) ||
            this.graph.hasEdge(targetId, sourceId)
        );
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
    this.normalMetrics = {
        nodeOcclusion: 0,
        edgeNodeOcclusion: 0,
        edgeLength: 0,
        edgeCrossing: 0,
        angularResolution: 0
    };
    this.edgeCrossingCache = {};
    this.nodesWithAngles = 0;

    for (let nId of this.graph.nodes()) {
        let nodeMetrics = {
            nodeOcclusion: 0,
            angularResolution: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0
        };
        // update indexes
        this.nodesWithAngles += this.graph.neighbors(nId).length > 1 ? 1 : 0;

        // recalculate nodeOcclusion
        if (this.weights.nodeOcclusion > 0) {
            nodeMetrics.nodeOcclusion = evaluator.nodeNodeOcclusion(
                this.graph,
                nId,
                this.minDist
            );
        }

        // recalculate angularResolution
        if (this.weights.angularResolution > 0) {
            nodeMetrics.angularResolution += evaluator.angularResolution(
                this.graph,
                nId
            );
        }

        // recalculate edge metrics
        for (let eId of this.graph.outEdges(nId)) {
            if (this.weights.edgeLength > 0) {
                nodeMetrics.edgeLength += evaluator.edgeLength(
                    this.graph,
                    eId,
                    this.metricsParam.requiredEdgeLength
                );
            }

            // recalculate edgeCrossing
            if (this.weights.edgeCrossing > 0) {
                // what edges does this edge cross?
                let cross = evaluator.edgeCrossing(this.graph, eId);

                for (let ecId in cross) {
                    // first time we are tracking this edge?
                    if (!this.edgeCrossingCache[eId])
                        this.edgeCrossingCache[eId] = {};

                    // did we account for this intersection before?
                    if (!this.edgeCrossingCache[eId][ecId]) {
                        // add to own entry
                        this.edgeCrossingCache[eId][ecId] = 1;
                        // let the other edge know that it has a new intersection
                        if (!this.edgeCrossingCache[ecId])
                            this.edgeCrossingCache[ecId] = {};

                        this.edgeCrossingCache[ecId][eId] = 1;
                        // update the total count
                        this.metricsCache.edgeCrossing++;
                    }
                }
            }
            // recalculate edgeNodeOcclusion
            if (this.weights.edgeNodeOcclusion > 0) {
                this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                    this.graph,
                    eId,
                    this.minDist
                );
            }
        }
        this.metricsPerNode[nId] = nodeMetrics;
        for (let m in this.metricsCache)
            this.metricsCache[m] += this.metricsPerNode[nId][m];
    }
}
function updateMetrics(nodeId, oldPos) {
    this.metricsPerNode[nodeId].nodeOcclusion = 0;
    this.metricsCache.nodeOcclusion = 0;
    this.nodesWithAngles = 0;

    let node = this.graph.getNodeAttributes(nodeId);

    for (let nId of this.graph.nodes()) {
        // update indexes
        this.nodesWithAngles += this.graph.neighbors(nId).length > 1 ? 1 : 0;

        if (nodeId !== nId) {
            // remove old value from other node sum
            let n = this.graph.getNodeAttributes(nId);
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
            this.metricsPerNode[nodeId].nodeOcclusion += 1 / newD ** 2;
            // update the total sum for nodeOcclusion
            this.metricsCache.nodeOcclusion += this.metricsPerNode[
                nodeId
            ].nodeOcclusion;
        }
    }

    // update edge metrics
    let nodeMetrics = this.metricsPerNode[nodeId];
    nodeMetrics.angularResolution = evaluator.angularResolution(
        this.graph,
        nodeId
    );
    nodeMetrics.edgeLength = 0;
    nodeMetrics.edgeCrossing = 0;
    for (let eId of this.graph.outEdges(nodeId)) {
        nodeMetrics.edgeLength += evaluator.edgeLength(
            this.graph,
            eId,
            this.metricsParam.requiredEdgeLength
        );
        let targetId = this.graph.target(eId);
        this.metricsPerNode[
            targetId
        ].angularResolution = evaluator.angularResolution(this.graph, targetId);

        if (this.edgeCrossingCache[eId]) {
            // remove the current edge from the total
            this.metricsCache.edgeCrossing -= Object.keys(
                this.edgeCrossingCache[eId]
            ).length;

            // remove current edge from the other crossed edges
            // needed when those edges get modified
            for (let ecId in this.edgeCrossingCache[eId]) {
                delete this.edgeCrossingCache[ecId][eId];
            }
        }
        // get new intersections and update other edges
        this.edgeCrossingCache[eId] = evaluator.edgeCrossing(this.graph, eId);

        for (let ecId in this.edgeCrossingCache[eId]) {
            if (!this.edgeCrossingCache[ecId])
                this.edgeCrossingCache[ecId] = {};
            this.edgeCrossingCache[ecId][eId] = 1;
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

function toSigNode(node) {
    let n = this.graph.getAttributes(node);
    return n;
}
