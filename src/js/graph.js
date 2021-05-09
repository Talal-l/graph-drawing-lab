import { distance, random, Vec } from "./util.js";
export { generateGraph, Graph };

/**
 * Creates a random spanning tree for the given graph.
 *
 * @param {object} G -  graph instance
 * @returns {undefined}
 *
 */
function ranSpanningTree(G) {
  // deep copy of the existing nodes
  let outTree = G.nodes(true);
  // select the root
  let inTree = [outTree.pop()];

  while (outTree.length) {
    // pick a node from outside the tree
    let source = outTree.pop();
    // pick a random node from the tree
    let target = inTree[random(0, inTree.length - 1)];
    // create an edge
    G.addEdge(target.id, source.id);
    // add node to tree
    inTree.push(source);
  }
}
/*
 *
 * @param {number} nMin  Minimum number of nodes
 * @param {number} nMax  Maximum number of nodes
 * @param {number} eMin  Minimum number of edges
 * @param {number} eMax  Maximum number of edges
 * @param {object} width Width of the HTML canvas element
 * @param {object} height Height of the HTML canvas element
 * @returns {object} a graph object
 */
function generateGraph(nMin, nMax, eMin, eMax, width, height, s) {
  const x = width;
  const y = height;

  let G = new Graph();
  const N = random(nMin, nMax);
  const eLimit = (N * (N - 1)) / 2;
  let E = random(Math.min(eMin, eLimit), Math.min(eMax, eLimit));

  for (let i = 0; i < N; i++) {
    let n = {
      id: i,
      x: (0.5 - Math.random()) * x,
      y: (0.5 - Math.random()) * y,
    };
    G.addNode(n);
  }
  let nodes = G.nodes();

  // create a random spanning tree (ST) to guarantee that the graph is connected
  ranSpanningTree(G);
  // subtract edges created by the ST
  E = E - (N - 1);

  // loop until the desired number of edges is reached
  for (let i = 0; E > 0; i = (i + 1) % N) {
    // determine the number of edges allowed for this node in this iteration
    let nEdge = random(0, Math.min(E, N - 1));
    for (let j = 0; j < N && nEdge > 0; j++) {
      // pick a random node to connect to
      let n1 = nodes[random(0, N - 1)].id;
      let n2 = nodes[random(0, N - 1)].id;
      if (n1 !== n2 && !G.hasEdge(n1, n2)) {
        G.addEdge(n1, n2);
        nEdge--;
        // update total edge count
        E--;
      }
    }
  }
  return G;
}

class Graph {
  constructor(graph, options) {
    this._nodes = [];
    this._adjList = [];

    options = options || {};
    this.nodeSize = 10;
    this.edgeSize = 1.5;
    this.nodeColor = "#000";
    this.edgeColor = "#000";
    const width = 1600;
    const height = 880;
    this.defaultBounds = {
      xMax: width - 20,
      yMax: height - 20,
      xMin: 20,
      yMin: 20,
    };
    this.bounds = { ...this.defaultBounds };
    this.minDist = 10;
    this.maxDist = distance(
      { x: this.bounds.xMax, y: this.bounds.yMax },
      { x: this.bounds.xMin, y: this.bounds.yMin }
    );
  }
  get nextId() {
    return this._nextId++;
  }

  nodes(copy = false) {
    let clone = [];
    if (copy) {
      for (let n of this._nodes) {
        clone.push({ ...n });
      }
    } else clone = this._nodes;
    return clone;
  }
  addNode(node) {
    node.id = this._nodes.length;
    this._nodes.push(node);
    this._adjList.push(new Array(0));
    this._adjList[this._nodes.length - 1] = [];
  }
  getNodePos(nodeId) {
    return { x: this._nodes[nodeId].x, y: this._nodes[nodeId].y };
  }
  nodesIds() {
    let ids = [];
    for (let i = 0; i < this._nodes.length; i++) {
      if (i !== null) {
        ids.push(i);
      }
    }

    return ids;
  }
  removeNode(nodeId) {
    this._nodes.copyWithin(nodeId, nodeId + 1);
    this._nodes.length--;
    this._adjList.copyWithin(nodeId, nodeId + 1);
    this._adjList.length--;

    for (let i = 0; i < this._nodes.length; i++) {
      if (i !== this._nodes[i].id) {
        this._nodes[i].id = i;
      }
      let index = -1;
      for (let j = 0; j < this._adjList[i].length; j++) {
        if (this._adjList[i][j] === nodeId) {
          index = j;
        } else if (this._adjList[i][j] > nodeId) {
          this._adjList[i][j]--;
        }
      }
      if (index !== -1) {
        this._adjList[i].copyWithin(index, index + 1);
        this._adjList[i].length--;
      }
    }
  }

