import { Vec, distance, equal, offsets } from "./util.js";
import { Graph } from "./graph.js";

// Util methods
function bestObjective(refSet) {
    let best = refSet[0];
    let same = true;
    let g = refSet[0].layout.graph;
    for (let e of refSet) {
        if (g === e.layout.graph) same++;
        if (e.layout.objective() < best.layout.objective()) best = e;
    }
    return best;
}
function worstObjective(refSet) {
    let worst = refSet[0];
    for (let e of refSet) {
        if (e.layout.objective() > worst.layout.objective()) worst = e;
    }
    return worst;
}
function str(obj) {
    return JSON.stringify(obj, null, 2);
}

// TODO: handle precision error
function sameGraph(G1, G2) {
    return str(G1.graph) === str(G2.graph);
}
function inTabuSet(set, s) {
    for (const sol of set) {
        if (
            s.nodeId === sol.nodeId &&
            Math.floor(s.pos.x) === Math.floor(sol.pos.x) &&
            Math.floor(s.pos.y) === Math.floor(sol.pos.y)
        )
            return true;
    }
    return false;
}
function isHighQuality(refSet, layout) {
    for (const e of refSet) {
        if (layout.objective() > e.layout.objective()) return false;
    }
    return true;
}

function isDiverse(refSet, layout) {
    let best = bestObjective(refSet).layout;
    let worst = worstObjective(refSet).layout;
    if (layout.objective() < worst.objective()) {
        if (layoutDistance(layout, best) > medianPos(refSet)) return true;
    }
    return false;
}

// add to set or replace with worst if size limit is reached
function replaceWorst(refSet, entry) {
    // replace solution with the worst objective
    let index = 0;
    let worstObj = refSet[0].layout.objective();

    for (let i = 0; i < refSet.length; i++) {
        const l = refSet[i].layout;
        if (l.objective() > worstObj) {
            index = i;
            worstObj = l.objective();
        }
    }
    refSet[index] = entry;
}

function layoutEqual(l1, l2) {
    let nodes = l1.nodes();
    for (let id = 0; id < nodes.length; id++) {
        let p1 = l1.getNodePos(id);
        let p2 = l2.getNodePos(id);
        if (!equal(p1.x, p2.x) || !equal(p1.y, p2.y)) return false;
    }
    return true;
}

function inRefSet(refSet, layout) {
    for (let e of refSet) {
        if (e.layout !== layout) if (layoutEqual(e.layout, layout)) return true;
    }
    return false;
}

function layoutDistance(l1, l2) {
    let nodes = l1.nodes();
    let sum = 0;
    for (let id = 0; id < nodes.length; id++) {
        let p1 = l1.getNodePos(id);
        let p2 = l2.getNodePos(id);
        sum += distance(p1, p2);
    }
    return sum;
}
function medianPos(refSet) {
    let sum = 0;
    let best = bestObjective(refSet).layout;
    for (const e of refSet) {
        sum += layoutDistance(e.layout, best);
    }
    return sum / (refSet.length - 1);
}
function selectSrcDst(refSet) {
    // best and most distance

    // find layout with best objective
    let best = bestObjective(refSet).layout;

    // find layout with max distance from the best
    let furthest = null;
    let maxDist = 0;
    for (let e of refSet) {
        let dist = layoutDistance(e.layout, best);
        if (dist > maxDist) {
            furthest = e.layout;
            maxDist = dist;
        }
    }
    return [best, furthest];
}

function shortestDist(srcPos, dstPos, pathSquareSize) {
    let vectors = offsets(pathSquareSize);
    let closest = srcPos;
    for (const v of vectors) {
        let p = v.add(srcPos);
        if (distance(p, dstPos) < distance(closest, dstPos)) closest = p;
    }
    return closest;
}

