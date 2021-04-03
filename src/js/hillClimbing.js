import {equal} from "./util.js";
import {ZNorm} from "./normalization.js";
import {Graph} from "./graph.js";
import {updateMetrics} from "./metrics2.js";


export class HillClimbing {
    constructor(graph, params) {
        if (!params) params = {};
        this.graph = graph;
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

        this.metrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };

        graph.setWeights({
            nodeOcclusion: 1,
            nodeEdgeOcclusion: 0,
            edgeLength: 1,
            edgeCrossing: 1,
            angularResolution: 1,
        });

        this.offsets = [
            {x: 1, y: 0}, // right
            {x: 1, y: 1}, // lower-right
            {x: 0, y: 1}, // bottom
            {x: -1, y: 1}, // lower left
            {x: -1, y: 0}, // left location
            {x: -1, y: -1}, // upper left
            {x: 0, y: -1}, // up
            {x: 1, y: -1}, // upper right
        ];

        this.zn = new ZNorm(graph.edgesNum());
        this.cost = 0;
        this.old_cost = Infinity;


        this.metrics = graph.calcMetrics();
        // we need teh extra normalization to match the java results
        this.zn.equalizeScales(this.metrics);
        let normalizedMetrics = this.zn.equalizeScales(this.metrics);
        this.cost = graph.objective(normalizedMetrics);
    }

    onNodeMove(nodeId, layoutAlg) {
    }
    onStep(layoutAlg) {
    }



    step() {
        let oldMeasures = {};
        let newMeasures = {};
        let rawOldMeasures = {};
        let rawNewMeasures = {};
        let oldFit, newFit;
        let bestPos = {x: 0, y: 0};
        let original_point = {x: 0, y: 0};
        let points = this.graph._nodes;

        this.old_cost = this.cost;
        for (let i = 0; i < points.length; i++) {

            // save original and it's normalied metrics
            original_point.x = points[i].x;
            original_point.y = points[i].y;
            bestPos.x = points[i].x;
            bestPos.y = points[i].y;

            rawOldMeasures = this.graph.calcNodeMetrics(i);
            oldMeasures = this.zn.equalizeScales(rawOldMeasures);

            for (let offset of this.offsets) {
                points[i].x = original_point.x + offset.x * this.squareSize;
                points[i].y = original_point.y + offset.y * this.squareSize;
                if (this.graph.withinBounds(points[i].x, points[i].y)) {
                    this.evaluatedSolutions++;

                    rawNewMeasures = this.graph.calcNodeMetrics(i);
                    newMeasures = this.zn.equalizeScales(rawNewMeasures);

                    oldFit = this.graph.objective(oldMeasures);
                    newFit = this.graph.objective(newMeasures);
                    if (!equal(newFit, oldFit) && newFit < oldFit) {
                        this.metrics = updateMetrics(this.metrics, rawOldMeasures, rawNewMeasures);
                        this.cost = this.graph.objective(this.metrics);
                        oldMeasures = newMeasures;
                        rawOldMeasures = rawNewMeasures;
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

        this.cost = this.graph.objective(this.zn.equalizeScales(this.metrics));
        if ((!equal(this.cost, this.old_cost) && this.cost >= this.old_cost) || equal(this.cost, this.old_cost)) {
            this.squareSize /= 4;
        }

        return this.graph;
    }

    run() {
        let start = performance.now();
        this.done = false;
        while (this.squareSize >= 1) {
            this.step();
            this.onStep(this);
        }

        this.executionTime = performance.now() - start;
        return this.graph;
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
