import { Table } from "./table.js";
import { loadPage } from "./util.js";
import { BatchRunPage } from "./batchRun.js";

export async function SummaryPage(tabs) {
  const PAGE = await loadPage("summary", document);
  sessionStorage.setItem("lastPage", "SummaryPage");
  // tool bar
  function toolbarClickHandler(event) {
    let target = event.target;
    switch (target.id) {
      case "back":
        BatchRunPage();
        break;
      default:
        break;
    }
  }
  const toolbar = PAGE.querySelector(".toolbar-container");

  // TODO: what to do with the side menu in this page?
  toolbar.addEventListener("click", toolbarClickHandler);

  let runs = tabs;
  console.log(runs);

  let aveObjectiveTable = new Table("average-objective-table");
  [
    { title: "Run name", id: "runName" },
    { title: "Layout Algorithm", id: "layoutAlgorithm" },
    { title: "Objective", id: "objective" },
    { title: "median", id: "median" },
  ].forEach((header) => aveObjectiveTable.addHeader(header));

  aveObjectiveTable.refresh();

  // extract needed info
  for (const run of runs) {
    // TODO: don't add stuff to run/tabs!
    run.objectives = [];
    run.executionTimeList = [];
    run.evaluatedSolutionsList = [];
    addParamEntryEl(run, "summary-param-container");

    for (const key in run.files) {
      let file = run.files[key];
      run.objectives.push(file.objective);

      run.executionTimeList.push(file.info.executionTime / 1000);
      run.evaluatedSolutionsList.push(file.info.evaluatedSolutions);
    }

    let objAverage =
      run.objectives.reduce((a, e) => (a += e), 0) / run.objectives.length;

    run.objAvg = objAverage;

    run.median = d3.median(run.objectives);

    let layoutName = run.runCount > 0 ? run.layout : "-";
    let row = {
      layoutAlgorithm: { value: run.layout, type: "text" },
      runName: { value: run.title, type: "text" },
      objective: { value: objAverage, type: "text" },
      median: { value: run.median, type: "text" },
    };
    aveObjectiveTable.addRow(row);

    aveObjectiveTable.refresh();
  }

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

            ${paramItemEl("layout", run.layout)}
            ${(() => {
              let html2 = "";

              for (const p of run.layoutParam) {
                let name = null;
                let value = null;
                if (p.type === "number") {
                  name = p.name;
                  value = p.value;
                } else if (p.type === "list") {
                  name = p.name;
                  value = p.options[p.selectedOptionIndex].name;
                }
                html2 += paramItemEl(name, value);
              }

              return html2;
            })()}
        </div>
    `;
    return html;
  }

  function addParamEntryEl(run, containerId) {
    let container = PAGE.querySelector(`#${containerId}`);
    container.insertAdjacentHTML("beforeend", paramEntryEl(run));
  }

  function barChart(id, xLabel, yLabel, data) {
    console.log(id, data);
    const margin = { top: 60, right: 60, bottom: 40, left: 60 };
    const width = 1000;
    const height = 600;
    const innerWidth = width - margin.right - margin.left;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(`#${id}`);
    console.log(svg);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const yScale = d3
      .scaleLinear()
      .range([innerHeight, 0])
      .domain([0, d3.max(data.map((e) => e.y))]);
    chart.append("g").call(d3.axisLeft(yScale));

    const xScale = d3
      .scaleBand()
      .range([0, innerWidth])
      .domain(data.map((e) => e.x))
      .padding(0.2);

    const myColor = d3.scaleOrdinal(d3.schemeAccent);

    chart
      .append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(xScale));

    chart
      .selectAll()
      .data(data)
      .enter()
      .append("rect")
      .attr("fill", (_, i) => myColor(i))
      .attr("x", (s) => xScale(s.x))
      .attr("y", (s) => yScale(s.y))
      .attr("height", (s) => innerHeight - (yScale(s.y) || 0))
      .attr("width", xScale.bandwidth());

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height)
      .attr("text-anchor", "middle")
      .text(xLabel);

    svg
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .text(yLabel);
  }

  barChart(
    "chart-avg-objective",
    "run",
    "Average objective",
    runs.map((s) => ({ x: s.title, y: d3.mean(s.objectives) }))
  );

  let avgExecutionTable = new Table("average-execution-table");
  [
    { title: "Run name", id: "runName" },
    { title: "Layout Algorithm", id: "layoutAlgorithm" },
    { title: "Average execution time (seconds)", id: "avgExecution" },
    { title: "median execution time (seconds)", id: "medianExecution" },
  ].forEach((header) => avgExecutionTable.addHeader(header));

  for (let run of runs) {
    let row = {
      layoutAlgorithm: { value: run.layout, type: "text" },
      runName: { value: run.title, type: "text" },
      avgExecution: {
        value: d3.mean(run.executionTimeList),
        type: "text",
      },
      medianExecution: {
        value: d3.median(run.executionTimeList),
        type: "text",
      },
    };
    avgExecutionTable.addRow(row);
  }

  avgExecutionTable.refresh();
  barChart(
    "execution-chart",
    "run",
    "Average execution time (seconds)",
    runs.map((s) => ({ x: s.title, y: d3.mean(s.executionTimeList) }))
  );

  let evaluatedTable = new Table("average-evaluated-table");
  [
    { title: "Run name", id: "runName" },
    { title: "Layout Algorithm", id: "layoutAlgorithm" },
    { title: "Average evaluated solutions", id: "avgEvaluated" },
    { title: "Median evaluated solutions ", id: "medianEvaluated" },
  ].forEach((header) => evaluatedTable.addHeader(header));

  for (let run of runs) {
    let row = {
      layoutAlgorithm: { value: run.layout, type: "text" },
      runName: { value: run.title, type: "text" },
      avgEvaluated: {
        value: d3.mean(run.evaluatedSolutionsList),
        type: "text",
      },
      medianEvaluated: {
        value: d3.median(run.evaluatedSolutionsList),
        type: "text",
      },
    };
    evaluatedTable.addRow(row);
  }

  evaluatedTable.refresh();

  barChart(
    "evaluated-chart",
    "run",
    "Average evaluated solutions",
    runs.map((s) => ({ x: s.title, y: d3.mean(s.evaluatedSolutionsList) }))
  );

  window.d3 = d3;
  window.runs = runs;
}
