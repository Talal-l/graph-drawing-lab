import { nodeOcclusionN, edgeCrossingN, edgeLengthN } from "./metrics2.js";
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
        nodeOcclusion: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
        nodeEdgeOcclusion: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
        edgeLength: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
        edgeCrossing: null, // doesn't use zScoreNormalization
        angularResolution: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
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

    // This method takes an arraylist of solution vector and finds the weighted sum of the measures in the vector by multiplying them by their user defined weights
    function ComputeCost(a) {
        let sum = 0;
        // compute the weighted sum
        for (let key of Object.keys(a)) {
            sum += weights[key] * a[key];
        }
        return sum;
    }

    // This method takes two vectors of current (better) and previous (worse) measures at specific points and updates the solution vector by subtracting the previous and adding the current
    function UpdateMetrics(oldV, newV) {
        for (let key of Object.keys(metrics)) {
            if (metrics[key] != 0) {
                metrics[key] = metrics[key] - oldV[key] + newV[key];
            }
            else {
                metrics[key] = 0;
            }
        }
    }

    /****************************** NORMALIZATION ****************************************/

    function Clear_Measures() {
        normData = {
            nodeOcclusion: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
            nodeEdgeOcclusion: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
            edgeLength: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
            edgeCrossing: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
            angularResolution: { min: 0, max: 0, oldAvg: 0, newAvg: 0, oldSd: 0, newSd: 0, history: [] },
        };
    }
    function Avg_measures(measure, oldAvg, num) {
        let newAvg;
        if (num == 0) {
            newAvg = 0.0;
        } else {
            if (num == 1) {
                newAvg = measure;
            } else {
                newAvg = oldAvg + (measure - oldAvg) / num;
            }
        }
        return newAvg;
    }
    function SD_measures(measure, oldSD, oldAvg, newAvg, num) {
        let SD;
        if (num == 0 || num == 1) {
            SD = 0.0;
        } else {
            SD = Math.sqrt(
                oldSD * oldSD + (measure - oldAvg) * (measure - newAvg)
            );
        }
        return SD;
    }


    // compute and save current max and min for measure  values (old max and min are compared to parameter m)
    function maxmin_m(params, m) {
        if (params.history.length == 0 || params.history.length == 1 || params.history.length == 2) {
            // if no or one value only in the array of the measure 
            params.max = m;
            params.min = m;
        } else {
            if (m > params.max) { params.max = m; }
            if (m < params.min) { params.min = m; }
        }
    }
    function normM(params, m) {
        let mNorm;
        if (params == null) {
            let e = graph.edgesNum() / 2; // divide by 2 because it is undirected edge
            if (e > 1) {
                mNorm = m / ((e * (e - 1)) / 2);
            } else {
                mNorm = 0;
            }
            return mNorm;
        }
        params.history.push(m);
        if (params.history.length == 1 || params.history.length == 2) {
            params.oldAvg = m;
            params.newAvg = m;
            params.oldSd = 0;
            params.newSd = 0;
        } else {
            params.newAvg = Avg_measures(m, params.oldAvg, params.history.length - 1); // find mean
            params.newSd = SD_measures(
                m,
                params.oldSd,
                params.oldAvg,
                params.newAvg,
                params.history.length - 1
            ); // find standard deviation
            params.oldAvg = params.newAvg;
            params.oldSd = params.newSd;
        }

        maxmin_m(params, m);

        if (params.newSd == 0) {
            mNorm = m;
        } else {
            mNorm = (m - params.newAvg) / params.newSd; // value
            let lmin = (params.min - params.newAvg) / params.newSd; // min
            let lmax = (params.max - params.newAvg) / params.newSd; // max
            mNorm = (mNorm - lmin) / (lmax - lmin); // normalized
        }
        return mNorm;
    }

    function EqualizeScales(a) {
        let temp = {};
        for (let key of Object.keys(a)) {
            if (key == "edgeCrossing") {
                temp[key] = normM(null, a[key]);
            } else {
                temp[key] = normM(normData[key], a[key]);
            }
        }
        //console.log(temp);
        return temp;
    }

    /************************************** END of NORMALIZATION ****************************************/
    let bounds = {
        xMin: 20,
        xMax: 1600 - 20,
        yMin: 20,
        yMax: 880 - 20,
    };

    function withinBounds(bounds, { x, y }) {
        let { xMax, yMax, xMin, yMin } = bounds;
        return x < xMax && x > xMin && y < yMax && y > yMin;
    }

    cost = 0; // cost function is currently 0;
    old_cost = Infinity; // initial old cost
    Clear_Measures(); // clears each measure arraylist
    HillEvalSolutions = 0;
    metrics = graph.calcMetrics(); // compute initial solution and save the measures in the solution vector
    //console.log(measure5_3(p));
    EqualizeScales(metrics);
    normalizedMetrics = EqualizeScales(metrics); // normalize the solution

    cost = graph.objective(normalizedMetrics); // compute initial cost from solution vector

    while (square_size >= 1) {
        // drawing process
        Drawer3(square_size); // draw according to all measures
        EqualizeScales(graph.calcMetrics());
        cost = graph.objective(EqualizeScales(graph.calcMetrics()));
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
        // for each node create a rectangle of "square size" and test the points on up, down, left, right and the corners
        // whether they can be potential new locations and test the value of the cost function.
        //console.log("finding a better position for each node");
        for (let i = 0; i < points.length; i++) {
            //console.log("working with node: " + i);
            original_point.x = points[i].x; // save the coordinates of the original point
            original_point.y = points[i].y;
            bestPos.x = points[i].x;
            bestPos.y = points[i].y;
            let f = graph.calcNodeMetrics(i);
            oldMeasures = EqualizeScales(f); // compute previous measures and store them in a vector
            EqualizeScales(f);

            for (let offset of offsets) {
                points[i].x = original_point.x + offset.x * square_size;
                points[i].y = original_point.y + offset.y * square_size;
                if (withinBounds(bounds, points[i])) {

                    let rawMetrics = graph.calcNodeMetrics(i);
                    newMeasures = EqualizeScales(rawMetrics); // compute current measures and store them in a vector
                    EqualizeScales(rawMetrics);

                    oldFit = graph.objective(oldMeasures); // compute previous cost
                    newFit = graph.objective(newMeasures); // compute current cost
                    HillEvalSolutions++; // counts number of compute fitness functon
                    if (!equal(newFit, oldFit) && newFit < oldFit) {
                        // compare fitness of the node in its new and old positions
                        UpdateMetrics(oldMeasures, newMeasures); // update solution vector
                        normalizedMetrics = { ...metrics }; // normalize the solution
                        cost = graph.objective(normalizedMetrics);
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
