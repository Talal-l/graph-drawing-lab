import {offsets, Vec} from "./util.js";
import {Graph} from "./graph.js";

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
        this.effectBounds = false;
        this.layoutAlgName = "hillClimbing";

        /* 
            Assuming the following
            
                   ^ 0,-1
                   |
          -1.0 <---.---> 1,0
                   |
                   v  0,1

        */
    }
    onNodeMove(nodeId, layoutAlg) {

    }
    onStep(layoutAlg) {

    }


    // single iteration of the layout algorithm
    step() {
        let lastObj = this.graph.objective();

        //console.log("step: " + this.it + " nodeNodeOcclusion: " + this.graph._metrics.nodeOcclusion +
            //" normalized to: " + this.graph.normalMetrics().nodeOcclusion,
            //"History: " + JSON.stringify(this.graph._zn.nodeOcclusion.history));

        let vectors = offsets(this.squareSize);
        for (let nId = 0; nId < this.graph._nodes.length; nId++) {
            // start with no move as the best move


            let bestMove = new Vec(0,0);
            let bestMoveObj = this.graph.nodeObjective(nId);
            let originalPos = this.graph.getNodePos(nId);

            for (let v of vectors) {
                this.evaluatedSolutions++;

                let newPos = this.graph.moveNode(
                    nId,
                    v,
                    this.effectBounds
                );
                if (newPos == null) continue;
                //console.log("moved node: " + nId + " using: (" + v.x + ", " + v.y + ") to: (" + newPos.x + ", " + newPos.y + ")");

                let newPosObjective = (newPos != null) ? this.graph.nodeObjective(nId) :Infinity;

                this.graph.setNodePos(
                    nId,
                    originalPos,
                    this.effectBounds
                );

                if (newPosObjective !== null && newPosObjective < bestMoveObj) {
                    bestMoveObj = newPosObjective;
                    bestMove = v;
                }
            }
            // triggers an event
            this.graph.moveNode(
                nId,
                bestMove,
                this.effectBounds
            );


            this.onNodeMove(nId, this);

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
        this.graph.resetZn();
        while (this.it < this.maxIt && this.squareSize >= 1) {
            let startStep = performance.now();
            this.step();
            this.onStep(this);
            //console.log("stepTime: ", performance.now() - startStep, "cost: " + this.graph.objective());
        }
        this.executionTime = performance.now() - start;
    }

    serialize(string = true) {
        let s = {};
        if (string === true) return JSON.stringify(this);
        s.graph = this.graph.serialize();
        // distance to move the node
        s.squareSize = this.squareSize;
        s.squareReduction = this.squareReduction;
        s.it = this.it;
        s.maxIt = this.maxIt;
        s.done = this.done;
        s.strategy = this.strategy;
        s.evaluatedSolutions = this.evaluatedSolutions;
        s.executionTime = this.executionTime; // in ms
        s.effectBounds = this.effectBounds;
        s.layoutAlgName = this.layoutAlgName;

        return s;


    }
    deserialize(data) {
        if (typeof data === "string") data = JSON.parse(data);
        this.graph = new Graph().deserialize(data.graph);
        // distance to move the node
        this.squareSize = data.squareSize;
        this.squareReduction = data.squareReduction;
        this.it = data.it;
        this.maxIt = data.maxIt;
        this.done = data.done;
        this.strategy = data.strategy;
        this.evaluatedSolutions = data.evaluatedSolutions;
        this.executionTime = data.executionTime; // in ms
        this.effectBounds = data.effectBounds;
        this.layoutAlgName = data.layoutAlgName;
        return this;
    }
}


