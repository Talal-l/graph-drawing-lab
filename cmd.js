// wrapper to run the code without a gui (browser)
import {hillClimbing_Fast_NoGrid} from "./src/js/hcjavaClone.js";
import {Graph} from "./src/js/graph.js";
import * as fs from "fs";

function main(){
    let path = "data/Gr1";
    let file = fs.readFileSync(path,"utf8");

    let w = {
        nodeOcclusion: 0,
        nodeEdgeOcclusion: 0,
        edgeLength: 0,
        edgeCrossing: 1,
        angularResolution: 0,
    };
        

        let graph = new Graph().importCustom(file);
        //graph.setWeights(w);

        hillClimbing_Fast_NoGrid(graph);


}

main();
