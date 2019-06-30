(function(undefined) {
    
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


    function CustomLayout(sig, options) {
        let defaultOptions = {
            maxIterations: 500
        };

        options = options || {};
        this.options = sigma.utils.extend(options, defaultOptions);
        this.sig = sig;
    }
    // interface

    /**
     * Initialize the layout with the given sigma instance and options.
     *
     * Recognized options:
     * **********************
     * Here is the exhaustive list of every accepted parameter in the settings
     * object
     *
     *
     *
     * @param  {sigma} sig The related sigma instance.
     * @param  {?object} options layout options
     */
    // eslint-disable-next-line no-undef
    sigma.CustomLayout = CustomLayout;
}.call(this));
