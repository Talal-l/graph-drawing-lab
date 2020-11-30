import {
    nodeOcclusion,
    nodeEdgeOcclusion,
    edgeLength,
    edgeCrossing,
    angularResolution
} from "./metrics2.js";

import {ZNormalization} from "./normalization.js";

import {Graph} from "./graph.js";


function inTabuSet(tabuSet, {v, candidatePos}){
    for (let e in tabuSet){
        if (e.v === v && e.candidatePos === candidatePos){
            return true;
        }
    }
}
function minFitness(candidates){
    let minC = candidates[0];
    for (let c in candidates){
        if (c.fitness < minC.fitness){
            minC = c;
        }
    }
    return minC;
}



export class TabuSearch {
    constructor(graph){
        this.graph = graph;
        this.layoutAlgName = "tabuSearch";
        this.executionTime = 0;
        this.evaluatedSolutions = 0;



    }

    step(){

    }
    run() {

        let initialSquareSize = 512;
        let initialCutoff = 4;
        let maxIterations = 40;
        let intensifyIterations = 5;
        let intensifyCutOff = 0.005;
        let squareReduction = 4;
        let duration = 5;
        let requiredEdgeLength = 100;


        let allOffsets = [[1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
        let tabuSet = [];
        let squareSize = initialSquareSize;
        let cutOff = initialCutoff;
        let iteration = 0;

        let layout = this.graph;


        let V = layout._nodes.map(e => e.id);

        let zNorm = new ZNormalization();
        function fitness(layout) {
            let nodeOc = nodeOcclusion(layout);
            let nodeEdgeOc = nodeEdgeOcclusion(layout);
            let angularRes = angularResolution(layout);
            let edgeCross = edgeCrossing(layout);
            let edgelen = edgeLength(layout, requiredEdgeLength);

            let fitness = 0;
            fitness += zNorm.normalize("nodeOcclusion", nodeOc);
            fitness += zNorm.normalize("nodeEdgeOcclusion", nodeEdgeOc);
            fitness += zNorm.normalize("angularResolution", angularRes);
            fitness += zNorm.normalize("edgeCrossing", edgeCross);
            fitness += zNorm.normalize("edgeLength", edgelen);

            return fitness;
        }
        let startTime = performance.now();
        while (iteration < maxIterations) {
            for (let v of V) {
                let candidates = [];
                let currentPos = {...layout._nodes[v]};
                let currentFitness = fitness(layout);
                for (let offset of allOffsets) {
                    this.evaluatedSolutions++;
                    console.log("moving", v, offset);
                    let candidatePos = [currentPos.x + offset[0]*squareSize, currentPos.y + offset[1]*squareSize];
                    if (!inTabuSet(tabuSet, {v, candidatePos, iteration})) {
                        layout._nodes[v].x = candidatePos[0];
                        layout._nodes[v].y = candidatePos[1];

                        let candidateFitness = fitness(layout);
                        if (candidateFitness / currentFitness > cutOff) {
                            tabuSet.push({v: v, candidatePos: candidatePos, iteration: iteration});
                        }else {
                            candidates.push({candidatePos: candidatePos, candidateFitness: candidateFitness});
                        }
                        layout._nodes[v].x = currentPos.x;
                        layout._nodes[v].y = currentPos.y;
                    }
                }
                if (candidates.length > 0) {
                    let newPos = minFitness(candidates).candidatePos;
                    layout._nodes[v].x = newPos[0];
                    layout._nodes[v].y = newPos[1];
                }
            }
            if ((iteration % intensifyIterations) === 0) {
                squareSize = squareSize - (initialSquareSize / squareReduction);
                cutOff = cutOff - (intensifyCutOff * intensifyIterations);
            }
            tabuSet = tabuSet.filter(e => e.iteration - 1 < duration);
            iteration = iteration + 1;
        }
        this.executionTime = performance.now() - startTime;
        console.log("fitness", fitness(layout));
        console.log("nodes", JSON.stringify(layout._nodes));
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
