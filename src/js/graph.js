/*global sigma*/

import {
    distance,
    random,
    shuffle,
    deepCopy,
    getEdgeId,
    Vec,
    defaults,
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
        this.metricsParam = options.metricsParam || evaluator.defaultParams;
        this.weights = options.weights || evaluator.defaultWeights;
        this.metricsCache = {
            nodeOcclusion: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            crossingNum: 0,
            angularResolution: 0
        };
        this.useCache = false;
        this.metricsPerNode = {};
        this.edgeCrossingCahce = {};
    }
    objective(weights) {
        weights = weights || this.weights;
        let wSum = 0;
        for (let key in this.metricsCache)
            wSum += this.metricsCache[key] * weights[key];
        if (!Number.isFinite(wSum)) {
            //throw `invalid weights or metrics\nmetrics:\n ${JSON.stringify(
            //this.metricsCache
            //)}\nweights:\n ${JSON.stringify(weights)}`;
        }
        return wSum;
    }

    metrics() {
        if (!this.metricsCache || !this.useCache) {
            //recalculateCache.call(this);

            this.useCache = true;
        }
        return this.metricsCache;
    }
    setMetricParam(metricsParam) {
        this.useCache = false;
        this.metricsParam = metricsParam;
    }

    updateObjective(node) {
        // TODO: only recalculate the diff instead of the whole graph
        this.useCache = false;
        //this.metrics();

        // update nodeOcclusion

        return this.objective();
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
        //console.log("moving node: ");
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        node = this.graph.nodes(nodeId);
        let oldPos = { x: node.x, y: node.y };
        node.x += vec.x;
        node.y += vec.y;
        updateNodeOcclusion.call(this, node, oldPos);

        // update edge metrics
        {
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
                ].angularResolution = evaluator.angularResolution(
                    this.graph,
                    target
                );

                //remove the current edge from total and remove from cache
                if (this.edgeCrossingCahce[e.id]) {
                    this.metricsCache.crossingNum -= Object.keys(
                        this.edgeCrossingCahce[e.id]
                    ).length;

                    // remove old info
                    for (let ec in this.edgeCrossingCahce[e.id]) {
                        delete this.edgeCrossingCahce[ec][e.id];
                    }
                }
                // get new intersections and update other edges
                this.edgeCrossingCahce[e.id] = edgeCrossing(this.graph, e);
                for (let ec in this.edgeCrossingCahce[e.id]) {
                    if (!this.edgeCrossingCahce[ec])
                        this.edgeCrossingCahce[ec] = {};
                    this.edgeCrossingCahce[ec][e.id] = 1;
                    this.metricsCache.crossingNum++;
                }
            }
        }
        // recalculate metrics that are hard to optimize

        this.metricsCache.edgeCrossing = 0;
        this.metricsCache.edgeNodeOcclusion = 0;
        //for (let e of this.graph.edges()) {
            //this.metricsCache.edgeCrossing += evaluator.edgeCrossing(
                //this.graph,
                //e
            //);


            ////this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
            ////this.graph,
            ////e
            ////);
        //}
        //console.log(this.metricsCache);
        return this.updateObjective();
    }
    setNodePos(node, { x, y }) {
        let nodeId;
        if (typeof node === "string") nodeId = node;
        else nodeId = node.id;

        let oldPos = { x: node.x, y: node.y };

        node = this.graph.nodes(nodeId);
        node.x = x;
        node.y = y;
        console.log("set pos");

        updateNodeOcclusion.call(this, node, oldPos);

        // update edge metrics
        {
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
                ].angularResolution = evaluator.angularResolution(
                    this.graph,
                    target
                );

                //remove the current edge from total and remove from cache
                if (this.edgeCrossingCahce[e.id]) {
                    this.metricsCache.crossingNum -= Object.keys(
                        this.edgeCrossingCahce[e.id]
                    ).length;

                    // remove old info
                    for (let ec in this.edgeCrossingCahce[e.id]) {
                        delete this.edgeCrossingCahce[ec][e.id];
                    }
                }
                // get new intersections and update other edges
                this.edgeCrossingCahce[e.id] = edgeCrossing(this.graph, e);
                for (let ec in this.edgeCrossingCahce[e.id]) {
                    if (!this.edgeCrossingCahce[ec])
                        this.edgeCrossingCahce[ec] = {};
                    this.edgeCrossingCahce[ec][e.id] = 1;
                    this.metricsCache.crossingNum++;
                }
            }
        }
        // recalculate metrics that are hard to optimize

        this.metricsCache.edgeCrossing = 0;
        this.metricsCache.edgeNodeOcclusion = 0;
        for (let e of this.graph.edges()) {
            //this.metricsCache.edgeCrossing += evaluator.edgeCrossing(
            //this.graph,
            //e
            //);
            this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                this.graph,
                e
            );
        }
        //console.log(this.metricsCache);
        return this.updateObjective();
    }

    setGraph(sigGraph) {
        this.metricsCache = {
            nodeOcclusion: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            crossingNum: 0,
            angularResolution: 0
        };
        this.metricsPerNode = {};

        recalculateCache.call(this);
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
        console.log("adding node");
        this.graph.addNode(node);
        recalculateCache.call(this);
        return this.updateObjective(node.id);
    }
    removeNode(nodeId) {
        console.log("remove node");
        this.graph.dropNode(nodeId);
        recalculateCache.call(this);
        return this.updateObjective(nodeId);
    }

    addEdge(edge) {
        console.log("adding edge");
        this.graph.addEdge(edge);
        recalculateCache.call(this);
        return this.updateObjective(edge.source);
    }
    removeEdge(edgeId) {
        console.log("remove edge");
        let edge = this.graph.edges(edgeId);
        this.graph.dropEdge(edgeId);
        recalculateCache.call(this);
        return this.updateObjective(edge.source.id);
    }

    edges() {
        return this.graph.edges();
    }

    clear() {
        this.graph.clear();
        this.metricsCache = {
            nodeOcclusion: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            crossingNum: 0,
            angularResolution: 0
        };
        this.metricsPerNode = {};
        return this;
    }

    read(obj) {
        this.metricsCache = {
            nodeOcclusion: 0,
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            crossingNum: 0,
            angularResolution: 0
        };
        this.metricsPerNode = {};
        this.graph.read(obj);

        recalculateCache.call(this);
        return this.updateObjective();
    }

    neighbors(node) {
        return this.graph.allNeighbors(node);
    }

    nextNodeId() {
        return this.graph.getNodesCount();
    }
}

