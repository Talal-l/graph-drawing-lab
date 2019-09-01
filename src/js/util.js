// sigma related utilities (require sigma instance)

/**
 * A wrapper method to use to enable us to attach a callback function to the refresh method
 * @param {sigma} sig - A sigma instance
 * @param {?Function} onRefresh  - Called after a refresh
 * 
 * @return undefined 
 */
function refreshScreen(sig, onRefresh) {
    sig.refresh();
    if (typeof onRefresh === "function") onRefresh(sig);
}


/**
 * 
 * @param {object} e - A sigma graph edge
 * @param {sigma.classes.graph} graph - A sigma graph instance
 */
function getEdgeNodes(e, graph) {
    return [graph.nodes(e.source), graph.nodes(e.target)]
}

/**
 * 
 * @param {object} p1 - An object with x and y properties 
 * @param {object} p2 - An object with x and y properties
 */
function distance(p1, p2) {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}



