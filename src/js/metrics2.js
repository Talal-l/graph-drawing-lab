import * as util from "./util.js";

export let log = {};
log.d = function (msg) {
    console.debug(msg);
};

export class Metrics{
    constructor(){
        this.nodeOcclusion = 0;
        //this.nodeEdgeOcclusion = 0;
        this.edgeCrossing = 0;
        this.edgeLength = 0;
        this.angularResolution = 0;
    }
}
export class MetricsWeights{
    constructor(){
        this.nodeOcclusion = 1;
        //this.nodeEdgeOcclusion = 1;
        this.edgeCrossing = 1;
        this.edgeLength = 1;
        this.angularResolution = 1;
    }
}
export class MetricsParams{
    constructor(){
        this.requiredEdgeLength = 100;
        this.occlusionThreshold = 100;
        this.angleThreshold = 25;
    }
}
export function updateMetrics(metrics, oldV, newV) {
    let m = {...metrics};
    for (let key of Object.keys(m)) {
        if (m[key] != 0) {
            m[key] = m[key] - oldV[key] + newV[key];
        }
        else {
            m[key] = 0;
        }
    }
    return m;
}
export function objective(metrics, weights) {
    let sum = 0;
    for (let key of Object.keys(metrics)) {
        sum += metrics[key] * weights[key];
    }
    return sum;
}
export function calcMetrics(graph, params) {
    console.log("calcMetrics");
    params = params || new MetricsParams();
    let weights = params.weights || new MetricsWeights();
    let metrics = new Metrics();
    for (let i = 0; i < graph._nodes.length; i++) {
        if (weights.nodeOcclusion) {
            metrics.nodeOcclusion += nodeOcclusionN(graph, i, params.occlusionThreshold ** 2);
        }
        //if (weights.nodeEdgeOcclusion) {
            //metrics.nodeEdgeOcclusion += nodeEdgeOcclusionN(graph, i);
        //}
        if (weights.edgeLength) {
            metrics.edgeLength += edgeLengthN(
                graph,
                params.requiredEdgeLength,
                i
            );
        }
        if (weights.edgeCrossing) {
            metrics.edgeCrossing += edgeCrossingN(graph, i);
        }
        if (weights.angularResolution) {
            metrics.angularResolution += angularResolution2N(graph, i, params.angleThreshold);
        }
    }

    metrics.nodeOcclusion /= 2;
    metrics.edgeLength /= 2;
    metrics.edgeCrossing /= 8;
    //metrics.nodeEdgeOcclusion /= 2;
    metrics.angularResolution /= 3;

    return metrics;
}
export function calcNodeMetrics(graph, nodeId, params) {
    params = params || new MetricsParams();
    let metrics = new Metrics();
    let weights = params.weights || new MetricsWeights();

    if (weights.nodeOcclusion) {
        metrics.nodeOcclusion = nodeOcclusionN(graph, nodeId, params.occlusionThreshold ** 2);
    }
    //if (weights.nodeEdgeOcclusion) {
        //metrics.nodeEdgeOcclusion = nodeEdgeOcclusionN(graph, nodeId);
    //}

    if (weights.edgeLength) {
        metrics.edgeLength = edgeLengthN(
            graph,
            params.requiredEdgeLength,
            nodeId
        );
    }

    if (weights.edgeCrossing) {
        metrics.edgeCrossing = edgeCrossingN(graph, nodeId);
    }

    if (weights.angularResolution) {
        metrics.angularResolution = angularResolution2N(graph, nodeId, params.angleThreshold);
    }
    return metrics;
}
export function nodeOcclusion(graph) {
    let sum = 0.0;
    let nodes = graph.nodes();
    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
            if (i !== j) {
                let d = util.distance(nodes[i], nodes[j]);
                if (d !== 0) {
                    sum += 1.0 / (d * d);
                }
            }
        }
    }
    return sum / 2;
}
export function edgeCrossing(graph) {
    const duplicateCount = 8;
    let sum = 0;
    let nodes = graph.nodes();
    let adj = graph.adjList();
    log.edgeCrossingIntersections = [];
    for (let i = 0; i < nodes.length; i++) {
        let l1P1 = nodes[i];
        // nodes connected to i
        for (let nIndex of adj[i]) {
            // create line for edge
            let l1P2 = nodes[nIndex];
            for (let j = 0; j < nodes.length; j++) {
                let l2P1 = nodes[j];
                // nodes connected to j
                for (let nIndex2 of adj[j]) {
                    // create line for edge
                    if (
                        i !== j &&
                        j !== nIndex &&
                        i !== nIndex2 &&
                        nIndex !== nIndex2
                    ) {
                        let l2P2 = nodes[nIndex2];
                        let insec = util.linesIntersect(
                            l1P1.x,
                            l1P1.y,
                            l1P2.x,
                            l1P2.y,
                            l2P1.x,
                            l2P1.y,
                            l2P2.x,
                            l2P2.y
                        );
                        if (insec) {
                            if (i === 0)
                                log.edgeCrossingIntersections.push([
                                    `${i}->${nIndex}`,
                                    `${j}->${nIndex2}`,
                                ]);

                            sum++;
                        }
                    }
                }
            }
        }
    }
    // an intersection between (1->2) and (3->4) will be counted as follows
    // (1->2) Intersects (3->4, 4->3)  +  (2->1) Intersects (3->4, 4->3) +
    // (3->4) Intersects (1->2, 2->1)  +  (4->3) Intersects (1->2, 2->1) = 8 intersections
    // to get the actual count we need to divide by 8
    return sum / duplicateCount;
}

