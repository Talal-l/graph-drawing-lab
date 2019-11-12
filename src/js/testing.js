const sig = new sigma();

// tool bar
const genGraph = document.querySelector("#genGraph"),
    saveGraph = document.querySelector("#saveGraph"),
    loadGraph = document.querySelector("#loadGraph"),
    fileSelector = document.querySelector("#fileSelector"),
    deleteGraph = document.querySelector("#deleteGraph"),
    moveNodeItem = document.querySelector("#moveNode"),
    addNodeItem = document.querySelector("#addNode"),
    addEdgeItem = document.querySelector("#addEdge"),
    eraseItem = document.querySelector("#erase"),
    randomLayout = document.querySelector("#randomLayout"),
    runLayout = document.querySelector("#runLayout"),
    stepLayout = document.querySelector("#stepLayout"),
    toolbar = document.querySelector(".toolbar-container"),
    sideMenu = document.querySelector("#side-menu");

toolbar.addEventListener("click", event => {
    let target = event.target;
    switch (target.id) {
        case "menu":
            if (sideMenu.style.display === "flex") {
                sideMenu.style.display = "none";
            } else {
                sideMenu.style.display = "flex";
            }
            break;
        case "genTest":
            genModal.style.display = "flex";
            break;
        case "saveTest":
            break;
        case "loadDir":
            openDirDialog(loadTest);
            break;
        case "loadFile":
            openFileDialog(loadTest);
            break;
        case "runTest":
            break;
        case "backToMain":
            window.location.replace("index.html");
            break;
        default:
            break;
    }
});

function runTest(name, param) {



}
function loadTest(name, data) {
    let obj = JSON.parse(data);
    let graph = sig.graph.read(obj.graph);
    // run layout

    // get results
    let criteria = calculateCriteria(graph);

    let digits = 3;
    let table = document.querySelector("table");
    if (!table.querySelector(`#filename-${name}`)) {
        let row = document.createElement("TR");
        row.setAttribute("id", `filename-${name}`);

        function addEntry(data) {
            let td = document.createElement("TD");
            let tn = document.createTextNode(data);
            td.appendChild(tn);
            row.appendChild(td);

            // sync the state of the cell with its header
            td.hidden = getCellHeader(td).hidden;
        }

        //  must be added following the order in the table
        addEntry(name);
        addEntry(obj.layout);
        addEntry(graph.nodes().length);
        addEntry(graph.edges().length);

        addEntry(density(graph).toFixed(digits));

        addEntry(criteria.nodeOcclusion.value.toFixed(digits));
        addEntry(criteria.edgeNodeOcclusion.value.toFixed(digits));
        addEntry(criteria.edgeLength.value.toFixed(digits));
        addEntry(criteria.angularRes.value.toFixed(digits));
        addEntry(calculateObjective(criteria).toFixed(digits));

        table.appendChild(row);
    }

    // clean the sig instance so we can load the next test
    sig.graph.clear();
}

const genModal = document.querySelector("#gen-modal"),
    warnModal = document.querySelector("#warn-modal"),
    genMode = document.querySelector("#gen-mode"),
    nodeNumMinEl = document.querySelector("#node-num-min"),
    nodeNumMaxEl = document.querySelector("#node-num-max"),
    nodeError = document.querySelector("#node-error"),
    edgeNumMinEl = document.querySelector("#edge-num-min"),
    edgeNumMaxEl = document.querySelector("#edge-num-max"),
    testNumEl = document.querySelector("#test-num"),
    edgeError = document.querySelector("#edge-error");
