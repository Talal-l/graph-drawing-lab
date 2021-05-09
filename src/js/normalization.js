import { equal } from "./util.js";

export class ZNormalization {
  constructor() {
    this.normalMetrics = {
      nodeOcclusion: 0,
      nodeEdgeOcclusion: 0,
      edgeLength: 0,
      edgeCrossing: 0,
      angularResolution: 0,
    };
    this.nodeOcclusion = {
      min: 0,
      max: 0,
      len: 0,
      avg: 0,
      SD: 0,
    };
    this.nodeEdgeOcclusion = {
      min: 0,
      max: 0,
      len: 0,
      avg: 0,
      SD: 0,
    };
    this.edgeLength = {
      min: 0,
      max: 0,
      len: 0,
      avg: 0,
      SD: 0,
    };
    this.edgeCrossing = {
      min: 0,
      max: 0,
      len: 0,
      avg: 0,
      SD: 0,
    };
    this.angularResolution = {
      min: 0,
      max: 0,
      len: 0,
      avg: 0,
      SD: 0,
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
    if (num == 0 || num == 1) {
      newSD = 0.0;
    } else {
      newSD = Math.sqrt(
        oldSD * oldSD + (measure - oldAvg) * (measure - newAvg)
      );
    }
    return newSD;
  }

  // normalize the value of m by subtracting the current average (mean) of all the current values and divide them by their standard deviation
  // then the normalized value subtracts the minimum value and divided by the difference between max and min values to get a value between 0 and 1
  normalize(metricName, m) {
    let max, min, mNorm, newAvg, newSD;

    this[metricName].len++;

    let len = this[metricName].len;

    // update sd and mean
    if (len === 1 || len === 2) {
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
    if (len <= 2) {
      this[metricName].max = m;
      this[metricName].min = m;
    } else {
      if (m > this[metricName].max) this[metricName].max = m;
      if (m < this[metricName].min) this[metricName].min = m;
    }
    // normalize using new values
    if (equal(newSD, 0)) {
      mNorm = m;
    } else {
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
  toJSON() {
    let s = {
      normalMetrics: { ...this.normalMetrics },
      nodeOcclusion: { ...this.nodeOcclusion },
      nodeEdgeOcclusion: { ...this.nodeEdgeOcclusion },
      edgeLength: { ...this.edgeLength },
      edgeCrossing: { ...this.edgeCrossing },
      angularResolution: { ...this.angularResolution },
    };
    s.nodeOcclusion.len = this.nodeOcclusion.len;
    s.nodeEdgeOcclusion.len = this.nodeEdgeOcclusion.len;
    s.edgeLength.len = this.edgeLength.len;
    s.edgeCrossing.len = this.edgeCrossing.len;
    s.angularResolution.len = this.angularResolution.len;

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

    this.normalMetrics = { ...data.normalMetrics };
    this.nodeOcclusion = { ...data.nodeOcclusion };
    this.nodeEdgeOcclusion = { ...data.nodeEdgeOcclusion };
    this.edgeLength = { ...data.edgeLength };
    this.edgeCrossing = { ...data.edgeCrossing };
    this.angularResolution = { ...data.angularResolution };

    this.nodeOcclusion.len = data.nodeOcclusion.len;
    this.nodeEdgeOcclusion.len = data.nodeEdgeOcclusion.len;
    this.edgeLength.len = data.edgeLength.len;
    this.edgeCrossing.len = data.edgeCrossing.len;
    this.angularResolution.len = data.angularResolution.len;

    return this;
  }
}

export class ZNorm {
  constructor(edgeNum) {
    this.normData = {
      nodeOcclusion: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      nodeEdgeOcclusion: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      edgeLength: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      edgeCrossing: null, // doesn't use zScoreNormalization
      angularResolution: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
    };
    this.edgeNum = edgeNum;
  }

  Avg_measures(measure, oldAvg, num) {
    let newAvg;
    if (num == 0) {
      newAvg = 0.0;
    } else {
      if (num == 1) {
        newAvg = measure;
      } else {
        newAvg = oldAvg + (measure - oldAvg) / num;
      }
    }
    return newAvg;
  }
  SD_measures(measure, oldSD, oldAvg, newAvg, num) {
    let SD;
    if (num == 0 || num == 1) {
      SD = 0.0;
    } else {
      SD = Math.sqrt(oldSD * oldSD + (measure - oldAvg) * (measure - newAvg));
    }
    return SD;
  }

  // compute and save current max and min for measure  values (old max and min are compared to parameter m)
  maxmin_m(params, m) {
    if (params.len == 0 || params.len == 1 || params.len == 2) {
      // if no or one value only in the array of the measure
      params.max = m;
      params.min = m;
    } else {
      if (m > params.max) {
        params.max = m;
      }
      if (m < params.min) {
        params.min = m;
      }
    }
  }
  normM(params, m) {
    let mNorm;
    if (params == null) {
      let e = this.edgeNum / 2; // divide by 2 because it is undirected edge
      if (e > 1) {
        mNorm = m / ((e * (e - 1)) / 2);
      } else {
        mNorm = 0;
      }
      return mNorm;
    }
    params.len++;
    if (params.len == 1 || params.len == 2) {
      params.oldAvg = m;
      params.newAvg = m;
      params.oldSd = 0;
      params.newSd = 0;
    } else {
      params.newAvg = this.Avg_measures(m, params.oldAvg, params.len - 1); // find mean
      params.newSd = this.SD_measures(
        m,
        params.oldSd,
        params.oldAvg,
        params.newAvg,
        params.len - 1
      ); // find standard deviation
      params.oldAvg = params.newAvg;
      params.oldSd = params.newSd;
    }

    this.maxmin_m(params, m);

    if (params.newSd == 0) {
      mNorm = m;
    } else {
      mNorm = (m - params.newAvg) / params.newSd; // value
      let lmin = (params.min - params.newAvg) / params.newSd; // min
      let lmax = (params.max - params.newAvg) / params.newSd; // max
      mNorm = (mNorm - lmin) / (lmax - lmin); // normalized
    }
    return mNorm;
  }

  equalizeScales(a) {
    let temp = {};
    for (let key of Object.keys(a)) {
      if (key == "edgeCrossing") {
        temp[key] = this.normM(null, a[key]);
      } else {
        temp[key] = this.normM(this.normData[key], a[key]);
      }
    }
    //console.log(temp);
    return temp;
  }

  clear() {
    this.normData = {
      nodeOcclusion: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      nodeEdgeOcclusion: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      edgeLength: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      edgeCrossing: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
      angularResolution: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        len: 0,
      },
    };
  }
}

export class FakeNormalization {
  constructor() {}
  normalize(metricName, m) {
    return m;
  }
  toJSON() {
    return {};
  }
  serialize(string = true) {
    if (string === true) return JSON.stringify(this);
    else return this.toJSON();
  }
  deserialize(data) {
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    return this;
  }
}
