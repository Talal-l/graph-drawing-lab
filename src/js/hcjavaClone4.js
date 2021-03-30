import {equal} from "./util.js";
import {ZNorm} from "./normalization.js";

let HillEvalSolutions = 0;

export class HillClimbing {
    constructor(graph) {
        this.graph = graph;
        this.HillEvalSolutions = 0;
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

        this.square_size = 512;



    }

    UpdateMetrics(metrics, oldV, newV) {
        let m = {...metrics};
        for (let key of Object.keys(m)) {
            if (m[key] != 0) {
                m[key] = m[key] - oldV[key] + newV[key];
            }
            else {
                m[key] = 0;
            }
        }
        return m;
    }


    run() {
        while (this.square_size >= 1) {
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
                    points[i].x = original_point.x + offset.x * this.square_size;
                    points[i].y = original_point.y + offset.y * this.square_size;
                    if (this.graph.withinBounds(points[i].x, points[i].y)) {

                        rawNewMeasures = this.graph.calcNodeMetrics(i);
                        newMeasures = this.zn.equalizeScales(rawNewMeasures);

                        oldFit = this.graph.objective(oldMeasures);
                        newFit = this.graph.objective(newMeasures);
                        HillEvalSolutions++;
                        if (!equal(newFit, oldFit) && newFit < oldFit) {
                            this.metrics = this.UpdateMetrics(this.metrics, rawOldMeasures, rawNewMeasures);
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
                this.square_size /= 4;
            }

        }
        return this.graph;
    }
}
