import { nodeOcclusionN, edgeCrossingN } from "./metrics2.js";

function F(a) {
    return a === 0 ? '0.0' : a;
}

function arrToString( array) {
    let s = "";
    for (let i = 0; i < array.length; i++) {
        s += array[i] ? array[i] :'0.0' + ", ";
       }
    return s;
}


let log = { crossing: [] };
export function hillClimbing_Fast_NoGrid(graph) {
    // Keep track of all points position
    let points = []; // List of small Rectangles which represents points (nodes)
    let adjacency = []; // Adjacency List of Adjacent nodes (list of edges)

    points = graph._nodes;
    adjacency = graph._adjList;

    let distances = [[]]; // Arrays of distances between every two nodes
    let SolutionVector = []; // Vector that always stores the chosen solution (saves the measures with the best values so far in a list)
    let NormalizedVector = []; // Vector that always stores the chosen solution (normalized)
    let m1 = []; // list of values of measure 1 used for normaization process
    let m2 = []; // list of values of measure 2 used for normaization process
    let m3 = []; // list of values of measure 3 used for normaization process
    let m4 = []; // list of values of measure 4 used for normaization process
    let m5 = []; // list of values of measure 5 used for normaization process
    let max_m1, min_m1; // to save max and min values of measure 1 to help finding a normalized value
    let max_m2, min_m2; // to save max and min values of measure 2 to help finding a normalized value
    let max_m3, min_m3; // to save max and min values of measure 3 to help finding a normalized value
    let max_m4, min_m4; // to save max and min values of measure 4 to help finding a normalized value
    let max_m5, min_m5; // to save max and min values of measure 5 to help finding a normalized value
    let oldAvgM1, newAvgM1, oldSDM1, newSDM1; // to save the old and new average and old and new standard deviation for measure 1 (used for normalization)
    let oldAvgM2, newAvgM2, oldSDM2, newSDM2; // to save the old and new average and old and new standard deviation for measure 2 (used for normalization)
    let oldAvgM3, newAvgM3, oldSDM3, newSDM3; // to save the old and new average and old and new standard deviation for measure 3 (used for normalization)
    let oldAvgM4, newAvgM4, oldSDM4, newSDM4; // to save the old and new average and old and new standard deviation for measure 4 (used for normalization)
    let oldAvgM5, newAvgM5, oldSDM5, newSDM5; // to save the old and new average and old and new standard deviation for measure 5 (used for normalization)
    let TabuList = []; // a list of strings which represent solutions that will not be searched for a period of time in the following format: nNODENUMxCOORDyYCOORDiITERATIONNUM iteration number helps in the tabu duration time
    let costDiff; // saves the difference between two costs (helps in Tabu Search Approach)
    let index; // used for deleting in moving nodes option
    let drawEdge = 0;
    let e1 = 0;
    let e2 = 0; // used for drawing edges
    let cost; // cost function
    let old_cost; // to save the old value of the cost function
    let w1, w2, w3, w4, w5; // weights for each measure
    let last_option; // used for mouseEntered function to make sure that the option does not execute twice in a row
    let moving; // used for drawing the edge while moving the cursor
    let clicked; // used for drawing the edges while moving the cursor (as starting point)
    let moved; // used for drawing the edges while moving the cursor (as ending point)
    let randDensity; // used for the random graph generator (density of the random graph)
    let randNode; // used for the random graph generator (number of nodes of the random graph)
    let windowX = 1600; // 1600 max width size of displayed window
    let windowY = 880; // 880 max height size of displayed window
    let G = {
        weight1: 0,
        weight2: 0,
        weight3: 1,
        weight4: 0,
        weight5: 0,
        threshold1: 100,
    }; // Object from class MyGraph (extended from JFrame) to create a small window
    let TabuIteration = []; // to keep track of number of tabu moves in each iterations
    let TabuEvalSolutions;
    let HillEvalSolutions;
    let SAEvalSolutions;
    let PRTSEvalSolutions;
    let testing;

    let PRrefSet = [[]]; // path relinking reference set (array of arrays of points where each array represents a layout)
    let PRrefSetSolutionsFitness = []; // array of the fitness values for each layout in the reference set
    let IndexBestinPRrefSet; // stores the index of the best solution in the reference set

    let tabuListAccess = 0;

    drawEdge = 0; // used to detect end points of edges while drawing the edge
    last_option = 0; // initial value for last_option chosen
    moving = 0; // initial value for moving (which means the edge has not been drawn yet)
    function importCustom(data) {
        let byline = data.split("\n");
        let start = 0;
        let nodesCoord = {};

        let nodeNum = Number(byline[0]);
        let graph = {
            nodes: new Array(nodeNum),
            adjList: new Array(nodeNum).fill(new Array()),
        };
        nodesCoord = byline[1].split("  ").map((e) => ({
            x: Number(e.split(" ")[0]),
            y: Number(e.split(" ")[1]),
        }));

        for (let i = 0; i < nodesCoord.length - 1; i++) {
            let node = {
                id: i,
                x: nodesCoord[i].x,
                y: nodesCoord[i].y,
            };
            if (node.x !== null && node.y !== null) graph.nodes[i] = node;
        }

        let offset = start + 4;
        for (let j = 0; j < nodeNum; j += 1) {
            let adj = byline[j + offset++].split(" ").map((e) => Number(e));
            adj.pop(); // remove "\r"
            graph.adjList[j] = adj;
        }
        adjacency = graph.adjList;
        points = graph.nodes;
    }
    // This method checks whether two nodes with indices a and b are adjacent
    function adjacent(a, b) {
        if (adjacency[a].includes(b)) {
            return true;
        }
        return false;
    }

    // This function computes the distance between every two nodes
    function compute_distancesA() {
        let dx;
        let dy;
        let temp;
        distances = []; // create distances list of lists (each node with its distances to all the other nodes)
        for (let i = 0; i < points.length; i++) {
            distances.push([]); // create a list for each node
            for (let j = 0; j < points.length; j++) {
                dx = points[i].x - points[j].x;
                dy = points[i].y - points[j].y;
                temp = Math.sqrt(dx * dx + dy * dy); // compute distance
                distances[i].push(temp);
            }
        }
    }
    // This function computes the distance from node p to every other node
    function compute_distances(p) {
        let dx, dy;
        let temp;
        for (
            let i = 0;
            i < points.length;
            i++ // to go through all the points
        ) {
            dx = points[p].x - points[i].x;
            dy = points[p].y - points[i].y;
            temp = Math.sqrt(dx * dx + dy * dy); // compute distance
            distances[p][i] = temp; // update the distance from node p to node i
            distances[i][p] = temp; // update the distance from node p to node i
        }
    }

    // counts number of edges in a graph
    function numOfEdges() {
        let sum = 0;
        for (let i = 0; i < adjacency.length; i++) sum += adjacency[i].length;
        return sum / 2; // divide by 2 because it is undirected edge
    }
    // This method takes an arraylist of solution vector and finds the weighted sum of the measures in the vector by multiplying them by their user defined weights
    function ComputeCost(a) {
        let sum = 0;
        let weights = []; // create an array of weights
        // add the weights to the array
        weights.push(G.weight1);
        weights.push(G.weight2);
        weights.push(G.weight3);
        weights.push(G.weight4);
        weights.push(G.weight5);
        // compute the weighted sum
        for (let i = 0; i < a.length; i++) {
            sum += weights[i] * a[i];
        }
        console.log("ComputeCost: " + (sum == 0 ? '0.0' : sum));
        return sum;
    }

    // This method takes two vectors of current (better) and previous (worse) measures at specific points and updates the solution vector by subtracting the previous and adding the current
    function UpdateSolutionVector(oldV, newV) {
        let temp = []; // temp array to clone the solution vector and then will be saved back in the solution vector
        for (let i = 0; i < SolutionVector.length; i++) {
            if (SolutionVector[i] != 0)
                temp.push(SolutionVector[i] - oldV[i] + newV[i]);
            // update the vector
            else temp.push(0.0);
        }
        // update solution vector
        SolutionVector = [];
        SolutionVector.push(...temp);
    }

    /****************************** NORMALIZATION ****************************************/

    // clear arrays of measures used for normalization of measures (for each measure) and create them from the beginning
    function Clear_Measures() {
        m1 = []; // clears array of all values of measure 1
        m2 = []; // clears array of all values of measure 2
        m3 = []; // clears array of all values of measure 3
        m4 = []; // clears array of all values of measure 4
        m5 = []; // clears array of all values of measure 5
        oldAvgM1 = newAvgM1 = oldSDM1 = newSDM1 = 0; // initialize all these values to measure 1
        oldAvgM2 = newAvgM2 = oldSDM2 = newSDM2 = 0; // initialize all these values to measure 2
        oldAvgM3 = newAvgM3 = oldSDM3 = newSDM3 = 0; // initialize all these values to measure 3
        oldAvgM4 = newAvgM4 = oldSDM4 = newSDM4 = 0; // initialize all these values to measure 4
        oldAvgM5 = newAvgM5 = oldSDM5 = newSDM5 = 0; // initialize all these values to measure 5
        max_m1 = max_m2 = max_m3 = max_m4 = max_m5 = -Infinity; // initialization
        min_m1 = min_m2 = min_m3 = min_m4 = min_m5 = Infinity; // initialization
    }

    // Compute the mean (average) from previous value of the average given the new added value, the previous average, and number of elements in the list (array).
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

    // Compute the standard deviation of array using old value of standard deviation given the new added value, the value of previous standard deviation,
    // the value of previous average, the value of the current measure, and the number of elements in the array (list)
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

    // compute and save current max and min for measure 1 values (old max and min are compared to parameter m)
    function maxmin_m1(m) {
        if (m1.length == 0 || m1.length == 1 || m1.length == 2) {
            // if no or one value only in the array of measure 1
            max_m1 = m;
            min_m1 = m;
        } else {
            if (m > max_m1) max_m1 = m;
            if (m < min_m1) min_m1 = m;
        }
    }

    // normalize the value of m by subtracting the current average (mean) of all the current values and divide them by their standard deviation
    // then the normalized value subtracts the minimum value and divided by the difference between max and min values to get a value between 0 and 1
    function Norm_M1(m) {
        let max, min;
        let mNorm;
        m1.push(m);
        if (m1.length == 1 || m1.length == 2) {
            oldAvgM1 = m;
            newAvgM1 = m;
            oldSDM1 = 0;
            newSDM1 = 0;
        } else {
            newAvgM1 = Avg_measures(m, oldAvgM1, m1.length - 1); // find mean
            newSDM1 = SD_measures(
                m,
                oldSDM1,
                oldAvgM1,
                newAvgM1,
                m1.length - 1
            ); // find standard deviation
            oldAvgM1 = newAvgM1;
            oldSDM1 = newSDM1;
        }
        maxmin_m1(m);
        if (newSDM1 == 0) {
            mNorm = m;
        } else {
            mNorm = (m - newAvgM1) / newSDM1; // value
            min = (min_m1 - newAvgM1) / newSDM1; // min
            max = (max_m1 - newAvgM1) / newSDM1; // max
            mNorm = (mNorm - min) / (max - min); // normalized
        }
        return mNorm;
    }

    // compute and save current max and min for measure 2 values (old max and min are compared to parameter m)
    function maxmin_m2(m) {
        if (m2.length == 0 || m2.length == 1 || m2.length == 2) {
            // if no or one value only in the array of measure 2
            max_m2 = m;
            min_m2 = m;
        } else {
            if (m > max_m2) {
                max_m2 = m;
            }
            if (m < min_m2) {
                min_m2 = m;
            }
        }
    }

    // normalize the value of m by subtracting the current average (mean) of all the current values and divide them by their standard deviation
    // then the normalized value subtracts the minimum value and divided by the difference between max and min values to get a value between 0 and 1
    function Norm_M2(m) {
        let max;
        let min;
        let mNorm;
        m2.push(m);
        if (m2.length == 1 || m2.length == 2) {
            oldAvgM2 = m;
            newAvgM2 = m;
            oldSDM2 = 0;
            newSDM2 = 0;
        } else {
            newAvgM2 = Avg_measures(m, oldAvgM2, m2.length - 1); // find mean
            newSDM2 = SD_measures(
                m,
                oldSDM2,
                oldAvgM2,
                newAvgM2,
                m2.length - 1
            ); // find standard deviation
            oldAvgM2 = newAvgM2;
            oldSDM2 = newSDM2;
        }
        maxmin_m2(m);
        if (newSDM2 == 0) mNorm = m;
        else {
            mNorm = (m - newAvgM2) / newSDM2; // value
            min = (min_m2 - newAvgM2) / newSDM2; // min
            max = (max_m2 - newAvgM2) / newSDM2; // max
            mNorm = (mNorm - min) / (max - min); // normalized
        }
        return mNorm;
    }

    // normalize the value of m by dividing m by the maximum possible number of edges ((numOfEdges() * numOfEdges()-1) / 2);
    function Norm_M3(m) {
        let mNorm;
        let e;
        e = numOfEdges();
        if (e > 1) {
            mNorm = m / ((e * (e - 1)) / 2);
        } else {
            mNorm = 0;
        }
        return mNorm;
    }

    // compute and save current max and min for measure 4 values (old max and min are compared to parameter m)
    function maxmin_m4(m) {
        if (m4.length == 0 || m4.length == 1 || m4.length == 2) {
            // if no or one value only in the array of measure 4
            max_m4 = m;
            min_m4 = m;
        } else {
            if (m > max_m4) max_m4 = m;
            if (m < min_m4) min_m4 = m;
        }
    }

    // normalize the value of m by subtracting the current average (mean) of all the current values and divide them by their standard deviation
    // then the normalized value subtracts the minimum value and divided by the difference between max and min values to get a value between 0 and 1
    function Norm_M4(m) {
        let max, min;
        let mNorm;
        m4.push(m);
        if (m4.length == 1 || m4.length == 2) {
            oldAvgM4 = m;
            newAvgM4 = m;
            oldSDM4 = 0;
            newSDM4 = 0;
        } else {
            newAvgM4 = Avg_measures(m, oldAvgM4, m4.length - 1); // find mean
            newSDM4 = SD_measures(
                m,
                oldSDM4,
                oldAvgM4,
                newAvgM4,
                m4.length - 1
            ); // find standard deviation
            oldAvgM4 = newAvgM4;
            oldSDM4 = newSDM4;
        }
        maxmin_m4(m);
        if (newSDM4 == 0) {
            mNorm = m;
        } else {
            mNorm = (m - newAvgM4) / newSDM4; // value
            min = (min_m4 - newAvgM4) / newSDM4; // min
            max = (max_m4 - newAvgM4) / newSDM4; // max
            mNorm = (mNorm - min) / (max - min); // normalized
        }
        return mNorm;
    }

    // compute and save current max and min for measure 5 values (old max and min are compared to parameter m)
    function maxmin_m5(m) {
        if (m5.length == 0 || m5.length == 1 || m5.length == 2) {
            // if no or one value only in the array of measure 5
            max_m5 = m;
            min_m5 = m;
        } else {
            if (m > max_m5) {
                max_m5 = m;
            }
            if (m < min_m5) {
                min_m5 = m;
            }
        }
    }

    // normalize the value of m by subtracting the current average (mean) of all the current values and divide them by their standard deviation
    // then the normalized value subtracts the minimum value and divided by the difference between max and min values to get a value between 0 and 1
    function Norm_M5(m) {
        let max, min;
        let mNorm;
        m5.push(m);
        if (m5.length == 1 || m5.length == 2) {
            oldAvgM5 = m;
            newAvgM5 = m;
            oldSDM5 = 0;
            newSDM5 = 0;
        } else {
            newAvgM5 = Avg_measures(m, oldAvgM5, m5.length - 1); // find mean
            newSDM5 = SD_measures(
                m,
                oldSDM5,
                oldAvgM5,
                newAvgM5,
                m5.length - 1
            ); // find standard deviation
            oldAvgM5 = newAvgM5;
            oldSDM5 = newSDM5;
        }
        maxmin_m5(m);
        if (newSDM5 == 0) {
            mNorm = m;
        } else {
            mNorm = (m - newAvgM5) / newSDM5; // value
            min = (min_m5 - newAvgM5) / newSDM5; // min
            max = (max_m5 - newAvgM5) / newSDM5; // max
            mNorm = (mNorm - min) / (max - min); // normalized
        }
        return mNorm;
    }

    // This method makes all measures of the same value where each measure becomes of the value (m1*m2*m3*m4*m5)/(m1*m2*m3*m4*m5)+1
    function EqualizeScales(a) {
        let temp = [];
        let c1, c2, c3, c4, c5;
        // Normalize each measure with its normalization method and save each into a variable
        c1 = Norm_M1(a[0]);
        c2 = Norm_M2(a[1]);
        c3 = Norm_M3(a[2]);
        c4 = Norm_M4(a[3]);
        c5 = Norm_M5(a[4]);

        // store the normalized measures into a vector
        temp.push(c1);
        temp.push(c2);
        temp.push(c3);
        temp.push(c4);
        temp.push(c5);

        // return the normalized vector of measures
        return temp;
    }

    /************************************** END of NORMALIZATION ****************************************/

    let square_size = 512; // used for choosing a new location of the point in the drawing process
    let hcIterations = 0;
    cost = 0; // cost function is currently 0;
    old_cost = Infinity; // initial old cost
    Clear_Measures(); // clears each measure arraylist
    HillEvalSolutions = 0;
    SolutionVector = []; // clear solution vector
    SolutionVector.push(...initial_solution3()); // compute initial solution and save the measures in the solution vector
    NormalizedVector = [];
    NormalizedVector.push(...EqualizeScales(SolutionVector)); // normalize the solution
    cost = ComputeCost(NormalizedVector); // compute initial cost from solution vector
    console.log("initial cost: " + cost);

    while (square_size >= 1) {
        // drawing process
        Drawer3(square_size); // draw according to all measures
        cost = ComputeCost(EqualizeScales(fitness3()));
        hcIterations++;
        console.log("it: " + hcIterations);
        console.log("cost: " + cost + " old_cost: " + old_cost);
        if (cost >= old_cost)
            // reduce the square size if the current size does not make any improvements
            square_size /= 4; // the square size shrinks during the process

    }
    function Drawer3(square_size) {
        // Drawing process (Fast Version without grids) (choose a new position for each node and compute the fitness, then update the cost function accordingly)
        let oldMeasures = []; // store previous measures
        let newMeasures = []; // store current measures

        let oldFit, newFit; // to store old fitness and new fitness of the moved node
        let temp_point = { x: 0, y: 0 };
        let original_point = { x: 0, y: 0 }; // temporary points
        old_cost = cost; // store the new cost leto the old
        // for each node create a rectangle of "square size" and test the points on up, down, left, right and the corners
        // whether they can be potential new locations and test the value of the cost function.
        //console.log("finding a better position for each node");
        for (let i = 0; i < points.length; i++) {
            //console.log("working with node: " + i);
            original_point.x = points[i].x; // save the coordinates of the original point
            original_point.y = points[i].y;
            temp_point.x = points[i].x;
            temp_point.y = points[i].y;
            oldMeasures = [];
            let f = fitness3(i);
            oldMeasures.push(...EqualizeScales(f)); // compute previous measures and store them in a vector
            console.log("point: " + i + " squareSize: " + square_size + " oldMeasures: " + (oldMeasures[2] ? oldMeasures[2] : "0.0") + " fitness: " + f[2]);


            // right location
            if (
                original_point.x + square_size > 20 &&
                original_point.x + square_size < windowX - 20
            ) {
                console.log("right location");
                points[i].x = original_point.x + square_size; // update point
                points[i].y = original_point.y;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures); // compute previous cost
                newFit = ComputeCost(newMeasures); // compute current cost
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures); // update solution vector
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures); // update the old measures
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            //lower-right corner
            if (
                original_point.x + square_size > 20 &&
                original_point.x + square_size < windowX - 20 &&
                original_point.y + square_size > 20 &&
                original_point.y + square_size < windowY - 20
            ) {
                console.log("lower-right location");
                points[i].x = original_point.x + square_size; // update point
                points[i].y = original_point.y + square_size;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            // bottom location
            if (
                original_point.y + square_size > 20 &&
                original_point.y + square_size < windowY - 20
            ) {
                console.log("bottom location");

                points[i].x = original_point.x; // update point
                points[i].y = original_point.y + square_size;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            // lower-left location
            if (
                original_point.x - square_size > 20 &&
                original_point.x - square_size < windowX - 20 &&
                original_point.y + square_size > 20 &&
                original_point.y + square_size < windowY - 20
            ) {
                console.log("lower-left location");

                points[i].x = original_point.x - square_size; // update point
                points[i].y = original_point.y + square_size;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            // left location
            if (
                original_point.x - square_size > 20 &&
                original_point.x - square_size < windowX - 20
            ) {
                console.log("left location");

                points[i].x = original_point.x - square_size; // update point
                points[i].y = original_point.y;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            // upper-left location
            if (
                original_point.x - square_size > 20 &&
                original_point.x - square_size < windowX - 20 &&
                original_point.y - square_size > 20 &&
                original_point.y - square_size < windowY - 20
            ) {
                console.log("upper-left location");

                points[i].x = original_point.x - square_size; // update point
                points[i].y = original_point.y - square_size;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            // up location
            if (
                original_point.y - square_size > 20 &&
                original_point.y - square_size < windowY - 20
            ) {
                console.log("up location");

                points[i].x = original_point.x; // update point
                points[i].y = original_point.y - square_size;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            //upper-right location
            if (
                original_point.x + square_size > 20 &&
                original_point.x + square_size < windowX - 20 &&
                original_point.y - square_size > 20 &&
                original_point.y - square_size < windowY - 20
            ) {
                console.log("upper-right location");

                points[i].x = original_point.x + square_size; // update point
                points[i].y = original_point.y - square_size;
                compute_distances(i); // recompute distances of the moved node with the other nodes
                newMeasures = [];
                newMeasures.push(...EqualizeScales(fitness3(i))); // compute current measures and store them in a vector
                oldFit = ComputeCost(oldMeasures);
                newFit = ComputeCost(newMeasures);
                HillEvalSolutions++; // counts number of compute fitness functon
                console.log("newFit: " + F(newFit) + " oldFit: " + F(oldFit));
                if (newFit < oldFit) {
                    // compare fitness of the node in its new and old positions
                    UpdateSolutionVector(oldMeasures, newMeasures);
                    NormalizedVector = [];
                    NormalizedVector.push(...SolutionVector); // normalize the solution
                    cost = ComputeCost(NormalizedVector);
                    oldMeasures = [];
                    oldMeasures.push(...newMeasures);
                    temp_point.x = points[i].x;
                    temp_point.y = points[i].y;
                } else {
                    points[i].x = temp_point.x;
                    points[i].y = temp_point.y;
                    compute_distances(i); // recompute the distances of the node in its previous position
                }
            }
            console.log("point: " + i + " pos: " + points[i].x + "," + points[i].y+ " cost: " + cost);
        }
    }

    // this function computes the initial value of the cost function
    function initial_solution3() {
        compute_distancesA();
        return fitness3(); // return the current values of the measures as a vector
    }

    function fitness3(p) {
        // This function computes the fitness (cost) function including all measures along with their corresponding weights (all nodes)
        let c1 = 0;
        let c2 = 0;
        let c3 = 0;
        let c4 = 0;
        let c5 = 0;
        let temp = []; // temp arraylist
        let norm = []; // store the normalized measures into vector

        w1 = G.weight1; // weight for measure 1
        w2 = G.weight2; // weight for measure 2
        w3 = G.weight3; // weight for measure 3
        w4 = G.weight4; // weight for measure 4
        w5 = G.weight5; // weight for measure 5

        if (p == null) {
            // compute the current cost function according to all measures
            for (let i = 0; i < points.length; i++) {
                if (w1 != 0) c1 += measure1_3(i);
                if (w2 != 0) c2 += measure2_3(i);
                if (w3 != 0) c3 += measure3_3(i);
                if (w4 != 0) c4 += measure4_3(i);
                if (w5 != 0) c5 += measure5_3(i);


            }

            // values are divided by specific values because during computing these values some computations have been repreated
            c1 = c1 / 2;
            c2 = c2 / 2;
            c3 = c3 / 8; // # of intersections is divided by 8 because the code computes the intersection between [(p,i),(m,n)], [(p,i),(n,m)]
            c4 = c4 / 2;
            c5 = c5 / 3;

        } else {
            if (w1 != 0) c1 += measure1_3(p);
            if (w2 != 0) c2 += measure2_3(p);
            if (w3 != 0) c3 += measure3_3(p);
            if (w4 != 0) c4 += measure4_3(p);
            if (w5 != 0) c5 += measure5_3(p);

        }

        // add measures to temp arraylist to be sent to equalizescales
        temp.push(c1);
        temp.push(c2);
        temp.push(c3);
        temp.push(c4);
        temp.push(c5);

        // let x = ([nId,c3]);

        // equalize scales of the measures and saves them back in norm vector
        norm.push(...EqualizeScales(temp));

        return temp; // return normalized vector
    }

    function measure1_3(p) {
        // nodes distribution criterion for specific node p
        // Compute the cost function according to nodes distribution criterion (sum of inverse propotional to distance squared)

        let node_threshold = G.threshold1 ** 2; // to test if the distance between nodes is less than this value or not.
        return nodeOcclusionN(graph, p, node_threshold);
        let c = 0; // to compute cost of this criterion then will be added to the overall cost
        let d; // distance
        for (let i = 0; i < points.length; i++) {
            if (i != p) {
                // do not count the distance from the node to itself
                d = distances[p][i];
                if (d < node_threshold && d != 0)
                    // to check the distances between nodes which are less than the threshold
                    c += 1.0 / (d * d); // compute the cost function
            }
        }
        return c; // we don't divide by 2 here because we are just computing the distances from node p to every other node
    }

    function measure2_3(p) {
        // edges length criterion (all edges incident to node p only)
        // Compute the cost function according to edges length criterion (sum of (ei-required_distance)^2 divided by 2 since every edges is counted twice)
        //let required_length = 100; // required edge length
        //let e;// for edge length
        //let c = 0;  // to compute cost of this criterion then will be added to the overall cost
        //for (let i = 0; i < adjacency[p].length; i++) // for all nodes adjacent to node p
        //{
        //e = distances[p][adjacency[p][i]];     //get length of the edge from the array distances
        //c += (((e - required_length) * (e - required_length)));      // Sum((edge length - required distance)^2)
        //}
        //return (c); // we do not divide by 2 here becuase we only compute the length of every edge incident to node p
        return 0;
    }

    function measure3_3(p) {
        let e  = edgeCrossingN(graph, p);
        return e;

        // lines intersections criterion (just checks the lines that node p is one of their end points)
        // This method computes number of intesections between lines
        // It goes through the adjacency list and creates line for each edge
        //let intersections = 0;
        //for(let i=0; i<adjacency[ p ].length; i++) // creates lines for edges whose end point is point p
        //{
        //let line1 = new Line2D.Double(points[ p ].x, points[ p ].y , points[ adjacency[ p ][ i ] ].x, points[ adjacency[ p ][ i ] ].y); // create line 1
        //for(let m=0; m<points.length; m++)
        //{
        //for(let n=0; n<adjacency[ m ].length; n++) // creates lines for edges whose end point is m (but not p)
        //{
        //if(m!=p && m!=adjacency[ p ][ i ] && adjacency[ m ][ n ]!=p && adjacency[ m ][ n ]!=adjacency[ p ][ i ]) // if there is no common point between line 1 and the points of line 2
        //{
        //Line2D.Double line2 = new Line2D.Double(points[ m ].x, points[ m ].y , points[ adjacency[ m ][ n ] ].x, points[ adjacency[ m ][ n ] ].y); // create line 2
        //if(line1.intersectsLine(line2)) // if two lines intersect
        //intersections++;  // count intersections
        //}
        //}
        //}
        //}
        //return intersections;
    }

    function measure4_3(p) {
        // nodes-edges occlusion (checks only the edges which are affected by node p)
        //int x1, x2, y1, y2; // needed for computing the angles
        //let degree1, degree2; // needed for computing the angles
        //// This method computes nodes-edges occlusion criterion (for node p)
        //let occlusion_threshold = G.threshold4(); // to test if the distance between a node and an edge is less than this value or not
        //let c1 = 0; // to compute the cost of distances from other nodes to each edge whose one of its end points is p
        //let c2 = 0; // to compute the cost of distances from the node p to all other edges
        //let c = 0;  // sum of c1 and c2
        //let d;  // to computer the distance between the node and the edge
        //// to compute the cost of distances from other nodes to each edge whose one of its end points is p
        //for(let i=0; i<adjacency[ p ].length; i++) // creates lines for edges whose one of its end points is node p
        //{
        //Line2D.Double line1 = new Line2D.Double(points[ p ].x, points[ p ].y , points[ adjacency[ p ][ i ] ].x, points[ adjacency[ p ][ i ] ].y); // create line 1
        //for(let m=0; m<points.length; m++) // to go through all the nodes
        //{
        //if ( (m != p) && (m != adjacency[ p ][ i ])) // if the node m is not any of the end points of the line
        //{
        //// if the point points[ m ] is within the plane of the line "angles between the point m and the end points of the line are less than or equal to 90" then we compute the distance
        //x1 = points[ m ].x - points[ p ].x;
        //y1 = points[ m ].y - points[ p ].y;
        //x2 = points[ adjacency[ p ][ i ] ].x - points[ p ].x;
        //y2 = points[ adjacency[ p ][ i ] ].y - points[ p ].y;
        //degree1 = Math.acos(((x1 * x2) + (y1 * y2))/(Math.sqrt(x1*x1 + y1*y1) * Math.sqrt(x2*x2 + y2*y2))); // compute first angle in radian
        //degree1 = Math.toDegrees(degree1); // first angle in degrees
        //x1 = points[ m ].x - points[ adjacency[ p ][ i ] ].x;
        //y1 = points[ m ].y - points[ adjacency[ p ][ i ] ].y;
        //x2 = points[ p ].x - points[ adjacency[ p ][ i ] ].x;
        //y2 = points[ p ].y - points[ adjacency[ p ][ i ] ].y;
        //degree2 = Math.acos(((x1 * x2) + (y1 * y2))/(Math.sqrt(x1*x1 + y1*y1) * Math.sqrt(x2*x2 + y2*y2))); // compute second angle in radian
        //degree2 = Math.toDegrees(degree2); // second angle in degrees
        //if(degree1 <= 90 && degree2 <= 90) // if the node is within the plane of the line
        //{
        //d = line1.ptLineDist(points[ m ].x, points[ m ].y); // compute the distance from point m to the line
        //if (d == 0)  // in case the point is on the line, and to avoid dividing by zero, we will make the distance 1
        //d = 1;
        //if (d < occlusion_threshold )
        //c1 += 1.0 / (d*d); // add the inverse proportional of the square of the distance to the cost function
        //}
        //}
        //}
        //}
        //// to compute the cost of distances from the node p to all other edges
        //for(let i=0; i<points.length; i++)  // go through all the points
        //{
        //if (i != p) // check distances from node p to all othet edges whose non of their endpoints is node p
        //for(let j=0; j<adjacency[ i ].length; j++) // creates lines for edges whose end point is point i
        //{
        //Line2D.Double line1 = new Line2D.Double(points[ i ].x, points[ i ].y , points[ adjacency[ i ][ j ] ].x, points[ adjacency[ i ][ j ] ].y); // create line
        //if ( (p != adjacency[ i ][ j ])) // if the node p is not any of the end points of the line
        //{
        //// if the point points[ p ] is within the plane of the line "angles between the point m and the end points of the line are less than or equal to 90" then we compute the distance
        //x1 = points[ p ].x - points[ i ].x;
        //y1 = points[ p ].y - points[ i ].y;
        //x2 = points[ adjacency[ i ][ j ] ].x - points[ i ].x;
        //y2 = points[ adjacency[ i ][ j ] ].y - points[ i ].y;
        //degree1 = Math.acos(((x1 * x2) + (y1 * y2))/(Math.sqrt(x1*x1 + y1*y1) * Math.sqrt(x2*x2 + y2*y2))); // compute first angle in radian
        //degree1 = Math.toDegrees(degree1); // first angle in degrees
        //x1 = points[ p ].x - points[ adjacency[ i ][ j ] ].x;
        //y1 = points[ p ].y - points[ adjacency[ i ][ j ] ].y;
        //x2 = points[ i ].x - points[ adjacency[ i ][ j ] ].x;
        //y2 = points[ i ].y - points[ adjacency[ i ][ j ] ].y;
        //degree2 = Math.acos(((x1 * x2) + (y1 * y2))/(Math.sqrt(x1*x1 + y1*y1) * Math.sqrt(x2*x2 + y2*y2))); // compute second angle in radian
        //degree2 = Math.toDegrees(degree2); // second angle in degrees
        //if(degree1 <= 90 && degree2 <= 90) // if the node is within the plane of the line
        //{
        //d = line1.ptLineDist(points[ p ].x, points[ p ].y); // compute the distance from point p to the line
        //if (d == 0)  // in case the point is on the line, and to avoid dividing by zero, we will make the distance 1
        //d = 1;
        //if (d < occlusion_threshold )
        //c2 += 1.0 / (d*d); // add the inverse proportional of the square of the distance to the cost function
        //}
        //}
        //}
        //}
        //c2 = c2 / 2; // this cost is divided by 2 because distance from node p to edges has been computed twice "with edges [i,j] and [j,i]
        //c = c1 + c2;  // add both costs
        //return (c);
        return 0;
    }

    function measure5_3(p) {
        // Angular Resolution for all angles which are affected by node p
        // This method computes angular resolution criterion
        //let angle_threshold = G.threshold5(); // Threshold value to test the angles which are below this value only
        //let c = 0; // to compute the cost of this criterion
        //let x1, x2, y1, y2; // used for computing the slopes of the lines
        //let degree, radian; // stores the degree between two lines
        //for(let i=0; i<adjacency[ p ].length; i++)  // for the first line (p,i)
        //{
        //// the following checks the angles whose common node is p
        //for(let j=i+1; j<adjacency[ p ].length; j++)  // for the second line sharing the same point p as for the first line (p,j)
        //{
        //x1 = points[ adjacency[ p ][ i ] ].x - points[ p ].x; // x coordinate difference in line 1
        //y1 = points[ adjacency[ p ][ i ] ].y - points[ p ].y; // y coordinate difference in line 1
        //x2 = points[ adjacency[ p ][ j ] ].x - points[ p ].x; // x coordinate difference in line 2
        //y2 = points[ adjacency[ p ][ j ] ].y - points[ p ].y; // y coordinate difference in line 2
        //degree = Math.acos(((x1 * x2) + (y1 * y2))/(Math.sqrt(x1*x1 + y1*y1) * Math.sqrt(x2*x2 + y2*y2))); // compute the angle in radian
        //degree = Math.toDegrees(degree); // compute the angle in degrees
        //if (degree < angle_threshold)  // check only the angles which are less than the given threshold
        //{
        //radian = Math.toRadians(degree); // convert the degree to radian
        //c += Math.abs(((2*Math.PI)/adjacency[ p ].length)-radian); // add the following to the total cost: (((2*PI)/degree of the point p) - degree in radian between line1 and line2)
        //}
        //}
        //// the following checks the angles whose common node is the node adjacent to p (not p itself)
        //for(let j=0; j<adjacency[ adjacency[ p ][ i ] ].length; j++)
        //{
        //if(adjacency[ adjacency[ p ][ i ] ][ j ] != p)
        //{
        //x1 = points[ p ].x - points[ adjacency[ p ][ i ] ].x; // x coordinate difference in line 1
        //y1 = points[ p ].y - points[ adjacency[ p ][ i ] ].y; // y coordinate difference in line 1
        //x2 = points[ adjacency[ adjacency[ p ][ i ] ][ j ] ].x - points[ adjacency[ p ][ i ] ].x; // x coordinate difference in line 2
        //y2 = points[ adjacency[ adjacency[ p ][ i ] ][ j ] ].y - points[ adjacency[ p ][ i ] ].y; // y coordinate difference in line 2
        //degree = Math.acos(((x1 * x2) + (y1 * y2))/(Math.sqrt(x1*x1 + y1*y1) * Math.sqrt(x2*x2 + y2*y2))); // compute the angle in radian
        //degree = Math.toDegrees(degree); // compute the angle in degrees
        //if (degree < angle_threshold)  // check only the angles which are less than the given threshold
        //{
        //radian = Math.toRadians(degree); // convert the degree to radian
        //c += Math.abs(((2*Math.PI)/adjacency[ adjacency[ p ][ i ] ].length)-radian); // add the following to the total cost: (((2*PI)/degree of the point i adjacent to p) - degree in radian between line1 and line2)
        //}
        //}
        //}
        //}
        //return c;
        return 0;
    }

}
