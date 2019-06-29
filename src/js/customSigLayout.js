(function(undefined) {
    if (typeof sigma === "undefined") throw new Error("sigma is not declared");

    // Initialize package:
    sigma.utils.pkg("sigma.layout.customSigLayout");

    /**
     * Custom layout for sigmajs
     * ===============================
     *
     * Author:
     * Algorithm:
     * Acknowledgement:
     * Version: 0.1
     */

    // Layout api

    function CustomSigLayout() {
        this.run = () => {
            console.log(this);
        };
    }

    if (typeof sigma === "undefined") throw "sigma is not declared";

    sigma.prototype.getCustomLayout = () => {
        return new CustomSigLayout();
    };
}.call(this));
