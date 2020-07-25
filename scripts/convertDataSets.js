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
            data: { graph: graph }
        });
        start += nodeNum * 2 + 4;
    }
    return files;
}

let filesToConvert = walkDir("../data/DataSets");
let convertedFilesDir = "../data/dataSet";

for (let i = 0; i < filesToConvert.length; i++) {
    let convertedFiles = convert(filesToConvert[i]);
    for (let j = 0; j < convertedFiles.length; j++) {
        let newPath = convertedFiles[j].sourcePath.split(sep);
        newPath.splice(0, 3);
        newPath = `${convertedFilesDir}/${newPath.join(sep)}_case${j}.json`;
        let newDir = newPath.split(sep);
        newDir.pop();
        newDir = newDir.join(sep);
        fs.mkdirSync(newDir + "", { recursive: true });
        let nodes = convertedFiles[j].data.graph.nodes.length;
        fs.writeFileSync(
            newPath,
            JSON.stringify(convertedFiles[j].data),
            "utf-8"
        );
    }
}
