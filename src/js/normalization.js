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
        if (len == 1 || len == 2) {
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
        // if no or one value only in the array of measure 1
        if (len < 3) {
            this[metricName].max = m;
            this[metricName].min = m;
        } else {
            if (m > this[metricName].max) this[metricName].max = m;
            if (m < this[metricName].min) this[metricName].min = m;
        }
        if (newSD == 0) mNorm = m;
        else {
            let mNorm1 = (m - newAvg) / newSD; // value
            min = (this[metricName].min - newAvg) / newSD; // min
            max = (this[metricName].max - newAvg) / newSD; // max
            mNorm = (mNorm1 - min) / (max - min); // normalized
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
}
