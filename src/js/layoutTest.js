import { Graph } from "./graph.js";
import { HillClimbing } from "./hillClimbing.js";
import { Tabu } from "./tabu.js";
import * as d3 from "d3";
import {
  distance,
  transform,
  Vec,
  pointSegDistance,
  getEdgeNodes,
  minMaxNorm,
  linesIntersect,
  sortNeighborsByAngle,
  intersection,
} from "./util.js";
window.d3 = d3;

const steps = 5;
const margin = { top: 60, right: 60, bottom: 40, left: 60 };
const width = 1000;
const height = 600;
const innerWidth = width - margin.right - margin.left;
const innerHeight = height - margin.top - margin.bottom;

const svg = d3.select("svg");

const yScale = d3.scaleLinear().range([innerHeight, 0]).domain([0, 1]);

const xScale = d3
  .scaleBand()
  .range([0, innerWidth])
  .domain([...Array(steps).keys()])
  .padding(0.2);
const myColor = d3.scaleOrdinal(d3.schemeAccent);

svg
  .append("text")
  .attr("x", width / 2)
  .attr("y", height)
  .attr("text-anchor", "middle")
  .text("steps");

svg
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -height / 2)
  .attr("y", 15)
  .attr("text-anchor", "middle")
  .text("objective");

const chart = svg
  .append("g")
  .attr("border", "solid")
  .attr("id", "theChart")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

chart.append("g").call(d3.axisLeft(yScale));
chart
  .append("g")
  .attr("transform", `translate(0, ${innerHeight})`)
  .call(d3.axisBottom(xScale));

function update(chart, data) {
  chart
    .selectAll()
    .data(data, (d, i) => d.x + d.y + i)
    .enter()
    .append("rect")
    .attr("x", (s) => xScale(s.x))
    .attr("y", (s) => yScale(s.y))
    .attr("height", (s) => innerHeight - (yScale(s.y) || 0))
    .attr("width", xScale.bandwidth());
}

const filesToLoad = [
  // "202022136912.json",
  // "simpleGraph.json"
  // "202022136932.json"
  "dataSet/TS_SA_HC/Category II/n50_dens0130_20cases_case0.json",
];
// const filesToLoad = ["202022136932.json"];
//const filesToLoad = lsDir("data").slice(0,1);

console.log("filesToLoad", filesToLoad);
// load files into concreteGraphs
const graphs = [];
const hcArr = [];
const tsArr = [];
const tsArrPR = [];
window.tsArrPR = tsArrPR;
console.time("loadingGraphs");
async function loadGraph() {
  for (const file of filesToLoad) {
    let graphData = await fetch(`data/${file}`);
    graphData = await graphData.json();
    console.log(graphData);
    let graph = new Graph.deserialize(graphData);
    graph.filename = file;
    // init hc array
    // hcArr.push(initHC(graph));
    // init ts array
    // tsArr.push(initTS(graph));
    graphs.push(graph);
  }
  console.timeEnd("loadingGraphs");

  let run1 = [];
  let run2 = [];
  let count = 50;
  for (var i = 0; i < count; i++) {
    let r1 = intesectionTest(graphs[0].graph);
    let r2 = segmentTest(graphs[0].graph);
    run1.push(r1);
    run2.push(r2);
  }
  window.run1 = run1;
  window.run2 = run2;
  console.group(`graph ${graphs[0].filename}`);
  console.log(`with vector average: ${d3.mean(run1.map((e) => e.withVec))}`);
  console.log(
    `without vector average: ${d3.mean(run1.map((e) => e.withoutVec))}`
  );
  console.log(
    `(segemtns) with vector average: ${d3.mean(run2.map((e) => e.segWithVec))}`
  );
  console.log(
    `(segments) without vector average: ${d3.mean(
      run2.map((e) => e.segWithoutVec)
    )}`
  );
  // syncWork();
}

loadGraph();
function syncWork() {
  console.group("ts with PR");
  for (const g of graphs) {
    let ts = initTS(g);
    ts.userPR = true;
    ts.run();
    tsArrPR.push(ts);
  }
  console.groupEnd("ts with PR");
  console.group("ts without PR");
  for (const g of graphs) {
    let ts = initTS(g);
    ts.userPR = false;
    ts.run();
    tsArr.push(ts);
  }

  console.groupEnd("ts without PR");

  let results = new Array(steps);
  let tsData = [];
  // for (let i = 0; i < steps; i++) {
  //     results[i] = {
  //         hcObjetives: new Array(graphs.length),
  //         tsObjetives: new Array(graphs.length)
  //     };

  //     setTimeout(() => {
  //         for (let j = 0; j < graphs.length; j++) {
  //             results[i].hcObjetives[j] = hcArr[j].step().objective();
  //             results[i].tsObjetives[j] = tsArr[j].step().objective();
  //         }

  //         tsData.push({ x: i, y: d3.mean(results[i].tsObjetives) });
  //         // array of data points
  //         console.log(tsData);
  //         //update(chart, tsData);
  //     }, 0);
  // }

  function initHC(graph) {
    let graphClone = new Graph().restoreFrom(graph);
    let param = null;
    const hc = new HillClimbing(graphClone, param);
    return hc;
  }

  function initTS(graph) {
    let graphClone = new Graph().restoreFrom(graph);
    let param = null;
    const ts = new Tabu(graphClone, param);
    return ts;
  }

  window.results = results;
  window.hcArr = hcArr;
  window.tsArr = tsArr;
  window.graphs = graphs;
  window.d3 = d3;
}

