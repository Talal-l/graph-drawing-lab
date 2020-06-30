import {} from "../src/js/metrics.js";

import { Tabu } from "../src/js/tabu.js";
import { loadGraph } from "./testUtil.js";
import { ConcreteGraph } from "../src/js/graph.js";
const Graph = require("graphology");

describe("Tabu search algorithm", () => {
    let graphSet = [];
    let params = {};
    graphSet.map(e => new ConcreteGraph(e, params));
    it(`Should give better objective`, () => {
        let g = loadGraph(`${__dirname}/data/simpleGraph.json`);
        let graph = new ConcreteGraph(g);
        let objectiveBeforeRun = graph.objective();
        let tabu = new Tabu(graph);
        tabu.run();
        let objectiveAfterRun= graph.objective();
        expect(objectiveAfterRun).toBeLessThan(objectiveBeforeRun);


    });
});
