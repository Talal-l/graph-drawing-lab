/**
 * 
 * @param {sigma.classes.graph} graph - A sigma graph instance
 */
function nodeNodeOcclusion(graph) {
    let nodes = graph.nodes();
    let sum = 0;
    // array of sigma node objects that contain x and y coordinates
    for (i of nodes) {
        for (j of nodes) {
            if (i.id !== j.id) {
                let d = distance(i, j);
                // console.log(`distance between ${i.id} and ${j.id} = ${d}`);
                sum += 1 / d ** 2;
            }
        }
    }
    return sum;
}
/**
 *  
 * @param {sigma.classes.graph} graph - A sigma graph instance
 * @param {Number} len - The desired edge length
 */
function edgeLength(graph, len) {
    edges = graph.edges();
    let sum = 0;
    for (e of edges) {
        console.log(e);
        [n1, n2] = getEdgeNodes(e, graph);
        let d = distance(n1, n2);
        sum += (d - len) ** 2;
    }
    return  sum;
}

function edgeCrossing() {}

function angularResolution(e1, e2) {}

