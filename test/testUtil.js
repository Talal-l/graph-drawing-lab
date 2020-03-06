const fs = require("fs");
const Graph = require("graphology");
export { loadGraph };

function loadGraph(filename) {
    try {
        let graph = new Graph();
        const data = fs.readFileSync(filename, "utf-8");
        graph.import(JSON.parse(data).graph);
        return graph;
    } catch (err) {
        console.error(err);
    }
}
