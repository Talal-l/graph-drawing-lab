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
    dfs,
    sortNeighborsByAngle
} from "../src/js/util.js";
import { loadGraph } from "./testUtil.js";
const Graph = require("graphology");
const fs = require("fs");
import { convert } from "./testUtil.js";

describe("Misc", () => {
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

    test("Should sort edges as expected", () => {
        // eslint-disable-next-line no-undef
        let graph = loadGraph(`${__dirname}/data/edgeSortTest.json`);
        let center = "0";
        let endPoints = graph.neighbors(center);
        let baseEndpoint = "1";
        let sortedEdges = sortNeighborsByAngle(graph, center, baseEndpoint);

        expect(sortedEdges).toEqual(["1", "3", "4", "2"]);
    });

    test("convert custom format", () => {
        const file = `${__dirname}/data/customFormat2Cases.txt`;
        // get all files in directory
        let fileData = fs.readFileSync(file, "utf-8");
        let r = convert(fileData, file);
        let convertedFileGraph = fs.readFileSync(
            `${__dirname}/data/customFormat2CasesConverted.json`,
            "utf-8"
        );
        expect(JSON.stringify(r[0].data)).toEqual(convertedFileGraph);
    });
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
describe("deepCopy", () => {
    test("simple object", () => {
        let source = { a: 1, b: 2 };
        let copy = deepCopy(source);
        copy.a = 12;

        expect(source).not.toEqual(copy);
    });
    test("nested object 1", () => {
        let source = { a: { a1: 0, b2: 0 }, b: 0 };
        let copy = deepCopy(source);
        copy.a.a1 = 12;

        expect(source).not.toEqual(copy);
    });
    test("with array ", () => {
        let source = { a: [1, 2, 3], b: 2 };
        let copy = deepCopy(source);
        copy.a[1] = 111;
        expect(source).not.toEqual(copy);
        expect(Array.isArray(copy.a)).toBe(true);
    });
    test("with nested array  ", () => {
        let source = { a: [[0, 0, 0], 0], b: 2 };
        let copy = deepCopy(source);
        copy.a[0][0] = 1;
        expect(source).not.toEqual(copy);
        expect(Array.isArray(copy.a)).toBe(true);
    });
    test("with nested object with array  ", () => {
        let source = { a: [[{ a: 0 }, 0, 0], 0], b: 2 };
        let copy = deepCopy(source);
        copy.a[0][0].a = 1;
        expect(source).not.toEqual(copy);
        expect(Array.isArray(copy.a)).toBe(true);
    });

    test("null", () => {
        let source = null;
        let copy = deepCopy(source);
        expect(copy).toEqual(null);
    });
});