export function edgeLength(graph, requiredLength) {
    //if (!requiredLength) debugger;
    let nodes = graph.nodes();
    let adj = graph.adjList();
    let sum = 0;
    for (let i = 0; i < nodes.length; i++) {
        let p1 = nodes[i];
        for (let j of adj[i]) {
            let p2 = nodes[j];
            let len = util.distance(p1, p2);
            let d = len - requiredLength;
            sum += d * d;
        }
    }
    return sum / 2; // divided by 2 because each edge is counted twice from i to j and from j to i
}
export function angularResolution(graph) {
    let s = 0;
    for (let i = 0; i < graph.nodes().length; i++) {
        s += angularResolutionN(graph, i);
    }
    return s;
}
export function angularResolutionN(graph, p) {
    // Angular Resolution for all angles which are affected by node p
    // This method computes angular resolution criterion
    let angle_threshold = 25; // Threshold value to test the angles which are below this value only
    let c = 0; // to compute the cost of this criterion
    let x1, x2, y1, y2; // used for computing the slopes of the lines
    let degree, radian; // stores the degree between two lines
    let adj = graph.adjList();
    let nodes = graph.nodes();
    for (
        let i = 0;
        i < adj[p].length;
        i++ // for the first line (p,i)
    ) {
        // the following checks the angles whose common node is p
        for (
            let j = i + 1;
            j < adj[p].length;
            j++ // for the second line sharing the same point p as for the first line (p,j)
        ) {
            x1 = nodes[adj[p][i]].x - nodes[p].x; // x coordinate difference in line 1
            y1 = nodes[adj[p][i]].y - nodes[p].y; // y coordinate difference in line 1
            x2 = nodes[adj[p][j]].x - nodes[p].x; // x coordinate difference in line 2
            y2 = nodes[adj[p][j]].y - nodes[p].y; // y coordinate difference in line 2
            degree = Math.acos(
                (x1 * x2 + y1 * y2) /
                    (Math.sqrt(x1 * x1 + y1 * y1) *
                        Math.sqrt(x2 * x2 + y2 * y2))
            ); // compute the angle in radian
            degree = (180 / Math.PI) * degree; // compute the angle in degrees
            if (degree < angle_threshold) {
                // check only the angles which are less than the given threshold
                radian = (Math.PI / 180) * degree; // convert the degree to radian
                c += Math.abs((2 * Math.PI) / adj[p].length - radian); // add the following to the total cost: (((2*PI)/degree of the point p) - degree in radian between line1 and line2)
            }
        }
        // the following checks the angles whose common node is the node adjacent to p (not p itself)
        for (let j = 0; j < adj[adj[p][i]].length; j++) {
            if (adj[adj[p][i]][j] !== p) {
                x1 = nodes[p].x - nodes[adj[p][i]].x; // x coordinate difference in line 1
                y1 = nodes[p].y - nodes[adj[p][i]].y; // y coordinate difference in line 1
                x2 = nodes[adj[adj[p][i]][j]].x - nodes[adj[p][i]].x; // x coordinate difference in line 2
                y2 = nodes[adj[adj[p][i]][j]].y - nodes[adj[p][i]].y; // y coordinate difference in line 2
                degree = Math.acos(
                    (x1 * x2 + y1 * y2) /
                        (Math.sqrt(x1 * x1 + y1 * y1) *
                            Math.sqrt(x2 * x2 + y2 * y2))
                ); // compute the angle in radian
                degree = (180 / Math.PI) * degree; // compute the angle in degrees
                if (degree < angle_threshold) {
                    // check only the angles which are less than the given threshold
                    radian = (Math.PI / 180) * degree; // convert the degree to radian
                    c += Math.abs(
                        (2 * Math.PI) / adj[adj[p][i]].length - radian
                    ); // add the following to the total cost: (((2*PI)/degree of the point i adjacent to p) - degree in radian between line1 and line2)
                }
            }
        }
    }
    return c;
}


