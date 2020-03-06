import {
    nodeNodeOcclusion,
    edgeNodeOcclusion,
    edgeLength,
    edgeCrossing,
    angularResolution,
} from "../src/js/metrics.js";

import { loadGraph } from "./testUtil.js";
import { distance, Vec } from "../src/js/util.js";
const Graph = require("graphology");
describe("node-node occlusion metric", () => {
    let minDist = 10;
    let nocMax = 1 / minDist ** 2;
    let largeDist = 1024;
    it.skip(`Should accept both string and int ids`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        let rInt = nodeNodeOcclusion(g, 0, minDist);
        let rStr = nodeNodeOcclusion(g, "0", minDist);
        expect(rInt).toBe(rStr);
    });
    it(`Should be 0 for graph with 1 node`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        let r = nodeNodeOcclusion(g, "0", minDist);
        expect(r).toBe(0);
    });

    it(`Should throw if id is not in graph`, () => {});
    it(`Should throw if not given a valid graph`, () => {});
    it(`Should be ${nocMax} if distance is ${minDist} (min)`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: minDist, y: 0 });
        let r = nodeNodeOcclusion(g, "0", minDist);
        expect(r).toBe(nocMax);
    });
    it(`Should be ${1 / 24 ** 2} if distance is ${24}`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 24, y: 0 });
        let r = nodeNodeOcclusion(g, "0", minDist);
        expect(r).toBe(1 / 24 ** 2);
    });
    it(`Should be ${1 / largeDist ** 2} if distance is ${largeDist}`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: largeDist, y: 0 });
        let r = nodeNodeOcclusion(g, "0", minDist);
        expect(r).toBe(1 / largeDist ** 2);
    });
    it(`Should be ${nocMax} if it overlaps another node`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 0, y: 0 });
        let r = nodeNodeOcclusion(g, "0", minDist);
        expect(r).toBe(nocMax);
    });
});

describe("edge-node occlusion metric", () => {
    let minDist = 10;
    let mMax = 1 / minDist ** 2;
    let largeDist = 1024;
    it(`Should accept both string and int ids`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 0, y: 0 });
        g.addEdgeWithKey(0, 0, 1);
        let rInt = edgeNodeOcclusion(g, 0, minDist);
        let rStr = edgeNodeOcclusion(g, "0", minDist);
        expect(rInt).toBe(rStr);
    });
    it(`Should be 0 when we have a single edge`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 100, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);
        let r = edgeNodeOcclusion(g, "0-1", minDist);
        expect(r).toBe(0);
    });
    it(`Should be ${mMax} when node is on edge`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 100, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);

        g.addNode(2, { x: 50, y: 0 });
        let r = edgeNodeOcclusion(g, "0-1", minDist);
        expect(r).toBe(mMax);
    });
    it(`Should work with 2 connected edges`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 100, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);
        g.addNode(2, { x: 50, y: 50 });
        g.addEdgeWithKey("0-2", 1, 2);
        let r1 = edgeNodeOcclusion(g, "0-1", minDist);
        let r2 = edgeNodeOcclusion(g, "0-2", minDist);
        expect(r1 + r2).toBeCloseTo(0.0004 + 0.0002);
    });
    it(`Should be ${2 * mMax} for overlapping edges with shared node`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 100, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);
        g.addNode(2, { x: 100, y: 0 });
        g.addEdgeWithKey("0-2", 0, 2);
        let r1 = edgeNodeOcclusion(g, "0-1", minDist);
        let r2 = edgeNodeOcclusion(g, "0-2", minDist);
        expect(r1 + r2).toBe(2 * mMax);
    });
    it(`Should be ${4 *
        mMax} for overlapping edges with no shared node`, () => {
        let g = new Graph();
        g.addNode(0, { x: 0, y: 0 });
        g.addNode(1, { x: 100, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);
        g.addNode(2, { x: 0, y: 0 });
        g.addNode(3, { x: 100, y: 0 });
        g.addEdgeWithKey("2-3", 2, 3);
        let r1 = edgeNodeOcclusion(g, "0-1", minDist);
        let r2 = edgeNodeOcclusion(g, "2-3", minDist);
        expect(r1 + r2).toBe(4 * mMax);
    });
    it(``, () => {});
});

describe("edge length metric", () => {
    it(``, () => {});
});
describe("edge crossing metric", () => {
    it(``, () => {});
});
describe("angular resolution metric", () => {
    it(`Should be 180 when two edges overlap`, () => {
        let g = new Graph();
        g.addNode(0, { x: 10, y: 0 });
        g.addNode(1, { x: 20, y: 0 });
        g.addNode(2, { x: 30, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);
        g.addEdgeWithKey("0-2", 0, 2);

        let r = angularResolution(g, "0");
        expect(r).toBe(180);
    });
    it(`Should be 180 when two edges overlap (y != 0)`, () => {
        let g = new Graph();
        g.addNode(0, { x: 10, y: 10 });
        g.addNode(1, { x: 20, y: 20 });
        g.addNode(2, { x: 30, y: 30 });
        g.addEdgeWithKey("0-1", 0, 1);
        g.addEdgeWithKey("0-2", 0, 2);

        let r = angularResolution(g, "0");
        expect(r).toBeCloseTo(180);
    });
    it(`Should be ${243} when we have 2 sets of overlapping edges (45 deg between the sets)`, () => {
        let g = new Graph();
        g.addNode(0, { id: "0", label: "0", x: 0, y: 0 });

        g.addNode(1, { id: "1", label: "1", x: 20, y: 20 });
        g.addNode(2, { id: "2", label: "2", x: 30, y: 30 });

        g.addNode(3, { id: "3", label: "3", x: 40, y: 0 });
        g.addNode(4, { id: "4", label: "4", x: 50, y: 0 });
        g.addNode(5, { id: "5", label: "5", x: 60, y: 0 });
        g.addEdgeWithKey("0-1", 0, 1);
        g.addEdgeWithKey("0-2", 0, 2);
        g.addEdgeWithKey("0-3", 0, 3);
        g.addEdgeWithKey("0-4", 0, 4);
        g.addEdgeWithKey("0-5", 0, 5);

        let r = angularResolution(g, "0");
        expect(r).toBe(243);
    });

    test("Should give expected values for the given graph (calculated manually)", () => {
        let g = loadGraph(`${__dirname}/data/k3.json`);
        expect(Math.floor(angularResolution(g, "0"))).toBe(151);
        expect(Math.floor(angularResolution(g, "1"))).toBe(90);
        expect(Math.floor(angularResolution(g, "2"))).toBe(118);
    });

    test("Should give 180 for all nodes if all angles are zero (complete graph with 3 nodes)", () => {
        let g = loadGraph(`${__dirname}/data/k3-overlap.json`);
        expect(angularResolution(g, "0")).toBeCloseTo(180);
        expect(angularResolution(g, "1")).toBeCloseTo(180);
        expect(angularResolution(g, "2")).toBeCloseTo(180);
    });
});
