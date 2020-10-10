import { Vec } from "./util.js";
import { Graph} from "./graph.js";

export class CircularLayout {
    constructor(graph, params) {
        if (!params) params = {};
        this.graph = graph;
        this.iterationCount = 0;
        this.maxIteration = params.maxIteration || 100;
        this.radius = params.radius || 450;
        this.executionTime = 0;
        this.evaluatedSolutions = 0;
    }
    onNodeMove(nodeId, layoutAlg) {

    }
    onStep(layoutAlg) {

    }

    run() {
        let start = new Date().getTime();
        while (this.iterationCount < this.maxIteration) {
            this.step();
        }
        this.executionTime = new Date().getTime() - start;
        this.iterationCount = 0;
    }

    /**
     * Execute one iteration
     */
    step() {
        let nodes = this.graph.nodes();
        let step = this.maxIteration - this.iterationCount;
        let N = nodes.length;

        for (let i = 0; i < N; i++) {
            let n = nodes[i];
            let x = this.radius * Math.cos((2 * Math.PI * i) / N);
            let y = this.radius * Math.sin((2 * Math.PI * i) / N);

            let v = new Vec((x - n.x) / step, (y - n.y) / step);
            this.graph._nodes[i].x += v.x;
            this.graph._nodes[i].y += v.y;
            this.evaluatedSolutions++;

            this.onNodeMove(i,this);
        }

        this.onStep(this);
        this.iterationCount++;
    }

    serialize(string = true) {
        let s = {};
        if (string === true) return JSON.stringify(this);
        s.graph = this.graph.serialize();
        s.iterationCount = this.iterationCount;
        s.maxIteration = this.maxIteration;
        s.radius = this.radius;
        s.executionTime = this.executionTime;

        return s;


    }
    deserialize(data) {
        if (typeof data === "string") data = JSON.parse(data);
        this.graph = new Graph().deserialize(data.graph);
        this.iterationCount = data.iterationCount;
        this.maxIteration = data.maxIteration;
        this.radius = data.radius;
        this.executionTime = data.executionTime;
        return this;
    }


}