export function angularResolution2N(graph,p,threshold) {
    let points = graph.nodes(true);
    let adjacency = graph.adjList();
    //Angular Resolution for all angles which are affected by node p
    //This method computes angular resolution criterion
    let c = 0; // to compute the cost of this criterion
    let x1, x2, y1, y2; // used for computing the slopes of the lines
    let degree, radian; // stores the degree between two lines
    for (let i = 0; i < adjacency[p].length; i++)  // for the first line (p,i)
    {
        // the following checks the angles whose common node is p
        for (let j = i + 1; j < adjacency[p].length; j++)  // for the second line sharing the same point p as for the first line (p,j)
        {
            x1 = points[adjacency[p][i]].x - points[p].x; // x coordinate difference in line 1
            y1 = points[adjacency[p][i]].y - points[p].y; // y coordinate difference in line 1
            x2 = points[adjacency[p][j]].x - points[p].x; // x coordinate difference in line 2
            y2 = points[adjacency[p][j]].y - points[p].y; // y coordinate difference in line 2
            //console.log("p: " + p + " x1: " + x1 + " y1: " + y1 + " x2: " + x2 + " y2: " + y2);
            radian = Math.acos(((x1 * x2) + (y1 * y2)) / (Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2))); // compute the angle in radian
            degree = radian * 180 / Math.PI; // compute the angle in degrees
            //console.log("p: " + p + " degree: " + degree + " radian: " + radian);
            if (degree <threshold)  // check only the angles which are less than the given threshold
            {
                c += Math.abs(((2 * Math.PI) / adjacency[p].length) - radian); // add the following to the total cost: (((2*PI)/degree of the point p) - degree in radian between line1 and line2)
            }
        }
        // the following checks the angles whose common node is the node adjacent to p (not p itself)
        for (let j = 0; j < adjacency[adjacency[p][i]].length; j++) {
            if (adjacency[adjacency[p][i]][j] != p) {
                x1 = points[p].x - points[adjacency[p][i]].x; // x coordinate difference in line 1
                y1 = points[p].y - points[adjacency[p][i]].y; // y coordinate difference in line 1
                x2 = points[adjacency[adjacency[p][i]][j]].x - points[adjacency[p][i]].x; // x coordinate difference in line 2
                y2 = points[adjacency[adjacency[p][i]][j]].y - points[adjacency[p][i]].y; // y coordinate difference in line 2

                //console.log("p: " + p + " x1: " + x1 + " y1: " + y1 + " x2: " + x2 + " y2: " + y2);
                radian = Math.acos(((x1 * x2) + (y1 * y2)) / (Math.sqrt(x1 * x1 + y1 * y1) * Math.sqrt(x2 * x2 + y2 * y2))); // compute the angle in radian
                degree = radian * 180 / Math.PI; // compute the angle in degrees
                //console.log("p: " + p + " degree: " + degree + " radian: " + radian);
                if (degree <threshold)  // check only the angles which are less than the given threshold
                {
                    c += Math.abs(((2 * Math.PI) / adjacency[adjacency[p][i]].length) - radian); // add the following to the total cost: (((2*PI)/degree of the point i adjacent to p) - degree in radian between line1 and line2)
                }
            }
        }
    }
    return c;
}


