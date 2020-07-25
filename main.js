const { app, BrowserWindow } = require("electron");
const path = require("path");
function createWindow() {
    const win = new BrowserWindow({
        webPreferences: { preload: path.join(__dirname, "preload.js") }
    });

    const mode = process.argv[2];
    if (mode === "layoutTest") {
        win.loadFile("layoutTest.html");
        win.webContents.openDevTools()
    } else {
        win.loadFile("index.html");
    }
}

app.on("ready", createWindow);