  // returns the new position if withing bound or null if outside.
  moveNode(nodeId, vec, effectBounds = false) {
    let node = this._nodes[nodeId];

    let x = node.x + vec.x;
    let y = node.y + vec.y;

    if (!effectBounds && !this.withinBounds(x, y)) {
      return null;
    }
    node.x = x;
    node.y = y;
    return { x: node.x, y: node.y };
  }
  // defaults to true since it's mostly used in the ui and we want to
  // always change the bounds there
  setNodePos(nodeId, newPos, effectBounds = true) {
    let node = this._nodes[nodeId];
    let a = new Vec(node.x, node.y);
    let b = new Vec(newPos.x, newPos.y);
    return this.moveNode(nodeId, b.sub(a), effectBounds);
  }
  adjList() {
    return this._adjList;
  }

  edges() {
    let nodes = this._nodes;
    let adj = this._adjList;
    let edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < adj[i].length; j++) {
        if (adj[i][j] != null) edges.push(`${i}->${adj[i][j]}`);
      }
    }
    return edges;
  }
  edgesNum() {
    let E = 0;
    let nodes = this._nodes;
    let adj = this._adjList;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < adj[i].length; j++) {
        if (adj[i][j] != null) E++;
      }
    }
    return E;
  }
  addEdge(n1Id, n2Id) {
    if (n1Id == null || n2Id == null)
      throw `invalid parameters ${n1Id} ${n2Id}`;
    if (!this.hasEdge(n1Id, n2Id)) {
      this._adjList[n1Id].push(n2Id);
      this._adjList[n2Id].push(n1Id);
    }
  }
  removeEdge(source, target) {
    for (let i = 0; i < this._adjList[source].length; i++) {
      if (this._adjList[source][i] === target) {
        this._adjList[source].splice(i, 1);
      }
    }
    for (let i = 0; i < this._adjList[target].length; i++) {
      if (this._adjList[target][i] === source) {
        this._adjList[target].splice(i, 1);
      }
    }
  }

  hasEdge(source, target) {
    for (let a of this._adjList[source]) {
      if (a === target) return true;
    }
    for (let a of this._adjList[target]) {
      if (a === source) return true;
    }
    return false;
  }

  density() {
    let V = this._nodes.length;
    let E = this.edges().length;
    let D = E / (V * (V - 1)) || 0;
    return D;
  }

  clear() {
    this._nodes = [];
    this._adjList = [];
    this._nextId = -1;
    this.bounds = { ...this.defaultBounds };
    return this;
  }
  withinBounds(x, y) {
    let { xMax, yMax, xMin, yMin } = this.bounds;
    return x < xMax && x > xMin && y < yMax && y > yMin;
  }
  // returns the min bounding box
  getBoundaries() {
    let b;

    b = {
      xMax: 0,
      yMax: 0,
      xMin: 0,
      yMin: 0,
    };
    for (let n of this._nodes) {
      if (n) {
        b.xMax = Math.max(b.xMax, n.x);
        b.xMin = Math.min(b.xMin, n.x);
        b.yMax = Math.max(b.yMax, n.y);
        b.yMin = Math.min(b.yMin, n.y);
      }
    }
    return b;
  }
  // only copies the nodes and edges
  readGraph(graph) {
    let gn = graph._nodes;
    let gAdj = graph._adjList;
    this._nodes = new Array(gn.length);
    this._adjList = new Array(gn.length);
    for (let i = 0; i < gn.length; i++) {
      this._nodes[i] = { ...gn[i] };
      this._adjList[i] = [...gAdj[i]];
    }
  }
  // copies a complete graph
  restoreFrom(graph) {
    let g = graph;
    this.clear();

    this.options = { ...g.options };
    this.bounds = { ...g.bounds };
    this._nextId = g._nextId;
    this.requiredEdgeLengthPerc = g.requiredEdgeLengthPerc;
    this.minDist = g.minDist;
    this.maxDist = g.maxDist;
    this.readGraph(g);
    return this;
  }
  fromGraphology(graph) {
    this.clear();
    let idMap = new Map();
    for (let i = 0; i < graph.nodes.length; i++) {
      let n = graph.nodes[i];
      if (n == null) continue;
      let pos = {
        x: n.attributes.x,
        y: n.attributes.y,
        id: Number(n.attributes.id),
      };
      idMap.set(n.key, i);
      this._nodes.push(pos);
    }
    for (let i = 0; i < this._nodes.length; i++) {
      this._adjList[i] = new Array();
    }
    // assuming the ids are sequential
    for (const e of graph.edges) {
      let sourceIndex = Number(idMap.get(e.source));
      let targetIndex = Number(idMap.get(e.target));
      if (!this._adjList[sourceIndex].includes(targetIndex))
        this._adjList[sourceIndex].push(targetIndex);

      if (!this._adjList[targetIndex].includes(sourceIndex))
        this._adjList[targetIndex].push(sourceIndex);
    }
    return this;
  }
  toJSON() {
    let s = {};
    s._nodes = [...this._nodes];
    s._adjList = [...this._adjList];
    s.options = { ...this.options };
    s.nodeSize = this.nodeSize;
    s.edgeSize = 1.5;
    s.nodeColor = this.nodeColor;
    s.edgeColor = this.edgeColor;
    s.bounds = { ...this.bounds };
    s._nextId = this._nextId;
    s.requiredEdgeLength = this.requiredEdgeLengthPerc;
    s.requiredEdgeLength = this.requiredEdgeLength;
    s.minDist = this.minDist;
    s.maxDist = this.maxDist;

    return s;
  }
  serialize(string = true) {
    if (string === true) return JSON.stringify(this);
    else return this.toJSON();
  }
  deserialize(data) {
    if (typeof data === "string") data = JSON.parse(data);
    return this.restoreFrom(data);
  }

  export(string = true) {
    let serialized = {
      graph: {
        nodes: [...this._nodes],
        adjList: [...this._adjList],
      },
    };

    if (string === true) return JSON.stringify(serialized);

    return serialized;
  }

  //let data = fs.readFileSync(filePath, "utf-8");
  importCustom(data, convert = false) {
    let byline = data.split("\n");
    // let caseNum = Number(byline[0]);
    let start = 0;
    let nodesCoord = {};
    let files = [];

    let nodeNum = Number(byline[0]);
    let graph = {
      nodes: new Array(nodeNum),
      adjList: new Array(nodeNum).fill(new Array()),
    };
    nodesCoord = byline[1].split("  ").map((e) => ({
      x: Number(e.split(" ")[0]),
      y: Number(e.split(" ")[1]),
    }));

    for (let i = 0; i < nodesCoord.length - 1; i++) {
      let node = {
        id: i,
        x: nodesCoord[i].x,
        y: nodesCoord[i].y,
      };
      if (node.x !== null && node.y !== null) graph.nodes[i] = node;
    }

    let offset = start + 4;
    for (let j = 0; j < nodeNum; j += 1) {
      let adj = byline[j + offset++].split(" ").map((e) => Number(e));
      adj.pop(); // remove "\r"
      graph.adjList[j] = adj;
    }
    this._adjList = graph.adjList;
    this._nodes = graph.nodes;

    // convert coordinates to center coordinates
    if (convert) {
      let bounds = this.getBoundaries();
      let boundCenter = {
        x: (bounds.xMax - bounds.xMin) / 2,
        y: (bounds.yMax - bounds.yMin) / 2,
      };
      for (let node of this._nodes) {
        node.x = node.x - boundCenter.x;
        node.y = node.y - boundCenter.y;
      }
      // translate the bounds too
      this.bounds.xMin = this.bounds.xMin - boundCenter.x;
      this.bounds.yMin = this.bounds.yMin - boundCenter.y;

      this.bounds.xMax = this.bounds.xMax - boundCenter.x;
      this.bounds.yMax = this.bounds.yMax - boundCenter.y;

      console.log("actual bounds", bounds);
      console.log("default bounds", this.defaultBounds);
      console.log("bounds center", boundCenter);
      console.log("bounds after translate", this.getBoundaries());
      console.log("cneter after:", {
        x: (this.getBoundaries().xMax - this.getBoundaries().xMin) / 2,
        y: (this.getBoundaries().yMax - this.getBoundaries().yMin) / 2,
      });
      console.log("current bounds", this.bounds, this.defaultBounds);
    }

    return this;
  }
  import(data) {
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
    let nodeNum = data.graph.nodes.length;
    this._nodes = new Array(nodeNum);
    this._adjList = new Array(nodeNum);

    for (let i = 0; i < nodeNum; i++) {
      this._nodes[i] = { ...data.graph.nodes[i] };
      this._nodes[i].id = i;
      this._adjList[i] = [...data.graph.adjList[i]];
    }

    // center the graph
    let b = this.getBoundaries();
    let center = { x: (b.xMax - b.xMin) / 2, y: (b.yMax - b.yMin) / 2 };

    for (let n of this._nodes) {
      n.x -= center.x;
      n.y -= center.y;
    }

    // TODO: make it so it's possible to update bound on load without doing it accidentally
    //if (this.effectBounds){
    //updateBounds.call(this);
    //}
    return this;
  }
  toSigGraph() {
    let graph = { nodes: [], edges: [] };
    let nodes = this._nodes;
    let adj = this._adjList;
    for (let i = 0; i < nodes.length; i++) {
      let n = {
        id: i,
        label: i + "",
        size: this.nodeSize,
        color: this.nodeColor,
        x: nodes[i].x,
        y: nodes[i].y,
      };

      graph.nodes.push(n);
      for (let j = 0; j < adj[i].length; j++) {
        graph.edges.push({
          source: i,
          target: adj[i][j],
          id: `${i}->${adj[i][j]}`,
          color: this.edgeColor,
          size: this.edgeSize,
        });
      }
    }
    return graph;
  }
}
