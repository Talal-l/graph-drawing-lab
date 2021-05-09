import { CircularLayout } from "./circularLayout.js";
import { Tabu } from "./tabu.js";
import { HillClimbing } from "./hillClimbing.js";

onmessage = function (e) {
  let emitOnMove = e.data.emitOnMove || false;
  let emitOnStep = e.data.emitOnStep || false;

  let { layoutAlgName, layoutAlg, command } = e.data;

  let onNodeMove = (nodeId, layoutAlg) => {
    // TODO: only send delta
    // to avoid sending too many messages
    if (layoutAlg.evaluatedSolutions % 100 === 0)
      postMessage(
        { type: "move", nodeId, layoutAlg, layoutAlgName, command },
        "*"
      );
  };

  let onStep = (layoutAlg) => {
    // TODO: only send delta
    postMessage({ type: "step", layoutAlg, layoutAlgName, command }, "*");
  };

  switch (layoutAlgName) {
    case "hillClimbing":
      layoutAlg = new HillClimbing().deserialize(layoutAlg);
      break;
    case "circular":
      layoutAlg = new CircularLayout().deserialize(layoutAlg);
      break;
    case "tabu":
      layoutAlg = new Tabu().deserialize(layoutAlg);
      break;
  }
  if (emitOnMove) {
    // TODO: find a better way to add a callabck without casing clone errors with postMessage
    layoutAlg.__proto__.onNodeMove = onNodeMove;
  }

  if (emitOnStep) {
    layoutAlg.__proto__.onStep = onStep;
  }

  layoutAlg[command]();

  layoutAlg.__proto__.onNodeMove = () => {};
  layoutAlg.__proto__.onStep = () => {};
  // {type:command} is used to make usage more consistent
  postMessage({
    type: command,
    layoutAlg: layoutAlg,
    layoutAlgName: layoutAlgName,
    command: command,
  });
};
