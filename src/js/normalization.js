import {equal} from "./util.js";

export class ZNormalization {
    constructor() {
        this.normalMetrics = {
            nodeOcclusion: 1,
            nodeEdgeOcclusion: 1,
            edgeLength: 1,
            edgeCrossing: 1,
            angularResolution: 1
        };
        this.nodeOcclusion = {
            min: 0,
            max: 0,
            history: [],
            avg: 0,
            SD: 0
        };
        this.nodeEdgeOcclusion = {
            min: 0,
            max: 0,
            history: [],
            avg: 0,
            SD: 0
        };
        this.edgeLength = {
            min: 0,
            max: 0,
            history: [],
            avg: 0,
            SD: 0
        };
        this.edgeCrossing = {
            min: 0,
            max: 0,
            history: [],
            avg: 0,
            SD: 0
        };
        this.angularResolution = {
            min: 0,
            max: 0,
            history: [],
            avg: 0,
            SD: 0
        };
    }

    // Compute the mean (average) from previous value of the average given the new added value, the previous average, and number of elements in the list (array).
    updateAvg(measure, oldAvg, num) {
        let newAvg;
        if (num == 0) newAvg = 0.0;
        else if (num == 1) newAvg = measure;
        else newAvg = oldAvg + (measure - oldAvg) / num;
        return newAvg;
    }

    // Compute the standard deviation of array using old value of standard deviation given the new added value, the value of previous standard deviation,
    // the value of previous average, the value of the current measure, and the number of elements in the array (list)
    updateSD(measure, oldSD, oldAvg, newAvg, num) {
        let newSD;
        if (num == 0 || num == 1) newSD = 0.0;
        else
            newSD = Math.sqrt(
                oldSD * oldSD + (measure - oldAvg) * (measure - newAvg)
            );
        return newSD;
    }

    // normalize the value of m by subtracting the current average (mean) of all the current values and divide them by their standard deviation
    // then the normalized value subtracts the minimum value and divided by the difference between max and min values to get a value between 0 and 1
    normalize(m, metricName) {
        let max, min, mNorm, newAvg, newSD;

        this[metricName].history.push(m);
        let len = this[metricName].history.length;

        // update sd and mean
        if (len < 2) {
            this[metricName].avg = m;
            newAvg = m;
            this[metricName].SD = 0;
            newSD = 0;
        } else {
            newAvg = this.updateAvg(m, this[metricName].avg, len - 1); // find mean
            newSD = this.updateSD(
                m,
                this[metricName].SD,
                this[metricName].avg,
                newAvg,
                len - 1
            ); // find standard deviation
            this[metricName].avg = newAvg;
            this[metricName].SD = newSD;
        }

        // update min and max
        if (len < 2) {
            this[metricName].max = m;
            this[metricName].min = m;
        } else {
            if (m > this[metricName].max) this[metricName].max = m;
            if (m < this[metricName].min) this[metricName].min = m;
        }
        // normalize using new values
        if (equal(newSD, 0)) mNorm = m;
        else {
            let mZScore = (m - newAvg) / newSD; // value
            min = (this[metricName].min - newAvg) / newSD; // min
            max = (this[metricName].max - newAvg) / newSD; // max
            mNorm = (mZScore - min) / (max - min); // normalized
            //if (metricName == "edgeCrossing")
                //console.log("metric: ", metricName,"min: ", min, "max: ", max, "zScore: ", mZScore, "SD: ", newSD, "avg: ", newAvg, "Norm: ", mNorm);
        }
        if (!isFinite(mNorm)) throw `${metricName} = ${mNorm}`;

        return mNorm;
    }

    // This method makes all measures of the same value where each measure becomes of the value (m1*m2*m3*m4*m5)/(m1*m2*m3*m4*m5)+1
    normalizeAll(metrics) {
        this.normalMetrics = {
            nodeOcclusion: this.normalize(
                metrics.nodeOcclusion,
                "nodeOcclusion"
            ),
            nodeEdgeOcclusion: this.normalize(
                metrics.nodeEdgeOcclusion,
                "nodeEdgeOcclusion"
            ),
            edgeLength: this.normalize(metrics.edgeLength, "edgeLength"),
            edgeCrossing: this.normalize(metrics.edgeCrossing, "edgeCrossing"),
            angularResolution: this.normalize(
                metrics.angularResolution,
                "angularResolution"
            )
        };

        return this.normalMetrics;
    }
    normalizeEdgeCrossing(m, graph) {
        let E = 0;
        let adjList = graph.adjList();
        for (let i = 0; i < adjList.length; i++) E += adjList[i].length;
        E = E / 2;
        let norm = E ? m / ((E * (E - 1)) / 2) : 0;
        if (norm < 0) {
            console.log(E);
            debugger;
        }
        return norm;
    }
    toJSON() {
        let  s = {
            normalMetrics : {... this.normalMetrics},
            nodeOcclusion: {... this.nodeOcclusion},
            nodeEdgeOcclusion: {... this.nodeEdgeOcclusion},
            edgeLength: {... this.edgeLength},
            edgeCrossing: {... this.edgeCrossing},
            angularResolution: {... this.angularResolution},

        };
        s.nodeOcclusion.history = [... this.nodeOcclusion.history];
        s.nodeEdgeOcclusion.history = [... this.nodeEdgeOcclusion.history];
        s.edgeLength.history = [... this.edgeLength.history];
        s.edgeCrossing.history = [... this.edgeCrossing.history];
        s.angularResolution.history = [... this.angularResolution.history];

        return s;
    }
    serialize(string = true) {
        if (string === true) return JSON.stringify(this);
        else return this.toJSON();
    }
    deserialize(data) {
        if (typeof data === "string") {
            data = JSON.parse(data);
        }

        this.normalMetrics = {...data.normalMetrics};
        this.nodeOcclusion = {...data.nodeOcclusion};
        this.nodeEdgeOcclusion = {...data.nodeEdgeOcclusion};
        this.edgeLength = {...data.edgeLength};
        this.edgeCrossing = {...data.edgeCrossing};
        this.angularResolution = {...data.angularResolution};

        this.nodeOcclusion.history = [...data.nodeOcclusion.history];
        this.nodeEdgeOcclusion.history = [...data.nodeEdgeOcclusion.history];
        this.edgeLength.history = [...data.edgeLength.history];
        this.edgeCrossing.history = [...data.edgeCrossing.history];
        this.angularResolution.history = [...data.angularResolution.history];

        return this;
    }
}
