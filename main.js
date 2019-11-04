const { app, BrowserWindow } = require("electron");
const path = require("path");
function createWindow() {
    // Create the browser window.

    const win= new BrowserWindow({
        webPreferences: { preload: path.join(app.getAppPath(), "preload.js") }
    });

    // and load the index.html of the app.
    win.loadFile("index.html");

    win.webContents.openDevTools();
}

app.on("ready", createWindow);
