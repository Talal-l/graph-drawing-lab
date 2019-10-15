// util.js imports
/*global refreshScreen, getEdgeNodes, distance, edgeIntersection*/

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
            // if n != start or end
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

function angularResolution(e1, e2) {}
