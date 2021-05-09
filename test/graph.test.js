import { generateGraph, ConcreteGraph } from "../src/js/graph.js";
import { dfs } from "../src/js/util.js";
import { loadGraph } from "./testUtil.js";
const Graph = require("graphology");
describe("Graph Generation", () => {
  let nMin = 12;
  let nMax = 12;
  let eMin = 11;
  let eMax = 66;

  it(`Should create a connected graph`, () => {
    let g = generateGraph(nMin, nMax, eMin, eMax, 1000, 1000);
    let count = 0;
    dfs(g, "0", (id) => {
      count++;
    });
    expect(count).toBe(g.nodes().length);
  });
});
describe("ConcreteGraph", () => {
  let expectedMetrics;
  let bounds;
  beforeAll(() => {
    bounds = JSON.stringify({
      xMax: 1000,
      yMax: 1000,
      xMin: -1000,
      yMin: -1000,
    });
    expectedMetrics = JSON.stringify({
      nodeOcclusion: 0,
      edgeNodeOcclusion: 0,
      edgeLength: 0,
      edgeCrossing: 0,
      angularResolution: 0,
    });
  });
  it(`Should be possible to create a graph with a given graph instance`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    let g1 = new ConcreteGraph();
    g1.read(graphObject);
    expect(g).toEqual(g1);
  });
  it(`Should be able to set metrics parameters using the constructor`, () => {
    let g = new ConcreteGraph(null, {
      metricsParam: {
        requiredEdgeLength: 0.5,
      },
    });
    expect(g.metricsParam.requiredEdgeLength).toEqual(0.5);
  });
  it(`Should be able to set the weights using the constructor`, () => {
    let g = new ConcreteGraph(null, {
      weights: {
        nodeOcclusion: 0.5,
        edgeNodeOcclusion: 0.1,
        edgeLength: 0,
        edgeCrossing: 0.999,
        angularResolution: 0.001,
      },
    });
    let weights = {
      nodeOcclusion: 0.5,
      edgeNodeOcclusion: 0.1,
      edgeLength: 0,
      edgeCrossing: 0.999,
      angularResolution: 0.001,
    };

    expect(g.weights).toEqual(weights);

    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g1 = new ConcreteGraph(graphObject, {
      weights: {
        nodeOcclusion: 0.5,
        edgeNodeOcclusion: 0.1,
        edgeLength: 0,
        edgeCrossing: 0.999,
        angularResolution: 0.001,
      },
    });

    expect(g1.weights).toEqual(weights);
  });
  it(`Should be able to move a node (within bounds)`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    g.moveNode("0", { x: 100, y: 100 });

    expect(g.getNodeAttributes("0").x).toEqual(100);
    expect(g.getNodeAttributes("0").y).toEqual(100);
  });
  it(`Should be able to move a node outside bounds if effectBounds is true`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    g.moveNode("0", { x: -2000, y: 2000 }, true);
    expect(g.getNodeAttributes("0").x).toEqual(-2000);
    expect(g.getNodeAttributes("0").y).toEqual(2000);
    expect(g.bounds.xMin).toEqual(-2000);
    expect(g.bounds.yMax).toEqual(2000);
  });
  it(`Should not move if effectBounds is false and move is outside the bounds`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    g.moveNode("0", { x: -2000, y: 2000 }, false);

    expect(g.getNodeAttributes("0").x).toEqual(0);
    expect(g.getNodeAttributes("0").y).toEqual(0);
  });
  it(`Should be able to set the position of a node outside the bound`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    g.setNodePos("0", { x: 2000, y: -2000 });
    expect(g.getNodeAttributes("0").x).toEqual(2000);
    expect(g.getNodeAttributes("0").y).toEqual(-2000);

    expect(g.bounds.xMax).toEqual(2000);
    expect(g.bounds.yMin).toEqual(-2000);
  });
  it(`Should not be able to set the position of a node outside the bound if effectBounds is false`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    g.setNodePos("0", { x: 2000, y: -2000 }, false);
    expect(g.getNodeAttributes("0").x).toEqual(0);
    expect(g.getNodeAttributes("0").y).toEqual(0);

    g.setNodePos("0", { x: 1000, y: -1000 }, false);
    expect(g.getNodeAttributes("0").x).toEqual(1000);
    expect(g.getNodeAttributes("0").y).toEqual(-1000);
  });
  it(`Should be able to remove a node (should also change the objective)`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    let g1 = new ConcreteGraph(graphObject);

    g1.removeNode("0");

    expect(g1.nodes()).not.toEqual(g.nodes());
    expect(g1.objective()).not.toEqual(g.objective());
  });
  it(`Should be able to remove an edge (should also change the objective)`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    let g1 = new ConcreteGraph(graphObject);

    g1.removeEdge("e0-1");

    expect(g1.edges()).not.toEqual(g.edges());
    expect(g1.objective()).not.toEqual(g.objective());
  });
  it(`Should be able to clear a graph`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject);
    g.clear();
    expect(g.weights).toEqual({
      nodeOcclusion: 1,
      edgeNodeOcclusion: 1,
      edgeLength: 1,
      edgeCrossing: 1,
      angularResolution: 1,
    });
    expect(g.metricsCache).toEqual({
      nodeOcclusion: 0,
      edgeNodeOcclusion: 0,
      edgeLength: 0,
      edgeCrossing: 0,
      angularResolution: 0,
    });
    expect(g.minDist).toEqual(10);
    expect(g.maxDist).toBeCloseTo(2828.42712474619);
  });
  test(`setWeights should produce the right intial metricsPerNode`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph(graphObject, {
      weights: {
        nodeOcclusion: 0,
        edgeNodeOcclusion: 1,
        edgeLength: 1,
        edgeCrossing: 1,
        angularResolution: 1,
      },
    });

    let g1 = new ConcreteGraph(graphObject);
    g.setWeights({
      nodeOcclusion: 1,
      edgeNodeOcclusion: 1,
      edgeLength: 1,
      edgeCrossing: 1,
      angularResolution: 1,
    });
    expect(g).toEqual(g1);
  });
  test("Reading should give expected graph", () => {
    let g = new ConcreteGraph();
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    g.read(graphObject);
    let g1 = new Graph();
    g1.import(graphObject);
    expect(g.graph).toEqual(g1);
  });
  it(`Should get 2 neighbors for node 0`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph();
    g.read(graphObject);
    expect(g.neighbors("0").length).toEqual(2);
  });
  test(`Empty graph should have all metrics set to zero`, () => {
    let g = new ConcreteGraph();
    expect(g.metricsCache.nodeOcclusion).toEqual(0);
    expect(g.metricsCache.edgeNodeOcclusion).toEqual(0);
    expect(g.metricsCache.angularResolution).toEqual(0);
    expect(g.metricsCache.edgeLength).toEqual(0);
    expect(g.metricsCache.edgeCrossing).toEqual(0);
  });
  it(`Should give 0 objective when moving a node in a graph with 1 node `, () => {
    let g = new ConcreteGraph();
    g.addNode({
      label: "0",
      id: "0",
      x: 0,
      y: 0,
      size: 10,
      color: "#921",
    });
    g.moveNode("0", { x: 100, y: 100 });
    expect(g.objective()).toEqual(0);
  });
  test(`angular resolution should be 90`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g = new ConcreteGraph();
    g.read(graphObject);
    expect(g.metricsCache.angularResolution).toBe(90);
  });
  test(`angular resolution should be 135 after moving a source (angle 45)`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g1 = new ConcreteGraph();
    g1.read(graphObject);
    g1.setNodePos("0", { x: -100, y: 0 });
    expect(g1.metricsCache.angularResolution).toBe(135);
  });
  test(`angular resolution should be 135 after moving a target (angle 45)`, () => {
    let g = new ConcreteGraph();
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    g.read(graphObject);
    g.setNodePos("1", { x: 100, y: -100 });
    expect(g.metricsCache.angularResolution).toBe(135);
  });
  it(`Should give the same graph when graph is created at once or by adding elements to it (same bounds)`, () => {
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    let g1 = new ConcreteGraph();
    g1.read(graphObject);
    let g2 = new ConcreteGraph();
    g2.addNode({
      label: "0",
      id: "0",
      x: 0,
      y: 0,
      size: 10,
      color: "#921",
    });
    g2.addNode({
      label: "1",
      id: "1",
      x: 0,
      y: -100,
      size: 10,
      color: "#921",
    });
    g2.addNode({
      label: "2",
      id: "2",
      x: 100,
      y: 0,
      size: 10,
      color: "#921",
    });
    g2.addNode({
      label: "3",
      id: "3",
      x: -80,
      y: -110,
      size: 10,
      color: "#921",
    });
    g2.addNode({
      label: "4",
      id: "4",
      x: 80,
      y: 50,
      size: 10,
      color: "#921",
    });
    g2.addEdge({
      id: "e0-1",
      source: "0",
      target: "1",
      size: 1.5,
      color: "#ccc",
    });
    g2.addEdge({
      id: "e0-2",
      source: "0",
      target: "2",
      size: 1.5,
      color: "#ccc",
    });
    g2.addEdge({
      id: "e3-4",
      source: "3",
      target: "4",
      size: 1.5,
      color: "#ccc",
    });
    expect(g1).toEqual(g2);
  });
  it(`Should work with overlapping nodes`, () => {
    let g2 = new ConcreteGraph();
    for (let i = 0; i <= 4; i++) {
      g2.addNode({
        label: `${i}`,
        id: `${i}`,
        x: 0,
        y: 0,
        size: 10,
        color: "#921",
      });
    }
    g2.addEdge({
      id: "e0-1",
      source: "0",
      target: "1",
      size: 1.5,
      color: "#ccc",
    });
    g2.addEdge({
      id: "e0-2",
      source: "0",
      target: "2",
      size: 1.5,
      color: "#ccc",
    });
    g2.addEdge({
      id: "e3-4",
      source: "3",
      target: "4",
      size: 1.5,
      color: "#ccc",
    });
  });
  it(`Should be possible to get the same graph using moveNode()`, () => {
    let g1 = new ConcreteGraph();
    let graphObject = loadGraph(`${__dirname}/data/simpleGraph.json`);
    g1.read(graphObject);

    let g2 = new ConcreteGraph();
    for (let i = 0; i <= 4; i++) {
      g2.addNode({
        label: `${i}`,
        id: `${i}`,
        x: i * 10 + 1,
        y: 0,
        size: 10,
        color: "#921",
      });
    }
    g2.addEdge({
      id: "e0-1",
      source: "0",
      target: "1",
      size: 1.5,
      color: "#ccc",
    });
    g2.addEdge({
      id: "e0-2",
      source: "0",
      target: "2",
      size: 1.5,
      color: "#ccc",
    });
    g2.addEdge({
      id: "e3-4",
      source: "3",
      target: "4",
      size: 1.5,
      color: "#ccc",
    });

    g2.setNodePos("0", { x: 0, y: 0 });
    g2.setNodePos("1", { x: 0, y: -100 });
    g2.setNodePos("2", { x: 100, y: 0 });
    g2.setNodePos("3", { x: -80, y: -110 });
    g2.setNodePos("4", { x: 80, y: 50 });
    let m1 = g1.metricsCache;
    let m2 = g2.metricsCache;
    expect(m2.nodeOcclusion).toBeCloseTo(m1.nodeOcclusion, 5);
    expect(m2.edgeNodeOcclusion).toBeCloseTo(m1.edgeNodeOcclusion, 5);
    expect(m2.edgeLength).toBeCloseTo(m1.edgeLength, 5);
    expect(m2.edgeCrossing).toEqual(m1.edgeCrossing);
    expect(m2.angularResolution).toEqual(m1.angularResolution);
  });
  describe("Graph with edge length spanning the max distance", () => {
    test("Normalized result should be 0.25 if required length is 0.5", () => {
      let g = new ConcreteGraph(null, {
        metricsParam: { requiredEdgeLength: 0.5 },
      });
      g.addNode({
        id: "0",
        x: -1000,
        y: 1000,
        color: "#921",
        size: 10,
      });
      g.addNode({
        id: "1",
        x: 1000,
        y: -1000,
        color: "#921",
        size: 10,
      });
      g.addEdge({
        id: "e0-1",
        source: "0",
        target: "1",
      });
      g.objective();
      expect(g.normalMetrics.edgeLength).toBeCloseTo(0.25);
    });

    test(`Should be 0 if required length is 1`, () => {
      let g = new ConcreteGraph(null, {
        metricsParam: { requiredEdgeLength: 1 },
      });
      g.addNode({
        id: "0",
        x: -1000,
        y: 1000,
        color: "#921",
        size: 10,
      });
      g.addNode({
        id: "1",
        x: 1000,
        y: -1000,
        color: "#921",
        size: 10,
      });
      g.addEdge({
        id: "e0-1",
        source: "0",
        target: "1",
      });
      g.objective();
      expect(g.normalMetrics.edgeLength).toBeCloseTo(0);
    });
    test(`Should be 1 if required length is 1`, () => {
      let g = new ConcreteGraph(null, {
        metricsParam: { requiredEdgeLength: 0.0035355339059327377 },
      });
      g.addNode({
        id: "0",
        x: -1000,
        y: 1000,
        color: "#921",
        size: 10,
      });
      g.addNode({
        id: "1",
        x: 1000,
        y: -1000,
        color: "#921",
        size: 10,
      });
      g.addEdge({
        id: "e0-1",
        source: "0",
        target: "1",
      });
      g.objective();
      expect(g.normalMetrics.edgeLength).toBeCloseTo(1);
    });
  });
});
