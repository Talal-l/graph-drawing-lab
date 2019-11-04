const { dialog, BrowserWindow } = require("electron").remote;
const fs = require("fs");
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

window.openFileDialog = function() {
    let dialogOptions = {
        buttonLabel: "Open"
    };
    let filePath = dialog.showOpenDialogSync(win, dialogOptions);

    fs.readFile(filePath, (err, data) => {
        if (err) throw err;
        console.log(data);
    });
};
