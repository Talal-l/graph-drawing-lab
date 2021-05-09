import { nodeOcclusionN, edgeCrossingN, edgeLengthN } from "./metrics2.js";
import { ZNormalization } from "./normalization.js";
import { equal } from "./util.js";

let HillEvalSolutions = 0;

export function hillClimbing_Fast_NoGrid(graph) {
  // Keep track of all points position
  let points = []; // List of small Rectangles which represents points (nodes)
  let adjacency = []; // Adjacency List of Adjacent nodes (list of edges)
  let square_size = 512; // used for choosing a new location of the point in the drawing process
  let hcIterations = 0;

  let metrics = {
    nodeOcclusion: 0,
    nodeEdgeOcclusion: 0,
    edgeLength: 0,
    edgeCrossing: 0,
    angularResolution: 0,
  };

  let weights = {
    nodeOcclusion: 1,
    nodeEdgeOcclusion: 0,
    edgeLength: 1,
    edgeCrossing: 1,
    angularResolution: 1,
  };

  graph.setWeights(weights);

  let normalizedMetrics = {
    nodeOcclusion: 0,
    nodeEdgeOcclusion: 0,
    edgeLength: 0,
    edgeCrossing: 0,
    angularResolution: 0,
  };
  let normData = {
    nodeOcclusion: {
      min: 0,
      max: 0,
      oldAvg: 0,
      newAvg: 0,
      oldSd: 0,
      newSd: 0,
      history: [],
    },
    nodeEdgeOcclusion: {
      min: 0,
      max: 0,
      oldAvg: 0,
      newAvg: 0,
      oldSd: 0,
      newSd: 0,
      history: [],
    },
    edgeLength: {
      min: 0,
      max: 0,
      oldAvg: 0,
      newAvg: 0,
      oldSd: 0,
      newSd: 0,
      history: [],
    },
    edgeCrossing: null, // doesn't use zScoreNormalization
    angularResolution: {
      min: 0,
      max: 0,
      oldAvg: 0,
      newAvg: 0,
      oldSd: 0,
      newSd: 0,
      history: [],
    },
  };

  let offsets = [
    { x: 1, y: 0 }, // right
    { x: 1, y: 1 }, // lower-right
    { x: 0, y: 1 }, // bottom
    { x: -1, y: 1 }, // lower left
    { x: -1, y: 0 }, // left location
    { x: -1, y: -1 }, // upper left
    { x: 0, y: -1 }, // up
    { x: 1, y: -1 }, // upper right
  ];
  let cost; // cost function
  let old_cost; // to save the old value of the cost function
  points = graph._nodes;
  adjacency = graph._adjList;

  graph.setBounds({
    xMin: 20,
    xMax: 1600 - 20,
    yMin: 20,
    yMax: 880 - 20,
  });

  cost = 0; // cost function is currently 0;
  old_cost = Infinity; // initial old cost
  graph.resetZn();
  HillEvalSolutions = 0;

  graph.calcMetrics(); // compute initial solution and save the measures in the solution vector
  graph._normalMetrics = graph.normalizeAll();
  graph.normalizeAll(); // normalize the solution

  cost = graph.objective(); // compute initial cost from solution vector

  while (square_size >= 1) {
    // drawing process
    Drawer3(square_size); // draw according to all measures
    graph.calcMetrics();
    graph._normalMetrics = graph.normalizeAll();

    cost = graph.objective();
    hcIterations++;
    if ((!equal(cost, old_cost) && cost >= old_cost) || equal(cost, old_cost)) {
      square_size /= 4; // the square size shrinks during the process
    }
  }
  function Drawer3(square_size) {
    let oldMeasures = {}; // store previous measures
    let newMeasures = {}; // store current measures
    let oldFit, newFit; // to store old fitness and new fitness of the moved node
    let bestPos = { x: 0, y: 0 };
    let original_point = { x: 0, y: 0 }; // temporary points
    old_cost = cost; // store the new cost leto the old
    for (let i = 0; i < points.length; i++) {
      //console.log("working with node: " + i);
      original_point.x = points[i].x; // save the coordinates of the original point
      original_point.y = points[i].y;
      bestPos.x = points[i].x;
      bestPos.y = points[i].y;

      let f = graph.calcNodeMetrics(i);
      oldMeasures = graph.normalizeAll(f); // compute previous measures and store them in a vector
      graph.normalizeAll(f);

      for (let offset of offsets) {
        points[i].x = original_point.x + offset.x * square_size;
        points[i].y = original_point.y + offset.y * square_size;
        if (graph.withinBounds(points[i].x, points[i].y)) {
          let rawMetrics = graph.calcNodeMetrics(i);
          newMeasures = graph.normalizeAll(rawMetrics); // compute current measures and store them in a vector
          graph.normalizeAll(newMeasures);

          oldFit = graph.objective(oldMeasures); // compute previous cost
          newFit = graph.objective(newMeasures); // compute current cost

          HillEvalSolutions++; // counts number of compute fitness functon

          if (!equal(newFit, oldFit) && newFit < oldFit) {
            // compare fitness of the node in its new and old positions
            graph.updateNormalMetrics(oldMeasures, newMeasures); // update solution vector
            cost = graph.objective();
            oldMeasures = newMeasures; // update the old measures
            bestPos.x = points[i].x;
            bestPos.y = points[i].y;
          } else {
            points[i].x = bestPos.x;
            points[i].y = bestPos.y;
          }
        } else {
          // reset
          points[i].x = bestPos.x;
          points[i].y = bestPos.y;
        }
      }
    }
  }
}
