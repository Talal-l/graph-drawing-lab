const { Table } = require("./table");

// tool bar
function toolbarClickHandler(event) {
    let target = event.target;
    switch (target.id) {
        case "menu":
            sideMenu.classList.toggle("hidden");

            break;
        case "back":
            window.location.replace("batchRun.html");
            break;
        default:
            break;
    }
}
const toolbar = document.querySelector(".toolbar-container"),
    sideMenu = document.querySelector("#side-menu");

// TODO: what to do with the side menu in this page?
sideMenu.classList.toggle("hidden");
toolbar.addEventListener("click", toolbarClickHandler);

// {-------------------------------- summary stuff --------------------------------
let runs = JSON.parse(localStorage.getItem("runs"));
console.log(runs);

let aveObjectiveTable = new Table("average-objective-table");
[
    { title: "Run name", id: "runName" },
    { title: "Layout Algorithm", id: "layoutAlgorithm" },
    { title: "Objective", id: "objective" },
    { title: "Objective after run", id: "objectiveAfterRun" },
    { title: "Diff", id: "diff" },
    { title: "median after run", id: "median" }
].forEach(header => aveObjectiveTable.addHeader(header));

aveObjectiveTable.refresh();

// extract needed info
for (const run of runs) {
    run.originalObjectives = [];
    run.objectives = [];

    console.log(paramEntryEl(run));
    addParamEntryEl(run, "summary-param-container");

    for (const key in run.loadedFiles) {
        let file = run.loadedFiles[key];
        run.originalObjectives.push(file.originalObjective);
        run.objectives.push(file.objective);
    }

    let objAverage =
        run.objectives.reduce((a, e) => (a += e), 0) / run.objectives.length;
    let oldObjAverage =
        run.originalObjectives.reduce((a, e) => (a += e), 0) /
        run.originalObjectives.length;

    run.objAvg = objAverage;
    run.oldObjAvg = oldObjAverage;

    run.median = d3.median(run.objectives);

    let layoutName = run.runCount > 0?run.layoutAlgName:"-";
    let row = {
        layoutAlgorithm: { value: layoutName, type: "text" },
        runName: { value: run.title, type: "text" },
        objective: { value: oldObjAverage, type: "text" },
        objectiveAfterRun: { value: objAverage, type: "text" },
        diff: { value: Math.abs(oldObjAverage - objAverage), type: "text" },
        median:{value: run.median, type: "text"},
    };
    aveObjectiveTable.addRow(row);

    aveObjectiveTable.refresh();
}

// -------------------------------- summary stuff --------------------------------}

// start methods

function paramEntryEl(run) {
    function paramItemEl(key, value) {
        let html = `
            <div class="summary-param-item">
                <span class="label">${key}:</span>
                <span class="value">${value}</span>
            </div>
        `;
        return html;
    }
    let html = `
        <div class="summary-param-entry">
            <h3>${run.title}</h3>

            ${paramItemEl("layout", run.layoutAlgName)}
            ${(() => {
                let html2 = "";
                console.log(run.layoutParam);

                for (const key in run.layoutParam) {
                    let value = run.layoutParam[key];
                    html2 += paramItemEl(key, value);
                }
                console.log(html2);

                return html2;
            })()}
        </div>
    `;
    return html;
}

function addParamEntryEl(run, containerId) {
    let container = document.querySelector(`#${containerId}`);
    container.insertAdjacentHTML("beforeend", paramEntryEl(run));
}

// end methods

const margin = 60;
const width = 1000 - 2 * margin;
const height = 600 - 2 * margin;

const svg = d3.select("svg");

const chart = svg
    .append("g")
    .attr("transform", `translate(${margin}, ${margin})`);

const yScale = d3
    .scaleLinear()
    .range([height, 0])
    .domain([0, d3.max(runs.map(s => s.objAvg))]);

chart.append("g").call(d3.axisLeft(yScale));

const xScale = d3
    .scaleBand()
    .range([0, width])
    .domain(runs.map(s => s.title))
    .padding(0.2);

chart
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale));
chart
    .selectAll()
    .data(runs)
    .enter()
    .append("rect").attr("fill","steelblue")
    .attr("x", s => xScale(s.title))
    .attr("y", s => yScale(s.objAvg))
    .attr("height", s => height - yScale(s.objAvg))
    .attr("width", xScale.bandwidth());
svg.append('text')
    .attr('x', -(height / 2) - margin)
    .attr('y', margin / 2.4)
    .attr('transform', 'rotate(-90)')
    .attr('text-anchor', 'middle')
    .text('Average objective');

svg.append('text')
    .attr('x', width / 2 + margin)
    .attr('y', 40)
    .attr('text-anchor', 'middle')
    .text('Run');



window.runs = runs;
