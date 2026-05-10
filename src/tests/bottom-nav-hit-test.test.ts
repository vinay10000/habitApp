import assert from "node:assert/strict";

import { getTabIndexFromLocation } from "../components/bottom-nav-hit-test";

const frame = { x: 24, width: 320 };

assert.equal(getTabIndexFromLocation(frame, 4, 24), 0);
assert.equal(getTabIndexFromLocation(frame, 4, 103), 0);
assert.equal(getTabIndexFromLocation(frame, 4, 104), 1);
assert.equal(getTabIndexFromLocation(frame, 4, 183), 1);
assert.equal(getTabIndexFromLocation(frame, 4, 184), 2);
assert.equal(getTabIndexFromLocation(frame, 4, 263), 2);
assert.equal(getTabIndexFromLocation(frame, 4, 264), 3);
assert.equal(getTabIndexFromLocation(frame, 4, 343), 3);
assert.equal(getTabIndexFromLocation(frame, 4, 12), 0);
assert.equal(getTabIndexFromLocation(frame, 4, 390), 3);
assert.equal(getTabIndexFromLocation(frame, 0, 100), null);
assert.equal(getTabIndexFromLocation({ x: 0, width: 0 }, 4, 100), null);

console.log("bottom nav hit-test tests passed");
