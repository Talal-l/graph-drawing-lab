
const sep = require("path").sep;
const fs = require("fs");

function walkDir(path) {
    let files = [];
    if (fs.lstatSync(path).isDirectory()) {
        let list = fs.readdirSync(path);
        for (let p of list) files = files.concat(walkDir(path + sep + p));
    } else files.push(path);
    // filter out hidden files
    return files.filter(f => !/(^|\/|\\)\.[^\/\.]/g.test(f));
}

function convert(filePath) {
    let data = fs.readFileSync(filePath, "utf-8");
    let byline = data.split("\n");
    let caseNum = Number(byline[0]);
    let start = 0;
    let nodesCoord = {};
    let files = [];

    for (var i = 0; i < caseNum; i += 1) {
        let nodeNum = Number(byline[start + 1]);
        let graph = {
            nodes: new Array(nodeNum),
            adjList: new Array(nodeNum).fill(new Array())
        };
        nodesCoord = byline[start + 2].split("  ").map(e => ({
            x: Number(e.split(" ")[0]),
            y: Number(e.split(" ")[1])
        }));

        for (let i = 0; i < nodesCoord.length - 1; i++) {
            let node = {
                id: i,
                x: nodesCoord[i].x,
                y: nodesCoord[i].y
            };
            if (node.x !== null && node.y !== null) graph.nodes[i] = node;
        }

        let offset = start + 4;
        for (let j = 0; j < nodeNum; j += 1) {
            let adj = byline[j + offset++].split(" ").map(e => Number(e));
            adj.pop(); // remove "\r"
            graph.adjList[j] = adj;
        }

        files.push({
            sourcePath: filePath,
            data: {graph: graph}
        });
        start += nodeNum * 2 + 4;
    }
    return files;
}

let args = process.argv.slice(2);


let tmp = args[0].split(sep);
let inputFilename = tmp.pop();
let inputPath = tmp.join(sep);
let outputPath = inputPath;
let outputFilename = inputFilename.match("(.*)\\.")[1];



let graphData = fs.readFileSync(`${inputPath}/${inputFilename}`, "utf-8");
let graph = JSON.parse(graphData).graph;

let out = `${outputPath}/${outputFilename}.fi`;

let minY = 0;
let minX = 0;

for (let i = 0; i < graph.nodes.length; i++) {
    let {x, y} = graph.nodes[i];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
}
fs.writeFileSync(out, graph.nodes.length + "\n", "utf-8");
for (let i = 0; i < graph.nodes.length; i++) {
    let {x, y} = graph.nodes[i];
    let s = `${Math.floor(x + Math.abs(minX))} ${Math.floor(y + Math.abs(minY))}  `;
    fs.appendFileSync(out, s);

}
fs.appendFileSync(out, "\n");

for (let i = 0; i < graph.adjList.length; i++) {
    let adj = graph.adjList[i];
    fs.appendFileSync(out, adj.length + "\n");
    fs.appendFileSync(out, adj.join(" ") + "\n");
}
fs.appendFileSync(out, "\n");
