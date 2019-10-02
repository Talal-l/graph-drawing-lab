// util.js imports
/*global refreshScreen, getEdgeNodes, distance, edgeIntersection*/
 

/**
 * Calculate the normalized score describing how close nodes are to each other.
 * 0 being very far and 1 being very close.
 * @param {object} graph - A sigma graph instance
 * @returns {number} - TODO: Normalized score
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
                sum += 1 / (d*d);
            }
        }
    }
    return sum;
}
/**
 * Calculate a score describing how far are the edges from the desired length.
 * @param {object} graph - A sigma graph instance
 * @param {number} len - The desired edge length
 * @returns {number} - TODO: Normalized score
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

/** Calculate the edge crossing score where 0 is no crossing and 1 being all edges are crossed.
 * @param {object} graph - A sigma graph instance
 * @returns {number} - TODO: Normalized score
 */
function edgeCrossing(graph) {
    let edges = graph.edges();
    let isecList = [];

    for (let i = 0; i < edges.length - 1; i++) {
        let e1 = edges[i];
        for (let j = i + 1; j < edges.length; j++) {
            let e2 = edges[j];
            // skip if same source or same target
            let i = edgeIntersection(e1, e2, graph);
            i && isecList.push(i);
        }
    }
    return isecList;
}

function angularResolution(e1, e2) {}
