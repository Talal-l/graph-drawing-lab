import {
    distance,
    transform,
    Vec,
    pointSegDistance,
    getEdgeNodes,
    minMaxNorm,
    edgeIntersection,
} from "./util.js";

export {
    nodeNodeOcclusion,
    edgeNodeOcclusion,
    edgeLength,
    edgeCrossing,
    angularResolution
};

/**
 * Calculate the score describing how close node is to all other nodes.
 * @param {object} graph - A sigma graph instance
 * @param {object} node - Target node
 * @returns {number} - Normalized score
 */
function nodeNodeOcclusion(graph, node) {
    let nodes = graph.nodes();
    let sum = 0;
    for (let n of nodes) {
        if (node.id !== n.id) {
            let d = distance(node, n);
            if (!d) {
                // HACK: avoid division by zero when we have overlap
                d = 0.00009;
            }
            sum += 1 / (d * d);
        }
    }
    return sum;
}

/**
 * Calculate the score describing closeness of an edge to all nodes in the graph.
 * @param {object} graph - A sigma graph instance
 * @param {object} edge - Edge to measure
 * @returns {number} - Score
 */
function edgeNodeOcclusion(graph, edge) {
    let nodes = graph.nodes();
    let sum = 0;

    let seg = {
        start: new Vec(graph.nodes(edge.source)),
        end: new Vec(graph.nodes(edge.target))
    };
    for (let n of nodes) {
        let d = pointSegDistance(n, seg);
        if (!d) {
            // HACK: avoid division by zero when we have overlap
            d = 0.00009;
        }
        if (n.id !== edge.source && n.id !== edge.target) {
            sum += 1 / d ** 2;
        }
    }

    return sum;
}
/**
 * Calculate a score describing how far an edge is from the desired length.
 * @param {object} graph - A sigma graph instance
 * @param {object} edge - Edge to measure
 * @param {number} len - The desired edge length
 * @returns {number} - Score
 */
function edgeLength(graph, edge, len) {
    let [n1, n2] = getEdgeNodes(edge, graph);
    let d = distance(n1, n2);
    return (d - len) ** 2;
}

/** Calculate a score describing the intensity of edge crossing.
 * @param {object} graph - A sigma graph instance
 * @returns {Object} - Object with edge crossing with the given edge
 */
function edgeCrossing(graph, edge) {
    let edges = graph.edges();

    let isecList = Object.create(null);
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

/**
 * Calculate a score describing the angular resolution between incident edges
 * @param {object} graph - A sigma graph instance
 * @param {object} node - The node to calculate the metric for
 * @returns {number} - Score
 */
function angularResolution(graph, node) {
    let nodes = graph.nodes();
    let sum = 0;
    let maxSum = 0;
    let E = graph.allNeighborNodes(node);
    if (E.length > 1) {
        maxSum += 360;
        let adj = adjEdges(node, E);
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
    return sum;
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