// internal methods that must be called with a ConcreteGraph object as the context
function recalculateCache() {
    console.log("recalculateCache");
    this.metricsPerNode = {};
    this.metricsCache = {
        nodeOcclusion: 0,
        edgeNodeOcclusion: 0,
        edgeLength: 0,
        edgeCrossing: 0,
        crossingNum: 0,
        angularResolution: 0
    };
    this.edgeCrossingCahce = {};

    for (let n of this.graph.nodes()) {
        let nodeMetrics = {
            nodeOcclusion: evaluator.nodeNodeOcclusion(this.graph, n),
            angularResolution: evaluator.angularResolution(this.graph, n),
            edgeNodeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            crossing: {}
        };
        for (let e of this.graph.outEdges(n)) {
            nodeMetrics.edgeLength += evaluator.edgeLength(
                this.graph,
                e,
                this.metricsParam.requiredEdgeLength
            );
            this.metricsCache.edgeCrossing += evaluator.edgeCrossing(
                this.graph,
                e
            );

            // what edges does this edge cross?
            let cross = edgeCrossing(this.graph, e);

            for (let ec in cross) {
                // first time we are tracking this edge?
                if (!this.edgeCrossingCahce[e.id])
                    this.edgeCrossingCahce[e.id] = {};

                // did you account for this intersection before?
                if (!this.edgeCrossingCahce[e.id][ec]) {
                    // add to own entry
                    this.edgeCrossingCahce[e.id][ec] = 1;
                    // let the other edge know that it has a new intersection
                    if (!this.edgeCrossingCahce[ec])
                        this.edgeCrossingCahce[ec] = {};

                    this.edgeCrossingCahce[ec][e.id] = 1;
                    // update the total count
                    this.metricsCache.crossingNum++;
                    console.log(this.metricsCache);
                }
            }

            this.metricsCache.edgeNodeOcclusion += evaluator.edgeNodeOcclusion(
                this.graph,
                e
            );
        }

        this.metricsPerNode[n.id] = nodeMetrics;
        for (let m in this.metricsCache)
            if (m !== "crossingNum")
                this.metricsCache[m] += this.metricsPerNode[n.id][m];
    }

    this.metricsCache.edgeCrossing /= 2;

    // undo the double counting
    this.useCache = true;
}

// update nodeOcclusion
function updateNodeOcclusion(node, oldPos) {
    this.metricsPerNode[node.id].nodeOcclusion = 0;
    let sum = 0;
    // HACK: small number to use if the distance is 0
    const EPS = 0.000009;
    for (let n of this.graph.nodes()) {
        if (node.id !== n.id) {
            // remove old value from other node sum
            let oldD = distance(oldPos, n);
            if (oldD) oldD = EPS;
            this.metricsPerNode[n.id].nodeOcclusion -= 1 / oldD ** 2;
            // add the new distance
            let newD = distance(node, n);
            if (newD) newD = EPS;
            this.metricsPerNode[n.id].nodeOcclusion += 1 / newD ** 2;

            sum += 1 / newD ** 2;
        }
    }
}
/** Calculate a score describing the intensity of edge crossing.
 * @param {object} graph - A sigma graph instance
 * @returns {object} - Number of edges crossing the given edge
 */
function edgeCrossing(graph, edge) {
    let edges = graph.edges();
    let isecList = {};
    let sum = 0;

    for (let e of edges) {
        let isec = edgeIntersection(edge, e, graph);
        if (
            isec &&
            edge.source !== e.source &&
            edge.target !== e.target &&
            edge.target !== e.source &&
            edge.source !== e.target
        ) {
            isecList[e.id] = 1;
            sum++;
        }
    }
    return isecList;
}