export function nodeEdgeOcclusion(graph) {
    let distSq = 0.0;
    let sum = 0.0;
    let nodes = graph.nodes();
    let adj = graph.adjList();

    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < adj[i].length; j++) {
            let p1 = nodes[i];
            let p2 = nodes[adj[i][j]];
            if (!p2) continue;
            for (let m = 0; m < nodes.length; m++) {
                if (m !== i && m !== adj[i][j]) {
                    let p3 = nodes[m];
                    distSq = util.ptSegDistSqIn(
                        p1.x,
                        p1.y,
                        p2.x,
                        p2.y,
                        p3.x,
                        p3.y
                    );
                    if (distSq) {
                        if (distSq === 0) distSq = 1; // avoid division by zero
                        sum += 1.0 / distSq;
                    }
                }
            }
        }
    }
    return sum / 2;
}

export function nodeEdgeOcclusionSlow(graph) {
    let distSq = 0.0;
    let sum = 0.0;
    let nodes = graph.nodes();
    let adj = graph.adjList();

    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < adj[i].length; j++) {
            let p1 = nodes[i];
            let p2 = nodes[adj[i][j]];

            for (let m = 0; m < nodes.length; m++) {
                if (m !== i && m !== adj[i][j]) {
                    let p3 = nodes[m];
                    let a1Rad = util.segAngle(p1, p2, p3);
                    let a2Rad = util.segAngle(p2, p1, p3);
                    if (a1Rad <= Math.PI / 2 && a2Rad <= Math.PI / 2) {
                        distSq = util.ptLineDistSq(
                            p1.x,
                            p1.y,
                            p2.x,
                            p2.y,
                            p3.x,
                            p3.y
                        );
                        if (distSq === 0) distSq = 1; // avoid division by zero
                        sum += 1.0 / distSq;
                    }
                }
            }
        }
    }
    return sum / 2;
}

// metrics for a node

export function nodeOcclusionN(graph, nId, threshold) {
    let sum = 0.0;
    let nodes = graph.nodes();
    for (let j = 0; j < nodes.length; j++) {
        if (nId !== j) {
            let d = util.distanceSquared(nodes[nId], nodes[j]);

            if (d < threshold && d !== 0) {
                sum += 1.0 / d;
            }
        }
    }
    return sum;
}
export function edgeCrossingN(graph, nId) {
    let sum = 0;
    let nodes = graph.nodes();
    let adj = graph.adjList();
    let l1P1 = nodes[nId];

    // nodes connected to i
    for (let nIndex of adj[nId]) {
        // create line for edge
        let l1P2 = nodes[nIndex];
        for (let j = 0; j < nodes.length; j++) {
            let l2P1 = nodes[j];
            // nodes connected to j
            for (let nIndex2 of adj[j]) {
                // create line for edge
                if (
                    j !== nIndex &&
                    nId !== j &&
                    nId !== nIndex2 &&
                    nIndex !== nIndex2
                ) {
                    let l2P2 = nodes[nIndex2];
                    let insec = util.linesIntersect(
                        l2P1.x,
                        l2P1.y,
                        l2P2.x,
                        l2P2.y,
                        l1P1.x,
                        l1P1.y,
                        l1P2.x,
                        l1P2.y
                    );
                    if (insec) {
                        //console.log(nId + "-" + nIndex + "X" + j + "-" + nIndex2 + "\n" 
                            //+ "( ((1-t)" + l1P1.x + "+t" + l1P2.x + "), ((1-t)" + l1P1.y + "+t" + l1P2.y + ") )\n"
                            //+ "( ((1-t)" + l2P1.x + "+t" + l2P2.x + "), ((1-t)" + l2P1.y + "+t" + l2P2.y + ") )\n\n"

                        //);
                        sum++;
                    }
                }
            }
        }
    }

    /*
         An intersection between (1->2) and (3->4) will be counted as follows
         (1->2) Intersects (3->4, 4->3) so we need to divide by 2 to get the correct results.

         Note that if this function was used to get all intersections then you also will get
         (1->2) Intersects (3->4, 4->3)
         (2->1) Intersects (3->4, 4->3)
         (3->4) Intersects (1->2, 2->1)
         (4->3) Intersects (1->2, 2->1)
         each is divided by 2 so the total intersections = 4 and we would need 
         to divide by 4 to get the correct number
    */

    return sum;
}

