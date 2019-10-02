QUnit.module("Vec Class");

QUnit.test("creating vec from point", a => {
    let cases = [
        { x: 0, y: 0, junk: 122 },
        { x: 12, y: -2, other: "string" },
        { x: -12.23, y: 3.3 },
        { x: -12, y: 3.3 },
        { x: 0.0003, y: -0.23 },
        { x: -1, y: -0 }
        // test string
    ];
    for (c of cases) {
        let vP = new Vec(c.x, c.y);
        let vObj = new Vec(c);

        a.ok(
            vP.x === c.x && vP.y === c.y,
            `vp: ${JSON.stringify(vP)} c${JSON.stringify(c)}`
        );
        a.ok(
            vObj.x === c.x && vObj.y === c.y,
            `obj: ${JSON.stringify(vObj)} c:${JSON.stringify(c)}`
        );
    }
});

QUnit.skip("vector operations", a => {
    // defining vectors to test
    v = [
        new Vec(419.5, 24.5),
        new Vec(-419.5, -24.5),
        new Vec(641.5, 202.5),
        new Vec(641.5, 202.51),
        new Vec(0.0005, 202.51),
        new Vec(0.0004, 202.51),
        new Vec(-35.5, -277.5),
        new Vec(-35.5, 277.5)
    ];

    // testing addition
    a.deepEqual(v[0].add(v[2]), new Vec(1061, 227), "add: normal");
    a.deepEqual(v[0].add(v[1]), new Vec(0, 0), "add: equal with opposite sign");
    a.deepEqual(v[6].add(v[7]), new Vec(-71, -0), "add: mixed signs");
    a.deepEqual(v[4].add(v[5]), new Vec(0.0009, 405.02), "add: small numbers");

    // testing subtraction
    a.deepEqual(
        new Vec(23, 45).sub(new Vec(23, 12)),
        new Vec(0, 33),
        "sub: normal"
    );
    a.deepEqual(
        new Vec(0.0005, 2023.51).sub(new Vec(0.0004, 0.0001)),
        new Vec(0.0001, 2023.51),
        "sub: small"
    );
    a.deepEqual(
        new Vec(641.5, 202.5).sub(new Vec(641.5, 202.5)),
        new Vec(0, 0),
        "sub: same"
    );

    // testing scaler
    a.deepEqual(new Vec(641.5, 202.5).scale(2), new Vec(0, 0), "scaler: 0");
    a.deepEqual(
        new Vec(641.5, 202.5).scale(1),
        new Vec(641.5, 202.5),
        "scaler: 1"
    );
    a.deepEqual(
        new Vec(641.5, 202.5).scale(2),
        new Vec(1283, 405),
        "scaler: 2"
    );
    a.deepEqual(
        new Vec(0.000034, 34234.5).scale(2),
        new Vec(0.000068, 68469),
        "scaler: 2 small values"
    );
    a.deepEqual(
        new Vec(0.0034, 34234.5).scale(0.0002),
        new Vec(0.00000068, 6.8469),
        "scaler: scalling small vec by small value"
    );
    // testing dot product
    a.deepEqual(new Vec(12, 0).dot(new Vec(0, -12)), 0, "dot: perpendicular ");

    // testing cross

    a.deepEqual(
        new Vec(12, 0).cross(new Vec(0, -12)),
        -144,
        "cross: perpendicular"
    );
});