export class Tabu {
    constructor(graph, params) {
        this.graph = graph;
        if (!params) params = {};
        this.params = params;
        // distance to move the node
        this.squareSize = params.squareSize || 512;
        this.squareReduction = params.squareReduction || 4;
        this.maxIt = params.iterations || 40;
        this.intensifyIt = params.intensifyIt || 5;
        this.cutoff = params.cutoff || 4;
        this.initCutoff = this.cutoff;
        this.cutoffReduction = params.cutoffReduction || 0.005;
        this.duration = params.duration || 5;
        this.effectBounds = false;
        this.layoutAlgName = "tabu";

        // PR parametrs
        this.PRparam = params.PRparam || {
            PRmaxIter: 4,
            refSetSize: 20,
            pathLength: 15,
            pathSquareSize: 20,
            accelerationPeriod: 7,
            acclerationRate: 0.002,
        };
        this.executionTime = 0;
        this.evaluatedSolutions = 0;
        this.it = 0;
        this.done = false;
        this.tabuSet = [];
        this.refSet = [];
        this.usePR = false;
        // refset = [{layout,it}]

        /* 
            Assuming the following
            
                   ^ 0,-1
                   |
          -1.0 <---.---> 1,0
                   |
                   v  0,1

        */
    }
    onNodeMove(nodeId, layoutAlg) {}
    onStep(layoutAlg) {}
    moveAlongPath(src, dst) {
        let length = 0;
        let nodes = src.nodes();
        let best = src;
        let srcClone = new Graph().restoreFrom(src);
        while (!layoutEqual(src, dst) && length < this.PRparam.pathLength) {
            for (let nId = 0; nId < nodes.length; nId++) {
                let position = shortestDist(
                    src.getNodePos(nId),
                    dst.getNodePos(nId),
                    this.PRparam.pathSquareSize
                );
                let move = { nodeId: nId, pos: position, it: this.it };
                if (!inTabuSet(this.tabuSet, move)) {
                    if (srcClone.objective() < best.objective()) {
                        best = new Graph().restoreFrom(srcClone);
                    }

                    this.tabuSet.push(move);
                }
            }
            length++;
        }
        return best;
    }
    pathRelinking() {
        let i = 0;
        let bestCandidate = null;
        let bestCandidateClone = null;
        while (i < this.PRparam.PRmaxIter && this.refSet.length > 1) {
            let [src, dst] = selectSrcDst(this.refSet);
            this.refSet = this.refSet.filter(
                (e) =>
                    !layoutEqual(e.layout, src) && !layoutEqual(e.layout, dst)
            );

            // TODO: Do we need to clone src and dst
            let candidateLayout1 = this.moveAlongPath(src, dst);
            let candidateLayout2 = this.moveAlongPath(dst, src);
            if (candidateLayout1.objective() <= candidateLayout2.objective()) {
                bestCandidate = candidateLayout1;
            } else {
                bestCandidate = candidateLayout2;
            }
            bestCandidateClone = new Graph().restoreFrom(bestCandidate);

            let entry = { layout: bestCandidateClone, it: this.it };

            // update refSet
            if (!inRefSet(this.refSet, entry.layout)) {
                if (this.refSet.length < this.PRparam.refSetSize) {
                    this.refSet.push(entry);
                } else if (
                    isHighQuality(this.refSet, entry.layout) ||
                    isDiverse(this.refSet, entry.layout)
                ) {
                    replaceWorst(this.refSet, entry);
                }
            }
            i++;
        }
        return bestCandidateClone;
    }
    // single iteration of the layout algorithm
    step() {
        let layout = this.graph;
        // find best solution/move for every node
        let allOffsets = offsets(this.squareSize);
        for (let nId = 0; nId < this.graph._nodes.length; nId++) {
            const currentObj = layout.objective();
            const currentPos = layout.getNodePos(nId);

            let chosenSol = null;
            let chosenSolObj = null;

            for (let offset of allOffsets) {
                let candidateSol = {
                    nodeId: nId,
                    pos: offset.add(currentPos),
                    it: this.it,
                };

                if (!inTabuSet(this.tabuSet, candidateSol)) {
                    this.evaluatedSolutions++;
                    layout.setNodePos(nId, candidateSol.pos, this.effectBounds);
                    let candidateSolObj = layout.objective();
                    layout.setNodePos(nId, currentPos, this.effectBounds);
                    let ratio = candidateSolObj / currentObj;

                    if (!isFinite(ratio) || ratio > this.cutoff) {
                        this.tabuSet.push(candidateSol);
                    }
                    if (
                        chosenSolObj == null || 
                        candidateSolObj < chosenSolObj
                    ) {
                        chosenSolObj = candidateSolObj;
                        chosenSol = candidateSol;
                    }
                }
            }

            if (chosenSol !== null) {
                layout.setNodePos(
                    chosenSol.nodeId,
                    chosenSol.pos,
                    this.effectBounds
                );
                this.onNodeMove(chosenSol.nodeId, this);

                let currentSol = {
                    nodeId: nId,
                    pos: currentPos,
                    it: this.it,
                };
                this.tabuSet.push(currentSol);
            }
        }

        if (this.usePR && !inRefSet(this.refSet, layout)) {
            console.log("using PR");
            let layoutClone = new Graph(layout.graph);
            let entry = { layout: layoutClone, it: this.it };
            if (this.refSet.length < this.PRparam.refSetSize) {
                this.refSet.push(entry);
            } else if (
                isHighQuality(this.refSet, layout) ||
                isDiverse(this.refSet, layout)
            ) {
                replaceWorst(this.refSet, entry);
            }
        } else {
        }
        if (this.it % this.intensifyIt === 0) {
            if (this.usePR) {
                let PRLayout = this.pathRelinking();
                if (PRLayout.objective() < this.graph.objective()) {
                    this.graph = PRLayout;
                }
            }
            this.squareSize = this.squareSize / this.squareReduction;
            this.cutoff -= this.cutoffReduction * this.intensifyIt;
        }
        // remove old sol from tabu set
        let filtered = this.tabuSet.filter(
            (s) => this.it - s.it < this.duration
        );
        this.tabuSet = filtered;

        this.it++;
        return this.graph;
    }