genModal.addEventListener("click", event => {
    const target = event.target;

    switch (target.id) {
        case "generate":
            let maxEdges = null;
            let nodeNumMin = parseInt(nodeNumMinEl.value),
                edgeNumMin = parseInt(edgeNumMinEl.value),
                nodeNumMax = parseInt(nodeNumMaxEl.value),
                edgeNumMax = parseInt(edgeNumMaxEl.value),
                testNum = parseInt(testNumEl.value);

            // toggle any existing error messages
            nodeError.innerHTML = "";
            nodeError.style.display = "none";
            edgeError.innerHTML = "";
            edgeError.style.display = "none";

            if (genMode.value === "range") {
                maxEdges = (nodeNumMax * (nodeNumMax - 1)) / 2;
                console.log(nodeNumMax);
                if (nodeNumMax < nodeNumMin || !nodeNumMin || !nodeNumMax) {
                    nodeError.innerHTML = "Max is less than min!";
                    nodeError.style.display = "block";
                    break;
                }
                if (edgeNumMax < edgeNumMin || !edgeNumMin || !edgeNumMax) {
                    edgeError.innerHTML = "Max is less than min!";
                    edgeError.style.display = "block";
                    break;
                }
            } else {
                maxEdges = (nodeNumMin * (nodeNumMin - 1)) / 2;
                nodeNumMax = nodeNumMin;
                edgeNumMax = edgeNumMin;
            }

            if (nodeNumMin < 1 || !nodeNumMin) {
                nodeError.innerHTML = "Can't have less than 1 nodes";
                nodeError.style.display = "block";
                break;
            }
            if (edgeNumMin < nodeNumMin - 1 || !edgeNumMin) {
                edgeError.innerHTML = `Can't have less than ${nodeNumMin -
                    1} edges `;
                edgeError.style.display = "block";
                break;
            }
            if (edgeNumMax > maxEdges || !edgeNumMin) {
                edgeError.innerHTML = `Can't have more than ${maxEdges} edges`;
                edgeError.style.display = "block";
                break;
            }
            let G = genTest(
                testNum,
                nodeNumMin,
                nodeNumMax,
                edgeNumMin,
                edgeNumMax,
                1900,
                1300
            );
            genModal.style.display = "none";
            break;
        case "dismiss":
            genModal.style.display = "none";
            break;
    }
});
warnModal.addEventListener("click", event => {
    const target = event.target;

    switch (target.id) {
        case "save":
            warnModal.style.display = "none";
            saveCurrentGraph();
            sig.graph.clear();
            refreshScreen(updateCriteria);
            genModal.style.display = "flex";
            break;
        case "delete":
            warnModal.style.display = "none";
            sig.graph.clear();
            refreshScreen(updateCriteria);
            genModal.style.display = "flex";
            break;
    }
});

genMode.addEventListener("change", event => {
    // toggle any existing error messages
    nodeError.innerHTML = "";
    nodeError.style.display = "none";
    edgeError.innerHTML = "";
    edgeError.style.display = "none";

    if (event.target.value === "range") {
        nodeNumMaxEl.style.display = "inline";
        edgeNumMaxEl.style.display = "inline";
    } else {
        nodeNumMaxEl.style.display = "none";
        edgeNumMaxEl.style.display = "none";
        nodeNumMaxEl.value = null;
        edgeNumMaxEl.value = null;
    }
});

// side menu events
sideMenu.addEventListener("change", event => {
    console.log(event.target.checked);
    let colId = event.target.getAttribute("data-col");
    // show if checked
    showCol(colId, event.target.checked);
});

let toggleEl = document.querySelectorAll(".menu-section-label");
for (const e of toggleEl) {
    e.onclick = function() {
        let secId = this.getAttribute("data-section");
        let secEl = document.querySelector(`#${secId}`);
        let t = this.querySelector(".menu-section-toggle");
        if (t.classList.contains("arrow-right")) {
            t.classList.remove("arrow-right");
            t.style.animationDirection = "reverse";
            t.classList.add("arrow-down");
            secEl.style.display = "block";
        } else {
            t.classList.remove("arrow-down");
            t.style.animationDirection = "normal";
            t.style.animationPlayState = "running";
            t.classList.add("arrow-right");
            secEl.style.display = "none";
        }
        var newOne = t.cloneNode(true);
        t.parentNode.replaceChild(newOne, t);
    };
}

function genTest(testNum, nMin, nMax, eMin, eMax, width, height) {
    // TODO: Make this async

    while (testNum--) {
        let G = generateGraph(nMin, nMax, eMin, eMax, height, width);
        let c = calculateCriteria(G);
        let obj = {
            graph: {
                nodes: G.nodes(),
                edges: G.edges()
            },
            criteria: c,
            layout: "Random"
        };
        let json = JSON.stringify(obj);
        console.log(obj);
        saveFile(json);
    }
}

function showCol(colId, show = true) {
    let index = document.querySelector(`#${colId}`).cellIndex;
    let rows = document.querySelectorAll("tr");
    for (let r of rows) {
        r.querySelector(`:nth-child(${index + 1})`).hidden = !show;
    }
}

function getCellHeader(cell) {
    let index = cell.cellIndex;
    let colHeader = document
        .querySelector("tr")
        .querySelector(`:nth-child(${index + 1})`);
    return colHeader;
}
