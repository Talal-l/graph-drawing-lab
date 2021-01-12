import { distance, random, shuffle, Vec, equal, minMaxNorm } from "./util.js";

import {
    nodeOcclusionN,
    nodeEdgeOcclusionN,
    edgeLengthN,
    edgeCrossingN,
    angularResolutionN,
    angularResolutionNFast,
} from "./metrics2.js";

import { FakeNormalization as Normalization } from "./normalization.js";

export { generateGraph, Graph };

/**
 * Creates a random spanning tree for the given graph.
 *
 * @param {object} G -  graph instance
 * @returns {undefined}
 *
 */
function ranSpanningTree(G) {
    // deep copy of the existing nodes
    let outTree = G.nodes(true);
    // select the root
    let inTree = [outTree.pop()];

    while (outTree.length) {
        // pick a node from outside the tree
        let source = outTree.pop();
        // pick a random node from the tree
        let target = inTree[random(0, inTree.length - 1)];
        // create an edge
        G.addEdge(target.id, source.id);
        // add node to tree
        inTree.push(source);
    }
}
/*
 *
 * @param {number} nMin  Minimum number of nodes
 * @param {number} nMax  Maximum number of nodes
 * @param {number} eMin  Minimum number of edges
 * @param {number} eMax  Maximum number of edges
 * @param {object} width Width of the HTML canvas element
 * @param {object} height Height of the HTML canvas element
 * @returns {object} a graph object
 */
function generateGraph(nMin, nMax, eMin, eMax, width, height, s) {
    const x = width;
    const y = height;

    let G = new Graph();
    const N = random(nMin, nMax);
    const eLimit = (N * (N - 1)) / 2;
    let E = random(Math.min(eMin, eLimit), Math.min(eMax, eLimit));

    for (let i = 0; i < N; i++) {
        let n = {
            id: i,
            x: (0.5 - Math.random()) * x,
            y: (0.5 - Math.random()) * y,
        };
        G.addNode(n);
    }
    let nodes = G.nodes();

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
            let n1 = nodes[random(0, N - 1)].id;
            let n2 = nodes[random(0, N - 1)].id;
            if (n1 !== n2 && !G.hasEdge(n1, n2)) {
                G.addEdge(n1, n2);
                nEdge--;
                // update total edge count
                E--;
            }
        }
    }
    return G;
}

