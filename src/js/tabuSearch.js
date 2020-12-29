import {
    nodeOcclusion,
    nodeEdgeOcclusion,
    edgeLength,
    edgeCrossing,
    angularResolution,
} from "./metrics2.js";

import { offsets } from "./util.js";
import { ZNormalization } from "./normalization.js";

import { Graph } from "./graph.js";

function inTabuSet(tabuSet, { v, pos }) {
    for (let e in tabuSet) {
        if (e.v === v && e.pos.x === pos.x && e.pos.y === pos.y) {
            return true;
        }
    }
}
function minFitness(candidates) {
    let minC = candidates[0];
    for (let c of candidates) {
        if (c.fitness < minC.fitness) {
            minC = c;
        }
    }
    return minC;
}
function fitness(layout, weights, requiredEdgeLength) {
    let nodeOc = 0;
    let nodeEdgeOc = 0;
    let angularRes = 0;
    let edgeCross = 0;
    let edgeLen = 0;

    let fitness = 0;

    if (weights.nodeOcclusion > 0) {
        nodeOc = nodeOcclusion(layout);
        // fitness += zNorm.normalize("nodeOcclusion", nodeOc);
        fitness += nodeOc;
    }

    if (weights.nodeEdgeOcclusion > 0) {
        nodeEdgeOc = nodeEdgeOcclusion(layout);
        // fitness += zNorm.normalize("nodeEdgeOcclusion", nodeEdgeOc);
        fitness += nodeEdgeOc;
    }
    if (weights.angularResolution > 0) {
        angularRes = angularResolution(layout);
        // fitness += zNorm.normalize("angularResolution", angularRes);
        fitness += angularRes;
    }
    if (weights.edgeCrossing > 0) {
        edgeCross = edgeCrossing(layout);
        // fitness += zNorm.normalize("edgeCrossing", edgeCross);
        fitness += edgeCross;
    }
    if (weights.edgeLength > 0) {
        edgeLen = edgeLength(layout, requiredEdgeLength);
        // fitness += zNorm.normalize("edgeLength", edgelen);
        fitness += edgeLen;
    }

    return fitness;
}
export class TabuSearch {
    constructor(graph) {
        this.graph = graph;
        this.layoutAlgName = "tabuSearch";
        this.executionTime = 0;
        this.evaluatedSolutions = 0;
    }
    step() {}
    run() {
        let initialSquareSize = 512;
        let initialCutoff = 4;
        let maxIterations = 40;
        let intensifyIterations = 5;
        let intensifyCutOff = 0.005;
        let squareReduction = 4;
        let duration = 5;
        let requiredEdgeLength = 100;

        let tabuSet = [];
        let squareSize = initialSquareSize;
        let cutOff = initialCutoff;
        let iteration = 0;

        let layout = this.graph;

        let V = [...Array(layout._nodes.length).keys()];
        let startTime = performance.now();
        while (iteration < maxIterations) {
            for (let v of V) {
                let currentPos = {
                    x: layout._nodes[v].x,
                    y: layout._nodes[v].y,
                };

                let currentFitness = fitness(
                    layout,
                    layout.weights,
                    this.requiredEdgeLength
                );

                let candidates = [];
                for (let offset of offsets(squareSize)) {
                    console.log("moving", v, offset);
                    let candidatePos = {
                        x: currentPos.x + offset.x * squareSize,
                        y: currentPos.y + offset.y * squareSize,
                    };
                    if (
                        !inTabuSet(tabuSet, {
                            v: v,
                            pos: candidatePos,
                            iteration: iteration,
                        })
                    ) {
                        this.evaluatedSolutions++;
                        layout._nodes[v].x = candidatePos.x;
                        layout._nodes[v].y = candidatePos.y;
                        let candidateFitness = fitness(
                            layout,
                            layout.weights,
                            requiredEdgeLength
                        );
                        layout._nodes[v].x = currentPos.x;
                        layout._nodes[v].y = currentPos.y;
                        let ratio = candidateFitness / currentFitness;
                        if (!isFinite(ratio) || ratio > cutOff) {
                            tabuSet.push({
                                v: v,
                                pos: candidatePos,
                                iteration: iteration,
                            });
                        } else {
                            candidates.push({
                                pos: candidatePos,
                                fitness: candidateFitness,
                            });
                        }
                    }
                }
                if (candidates.length > 0) {
                    let newPos = minFitness(candidates).pos;
                    layout._nodes[v].x = newPos.x;
                    layout._nodes[v].y = newPos.y;
                    tabuSet.push({
                        v: v,
                        pos: currentPos,
                        iteration: iteration,
                    });
                }
            }
            if (iteration % intensifyIterations === 0) {
                squareSize = squareSize - initialSquareSize / squareReduction;
                cutOff = cutOff - intensifyCutOff * intensifyIterations;
            }
            tabuSet = tabuSet.filter((e) => e.iteration - 1 < duration);
            iteration = iteration + 1;
        }
        this.executionTime = performance.now() - startTime;
        return layout;
    }
    deserialize(data) {
        if (typeof data === "string") data = JSON.parse(data);
        this.graph = new Graph().deserialize(data.graph);
        this.layoutAlgName = data.layoutAlgName;
        return this;
    }
    serialize(string = true) {
        let s = {};
        if (string === true) return JSON.stringify(this);
        s.graph = this.graph.serialize();
        s.layoutAlgName = this.layoutAlgName;

        return s;
    }
}
