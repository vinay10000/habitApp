import assert from "node:assert/strict";

import { getTabIndexFromLocation, getVoiceActionFromVerticalSwipe } from "../components/bottom-nav-hit-test";

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

assert.equal(getVoiceActionFromVerticalSwipe("voice", 0, -52), "manual");
assert.equal(getVoiceActionFromVerticalSwipe("voice", 0, 52), "manual");
assert.equal(getVoiceActionFromVerticalSwipe("manual", 0, -52), "voice");
assert.equal(getVoiceActionFromVerticalSwipe("manual", 0, 52), "voice");
assert.equal(getVoiceActionFromVerticalSwipe("voice", 0, 18), "voice");

console.log("bottom nav hit-test tests passed");