class Graph {
    constructor(graph, options) {
        this._nodes = [];
        this._adjList = [];

        this.status = Graph.status.DIRTY;
        // init normalization objects
        this._zn = new Normalization();

        options = options || {};
        this.nodeSize = 10;
        this.edgeSize = 1.5;
        this.nodeColor = "#000";
        this.edgeColor = "#000";

        this._metrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };
        this._normalMetrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };
        const width = 1600;
        const height = 880;
        this.defaultBounds = {
            xMax: width / 2 - 20,
            yMax: height / 2 - 20,
            xMin: -width / 2 - 20,
            yMin: -height / 2 - 20,
        };
        this.bounds = { ...this.defaultBounds };

        this.requiredEdgeLengthPerc = 0.5;
        this.requiredEdgeLength = 100;
        this.metricsParam = options.metricsParam || {
            requiredEdgeLength: 100,
        };
        this.weights = options.weights || {
            nodeOcclusion: 1,
            nodeEdgeOcclusion: 1,
            edgeLength: 1,
            edgeCrossing: 1,
            angularResolution: 1,
        };

        this.minDist = 10;
        this.maxDist = distance(
            { x: this.bounds.xMax, y: this.bounds.yMax },
            { x: this.bounds.xMin, y: this.bounds.yMin }
        );

        // keep track of number of nodes with deg > 1
        // used to calculate the max value for angularResolution
        this._nodesWithAngles = 0;
    }
    get nextId() {
        return this._nextId++;
    }

    nodes(copy = false) {
        let clone = [];
        if (copy) {
            for (let n of this._nodes) {
                clone.push({ ...n });
            }
        } else clone = this._nodes;
        return clone;
    }

    addNode(node) {
        this.status = Graph.status.DIRTY;
        node.id = this._nodes.length;
        this._nodes.push(node);
        this._adjList.push(new Array(0));
        this._adjList[this._nodes.length - 1] = [];
        updateBounds.call(this);
    }
    getNodePos(nodeId) {
        return { x: this._nodes[nodeId].x, y: this._nodes[nodeId].y };
    }
    nodesIds() {
        let ids = [];
        for (let i = 0; i < this._nodes.length; i++) {
            if (i !== null) {
                ids.push(i);
            }
        }

        return ids;
    }
    removeNode(nodeId) {
        this.status = Graph.status.DIRTY;

        this._nodes.copyWithin(nodeId, nodeId + 1);
        this._nodes.length--;
        this._adjList.copyWithin(nodeId, nodeId + 1);
        this._adjList.length--;

        for (let i = 0; i < this._nodes.length; i++) {
            if (i !== this._nodes[i].id) {
                this._nodes[i].id = i;
            }
            let index = -1;
            for (let j = 0; j < this._adjList[i].length; j++) {
                if (this._adjList[i][j] === nodeId) {
                    index = j;
                } else if (this._adjList[i][j] > nodeId) {
                    this._adjList[i][j]--;
                }
            }
            if (index !== -1) {
                this._adjList[i].copyWithin(index, index + 1);
                this._adjList[i].length--;
            }
        }

        updateBounds.call(this);
    }

    // effectBounds will determine whether moving outside the bounds will expand them
    // or do nothing.
    // returns the new position if withing bound or null if outside.
    moveNode(nodeId, vec, effectBounds = false) {
        let node = this._nodes[nodeId];

        let x = node.x + vec.x;
        let y = node.y + vec.y;

        // TODO: Compare to the bounds in the java code
        if (!effectBounds && !this.withinBounds(x, y)) {
            return null;
        }

        // this is needed since we don't compute metrics in the constructor to avoid slowdowns when loading the graph in the ui
        if (this.status === Graph.status.DIRTY) {
            this._metrics = this.calcMetrics();
        }
        let oldPosMetrics = this.calcNodeMetrics(nodeId);
        let oldOtherAngular = 0;
        for (let adjN of this._adjList[nodeId]) {
            oldOtherAngular += angularResolutionNFast(this, adjN);
        }
        oldPosMetrics.angularResolution += oldOtherAngular;

        node.x = x;
        node.y = y;

        let newPosMetrics = this.calcNodeMetrics(nodeId);
        let newOtherAngular = 0;
        for (let adjN of this._adjList[nodeId]) {
            newOtherAngular += angularResolutionNFast(this, adjN);
        }
        newPosMetrics.angularResolution += newOtherAngular;

        this._metrics = updateMetrics(
            this._metrics,
            oldPosMetrics,
            newPosMetrics
        );
        this._normalMetrics = this.normalizeAll(this._metrics);

        if (effectBounds) {
            updateBounds.call(this);
        }

        this.status = Graph.status.COMPUTED;
        return { x: node.x, y: node.y };
    }
    // defaults to true since it's mostly used in the ui and we want to
    // always change the bounds there
    setNodePos(nodeId, newPos, effectBounds = true) {
        let node = this._nodes[nodeId];
        let a = new Vec(node.x, node.y);
        let b = new Vec(newPos.x, newPos.y);
        return this.moveNode(nodeId, b.sub(a), effectBounds);
    }
    // returns the objective generated by the move or null if out of bound
    // it doesn't move the node
    testMove(nodeId, vec, effectBounds = false) {
        if (this.status === Graph.status.DIRTY) {
            this._metrics = this.calcMetrics();
            // normalize so we can preserve the normalized value after the move
            this._normalMetrics = this.normalizeAll(this._metrics);
        }
        let oldMetrics = { ...this._metrics };
        let oldNormalMetrics = { ...this._normalMetrics };
        let oldPosX = this._nodes[nodeId].x;
        let oldPosY = this._nodes[nodeId].y;

        let newPos = this.moveNode(nodeId, vec, effectBounds);
        // move is out of bound
        if (!newPos) return null;

        let objective = this.objective();

        // reset the node movement
        this._nodes[nodeId].x = oldPosX;
        this._nodes[nodeId].y = oldPosY;
        this._metrics = oldMetrics;
        // ignore the new history for the current node. Not sure if this is the best approach
        //this._normalMetrics = oldNormalMetrics;

        this.status = Graph.status.COMPUTED;
        return objective;
    }

    adjList() {
        return this._adjList;
    }

    edges() {
        let nodes = this._nodes;
        let adj = this._adjList;
        let edges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < adj[i].length; j++) {
                if (adj[i][j] != null) edges.push(`${i}->${adj[i][j]}`);
            }
        }
        return edges;
    }
    edgesNum() {
        let E = 0;
        let nodes = this._nodes;
        let adj = this._adjList;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < adj[i].length; j++) {
                if (adj[i][j] != null) E++;
            }
        }
        return E;
    }
    addEdge(n1Id, n2Id) {
        if (n1Id == null || n2Id == null)
            throw `invalid parameters ${n1Id} ${n2Id}`;
        this.status = Graph.status.DIRTY;
        if (!this.hasEdge(n1Id, n2Id)) {
            this._adjList[n1Id].push(n2Id);
            this._adjList[n2Id].push(n1Id);
        }
    }
    removeEdge(source, target) {
        this.status = Graph.status.DIRTY;
        for (let i = 0; i < this._adjList[source].length; i++) {
            if (this._adjList[source][i] === target) {
                this._adjList[source].splice(i, 1);
            }
        }
        for (let i = 0; i < this._adjList[target].length; i++) {
            if (this._adjList[target][i] === source) {
                this._adjList[target].splice(i, 1);
            }
        }
    }

    hasEdge(source, target) {
        for (let a of this._adjList[source]) {
            if (a === target) return true;
        }
        for (let a of this._adjList[target]) {
            if (a === source) return true;
        }
        return false;
    }

    nodeObjective(nodeId) {
        let wSum = 0;
        let normalMetrics = this.normalizeAll(this.calcNodeMetrics(nodeId));
        for (let key in normalMetrics) {
            wSum += normalMetrics[key] * this.weights[key];
        }

        if (!Number.isFinite(wSum) || wSum < 0) {
            throw `invalid weights or metrics\nmetrics:\n ${JSON.stringify(
                normalMetrics
            )}\nweights:\n ${JSON.stringify(this.weights)}`;
        }
        return wSum;
    }

    objective() {
        if (this.status === Graph.status.DIRTY) {
            this._metrics = this.calcMetrics();
        }
        this._normalMetrics = this.normalizeAll(this._metrics);
        let wSum = 0;
        for (let key in this._normalMetrics) {
            wSum += this._normalMetrics[key] * this.weights[key];
        }
        if (!Number.isFinite(wSum) || wSum < 0) {
            throw `invalid weights or metrics\nmetrics:\n ${JSON.stringify(
                this._normalMetrics
            )}\nweights:\n ${JSON.stringify(this.weights)}`;
        }
        return wSum;
    }
    normalMetrics() {
        return this._normalMetrics;
    }
    normalizeAll(metrics) {
        // use zScore normalization except for edge crossing
        let normalMetrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };

        if (this.weights.edgeCrossing) {
            let E = 0;
            for (let i = 0; i < this._adjList.length; i++) {
                E += this._adjList[i].length;
            }
            E = E / 2;
            normalMetrics.edgeCrossing =
                E > 1 ? metrics.edgeCrossing / ((E * (E - 1)) / 2) : 0;

            //console.log("edgeCrossing: " + metrics.edgeCrossing.toFixed(10) + " normalized to: " + normalMetrics.edgeCrossing.toFixed(10));
        }

        //console.log(`edgeCrossing: ${this._metrics.edgeCrossing}, edgeCrossingNorm: ${edgeCrossingNorm}, max: ${((E * (E - 1)) / 2)}`);
        if (this.weights.nodeOcclusion) {
            normalMetrics.nodeOcclusion = this._zn.normalize(
                "nodeOcclusion",
                metrics.nodeOcclusion
            );
            //console.log("nodeNodeOcclusion: " + metrics.nodeOcclusion.toFixed(10) + " normalized to: " + normalMetrics.nodeOcclusion.toFixed(10));
        }
        if (this.weights.nodeEdgeOcclusion) {
            normalMetrics.nodeEdgeOcclusion = this._zn.normalize(
                "nodeEdgeOcclusion",
                metrics.nodeEdgeOcclusion
            );
            //console.log("nodeEdgeOcclusion: " + metrics.nodeEdgeOcclusion.toFixed(10) + " normalized to: " + normalMetrics.nodeEdgeOcclusion.toFixed(10));
        }
        if (this.weights.edgeLength) {
            normalMetrics.edgeLength = this._zn.normalize(
                "edgeLength",
                metrics.edgeLength
            );
            //console.log("edgeLength: " + metrics.edgeLength.toFixed(10) + " normalized to: " + normalMetrics.edgeLength.toFixed(10));
        }
        if (this.weights.angularResolution) {
            normalMetrics.angularResolution = metrics.angularResolution;
            //console.log("angularResolution: " + metrics.angularResolution.toFixed(10) + " normalized to: " + normalMetrics.angularResolution.toFixed(10));
        }

        return normalMetrics;
    }

    calcMetrics() {
        console.log("calcMetrics");
        let metrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };
        for (let i = 0; i < this._nodes.length; i++) {
            if (this.weights.nodeOcclusion) {
                metrics.nodeOcclusion += nodeOcclusionN(this, i);
            }
            if (this.weights.nodeEdgeOcclusion) {
                metrics.nodeEdgeOcclusion += nodeEdgeOcclusionN(this, i);
            }
            if (this.weights.edgeLength) {
                metrics.edgeLength += edgeLengthN(
                    this,
                    this.metricsParam.requiredEdgeLength,
                    i
                );
            }
            if (this.weights.edgeCrossing) {
                metrics.edgeCrossing += edgeCrossingN(this, i) / 4;
            }
            if (this.weights.angularResolution) {
                metrics.angularResolution += angularResolutionNFast(this, i);
            }
        }

        metrics.nodeOcclusion /= 2;

        this.status = Graph.status.COMPUTED;
        return metrics;
    }
    calcNodeMetrics(nodeId) {
        let metrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };

        if (this.weights.nodeOcclusion) {
            metrics.nodeOcclusion = nodeOcclusionN(this, nodeId);
        }
        if (this.weights.nodeEdgeOcclusion) {
            metrics.nodeEdgeOcclusion = nodeEdgeOcclusionN(this, nodeId);
        }

        if (this.weights.edgeLength) {
            metrics.edgeLength = edgeLengthN(
                this,
                this.metricsParam.requiredEdgeLength,
                nodeId
            );
        }

        if (this.weights.edgeCrossing) {
            metrics.edgeCrossing = edgeCrossingN(this, nodeId);
        }

        if (this.weights.angularResolution) {
            metrics.angularResolution = angularResolutionNFast(this, nodeId);
        }
        return metrics;
    }

    setMetricParam(metricsParam) {
        let diff = false;
        for (let key of Object.keys(metricsParam)) {
            if (this.metricsParam[key] !== metricsParam[key]) {
                diff = true;
                break;
            }
        }

        if (diff) {
            this.status = Graph.status.DIRTY;
            this.metricsParam = metricsParam;
        }
    }
    setWeights(weights) {
        Object.assign(this.weights, weights);
    }

    density() {
        let V = this._nodes.length;
        let E = this.edges().length;
        let D = E / (V * (V - 1)) || 0;
        return D;
    }

    clear() {
        this.status = Graph.status.DIRTY;
        this._nodes = [];
        this._adjList = [];
        this._nextId = -1;
        this.bounds = { ...this.defaultBounds };
        this._zn = new Normalization();
        return this;
    }
    setBounds(bounds) {
        this.bounds = bounds;
        updateBounds.call(this);
    }
    withinBounds(x, y) {
        let { xMax, yMax, xMin, yMin } = this.bounds;
        return x < xMax && x > xMin && y < yMax && y > yMin;
    }
    // returns the min bounding box
    getBoundaries() {
        let b;

        b = {
            xMax: 0,
            yMax: 0,
            xMin: 0,
            yMin: 0,
        };
        for (let n of this._nodes) {
            if (n) {
                b.xMax = Math.max(b.xMax, n.x);
                b.xMin = Math.min(b.xMin, n.x);
                b.yMax = Math.max(b.yMax, n.y);
                b.yMin = Math.min(b.yMin, n.y);
            }
        }
        return b;
    }
    // only copies the nodes and edges
    readGraph(graph) {
        let gn = graph._nodes;
        let gAdj = graph._adjList;
        this._nodes = new Array(gn.length);
        this._adjList = new Array(gn.length);
        for (let i = 0; i < gn.length; i++) {
            this._nodes[i] = { ...gn[i] };
            this._adjList[i] = [...gAdj[i]];
        }

        updateBounds.call(this);
    }
    // copies a complete graph
    restoreFrom(graph) {
        let g = graph;
        this.clear();

        this._zn = new Normalization().deserialize(graph._zn);
        this.options = { ...g.options };
        this.bounds = { ...g.bounds };
        this._nextId = g._nextId;
        this.requiredEdgeLengthPerc = g.requiredEdgeLengthPerc;
        this.metricsParam = { ...g.metricsParam };
        this.weights = { ...g.weights };
        this._metrics = { ...g._metrics };
        this._normalMetrics = { ...g._normalMetrics };
        this.minDist = g.minDist;
        this.maxDist = g.maxDist;
        this._nodesWithAngles = g.nodesWithAngles;
        this.readGraph(g);
        this.status = g.status;
        return this;
    }
    fromGraphology(graph) {
        this.status = Graph.status.DIRTY;
        this.clear();
        let idMap = new Map();
        for (let i = 0; i < graph.nodes.length; i++) {
            let n = graph.nodes[i];
            if (n == null) continue;
            let pos = {
                x: n.attributes.x,
                y: n.attributes.y,
                id: Number(n.attributes.id),
            };
            idMap.set(n.key, i);
            this._nodes.push(pos);
        }
        for (let i = 0; i < this._nodes.length; i++) {
            this._adjList[i] = new Array();
        }
        // assuming the ids are sequential
        for (const e of graph.edges) {
            let sourceIndex = Number(idMap.get(e.source));
            let targetIndex = Number(idMap.get(e.target));
            if (!this._adjList[sourceIndex].includes(targetIndex))
                this._adjList[sourceIndex].push(targetIndex);

            if (!this._adjList[targetIndex].includes(sourceIndex))
                this._adjList[targetIndex].push(sourceIndex);
        }
        return this;
    }
    toJSON() {
        let s = {};
        s._nodes = [...this._nodes];
        s._adjList = [...this._adjList];
        s.status = this.status;
        s._zn = this._zn.serialize(false);
        s.options = { ...this.options };
        s.nodeSize = this.nodeSize;
        s.edgeSize = 1.5;
        s.nodeColor = this.nodeColor;
        s.edgeColor = this.edgeColor;
        s._metrics = { ...this._metrics };
        s._normalMetrics = { ...this._normalMetrics };
        s.bounds = { ...this.bounds };
        s._nextId = this._nextId;
        s.requiredEdgeLength = this.requiredEdgeLengthPerc;
        s.requiredEdgeLength = this.requiredEdgeLength;
        s.metricsParam = { ...this.metricsParam };
        s.weights = { ...this.weights };
        s.minDist = this.minDist;
        s.maxDist = this.maxDist;
        s._nodesWithAngles = this._nodesWithAngles;

        return s;
    }
    serialize(string = true) {
        if (string === true) return JSON.stringify(this);
        else return this.toJSON();
    }
    deserialize(data) {
        if (typeof data === "string") data = JSON.parse(data);
        return this.restoreFrom(data);
    }

    export(string = true) {
        let serialized = {
            graph: {
                nodes: [...this._nodes],
                adjList: [...this._adjList],
            },
        };

        if (string === true) return JSON.stringify(serialized);

        return serialized;
    }

    import(data) {
        this.status = Graph.status.DIRTY;
        if (typeof data === "string") {
            data = JSON.parse(data);
        }
        let nodeNum = data.graph.nodes.length;
        this._nodes = new Array(nodeNum);
        this._adjList = new Array(nodeNum);

        for (let i = 0; i < nodeNum; i++) {
            this._nodes[i] = { ...data.graph.nodes[i] };
            this._nodes[i].id = i;
            this._adjList[i] = [...data.graph.adjList[i]];
        }
        this.nextId = this._nodes.length;

        // TODO: make it so it's possible to update bound on load without doing it accidentally
        //if (this.effectBounds){
        //updateBounds.call(this);
        //}
        return this;
    }
    toSigGraph() {
        let graph = { nodes: [], edges: [] };
        let nodes = this._nodes;
        let adj = this._adjList;
        for (let i = 0; i < nodes.length; i++) {
            let n = {
                id: i,
                label: i + "",
                size: this.nodeSize,
                color: this.nodeColor,
                x: nodes[i].x,
                y: nodes[i].y,
            };

            graph.nodes.push(n);
            for (let j = 0; j < adj[i].length; j++) {
                graph.edges.push({
                    source: i,
                    target: adj[i][j],
                    id: `${i}->${adj[i][j]}`,
                    color: this.edgeColor,
                    size: this.edgeSize,
                });
            }
        }
        return graph;
    }
    resetZn() {
        this._zn = new Normalization();
    }
}
Graph.status = {
    COMPUTED: 0, // metrics are up to data with the graph
    DIRTY: 1, // metrics and graph are out of sync (require recomputing the metrics)
};

function updateMetrics(currentMetrics, oldMetrics, newMetrics) {
    let metrics = { ...currentMetrics };
    for (let key in metrics) {
        if (!isFinite(metrics[key])) {
            throw ` ${key} = ${metrics[key]} `;
        }

        if (equal(metrics[key], oldMetrics[key])) {
            metrics[key] = oldMetrics[key];
        }
        metrics[key] = metrics[key] - oldMetrics[key] + newMetrics[key];

        if (metrics[key] < 0) {
            throw ` ${key} = ${metrics[key]} `;
        }
    }
    return metrics;
}

function updateBounds() {
    return;
    let b = this.getBoundaries();

    if (
        !this.withinBounds(b.xMax, b.yMax) ||
        !this.withinBounds(b.xMin, b.yMin)
    ) {
        this.bounds = {
            xMax: Math.max(this.bounds.xMax, b.xMax),
            yMax: Math.max(this.bounds.yMax, b.yMax),
            xMin: Math.min(this.bounds.xMin, b.xMin),
            yMin: Math.min(this.bounds.yMin, b.yMin),
        };
    }
    this.maxDist = distance(
        { x: this.bounds.xMax, y: this.bounds.yMax },
        { x: this.bounds.xMin, y: this.bounds.yMin }
    );
}