    // run
    run() {
        let start = performance.now();
        this.done = false;
        let lastObjective = -Infinity;
        //this.graph.resetZn();

        while (this.it < this.maxIt && this.squareSize >= 1) {
            this.step();
            this.onStep(this);
            lastObjective = this.graph.objective();
            if (
                this.graph.objective() < lastObjective &&
                !equal(this.graph.objective(), lastObjective)
            ) {
                throw `Objective is not supposed to get worse!`;
            }
        }
        this.executionTime = performance.now() - start;
        return this.graph;
    }

    serialize(string = true) {
        let s = {};
        if (string === true) return JSON.stringify(this);
        s.graph = this.graph.serialize();
        // distance to move the node
        s.params = { ...this.params };
        s.squareSize = this.squareSize;
        s.squareReduction = this.squareReduction;
        s.it = this.it;
        s.intensifyIt = this.intensifyIt;
        s.cutoff = this.cutoff;
        s.initCutoff = this.initCutoff;
        s.duration = this.duration;
        s.maxIt = this.maxIt;
        s.done = this.done;
        s.strategy = this.strategy;
        s.evaluatedSolutions = this.evaluatedSolutions;
        s.executionTime = this.executionTime; // in ms
        s.effectBounds = this.effectBounds;
        s.PRparam = { ...this.PRparam };
        s.tabuSet = [...this.tabuSet];
        s.refSet = [...this.refSet];
        s.usePR = this.usePR;
        s.layoutAlgName = this.layoutAlgName;

        return s;
    }
    deserialize(data) {
        if (typeof data === "string") data = JSON.parse(data);
        this.graph = new Graph().deserialize(data.graph);
        // distance to move the node
        this.squareSize = data.squareSize;
        this.squareReduction = data.squareReduction;
        this.it = data.it;
        this.maxIt = data.maxIt;
        this.done = data.done;
        this.strategy = data.strategy;
        this.evaluatedSolutions = data.evaluatedSolutions;
        this.executionTime = data.executionTime; // in ms
        this.effectBounds = data.effectBounds;
        this.layoutAlgName = data.layoutAlgName;

        this.params = data.params;
        this.intensifyIt = data.intensifyIt;
        this.initCutoff = data.initCutoff;
        this.duration = data.duration;
        this.PRparam = { ...data.PRparam };
        this.tabuSet = [...data.tabuSet];
        this.refSet = [...this.refSet];
        this.usePR = data.usePR;

        return this;
    }
}
