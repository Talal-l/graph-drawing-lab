import {equal} from "./util.js";
import {ZNorm} from "./normalization.js";
import {Graph} from "./graph.js";
import {updateMetrics, calcMetrics, calcNodeMetrics, MetricsWeights, MetricsParams, Metrics} from "./metrics2.js";


export class HillClimbing {
    constructor(graph, params) {
        if (!params) params = new MetricsParams;
        this.graph = graph;
        this.weights = params.weights || new MetricsWeights();
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

        this.metrics = new Metrics;

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

    }
    _normalizeAll(metrics) {
        // use zScore normalization except for edge crossing
        let normalMetrics = {
            nodeOcclusion: 0,
            nodeEdgeOcclusion: 0,
            edgeLength: 0,
            edgeCrossing: 0,
            angularResolution: 0,
        };

        if (this.weights.edgeCrossing) {
            let E = 0;
            for (let i = 0; i < this._adjList.length; i++) {
                E += this._adjList[i].length;
            }
            E = E / 2;
            normalMetrics.edgeCrossing =
                E > 1 ? metrics.edgeCrossing / ((E * (E - 1)) / 2) : 0;
        }
        if (this.weights.nodeOcclusion) {
            normalMetrics.nodeOcclusion = this.zn.normalize(
                "nodeOcclusion",
                metrics.nodeOcclusion
            );
        }
        if (this.weights.nodeEdgeOcclusion) {
            normalMetrics.nodeEdgeOcclusion = this.zn.normalize(
                "nodeEdgeOcclusion",
                metrics.nodeEdgeOcclusion
            );
        }
        if (this.weights.edgeLength) {
            normalMetrics.edgeLength = this.zn.normalize(
                "edgeLength",
                metrics.edgeLength
            );
        }
        if (this.weights.angularResolution) {
            normalMetrics.angularResolution = this.zn.normalize(
                "angularResolution",
                metrics.angularResolution
            );
        }

        return normalMetrics;
    }
    onNodeMove(nodeId, layoutAlg) {
    }
    onStep(layoutAlg) {
    }
    _objective(normalizedMetrics) {
        let m = normalizedMetrics;
        let wSum = 0;
        for (let key in m) {
            wSum += m[key] * this.weights[key];
        }
        return wSum;
    }


    step() {
        let oldMeasures = null;
        let newMeasures = null;
        let rawOldMeasures = null;
        let rawNewMeasures = null;
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

            rawOldMeasures = calcNodeMetrics(this.graph,i);
            oldMeasures = this.zn.equalizeScales(rawOldMeasures);

            for (let offset of this.offsets) {
                points[i].x = original_point.x + offset.x * this.squareSize;
                points[i].y = original_point.y + offset.y * this.squareSize;
                if (this.graph.withinBounds(points[i].x, points[i].y)) {
                    this.evaluatedSolutions++;

                    rawNewMeasures = calcNodeMetrics(this.graph,i);
                    newMeasures = this.zn.equalizeScales(rawNewMeasures);

                    oldFit = this._objective(oldMeasures);
                    newFit = this._objective(newMeasures);
                    if (!equal(newFit, oldFit) && newFit < oldFit) {
                        this.metrics = updateMetrics(this.metrics, rawOldMeasures, rawNewMeasures);
                        this.cost = this._objective(this.metrics);
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

        this.cost = this._objective(this.zn.equalizeScales(this.metrics));
        if ((!equal(this.cost, this.old_cost) && this.cost >= this.old_cost) || equal(this.cost, this.old_cost)) {
            this.squareSize /= 4;
        }

        return this.graph;
    }

    run() {
        let start = performance.now();
        this.done = false;
        this.zn = new ZNorm(this.graph.edgesNum());
        this.cost = 0;
        this.old_cost = Infinity;
        this.metrics = calcMetrics(this.graph,this.params);
        // we need teh extra normalization to match the java results
        this.zn.equalizeScales(this.metrics);
        let normalizedMetrics = this.zn.equalizeScales(this.metrics);
        this.cost = this._objective(normalizedMetrics);


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
