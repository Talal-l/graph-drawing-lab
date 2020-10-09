import {CircularLayout} from "./circularLayout.js";
import {Tabu} from "./tabu.js";
import {HillClimbing} from "./hillClimbing.js";

onmessage = function (e) {
    let {layoutAlgName, layoutAlg, command} = e.data;
    //console.log("in worker: ", JSON.stringify(e.data));
    switch (layoutAlgName) {
        case "hillClimbing":
            layoutAlg = new HillClimbing().deserialize(layoutAlg);
            break;
        case "circular":
            layoutAlg = new CircularLayout().deserialize(layoutAlg);
            break;
        case "tabu":
            layoutAlg = new Tabu().deserialize(layoutAlg);
            break;
    }
    layoutAlg[command]();

    postMessage({layoutAlg: layoutAlg, layoutAlgName: layoutAlgName, command: command});
};