function segmentTest(graph) {
  let results = {};
  let segments = [];

  for (const edgeId of graph.edges()) {
    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let seg1 = {
      start: new Vec(sourceNode),
      end: new Vec(targetNode),
    };
    segments.push(seg1);
  }
  //console.time("intersectionTest segmetns vector");
  results.segWithVec = new Date().getTime();
  let totalsegVec = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (i === j) continue;
      let seg1 = segments[i];
      let seg2 = segments[j];
      if (
        (!seg1.start.equal(seg2.start) && !seg1.end,
        seg2.end && !seg1.start.equal(seg2.end) && !seg1.end.equal(seg2.start))
      ) {
        let isec = intersection(seg1, seg2);
        if (isec) totalsegVec++;
      }
    }
  }
  results.segWithVec = new Date().getTime() - results.segWithVec;
  //console.log(`total seg vec: ${totalsegVec}`);
  //console.timeEnd("intersectionTest segmetns vector");

  let it = 0;
  //console.time("intersectionTest segmetns without vector");
  results.segWithoutVec = new Date().getTime();
  let totalsegNoVec = 0;
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      if (i === j) continue;
      let seg1 = segments[i];
      let seg2 = segments[j];

      it++;
      if (
        !seg1.start.equal(seg2.start) &&
        !seg1.end.equal(seg2.end) &&
        !seg1.start.equal(seg2.end) &&
        !seg1.end.equal(seg2.start)
      ) {
        let isec = linesIntersect(
          seg1.start.x,
          seg1.start.y,
          seg1.end.x,
          seg1.end.y,
          seg2.start.x,
          seg2.start.y,
          seg2.end.x,
          seg2.end.y
        );
        if (isec) totalsegNoVec++;
      }
    }
  }
  console.log("iterations: " + it);

  results.segWithoutVec = new Date().getTime() - results.segWithoutVec;
  //console.log(`total seg no vec: ${totalsegNoVec}`);
  //console.timeEnd("intersectionTest segmetns without vector");
  return results;
}
function intesectionTest(graph) {
  // [vec, no vec]
  let results = {};
  let segments = [];
  for (const edgeId of graph.edges()) {
    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let seg1 = {
      start: new Vec(sourceNode),
      end: new Vec(targetNode),
    };
    segments.push(seg1);
  }

  // vector intersection test
  results.withVec = new Date().getTime();

  let totalVec = 0;
  for (const edgeId of graph.edges()) {
    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let seg1 = {
      start: new Vec(sourceNode),
      end: new Vec(targetNode),
    };

    for (let eId of graph.edges()) {
      if (edgeId === eId) continue;
      let endpointsIds = graph.extremities(eId);
      let sourceNode2 = graph.getNodeAttributes(endpointsIds[0]);
      let targetNode2 = graph.getNodeAttributes(endpointsIds[1]);
      let seg2 = {
        start: new Vec(sourceNode2),
        end: new Vec(targetNode2),
      };

      if (
        (!seg1.start.equal(seg2.start) && !seg1.end,
        seg2.end && !seg1.start.equal(seg2.end) && !seg1.end.equal(seg2.start))
      ) {
        let isec = intersection(seg1, seg2);
        if (isec) totalVec++;
      }
    }
  }
  results.withVec = new Date().getTime() - results.withVec;
  //console.log(`total ${totalVec}`);

  results.withoutVec = new Date().getTime();

  let totalNoVec = 0;
  for (const edgeId of graph.edges()) {
    let [sourceId, targetId] = graph.extremities(edgeId);
    let sourceNode = graph.getNodeAttributes(sourceId);
    let targetNode = graph.getNodeAttributes(targetId);
    let seg1 = {
      start: new Vec(sourceNode),
      end: new Vec(targetNode),
    };

    for (let eId of graph.edges()) {
      if (edgeId === eId) continue;
      let endpointsIds = graph.extremities(eId);
      let sourceNode2 = graph.getNodeAttributes(endpointsIds[0]);
      let targetNode2 = graph.getNodeAttributes(endpointsIds[1]);
      let seg2 = {
        start: new Vec(sourceNode2),
        end: new Vec(targetNode2),
      };
      if (
        (!seg1.start.equal(seg2.start) && !seg1.end,
        seg2.end && !seg1.start.equal(seg2.end) && !seg1.end.equal(seg2.start))
      ) {
        let isec = linesIntersect(
          sourceNode.x,
          sourceNode.y,
          targetNode.x,
          targetNode.y,
          sourceNode2.x,
          sourceNode2.y,
          targetNode2.x,
          targetNode2.y
        );
        if (isec) {
          totalNoVec++;
        }
      }
    }
  }
  results.withoutVec = new Date().getTime() - results.withoutVec;
  //console.log(`total no vec: ${totalNoVec}`);
  return results;
}
