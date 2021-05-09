import {
  distance,
  transform,
  Vec,
  pointSegDistance,
  getEdgeNodes,
  minMaxNorm,
  sortNeighborsByAngle,
  intersection,
} from "./util.js";

export {
  nodeOcclusion,
  edgeNodeOcclusion,
  edgeLength,
  edgeCrossing,
  angularResolution,
};

/**
 * Calculate the score describing how close node is to all other nodes.
 * @param {object} graph - Graphology graph instance
 * @param {string} nodeId - Target node
 * @param {number} min - Min distance
 * @returns {number} - Score
 */
function nodeOcclusion(graph, nodeId, min) {
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
    end: new Vec(targetNode),
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
 * @param {number} min - Min distance
 * @returns {number} - Score
 */
function edgeLength(graph, edgeId, len, min) {
  let [sourceId, targetId] = graph.extremities(edgeId);
  let sourceNode = graph.getNodeAttributes(sourceId);
  let targetNode = graph.getNodeAttributes(targetId);
  let d = distance(sourceNode, targetNode);
  if (d < min) {
    d = min;
  }

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
    end: new Vec(targetNode),
  };

  for (let eId of graph.edges()) {
    if (edgeId === eId) continue;
    let endpointsIds = graph.extremities(eId);
    let sourceNode2 = graph.getNodeAttributes(endpointsIds[0]);
    let targetNode2 = graph.getNodeAttributes(endpointsIds[1]);
    let seg2 = {
      start: new Vec(sourceNode2),
      end: new Vec(targetNode2),
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
    var maxAngle = 360 / neighborsIds.length;
    let sorted = sortNeighborsByAngle(graph, nodeId);

    let c = graph.getNodeAttributes(nodeId);
    for (let i = 0, len = sorted.length; i < sorted.length; i++) {
      let v = new Vec(graph.getNodeAttributes(sorted[i])).sub(c);
      let u = new Vec(graph.getNodeAttributes(sorted[(i + 1) % len])).sub(c);
      let a = (v.angle(u) * 180) / Math.PI;
      sum += Math.abs(maxAngle - a);
    }
  }
  return sum;
}
