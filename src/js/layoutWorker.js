import {CircularLayout} from "./circularLayout.js";
import {Tabu} from "./tabu.js";
import {HillClimbing} from "./hillClimbing.js";

onmessage = function (e) {
    console.log("in worker: ", JSON.stringify(e.data));
    let layoutAlg = null;
    switch (e.data.layoutAlgName) {
        case "hillClimbing":
            layoutAlg = new HillClimbing().deserialize(e.data.layoutAlg);
            break;
        case "circular":
            layoutAlg = new CircularLayout().deserialize(e.data.layoutAlg);
            break;
        case "tabu":
            layoutAlg = new Tabu().deserialize(e.data.layoutAlg);
            break;
    }
    layoutAlg[e.data.command]();

    postMessage({layoutAlg: layoutAlg, layoutAlgName: e.data.layoutAlgName, command: e.data.command});
};
