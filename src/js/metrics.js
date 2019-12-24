// scope the file so it doesn't conflict with stuff in the global scope
// constructor
// holds the evaluation logic and persists any parameters

import {
    distance,
    transform,
    Vec,
    pointSegDistance,
    getEdgeNodes,
    minMaxNorm,
    edgeIntersection,
    defaults
} from "./util.js";

export { Evaluator };

function Evaluator(params) {
    // TODO: validate params
    this.params = params || defaults.metricsParams;
    this.weights = params.weights;
    this.normalize = true;

    Evaluator.prototype.setParams = function(params) {
        for (let p in params) {
            if (this.params[p] || this.params[p] === 0) {
                if (p === "weights") this.setWeights(params[p]);
                else this.params[p] = params[p];
            } else throw `Invalid parameter ${p}`;
        }
    };
    Evaluator.prototype.setWeights = function(weights) {
        for (let m in this.weights) {
            if (isFinite(weights[m])) this.weights[m] = weights[m];
            else throw `Invalid metric name ${m}`;
        }
    };
    Evaluator.prototype.objective = function(metrics, weights) {
        weights = weights || this.weights;
        let wSum = 0;
        for (let key in metrics) wSum += metrics[key] * weights[key];
        if (!Number.isFinite(wSum)) {
            throw `invalid weights or metrics\nmetrics:\n ${JSON.stringify(
                metrics
            )}\nweights:\n ${JSON.stringify(weights)}`;
        }

        return wSum;
    };
    Evaluator.prototype.metrics = function(graph, params) {
        params = params || this.params;
        let requiredLen = params.requiredEdgeLength;
        let maxEdgeLen = params.maxEdgeLength;

        let metrics = {
            nodeOcclusion: nodeNodeOcclusion(graph),
            edgeNodeOcclusion: edgeNodeOcclusion(graph),
            edgeLength: edgeLength(graph, requiredLen, maxEdgeLen),
            edgeCrossing: edgeCrossing(graph),
            angularResolution: angularResolution(graph)
        };
        return metrics;
    };

    // PRIVATE PROPERTIES
    /**
     * Calculate the normalized score describing how close nodes are to each other.
     * @param {object} graph - A sigma graph instance
     * @returns {number} - Normalized score
     */
    function nodeNodeOcclusion(graph) {
        let nodes = graph.nodes();
        let sum = 0;
        for (let i = 0; i < nodes.length - 1; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                let d = distance(nodes[i], nodes[j]);
                sum += 1 / (d * d);
            }
        }
        return transform(sum);
    }

    /**
     * Calculate the normalized score describing edges and nodes closeness.
     * @param {object} graph - A sigma graph instance
     * @returns {number} - Normalized score
     */
    function edgeNodeOcclusion(graph) {
        let nodes = graph.nodes();
        let edges = graph.edges();
        let sum = 0;

        for (let e of edges) {
            let seg = {
                start: new Vec(graph.nodes(e.source)),
                end: new Vec(graph.nodes(e.target))
            };
            for (let n of nodes) {
                if (n.id !== e.source && n.id !== e.target) {
                    sum += 1 / Math.pow(pointSegDistance(n, seg), 2);
                }
            }
        }

        return transform(sum);
    }
    /**
     * Calculate a normalized score describing how far the edges are from the desired length.
     * @param {object} graph - A sigma graph instance
     * @param {number} len - The desired edge length
     * @param {number} maxLen - Max possible length for an edge
     * @returns {number} - Normalized score
     */
    function edgeLength(graph, len) {
        let edges = graph.edges();
        let max = 0;
        let sum = 0;
        for (let e of edges) {
            let [n1, n2] = getEdgeNodes(e, graph);
            let d = distance(n1, n2);
            let t = Math.abs(d - len);
            max = Math.max(max, t);
            sum += t;
        }

        let maxLen = graph.edges().length * max || 1;
        return minMaxNorm(sum, 0, maxLen);
    }

    /** Calculate a normalized score describing the intensity of edge crossing.
     * @param {object} graph - A sigma graph instance
     * @returns {Array} - Normalized score and a list of intersection points
     */
    function edgeCrossing(graph) {
        let edges = graph.edges();
        let sum = 0;
        let isecList = [];

        for (let i = 0; i < edges.length - 1; i++) {
            let e1 = edges[i];
            for (let j = i + 1; j < edges.length; j++) {
                let e2 = edges[j];
                let isec = edgeIntersection(e1, e2, graph);
                if (
                    isec &&
                    e1.source !== e2.source &&
                    e1.target !== e2.target &&
                    e1.target !== e2.source &&
                    e1.source !== e2.target
                ) {
                    sum++;
                    isecList.push(isec);
                }
            }
        }

        // avoid a NaN on empty graph
        let maxCrossing =
            graph.edges().length * (graph.edges().length - 1) || 1;
        return minMaxNorm(sum, 0, maxCrossing);
    }

    /**
     * Calculate a normalized score describing the angular resolution between incident edges
     * @param {object} graph - A sigma graph instance
     * @returns {number} - Normalized score
     */
    function angularResolution(graph) {
        let nodes = graph.nodes();
        let sum = 0;
        let maxSum = 0;
        for (const n of nodes) {
            let E = graph.allNeighborNodes(n);
            if (E.length > 1) {
                maxSum += 360;
                let adj = adjEdges(n, E);
                var maxAngle = 360 / E.length || 360;

                let i = 0;
                for (let j = 1; j < adj.length; j++) {
                    // make sure to count overlapping edges
                    if (adj[j] > 1) {
                        sum += maxAngle * adj[j];
                    }
                    if (adj[j] && adj[i]) {
                        let a = j - i;
                        // only get the inner angle
                        if (a > 180) a = 360 - a;
                        sum += Math.abs(maxAngle - a);
                        i = j;
                    } else if (adj[j]) {
                        i = j;
                    }
                }
            }
        }

        // avoid NaN for graph that doesn't meet the conditions
        maxSum = maxSum || 1;
        return minMaxNorm(sum, 0, maxSum);
    }

    /**
     * Get the adj edges sorted by their angle from the x-axis (anticlockwise)
     * @param {object} n - An object with x,y coordinate
     * @param {Array} E - An array with nodes connected to n
     * @returns {Array} - An array with number of edges at an angle
     * Algorithm author: ebraheem.almuaili@gmail.com
     */
    function adjEdges(n, E) {
        let adj = new Array(360);
        let nVec = new Vec(n);
        let base = new Vec(1000, 0).sub(nVec);
        for (const e of E) {
            let e1 = new Vec(e).sub(nVec);
            let a = Math.floor((base.angle(e1) * 180) / Math.PI);
            // account for angles more than 180 deg
            if (e1.y > 0) a = 360 - a;
            // store number of edges with the same angle or less than 1 deg diff
            adj[a] = adj[a] ? ++adj[a] : 1;
        }
        return adj;
    }
}
