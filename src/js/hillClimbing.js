import { Vec } from "./util.js";
import {Graph} from "./graph";

function equal(a, b) {
    const EPS = 1e-10;
    return Math.abs(a - b) < EPS;
}
export class HillClimbing {
    constructor(graph, params) {
        console.log("params", JSON.stringify(params));
        if (!params) params = {};
        this.graph = graph;
        // distance to move the node
        this.squareSize = params.squareSize || 512;
        this.squareReduction = params.squareReduction || 4;
        this.it = 0;
        this.maxIt = params.iterations || 500;
        this.done = false;
        this.strategy = params.moveStrategy || "immediate";
        this.evaluatedSolutions = 0;
        this.executionTime = 0; // in ms
        this.effectBounds = true;

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
        let lastObj = this.graph.objective();
        let bestMovePerNode = [];
        
        let vectors = offsets(this.squareSize);
        for (let nId = 0; nId < this.graph._nodes.length; nId++) {
            // start with no move as the best move

            switch (this.strategy) {
                case "immediate": {
                    let bestMove = null;
                    let bestObj = Infinity;

                    for (let v of vectors) {
                        this.evaluatedSolutions++;

                        let newObj = this.graph.testMove(
                            nId,
                            v,
                            this.effectBounds
                        );
                        if (newObj !== null && newObj < bestObj) {
                            bestObj = newObj;
                            bestMove = v;
                        }
                    }
                    if (bestMove !== null) {
                        this.graph.moveNode(
                            nId,
                            bestMove,
                            this.effectBounds
                        );

                    }
                    break;
                }

                case "delayed": {
                    let bestMove = null;
                    let bestObj = this.graph.objective();

                    for (let v of vectors) {
                        this.evaluatedSolutions++;

                        let newObj = this.graph.testMove(nId, v, this.effectBounds);
                        if (
                            newObj !== null &&
                            !equal(newObj, bestObj) &&
                            newObj < bestObj
                        ) {
                            bestObj = newObj;
                            bestMove = v;
                        }
                    }
                    bestMovePerNode.push([nId, bestMove, bestObj]);
                    break;
                }
            }
        }
        for (const e of bestMovePerNode) {
            let vec = e[1];
            let nodeId = e[0];
            if (
                vec &&
                this.graph.testMove(nodeId, vec, this.effectBounds) < this.graph.objective()
            ) {
                this.graph.moveNode(nodeId, vec,this.effectBounds);
            }
        }

        let currentObj = this.graph.objective();

        if (equal(lastObj, currentObj) || currentObj > lastObj) {

            this.squareSize /= this.squareReduction;
        }

        this.it++;

        return this.graph;

    }

    // run
    run() {
        let start = performance.now();
        this.done = false;
        //this.graph.resetZn();
        while (this.it < this.maxIt && this.squareSize >= 1) {
            let startStep = performance.now();

            this.step();

            //console.log("stepTime: ", performance.now() - startStep, "cost: " + this.graph.objective());
        }
        this.executionTime = performance.now() - start;
    }

    serialize(string = true) {
        let s = {};
        if (string === true) return JSON.stringify(this);
        s.graph = this.graph.serialize();
        // distance to move the node
        s.squareSize  = this.squareSize;
        s.squareReduction = this.squareReduction;
        s.it = this.it;
        s.maxIt = this.maxIt;
        s.done = this.done;
        s.strategy = this.strategy;
        s.evaluatedSolutions = this.evaluatedSolutions;
        s.executionTime = this.executionTime; // in ms
        s.effectBounds = this.effectBounds;

        return s;


    }
    deserialize(data) {
        if (typeof data === "string") data = JSON.parse(data);
        this.graph = new Graph().deserialize(data.graph);
        // distance to move the node
        this.squareSize  = data.squareSize;
        this.squareReduction = data.squareReduction;
        this.it = data.it;
        this.maxIt = data.maxIt;
        this.done = data.done;
        this.strategy = data.strategy;
        this.evaluatedSolutions = data.evaluatedSolutions;
        this.executionTime = data.executionTime; // in ms
        this.effectBounds = data.effectBounds;
        return this;
    }
}

function offsets(squareSize) {
    let s = squareSize;
    let scaledOffsets = [
        new Vec({x:s,y: 0}),
        new Vec({x:s, y:-s}),
        new Vec({x:0, y:-s}),
        new Vec({x:-s,y: -s}),
        new Vec({x:-s, y:0}),
        new Vec({x: -s, y: s}),
        new Vec({x: 0, y: s}),
        new Vec({x:s, y:s}),
    ];
    return scaledOffsets;
}
