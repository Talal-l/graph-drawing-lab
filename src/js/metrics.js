import {
    distance,
    transform,
    Vec,
    pointSegDistance,
    getEdgeNodes,
    minMaxNorm,
    intersection
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
 * @param {object} graph - Graphology graph instance
 * @param {string} nodeId - Target node
 * @param {number} min - Min distance
 * @returns {number} - Score
 */
function nodeNodeOcclusion(graph, nodeId, min) {
    let node = graph.getNodeAttributes(nodeId);
    let sum = 0;
    for (let id of graph.nodes()) {
        if (id !== nodeId) {
            let n = graph.getNodeAttributes(id);
            let d = distance(node, n);
            if (d < min) {
                d = min;
            }
            sum += 1 / d ** 2;
        }
    }
    return sum;
}

/**
 * Calculate the score describing closeness of an edge to all nodes in the graph.
 * @param {object} graph - Graphology graph instance
 * @param {object} edgeId - Id of the edge to measure
 * @param {number} min - Min distance
 * @returns {number} - Score
 */
function edgeNodeOcclusion(graph, edgeId, min) {
    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let seg = {
        start: new Vec(sourceNode),
        end: new Vec(targetNode)
    };

    let sum = 0;
    for (let nId of graph.nodes()) {
        let n = graph.getNodeAttributes(nId);
        let d = pointSegDistance(n, seg);
        if (d < min) {
            d = min;
        }
        // not an endpoint
        if (!graph.extremities(edgeId).includes(nId)) {
            sum += 1 / d ** 2;
        }
    }

    return sum;
}
/**
 * Calculate a score describing how far an edge is from the desired length.
 * @param {object} graph - Graphology graph instance
 * @param {object} edgeId - Id of the edge to measure
 * @param {number} len - The desired edge length
 * @returns {number} - Score
 */
function edgeLength(graph, edgeId, len) {
    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let d = distance(sourceNode, targetNode);
    return (d - len) ** 2;
}

/** Find all edges intersecting with the given edge
 * @param {object} graph - Graphology graph instance
 * @returns {Object} - Map of edge ids intersecting the given edge
 */
function edgeCrossing(graph, edgeId) {
    let isecList = Object.create(null);

    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let seg1 = {
        start: new Vec(sourceNode),
        end: new Vec(targetNode)
    };

    for (let eId of graph.edges()) {
        if (edgeId === eId) continue;
        let endpointsIds = graph.extremities(eId);
        let sourceNode2 = graph.getNodeAttributes(endpointsIds[0]);
        let targetNode2 = graph.getNodeAttributes(endpointsIds[1]);
        let seg2 = {
            start: new Vec(sourceNode2),
            end: new Vec(targetNode2)
        };

        let isec = intersection(seg1, seg2);
        if (
            isec &&
            !endpointsIds.includes(sourceId) &&
            !endpointsIds.includes(targetId)
        ) {
            isecList[eId] = 1;
        }
    }
    return isecList;
}

/**
 * Calculate a score describing the angular resolution between incident edges
 * @param {object} graph - Graphology graph instance
 * @param {object} nodeId - Id of the node to calculate the metric for
 * @returns {number} - Score
 */
function angularResolution(graph, nodeId) {
    let sum = 0;
    let neighborsIds = graph.neighbors(nodeId);
    if (neighborsIds.length > 1) {
        let adj = adjEdges(graph, nodeId, neighborsIds);
        var maxAngle = 360 / neighborsIds.length || 360;

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
 * @param {object} graph - An object with x,y coordinate
 * @param {string} nId - Node id
 * @param {Array} nodesIds - An array with ids of nodes connected to n
 * @returns {Array} - An array with number of edges at an angle
 * Algorithm author: ebraheem.almuaili@gmail.com
 */
function adjEdges(graph, nId, nodesIds) {
    let n = graph.getNodeAttributes(nId);
    let adj = new Array(360);
    let nVec = new Vec(n);
    let base = new Vec(1000, 0).sub(nVec);
    for (const id of nodesIds) {
        let n = graph.getNodeAttributes(id);
        let otherN = new Vec(n).sub(nVec);
        let a = Math.floor((base.angle(otherN) * 180) / Math.PI);
        // account for angles more than 180 deg
        if (otherN.y > 0) a = 360 - a;
        // store number of edges with the same angle or less than 1 deg diff
        adj[a] = adj[a] ? ++adj[a] : 1;
    }
    return adj;
}
