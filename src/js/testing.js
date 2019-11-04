// UI events

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
        case "genTests":
            break;
        case "saveTests":
            break;
        case "loadGraph":
            break;

        case "runTests":
        break;
        case "backToMain":
          window.location.replace("index.html");
        break;

        default:
            break;
    }
});

const genModal = document.querySelector("#gen-modal"),
    warnModal = document.querySelector("#warn-modal"),
    genMode = document.querySelector("#gen-mode"),
    nodeNumMinEl = document.querySelector("#node-num-min"),
    nodeNumMaxEl = document.querySelector("#node-num-max"),
    nodeError = document.querySelector("#node-error"),
    edgeNumMinEl = document.querySelector("#edge-num-min"),
    edgeNumMaxEl = document.querySelector("#edge-num-max"),
    edgeError = document.querySelector("#edge-error");
genModal.addEventListener("click", event => {
    const target = event.target;

    switch (target.id) {
        case "generate":
            let maxEdges = null;
            let nodeNumMin = parseInt(nodeNumMinEl.value),
                edgeNumMin = parseInt(edgeNumMinEl.value),
                nodeNumMax = parseInt(nodeNumMaxEl.value),
                edgeNumMax = parseInt(edgeNumMaxEl.value);

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
            let G = generateGraph(
                nodeNumMin,
                nodeNumMax,
                edgeNumMin,
                edgeNumMax,
                container
            );
            sig.graph.clear();
            // extract the nodes and edges from the created graph and update the current instance with it
            sig.graph.read({ nodes: G.nodes(), edges: G.edges() });
            refreshScreen(updateCriteria);
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

fileSelector.addEventListener("change", function handleFiles(event) {
    console.log("file");
    let files = event.target.files;
    let reader = new FileReader();

    reader.onload = e => {
        let content = e.target.result;
        console.log(content);
        sig.graph.clear();
        sig.graph.read(JSON.parse(content));
        fileSelector.value = "";
        refreshScreen(updateCriteria);
    };

    reader.readAsText(files[0]);
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
    updateObjective();
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

function density(G) {
    let V = G.nodes().length;
    let E = G.edges().length;
    let D = (2 * E) / (V * (V - 1)) || 0;
    return D.toFixed(3);
}

function updateObjective() {
    // get the weights
    let w = [
        document.querySelector("#node-occlusion-weight").value,
        document.querySelector("#edge-node-occlusion-weight").value,
        document.querySelector("#edge-length-weight").value,
        document.querySelector("#edge-crossing-weight").value,
        document.querySelector("#angular-resolution-weight").value
    ];

    // get the criteria
    let c = [
        document.querySelector("#node-occlusion").innerHTML,
        document.querySelector("#edge-node-occlusion").innerHTML,
        document.querySelector("#edge-length").innerHTML,
        document.querySelector("#edge-cross").innerHTML,
        document.querySelector("#angular-resolution").innerHTML
    ];
    let wSum = 0;
    for (let i = 0; i < 5; i++) wSum += parseFloat(w[i]) * parseFloat(c[i]);

    document.querySelector("#objective-function").innerHTML = wSum.toFixed(3);
}

function updateCriteria() {
    let showAnnotation = false;
    // get the needed parameters
    let length = 500;
    let c = document.querySelector(".sigma-scene");
    let maxLen = Math.sqrt(c.width * c.width + c.height * c.height);

    // calculate the needed criteria
    let edgeLen = edgeLength(sig.graph, length, maxLen);
    let nOcclusion = nodeNodeOcclusion(sig.graph);
    let eOcclusion = edgeNodeOcclusion(sig.graph);
    let [crossing, list] = edgeCrossing(sig.graph);
    let angularRes = angularResolution(sig.graph);

    // update ui
    document.querySelector("#node-num").innerHTML = sig.graph.nodes().length;
    document.querySelector("#edge-num").innerHTML = sig.graph.edges().length;
    document.querySelector("#density").innerHTML = density(sig.graph);
    document.querySelector("#node-occlusion").innerHTML = nOcclusion.toFixed(3);
    document.querySelector(
        "#edge-node-occlusion"
    ).innerHTML = eOcclusion.toFixed(3);

    document.querySelector("#edge-length").innerHTML = edgeLen.toFixed(3);
    document.querySelector("#edge-cross").innerHTML = crossing.toFixed(3);
    document.querySelector(
        "#angular-resolution"
    ).innerHTML = angularRes.toFixed(3);

    if (showAnnotation) {
        clearAnnotation();
        for (let v of list) {
            addAnnotation(v);
        }
    }
    updateObjective();
}
