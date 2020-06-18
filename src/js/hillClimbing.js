import { Vec } from "./util.js";

export class HillClimbing {
    constructor(graph, params) {
        this.graph = graph;
        // distance to move the node
        this.squareSize = params.squareSize || 100;
        this.it = 0;
        this.maxIt = params.iterations || 500;
        this.done = false;
        this.strategy = params.moveStrategy || "immediate";

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
        console.log(`move strategy ${this.strategy}`);
        
    }

    // single iteration of the layout algorithm
    step() {
        let lastObj = this.graph.objective();
        for (let nId of this.graph.nodes()) {
            // start with no move as the best move

            switch (this.strategy) {
                case "immediate":{

                    let bestMoveIndex = null;
                    let bestObj = this.graph.objective();

                    for (let i = 0; i < this.vectors.length; i++) {
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

                case "delayed":{

                    let bestMoveIndex = null;
                    let bestMovePerNode = [];
                    let bestObj = this.graph.objective();

                    for (let i = 0; i < this.vectors.length; i++) {
                        let newObj = this.graph.testMove(nId, this.vectors[i]);
                        if (newObj !== null && newObj < bestObj) {
                            bestObj = newObj;
                            bestMoveIndex = i;
                            bestMovePerNode.push([nId,i]);
                        }
                    }
                    for (const e of bestMovePerNode) {
                       this.graph.moveNode(e[0],this.vectors[e[1]]); 
                    }
                    break;
                }

            }
        }

        if (lastObj === this.graph.objective()) {
            this.done = true;
        }
        this.it++;
    }

    // run
    run() {
        this.done = false;
        while (this.it < this.maxIt && !this.done) {
            this.step();
        }
    }
}




