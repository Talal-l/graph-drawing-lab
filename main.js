const { app, BrowserWindow } = require("electron");

function createWindow() {
    // Create the browser window.
    let win = new BrowserWindow({
        width: 1800,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });

    // and load the index.html of the app.
    win.loadFile("index.html");

    win.webContents.openDevTools();
}

app.on("ready", createWindow);