export function edgeLengthN(graph, requiredLength, nId) {
    //if (!requiredLength) debugger;
    let nodes = graph.nodes();
    let adj = graph.adjList();
    let sum = 0;
    let p1 = nodes[nId];
    for (let j of adj[nId]) {
        let p2 = nodes[j];
        let len = util.distance(p1, p2);
        let d = len - requiredLength;
        sum += d * d;
    }
    return sum;
}

export function angularResolutionNFast(graph, nId) {
    let nodes = graph.nodes();
    let adj = graph.adjList();
    log.angularPerNode = [];

    let sum = 0.0;
    let degN = adj[nId].length;
    if (degN > 1) {
        let angles = new Array(360 + 1);
        let p = nodes[nId];
        for (let j of adj[nId]) {
            let p1 = nodes[j];
            // atan2 assumes we are working from 0,0 so we need to translate the points so they start from (0,0)
            p1 = { x: p1.x - p.x, y: p1.y - p.y };
            let a = (util.antiClockAngle(p1) * 180) / Math.PI;
            a = Math.floor(a);
            if (angles[a] != null) {
                angles[a].overlap++;
            } else {
                angles[a] = { nId: j, overlap: 0, pos: p1, degAngle: a };
            }
        }
        let e1 = null;
        let angleSum = 0;

        log.anglesDiff = [];

        for (let k = 0; k < 360; k++) {
            if (angles[k]) {
                if (e1 === null) {
                    e1 = angles[k];
                    sum += (e1.overlap * 2 * Math.PI) / degN;
                    if (e1.overlap)
                        log.anglesDiff.push({ e1, e2: angles[k], deg: k });
                } else {
                    let deg = k - e1.degAngle;
                    log.anglesDiff.push({ e1, e2: angles[k], deg: deg });
                    angleSum += deg;
                    console.assert(isFinite(angleSum) && sum >= 0);
                    let rad = (deg * Math.PI) / 180;
                    sum += Math.abs((2 * Math.PI) / degN - rad);
                    console.assert(isFinite(sum) && sum >= 0);
                    e1 = angles[k];
                }
            }
        }
        // add the angle between first and last edges
        let lastAngleDeg = 360 - angleSum;
        let lastAngleRad = (lastAngleDeg * Math.PI) / 180;

        sum += Math.abs((2 * Math.PI) / degN - lastAngleRad);
        if (!isFinite(sum)) {
            throw "sum is NaN";
        }
    }

    log.angularPerNode.push({ nId, angularRes: sum });
    return sum;
}

// TODO: fix this to match nodeEdgeOcclusion(graph)
export function nodeEdgeOcclusionN(graph, nId) {
    let distSq = 0.0;
    let sum1 = 0.0;
    let sum2 = 0.0;
    let nodes = graph.nodes();
    let adj = graph.adjList();

    for (let i = 0; i < adj[nId].length; i++) {
        let p1 = nodes[nId];
        let p2 = nodes[adj[nId][i]];
        if (!p2) continue;
        for (let j = 0; j < nodes.length; j++) {
            if (j !== nId && j !== adj[nId][i]) {
                let p3 = nodes[j];
                distSq = util.ptSegDistSqIn(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                if (distSq) {
                    if (distSq === 0) distSq = 1; // avoid division by zero
                    sum1 += 1.0 / distSq;
                }
            }
        }
    }

    // get all edges and measure distance from current node

    let p3 = nodes[nId];
    for (let i = 0; i < nodes.length; i++) {
        let p1 = nodes[i];
        if (nId === i) continue;
        for (let j = 0; j < adj[i].length; j++) {
            let p2 = nodes[adj[i][j]];
            if (nId !== adj[i][j]) {
                distSq = util.ptSegDistSqIn(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
                if (distSq) {
                    if (distSq === 0) distSq = 1; // avoid division by zero
                    sum2 += 1.0 / distSq;
                }
            }
        }
    }
    return sum1 + sum2 / 2;
}
