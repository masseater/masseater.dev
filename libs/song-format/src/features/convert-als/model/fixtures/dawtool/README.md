# dawtool Live Sets

These Live Sets and `cases.json` come from the tests of [dawtool](https://github.com/offlinemark/dawtool) at commit `44f3e19ffc686477051e2d8a9049a838018d6256`. Ableton Live 8 to 12 saved the sets. They hold tempo automation, time signatures and locators, and no music. `LICENSE` is the dawtool license (BSD 3-Clause).

`cases.json` holds, for each test in `tests/test_ableton.py`, the file it opens, whether dawtool reads the tempo automation as written (`theoretical`), the tempo automation points it expects (`[beat, bpm]`), the markers it expects (`[seconds, name]`) and whether it expects the file to be rejected (`unreadable`). Build it again from a dawtool checkout of the pinned commit with the Node program below.

```js
const fs = require("node:fs");
const source = fs.readFileSync("tests/test_ableton.py", "utf8");
const cases = source
  .split(/\ndef /)
  .slice(1)
  .flatMap((test) => {
    const file = test.match(/TESTS_DIR_ALS}\/([^']+)'/);
    if (!file) return [];
    const tempo = test.match(/\n    auto = \[(.*)\]\n/);
    const markers =
      test.match(/\n    marks = \[(.*)\]\n/) ?? test.match(/assert proj\.markers == \[(.*)\]\n/);
    const times = test.match(/assert \[m\.time for m in markers\] == \[(.*)\]/);
    const texts = test.match(/assert \[m\.text for m in markers\] == \[(.*)\]/);
    return [
      {
        name: test.split("(")[0],
        file: file[1],
        theoretical: /theoretical=True/.test(test),
        tempo: tempo
          ? [...tempo[1].matchAll(/time=([-\d.e]+), real_time=[^,]+, value=([-\d.]+)/g)].map(
              (m) => [+m[1], +m[2]],
            )
          : null,
        markers: markers
          ? [...markers[1].matchAll(/Marker\(time=([-\d.e]+), text='([^']*)'\)/g)].map((m) => [
              +m[1],
              m[2],
            ])
          : times
            ? times[1]
                .split(",")
                .map(Number)
                .map((t, i) => [t, JSON.parse(`[${texts[1].replace(/'/g, '"')}]`)[i]])
            : null,
        unreadable: /pytest\.raises/.test(test),
      },
    ];
  });
fs.writeFileSync("cases.json", `${JSON.stringify(cases, null, 1)}\n`);
```
