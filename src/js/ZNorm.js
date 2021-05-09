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
        history: [],
      },
      nodeEdgeOcclusion: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
      edgeLength: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
      edgeCrossing: null, // doesn't use zScoreNormalization
      angularResolution: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
    };

    function Avg_measures(measure, oldAvg, num) {
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
    function SD_measures(measure, oldSD, oldAvg, newAvg, num) {
      let SD;
      if (num == 0 || num == 1) {
        SD = 0.0;
      } else {
        SD = Math.sqrt(oldSD * oldSD + (measure - oldAvg) * (measure - newAvg));
      }
      return SD;
    }

    // compute and save current max and min for measure  values (old max and min are compared to parameter m)
    function maxmin_m(params, m) {
      if (
        params.history.length == 0 ||
        params.history.length == 1 ||
        params.history.length == 2
      ) {
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
    function normM(params, m) {
      let mNorm;
      if (params == null) {
        let e = edgeNum / 2; // divide by 2 because it is undirected edge
        if (e > 1) {
          mNorm = m / ((e * (e - 1)) / 2);
        } else {
          mNorm = 0;
        }
        return mNorm;
      }
      params.history.push(m);
      if (params.history.length == 1 || params.history.length == 2) {
        params.oldAvg = m;
        params.newAvg = m;
        params.oldSd = 0;
        params.newSd = 0;
      } else {
        params.newAvg = Avg_measures(
          m,
          params.oldAvg,
          params.history.length - 1
        ); // find mean
        params.newSd = SD_measures(
          m,
          params.oldSd,
          params.oldAvg,
          params.newAvg,
          params.history.length - 1
        ); // find standard deviation
        params.oldAvg = params.newAvg;
        params.oldSd = params.newSd;
      }

      maxmin_m(params, m);

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

    this.equalizeScales = function (a) {
      let temp = {};
      for (let key of Object.keys(a)) {
        if (key == "edgeCrossing") {
          temp[key] = normM(null, a[key]);
        } else {
          temp[key] = normM(this.normData[key], a[key]);
        }
      }
      //console.log(temp);
      return temp;
    };
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
        history: [],
      },
      nodeEdgeOcclusion: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
      edgeLength: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
      edgeCrossing: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
      angularResolution: {
        min: 0,
        max: 0,
        oldAvg: 0,
        newAvg: 0,
        oldSd: 0,
        newSd: 0,
        history: [],
      },
    };
  }
}

/************************************** END of NORMALIZATION ****************************************/

let zn = new ZNorm();
