const { dialog, BrowserWindow } = require("electron").remote;
const fs = require("fs");
const path = require("path");

window.readFiles = function() {
    const root = fs.readdirSync("/");
    console.log(root);
};

let win = BrowserWindow.getFocusedWindow();

window.saveFileDialog = function(data) {
    let dialogOptions = {
        title: "helloworld.txt",
        buttonLabel: "Save"
    };

    let filePath = dialog.showSaveDialogSync(win, dialogOptions);
    if (!filePath) return;
    fs.writeFile(filePath, data, function(err) {
        if (!err) {
            dialog.showMessageBox({
                message: "The file has been saved!",
                buttons: ["OK"]
            });
        } else {
            dialog.showErrorBox("File save error", err);
        }
    });
};

window.saveFile = function(data) {
    let d = new Date();
    let date = `${d.getFullYear()}${d.getDate()}${d.getDate()}${d.getHours()}${d.getMinutes()}${d.getSeconds()}${Math.round(
        Math.random() * 100
    )}`;

    let filePath = "./data/" + date;
    console.log(filePath);
    fs.writeFileSync(filePath, data);
};

window.openFileDialog = function(fn) {
    let dialogOptions = {
        buttonLabel: "Open",
        defaultPath: "./data",
        properties: ["multiSelections", "openFile"]
    };
    let selectedFiles = dialog.showOpenDialogSync(win, dialogOptions);
    for (let f of selectedFiles) {
        fs.readFile(f, "utf8", (err, data) => {
            if (err) throw err;
            let filename = f.split(path.sep);
            filename = filename[filename.length - 1];
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

    let selectedFiles = dialog.showOpenDialogSync(win, dialogOptions);
    if (selectedFiles) {
        for (let f of selectedFiles) allFiles = allFiles.concat(walkDir(f));
    }
    for (let f of allFiles) {
        fs.readFile(f, "utf8", (err, data) => {
            if (err) throw err;
            let filename = f.split(path.sep);
            filename = filename[filename.length - 1];
            fn(filename, data);
        });
    }
};

function walkDir(path) {
    let files = [];
    if (fs.lstatSync(path).isDirectory()) {
        console.log(path);
        let list = fs.readdirSync(path);
        for (let p of list) files = files.concat(walkDir(path + "/" + p));
    } else files.push(path);
    return files;
}
