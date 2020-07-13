import { Vec } from "./util.js";

function equal(a, b) {
    const EPS = 1e-10;
    return Math.abs(a - b) < EPS;
}
export class HillClimbing {
    constructor(graph, params) {
        console.log("params", JSON.stringify(params));
        this.graph = graph;
        // distance to move the node
        this.squareSize = params.squareSize || 512;
        this.squareReduction = params.squareReduction || 4;
        this.it = 0;
        this.maxIt = params.iterations || 500;
        this.done = false;
        this.strategy = params.moveStrategy || "delayed";
        this.evaluatedSolutions = 0;
        this.executionTime = 0; // in ms

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
        let v = new Vec(this.squareSize, 0);
        this.vectors = [v];
        for (let a = 45; a < 315; a += 45) {
            this.vectors.push(v.rotate(a));
        }
        let lastObj = this.graph.objective();
        let bestMovePerNode = [];
        for (let nId of this.graph.nodes()) {
            // start with no move as the best move

            switch (this.strategy) {
                case "immediate": {
                    let bestMoveIndex = null;
                    let bestObj = this.graph.objective();

                    for (let i = 0; i < this.vectors.length; i++) {
                        this.evaluatedSolutions++;
                        let newObj = this.graph.testMove(nId, this.vectors[i]);

                        if (newObj !== null && newObj < bestObj) {
                            bestObj = newObj;
                            bestMoveIndex = i;
                        }
                    }
                    if (bestMoveIndex !== null) {
                        this.graph.moveNode(nId, this.vectors[bestMoveIndex]);
                    }
                    break;
                }

                case "delayed": {
                    let bestMoveIndex = null;
                    let bestObj = this.graph.objective();

                    for (let i = 0; i < this.vectors.length; i++) {
                        this.evaluatedSolutions++;

                        const beforeTest = this.graph.objective();
                        let newObj = this.graph.testMove(nId, this.vectors[i]);
                        const afterTest = this.graph.objective();
                        if (
                            newObj !== null &&
                            !equal(newObj, bestObj) &&
                            newObj < bestObj
                        ) {
                            bestObj = newObj;
                            bestMoveIndex = i;
                        }
                    }
                    bestMovePerNode.push([nId, bestMoveIndex, bestObj]);
                    break;
                }
            }
        }
        for (const e of bestMovePerNode) {
            let vec = this.vectors[e[1]];
            let nodeId = e[0];
            if (
                vec &&
                this.graph.testMove(nodeId, vec) < this.graph.objective()
            ) {
                this.graph.moveNode(nodeId, vec);
            }
        }

        let currentObj = this.graph.objective();

        if (equal(lastObj, currentObj) || currentObj > lastObj) {
            this.squareSize /= this.squareReduction;
        }

        this.it++;
    }

    // run
    run() {
        let start = new Date().getTime();
        this.done = false;
        while (this.it < this.maxIt && this.squareSize >= 1) {
            this.step();
        }
        this.executionTime = new Date().getTime() - start;
    }
}
