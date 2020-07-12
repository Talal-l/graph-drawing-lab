import { Vec } from "./util.js";
import { ConcreteGraph } from "./graph.js";

// Util methods
function bestObjective(solutions) {
    let bestSol = solutions[0];
    for (let sol of solutions) {
        if (sol.objective < bestSol.objective) bestSol = sol;
    }
}

function str(obj) {
    return JSON.stringify(obj);
}

function copyGraphFrom(concreteGraph) {
    return new ConcreteGraph(concreteGraph.graph);
}
function sameGraph(G1, G2) {
    return str(G1.graph) === str(G2.graph);
}
function inTabuSet(set, s) {
    for (const sol of set) {
        if (s.nodeId === sol.nodeId && s.pos === sol.pos) return true;
    }
    return false;
}
function isHighQuality(refSet, sol) {
    for (const s of refSet) {
        if (sol.objective > s.objective) return false;
    }
    return true;
}

function isDiverse(refSet, sol) {
    // distance from the best objective
    return sol.pos.sub(bestObjective(refSet).pos).len();
}

// add to set or replace with worst if size limit is reached
function replaceWorseSol(refSet, sol) {
    if (isHighQuality(this.refSet, sol) || isDiverse(this.refSet, sol)) {
        // replace solution with the worst objective
        let index = 0;
        let worstObj = refSet[0].objective;

        for (let i = 0; i < refSet.length; i++) {
            const s = refSet[i];
            if (s.objective > worstObj) {
                index = i;
                worstObj = s.objective;
            }
        }
        refSet[index] = sol;
    }
}

function moveAlongPath() {}

function pathRelinking(refSet, params) {
    let maxIter = params.PRmaxIter;
    let selectSol = params.selectionStrategy;

    let i = 0;
    while (i < maxIter && refSet.length > 1) {
        let { src, dst } = selectSol(refSet);
        let candidateLayout1 = moveAlongPath(src, dst, params);
        let candidateLayout2 = moveAlongPath(dst, src, params);
        replaceWorseSol(
            refSet,
            bestObjective(candidateLayout1, candidateLayout2)
        );
        i++;
    }
}

export class Tabu {
    constructor(graph, params) {
        this.graph = graph;
        if (!params) params = {};
        this.params = params;
        // distance to move the node
        this.squareSize = params.squareSize || 512;
        this.initSquareSize = this.squareSize;
        this.squareReduction = params.squareReduction || 1;
        this.refSetSize = 10;
        this.maxIt = params.iterations || 40;
        this.intensifyIt = params.intensifyIt || 5;
        this.cutoff = params.cutoff || 4;
        this.initCutoff = this.cutoff;
        this.cutoffReduction = params.cutoffReduction || 0.005;
        this.duration = params.duration || 5;

        this.executionTime = 0;
        this.evaluatedSolutions = 0;
        this.it = 0;
        this.done = false;
        this.tabuSet = [];
        this.refSet = [];
        // shape of a solution

        /* 
            Assuming the following
            
                   ^ 0,-1
                   |
          -1.0 <---.---> 1,0
                   |
                   v  0,1

        */
    }

    // single iteration of the layout algorithm
    step() {
        // copy graph into a new instance
        let layout = this.graph;
        let candididates = [];
        // find best solution/move for every node
        for (let nId of layout.nodes()) {
            const currentObj = layout.objective();
            const currentPos = layout.getNodePos(nId);
            let chosenSol = null;
            let chosenSolObj = Infinity;

            // generate the 8 vectors around the square
            let v = new Vec(this.squareSize, 0);
            this.vectors = [v];
            for (let a = 45; a < 315; a += 45) {
                this.vectors.push(v.rotate(a));
            }

            for (let v of this.vectors) {
                this.evaluatedSolutions++;

                let candidateSol = {
                    nodeId: nId,
                    pos: v.add(currentPos),
                    it: this.it
                };

                if (!inTabuSet(this.tabuSet, candidateSol)) {
                    // get the objective if node was moved in the direction of v
                    let candidateSolObj = layout.testMove(nId, v);
                    let ratio = candidateSolObj / currentObj;

                    if (ratio > this.cutoff) {
                        this.tabuSet.push(candidateSol);
                    } else if (candidateSolObj < chosenSolObj) {
                        chosenSolObj = candidateSolObj;
                        chosenSol = candidateSol;
                    }
                }
            }

            if (chosenSol !== null) {
                layout.setNodePos(chosenSol.nodeId, chosenSol.pos, false);

                let currentSol = {
                    nodeId: nId,
                    pos: currentPos,
                    it: this.it
                };
                this.tabuSet.push(currentSol);
            }

            if (this.it % this.intensifyIt === 0) {
                // this.squareSize = this.squareSize / this.squareReduction;
                this.cutoff -= this.cutoffReduction * this.intensifyIt;
            }
            // remove old sol from tabu set
            let filtered = this.tabuSet.filter(
                s => this.it - s.it < this.duration
            );
            if (filtered.length < this.tabuSet.length) this.tabuSet = filtered;
        }
        this.it++;
    }

    // run
    run() {
        let start = new Date().getTime();
        this.done = false;
        while (this.it < this.maxIt) {
            this.step();
        }
        this.executionTime = new Date().getTime() - start;
    }
}
