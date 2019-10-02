//TODO: intersection test

QUnit.test("Edge intersection test", a => {
    let noIsec = {
        nodes: [
            {
                label: "0",
                x: -22.5,
                y: -296,
                size: 10,
                color: "#921",
                id: "0"
            },
            {
                label: "1",
                x: -107.5,
                y: -93,
                size: 10,
                color: "#921",
                id: "1"
            },
            {
                label: "2",
                x: 75.15625,
                y: -202,
                size: 10,
                color: "#921",
                id: "2"
            },
            {
                label: "3",
                x: -53.84375,
                y: -161,
                size: 10,
                color: "#921",
                id: "3"
            }
        ],
        edges: [
            {
                size: 1.5,
                color: "#ccc",
                id: "e0-1",
                source: "0",
                target: "1"
            },
            {
                size: 1.5,
                color: "#ccc",
                id: "e2-3",
                source: "2",
                target: "3"
            }
        ]
    };

    let yesIsec = {
        nodes: [
            {
                label: "0",
                x: -22.5,
                y: -296,
                size: 10,
                color: "#921",
                "read_camcam1:x": -22.5,
                "read_camcam1:y": -296,
                "read_camcam1:size": 10,
                "camcam1:x": 512,
                "camcam1:y": 334,
                "camcam1:size": 10,
                id: "0"
            },
            {
                label: "1",
                x: -107.5,
                y: -93,
                size: 10,
                color: "#921",
                "read_camcam1:x": -107.5,
                "read_camcam1:y": -93,
                "read_camcam1:size": 10,
                "camcam1:x": 427,
                "camcam1:y": 537,
                "camcam1:size": 10,
                id: "1"
            },
            {
                label: "2",
                x: 75.15625,
                y: -202,
                size: 10,
                color: "#921",
                "read_camcam1:x": 75.15625,
                "read_camcam1:y": -202,
                "read_camcam1:size": 10,
                "camcam1:x": 609.65625,
                "camcam1:y": 428,
                "camcam1:size": 10,
                id: "2"
            },
            {
                label: "3",
                x: -128.84375,
                y: -155,
                size: 10,
                color: "#921",
                "read_camcam1:x": -128.84375,
                "read_camcam1:y": -155,
                "read_camcam1:size": 10,
                "camcam1:x": 405.65625,
                "camcam1:y": 475,
                "camcam1:size": 10,
                id: "3"
            }
        ],
        edges: [
            {
                size: 1.5,
                color: "#ccc",
                "read_camcam1:size": 1.5,
                id: "e0-1",
                source: "0",
                target: "1"
            },
            {
                size: 1.5,
                color: "#ccc",
                "read_camcam1:size": 1.5,
                id: "e2-3",
                source: "2",
                target: "3"
            }
        ]
    };

    var graph = new sigma.classes.graph().read(noIsec);
    edges = graph.edges();
    a.notOk(edgeIntersection(edges[0], edges[1], graph), "no intersect ok");

    graph = new sigma.classes.graph().read(t1);
    edges = graph.edges();
    a.ok(edgeIntersection(edges[0], edges[1], graph), "intersect ok");
});