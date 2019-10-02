// sigma related utilities (require sigma instance)

/**
 * A wrapper method to use to enable us to attach a callback function to the refresh method
 * @param {sigma} sig - A sigma instance
 * @param {function} [onRefresh]  - Called after a refresh
 *
 */
function refreshScreen(sig, onRefresh) {
    sig.refresh();
    if (typeof onRefresh === "function") onRefresh(sig);
}

/**
 *
 * @param {object} e - A sigma graph edge
 * @param {sigma.classes.graph} graph - A sigma graph instance
 */
function getEdgeNodes(e, graph) {
    return [graph.nodes(e.source), graph.nodes(e.target)];
}

/**
 * Shuffle the given array (modifies the array)
 * @param {array} array
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 *
 * @param {object} p1 - point object with x and y as properties
 * @param {object} p2 - point object with x and y as properties
 * @returns {number} - Distance between the two points
 */
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}
/**
 * Generate a random integer between min and max inclusive
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 *  2d vector with basic vector operations
 */
class Vec {
    /**
     * Create a vector using x,y or with an object with x,y
     * @param {number} x - x coordinate
     * @param {number} y - x coordinate
     * @param {object} [coordinate] - object with x and y properties
     */
    constructor(x, y) {
        if (arguments.length === 1) {
            let arg = arguments[0];
            this.x = arg.x;
            this.y = arg.y;
            if (typeof this.x === undefined || typeof this.y === undefined)
                throw "no x y in the given object";
        } else {
            this.x = x;
            this.y = y;
        }
        if (typeof this.x !== "number" || typeof this.y !== "number")
            throw "coordinates must be numbers";
    }

    add(v) {
        return new Vec(this.x + v.x, this.y + v.y);
    }
    sub(v) {
        return new Vec(this.x - v.x, this.y - v.y);
    }
    scale(s) {
        return new Vec(s * this.x, s * this.y);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    cross(v) {
        return this.x * v.y - this.y * v.x;
    }
}

/**
 * Find the intersection between two line segments.
 * This implementation ignores the colinear case and report it as no intersection.
 * Source: https://stackoverflow.com/a/565282
 *
 * @param {{start:{x:number,y:number}, end:{x:number,y:number}}} seg1 - An object representing the first segment
 * @param {{start:{x:number,y:number}, end:{x:number,y:number}}} seg2 - An object representing the first segment
 * @returns {object} - A Vec object with the x and y of the intersection point
 */
function intersection(seg1, seg2) {
    // endpoints of the first segment
    let p0 = new Vec(seg1.start);
    let p1 = new Vec(seg1.end);
    // endpoints of the second segment
    let q0 = new Vec(seg2.start);
    let q1 = new Vec(seg2.end);

    let s0 = p1.sub(p0);
    let s1 = q1.sub(q0);

    // save repeated calculations
    let s0Xs1 = s0.cross(s1);
    let q0SUBp0 = q0.sub(p0);

    // derived from the parametric line equation p0+s0t = q0+s1u
    let t = q0SUBp0.cross(s1) / s0Xs1;

    // check if the point is not in the first line
    if (t < 0 || t > 1) return;

    let u = q0SUBp0.cross(s0) / s0Xs1;
    // check if the point is the in second line
    if (u >= 0 && u <= 1) {
        return p0.add(s0.scale(t));
    }
}

/**
 * Wrapper function to check intersection between 2 sigma edges
 * @param {object} e1
 * @param {object} e2
 * @param {object} graph
 * @returns {object} - A Vec object with the x and y of the intersection point
 */
function edgeIntersection(e1, e2, graph) {
    return intersection(
        {
            start: graph.nodes(e1.source),
            end: graph.nodes(e1.target)
        },
        {
            start: graph.nodes(e2.source),
            end: graph.nodes(e2.target)
        }
    );
}
