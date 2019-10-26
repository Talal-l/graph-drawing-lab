// util.js imports
/*global refreshScreen, getEdgeNodes, distance, edgeIntersection Vec,  pointSegDistance*/

/**
 * Calculate the normalized score describing how close nodes are to each other.
 * @param {object} graph - A sigma graph instance
 * @returns {number} - Normalized score
 */
function nodeNodeOcclusion(graph) {
    let nodes = graph.nodes();
    let sum = 0;
    for (let i of nodes) {
        for (let j of nodes) {
            if (i.id !== j.id) {
                let d = distance(i, j);
                sum += 1 / (d * d);
            }
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
                sum += 1 / pointSegDistance(n, seg);
                console.log(pointSegDistance(n, seg));
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
function edgeLength(graph, len, maxLen) {
    let edges = graph.edges();
    let sum = 0;
    for (let e of edges) {
        console.log(e);
        let [n1, n2] = getEdgeNodes(e, graph);
        let d = distance(n1, n2);
        sum += (d - len) ** 2;
    }

    // in case the set length is larger than the max possible in the canvas
    maxLen = Math.max(length, maxLen);

    return minMaxNorm(sum, 0, sig.graph.edges().length * maxLen ** 2);
}

/** Calculate a normalized score describing the intensity of edge crossing.
 * @param {object} graph - A sigma graph instance
 * @returns {number} - Normalized score
 */
function edgeCrossing(graph) {
    let edges = graph.edges();
    let sum = 0;
    let isecList = [];

    for (let i = 0; i < edges.length - 1; i++) {
        let e1 = edges[i];
        for (let j = i + 1; j < edges.length; j++) {
            let e2 = edges[j];
            // TODO: skip if same source or same target
            let isec = edgeIntersection(e1, e2, graph);
            if (isec) {
                sum++;
                isecList.push(isec);
            }
        }
    }

    let maxCrossing = sig.graph.edges().length * (sig.graph.edges().length - 1);
    return [minMaxNorm(sum, 0, maxCrossing), isecList];
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
        if (E.length < 2) break;

        maxSum += 360;
        let adj = adjEdges(n, E);
        var maxAngle = 360 / E.length;

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
                console.log(`angle = ${a}`);
                i = j;
            } else if (adj[j]) {
                i = j;
            }
        }
    }
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
