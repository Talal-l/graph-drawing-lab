const { dialog, BrowserWindow } = require("electron").remote;
const fs = require("fs");
const sep = require("path").sep;

const dataDir = `${__dirname}/data`;
// TODO: switch to async functions

let win = BrowserWindow.getFocusedWindow();

window.saveFileDialog = function(data) {
    let d = new Date();
    let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}${Math.round(
        Math.random() * 100
    )}`;
    let dialogOptions = {
        buttonLabel: "Save",
        defaultPath: `${__dirname}/data/${date}.json`
    };

    let filePath = dialog.showSaveDialogSync(win, dialogOptions);
    if (!filePath) return;
    fs.writeFile(filePath, data, function(err) {
        if (err) {
            dialog.showErrorBox("File save error", err);
        }
    });
};

window.saveFile = function(data) {
    let d = new Date();
    let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}${Math.round(
        Math.random() * 100
    )}`;

    let filePath = `${__dirname}/data/${date}.json`;
    fs.writeFileSync(filePath, data);
};

window.openFileDialog = function(fn) {
    let dialogOptions = {
        buttonLabel: "Open",
        defaultPath: "./data",
        properties: ["multiSelections", "openFile"]
    };
    let selectedFiles = dialog.showOpenDialogSync(win, dialogOptions) || [];
    for (let f of selectedFiles) {
        fs.readFile(f, "utf8", (err, data) => {
            if (err) throw err;
            let filename = f.split(sep);
            filename = filename[filename.length - 1];
            filename = filename.split(".")[0];
            fn(filename, data);
        });
    }
};

window.openDirDialog = function(fn) {
    let dialogOptions = {
        buttonLabel: "Open",
        defaultPath: "./data",
        properties: ["multiSelections", "openDirectory"]
    };
    let allFiles = [];

    let selectedFiles = dialog.showOpenDialogSync(win, dialogOptions) || [];
    if (selectedFiles) {
        for (let f of selectedFiles) allFiles = allFiles.concat(walkDir(f));
    }
    for (let f of allFiles) {
        fs.readFile(f, "utf8", (err, data) => {
            if (err) throw err;
            let filename = f.split(sep);
            filename = filename[filename.length - 1];
            filename = filename.split(".")[0];
            fn(filename, data);
        });
    }
};

window.loadFileSync = function(path) {
    return fs.readFileSync(`${dataDir}/${path}`, "utf-8");
};

window.lsDir = function(path) {
    let p = `${__dirname}/${path}`;
    let files = fs
        .readdirSync(p)
        .filter(f => !/(^|\/|\\)\.[^\/\.]/g.test(f))
        .filter(f => fs.lstatSync(`${p}/${f}`).isFile());
    return files;
};

window.saveFileSync = function(path) {
    return fs.readFileSync(`${dataDir}/${path}`, "utf-8");
};

window.loadFile = function(path, fn) {
    fs.readFile(`${dataDir}/${path}`, "utf8", (err, data) => {
        if (err) throw err;
        let filename = path.split(sep);
        filename = filename[filename.length - 1];
        filename = filename.split(".")[0];
        fn(filename, data);
    });
};

function walkDir(path) {
    let files = [];
    if (fs.lstatSync(path).isDirectory()) {
        console.log(path);
        let list = fs.readdirSync(path);
        for (let p of list) files = files.concat(walkDir(path + sep + p));
    } else files.push(path);
    // filter out hidden files
    return files.filter(f => !/(^|\/|\\)\.[^\/\.]/g.test(f));
}
