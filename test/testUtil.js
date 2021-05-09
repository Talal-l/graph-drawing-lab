const fs = require("fs");
const sep = require("path").sep;
const Graph = require("graphology");
export { loadGraph, walkDir, convert };

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

function walkDir(path) {
  let files = [];
  if (fs.lstatSync(path).isDirectory()) {
    let list = fs.readdirSync(path);
    for (let p of list) files = files.concat(walkDir(path + sep + p));
  } else files.push(path);
  // filter out hidden files
  return files.filter((f) => !/(^|\/|\\)\.[^\/\.]/g.test(f));
}

function convert(data, filePath) {
  let byline = data.split("\n");
  let caseNum = Number(byline[0]);
  let start = 0;
  let nodesCoord = {};
  let files = [];

  for (var i = 0; i < caseNum; i += 1) {
    let graph = { attributes: {}, nodes: [], edges: [] };

    let nodeNum = Number(byline[start + 1]);
    nodesCoord = byline[start + 2].split("  ").map((e) => ({
      x: Number(e.split(" ")[0]),
      y: Number(e.split(" ")[1]),
    }));

    for (let i = 0; i < nodesCoord.length - 1; i++) {
      let node = {
        key: `${i}`,
        attributes: {
          label: `${i}`,
          id: i,
          x: nodesCoord[i].x,
          y: nodesCoord[i].y,
          size: 10,
          color: "#921",
        },
      };
      if (node.x !== null && node.y !== null) graph.nodes.push(node);
    }

    let offset = start + 4;
    for (let j = 0; j < nodeNum; j += 1) {
      let adj = byline[j + offset++].split(" ").map((e) => Number(e));
      adj.pop(); // remove "\r"
      for (let a of adj) {
        let edge = {
          source: `${j}`,
          target: `${a}`,
          key: `e${j}-${a}`,
          attributes: {
            id: `e${j}-${a}`,
            source: `${j}`,
            target: `${a}`,
            size: 1.5,
            color: "#ccc",
          },
        };
        graph.edges.push(edge);
      }
    }
    let destFile = filePath.split(sep).pop();
    let destPath = `${__dirname}/data/testSet/${destFile}_case${i}`;

    files.push({
      filename: destFile,
      path: destPath,
      data: { graph: graph },
    });
    start += nodeNum * 2 + 4;
  }
  return files;
}
