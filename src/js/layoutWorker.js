import { CircularLayout } from "./circularLayout.js";
import { Tabu} from "./tabu.js";
import { HillClimbing } from "./hillClimbing.js";
import { ConcreteGraph, generateGraph } from "./graph.js";

let GRAPH = new ConcreteGraph();
let layoutAlgList = { CircularLayout, HillClimbing };

onmessage = function(e) {
    console.log(e.data);
    let [graph, layoutAlgName, options, command] = e.data;

    let graphParam = options.metricsParam;
    let layoutParam = options.layoutParam;

    GRAPH.read(graph);
    GRAPH.setMetricParam(graphParam);
    GRAPH.setWeights(options.weights);

    let layoutAlg = null;
    switch (layoutAlgName) {
        case "hillClimbing":
            layoutAlg = new HillClimbing(GRAPH, layoutParam);
            break;
        case "circular":
            layoutAlg = new CircularLayout(GRAPH, layoutParam);
            break;
        case "tabu":
            layoutAlg = new Tabu(GRAPH, layoutParam);
            break;
    }
    layoutAlg[command]();

    let info = {
        executionTime: layoutAlg.executionTime,
        evaluatedSolutions: layoutAlg.evaluatedSolutions
    }

    postMessage([GRAPH.graph.toJSON(), layoutAlgName, options, command, info]);
};
