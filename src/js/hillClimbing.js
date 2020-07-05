import { Vec } from "./util.js";

function equal(a, b) {
    const EPS = 1e-10;
    console.log(a, b, Math.abs(a - b) < EPS);
    return Math.abs(a - b) < EPS;
}
export class HillClimbing {
    constructor(graph, params) {
        console.log("params", JSON.stringify(params));
        this.graph = graph;
        // distance to move the node
        this.squareSize = params.squareSize || 512;
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

        let v = new Vec(this.squareSize, 0);
        this.vectors = [v];
        for (let a = 45; a < 315; a += 45) {
            this.vectors.push(v.rotate(a));
        }
    }

    // single iteration of the layout algorithm
    step() {
        let lastObj = this.graph.objective();
        let bestMovePerNode = [];
        for (let nId of this.graph.nodes()) {
            // start with no move as the best move

            switch (this.strategy) {
                //case "immediate":{

                //let bestMoveIndex = null;
                //let bestObj = this.graph.objective();

                //for (let i = 0; i < this.vectors.length; i++) {
                //let newObj = this.graph.testMove(nId, this.vectors[i]);
                //if (newObj !== null && newObj < bestObj) {
                //bestObj = newObj;
                //bestMoveIndex = i;
                //}
                //}
                //if (bestMoveIndex !== null) {
                //this.graph.moveNode(nId, this.vectors[bestMoveIndex]);
                //}
                //break;
                //}

                default: {
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

        if (equal(lastObj, this.graph.objective())) {
            this.done = true;
        }
        this.it++;
    }

    // run
    run() {
        let start = new Date().getTime();
        this.done = false;
        while (this.it < this.maxIt && !this.done) {
            this.step();
        }
        this.executionTime = new Date().getTime() - start;
    }
}
