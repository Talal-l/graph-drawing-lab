import {
    refreshScreen,
    getEdgeNodes,
    shuffle,
    distance,
    pointSegDistance,
    random,
    Vec,
    intersection,
    edgeIntersection,
    minMaxNorm,
    transform,
    isEmpty,
    deepCopy,
    getEdgeId,
    dfs
} from "../src/js/util.js";
const Graph = require("graphology");

test("distance ", () => {
    let p1 = { x: 0, y: 0 };
    let p2 = { x: 1, y: 1 };
    expect(distance(p1, p2)).toBeCloseTo(Math.sqrt(2));
});
test("dfs", () => {
    let order = [];
    let g = new Graph();
    g.import({
        nodes: [{ key: 1 }, { key: 2 }, { key: 3 }, { key: 4 }],
        edges: [
            { source: 1, target: 2 },
            { source: 1, target: 3 },
            { source: 2, target: 3 },
            { source: 2, target: 4 }
        ]
    });
    dfs(g, "1", nId => {
        order.push(nId);
    });
    expect(order).toEqual(["1", "2", "3", "4"]);
});

describe("Vector class", () => {
    test(`The angle should be 0 if one of the vectors is (0,0)`, () => {
        let v1 = new Vec({ x: 0, y: 0 });
        let v2 = new Vec({ x: 10, y: 0 });
        let a = v1.angle(v2);
        expect(a).toBe(0);
    });
    test(`The angle should be close to 0 when the vectors are parallel`, () => {
        let v1 = new Vec({ x: 100, y: 0 });
        let v2 = new Vec({ x: 20, y: 0 });
        let a = v1.angle(v2);
        expect(a).toBeCloseTo(0);
    });
});
