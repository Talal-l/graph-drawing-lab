import { Graph} from "../graph.js";

// can't use shadow since sigma requires access to the container element.

export class FileModal extends HTMLElement {
    constructor() {
        super();

        this._file = null;
        this._tab = null;
        this._initOffset = 0;

        // setup all events here
    }
    set file(val) {
        this._file = val;
        this.setAttribute("filename", val.name);
        this.setAttribute("id", `file-${val.name}`);
    }
    get file() {
        return this._file;
    }
    set initOffset(val) {
        this._initOffset = val;
    }
    set tab(val) {
        this._tab = val;
        this.setAttribute("tab-id", this._tab.id);
    }
    get tab() {
        return this._tab;
    }
    connectedCallback() {
        let mouseDown = false;
        let px = 0;
        let py = 0;
        this.addEventListener("mousedown", e => {
            if (e.target.classList.contains("file-modal-drag")) {
                mouseDown = true;
                px = e.pageX;
                py = e.pageY;
            }
        });

        this.parentNode.addEventListener("mousemove", e => {
            if (mouseDown) {
                let x = e.pageX;
                let y = e.pageY;

                let dx = x - px;
                let dy = y - py;

                let top = Number(this.style.top.split("px")[0]);
                let left = Number(this.style.left.split("px")[0]);
                this.style.top = `${top + dy}px`;
                this.style.left = `${left + dx}px`;

                px = x;
                py = y;
            }
        });

        this.parentNode.addEventListener("mouseup", ({ target }) => {
            if (mouseDown) {
                mouseDown = false;
            }
        });
        this.addEventListener("click", ({ target }) => {
            if (target.classList.contains("file-modal-close")) {
                this.remove();
            }
        });

        let file = this.file;
        let tab = this.tab;
        if (file === null) throw `No file prop is provided!`;
        if (tab === null) throw `No Tab object!`;

        this.style = `
        background-color: white;position: absolute;width: 900px;height: 600px;left: ${700 +
            this._initOffset}px;top: ${150 +
            this._initOffset}px;border: solid;padding: 8px;z-index: 1; display
        `;
        this.innerHTML = `
            <style>
                .file-modal-preview{
                    width:100%;
                    height:73%;
                    display:flex;
                }
                .file-modal-preview .sigma-scene{
                    border: solid;
                }
                .file-modal-label-container{
                    display:flex;
                }
                .file-modal-label-container h2{
                    width:100%;
                    text-align:center;
                }
            </style>

            <div class="file-modal-control" style="width:100%;display:flex">
                <span class="file-modal-drag fas fa-arrows-alt fa-2x" style="margin-right:auto;cursor:pointer"></span>
                <span class="file-modal-close fas fa-times" style="cursor:pointer"></span>
            </div>
            <h2 class="file-modal-title">${file.name}</h2> 
            <h3 class="file-modal-title">${tab.title}</h3> 
            <div class="file-modal-label-container">
                <h2>Before</h2> 
                <h2>After</h2> 
            </div> 

            <div class="file-modal-preview">
                <div class="file-modal-preview" id="file-modal-before-${file.name}-${tab.id}">
                </div>
                <div class="file-modal-preview" id="file-modal-after-${file.name}-${tab.id}">
                </div>
            </div>


        `;

        // create graph and render it in the modal
        let webglRenderer = {
            type: "webgl",
            container: `file-modal-before-${file.name}-${tab.id}`
        };
        let sigDefaults = {
            renderer: webglRenderer,
            settings: {
                doubleClickEnabled: false,
                autoRescale: true
            }
        };

        // draw graph before run
        let sig = new sigma(sigDefaults);
        let graph = new Graph().restoreFrom(file.originalGraph);
        sig.graph.read(graph.toSigGraph());
        sig.refresh();

        // draw graph after the run
        webglRenderer.container  = `file-modal-after-${file.name}-${tab.id}`;
        sig = new sigma(sigDefaults);
        graph = new Graph().restoreFrom(file.graph);
        sig.graph.read(graph.toSigGraph());
        sig.refresh();


    }

}

customElements.define("file-modal", FileModal);
