(function(undefined) {
    console.log(this);
    if (typeof sigma === "undefined") throw new Error("sigma is not declared");

    // Initialize package:
    sigma.utils.pkg("sigma.customLayout");

    /**
     * Custom layout for sigmajs
     * ===============================
     *
     * Author:
     * Algorithm:
     * Acknowledgement:
     * Version: 0.1
     */
    class CustomLayout {
        constructor(sig, options) {
            let defaultOptions = {
                maxIterations: 80
            };

            options = options || {};
            this.options = sigma.utils.extend(options, defaultOptions);
            this.sig = sig;
            this.graph = sig.graph;
            this.iterationCount = 0;
        }

        run() {
            let maxIt = this.options.maxIterations;
            while (this.iterationCount < maxIt) {
                this.step();
            }
            this.iterationCount = 0;
        }

        /**
         * Execute one iteration
         *
         * @param  {boolean} [refresh=false] Set to redraw graph
         */
        step(refresh = false) {
            // console.log("running step of customelayout");
            let nodes = this.graph.nodes();
            // console.log(nodes);
            let edges = this.graph.edges();

            let r = 450;
            let N = nodes.length;
            let step = 30;
            for (let i = 0; i < N; i++) {
                let n = nodes[i];
                let x = r * Math.cos((2 * Math.PI * i) / N);
                let y = r * Math.sin((2 * Math.PI * i) / N);

                n.x += (x - n.x) / step;
                n.y += (y - n.y) / step;
            }
            // console.log(this.graph.nodes());

            if (refresh) refreshScreen();

            this.iterationCount++;
        }
    }

    // Expose the class through the global sigma object
    sigma.CustomLayout = CustomLayout;
}.call(this));
