import {MainPage} from "./main.js";
import {BatchRunPage} from "./batchRun.js";
import {SummaryPage} from "./summary.js";
// handles inital setup and page navigation


// loaded on index load and never again

let lastPage = sessionStorage.getItem("lastPage");

let pageMapping = {
    "MainPage": MainPage,
    "BatchRunPage": BatchRunPage,
    "SummaryPage": SummaryPage,
};

if (lastPage !== null) {
    pageMapping[lastPage]();
} else {
    MainPage();

}

