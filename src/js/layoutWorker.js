import { CircularLayout } from "./circularLayout.js";
import { HillClimbing } from "./hillClimbing.js";
import { ConcreteGraph, generateGraph } from "./graph.js";

let GRAPH = new ConcreteGraph();
let layoutAlgList = { CircularLayout, HillClimbing };
console.log(layoutAlgList);

onmessage = function(e) {
    console.log(e.data);
    let [graph, layoutAlgName, options, command] = e.data;

    GRAPH.read(graph);
    let layoutAlg = null;
    switch (layoutAlgName) {
        case "hillClimbing":
            layoutAlg = new HillClimbing(GRAPH, options);
            break;
        case "circular":
            layoutAlg = new CircularLayout(GRAPH, options);
            break;
    }
    layoutAlg[command]();

    postMessage([GRAPH.graph.toJSON(), layoutAlgName, options, command]);
};