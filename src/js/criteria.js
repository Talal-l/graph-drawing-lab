// util.js imports
/*global refreshScreen, getEdgeNodes, distance, edgeIntersection Vec,  pointSegDistance*/

/**
 * Calculate the score describing how close nodes are to each other.
 * @param {object} graph - A sigma graph instance
 * @returns {number} - Score
 */
function nodeNodeOcclusion(graph) {
    let nodes = graph.nodes();
    let sum = 0;
    // array of sigma node objects that contain x and y coordinates
    for (let i of nodes) {
        for (let j of nodes) {
            if (i.id !== j.id) {
                let d = distance(i, j);
                // console.log(`distance between ${i.id} and ${j.id} = ${d}`);
                sum += 1 / (d * d);
            }
        }
    }
    return sum;
}

/**
 * Calculate the score describing how close nodes are to edges.
 * @param {object} graph - A sigma graph instance
 * @returns {number} - Score
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

    return sum;
}
/**
 * Calculate a score describing how far are the edges from the desired length.
 * @param {object} graph - A sigma graph instance
 * @param {number} len - The desired edge length
 * @returns {number} - Score
 */
function edgeLength(graph, len) {
    let edges = graph.edges();
    let sum = 0;
    for (let e of edges) {
        console.log(e);
        let [n1, n2] = getEdgeNodes(e, graph);
        let d = distance(n1, n2);
        sum += (d - len) * (d - len);
    }
    return sum;
}

/** Calculate the total number of edge crossings
 * @param {object} graph - A sigma graph instance
 * @returns {number} - Number o edge crossings
 */
function edgeCrossing(graph) {
    let edges = graph.edges();
    let edgeCross = 0;

    for (let i = 0; i < edges.length - 1; i++) {
        let e1 = edges[i];
        for (let j = i + 1; j < edges.length; j++) {
            let e2 = edges[j];
            // TODO: skip if same source or same target
            edgeCross += edgeIntersection(e1, e2, graph) ? 1 : 0;
        }
    }
    return edgeCross;
}

/**
 * Calculate the score describing the angular resolution between edges
 * @param {object} graph - A sigma graph instance
 * @returns {number} - Score
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
            // angle between adj
            if (adj[j] && adj[i]) {
                let a = j - i;
                // only get the inner angle
                if (a > 180) a = 360 - a;
                sum += Math.abs(maxAngle - a);
                console.log(`angle = ${a}`);
                i = j;
                // only for finding the first one
            } else if (adj[j]) {
                i = j;
            }
        }
    }
    console.log(`sum = ${sum} maxAngle = ${maxAngle}`);
    return minMaxNorm(sum, 0, maxSum);
}

/**
 * Get the adj edges sorted by their angle from the x-axis
 * @param {object} graph - A sigma graph instance
 * @returns {Array} - array with number of edges at an angle
 * Algorithm: ebraheem.almuaili@gmail.com
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
