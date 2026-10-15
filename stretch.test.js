// Run with: node --test stretch.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const X = require("./stretch.js");
const EX = require("./exercises.js");
const byName = (n) => EX.find((e) => e.name === n);

test("every routine uses real stretches and takes a sensible time", () => {
  for (const r of X.ROUTINES) {
    for (const id of r.ids) assert.ok(X.STRETCHES[id], `${r.id}: ${id}`);
    const m = X.minutes(r.ids);
    assert.ok(m >= 4 && m <= 15, `${r.name}: ${m} min`);
  }
});

test("timeline holds each side and pauses to get into position", () => {
  const segs = X.segments(["quad", "child"]);
  assert.deepEqual(segs.map((s) => [s.kind, s.id, s.side]), [
    ["prep", "quad", "Left side"], ["hold", "quad", "Left side"], ["prep", "quad", "Right side"], ["hold", "quad", "Right side"],
    ["prep", "child", null], ["hold", "child", null],
  ]);
  assert.equal(segs.reduce((a, s) => a + s.sec, 0), X.totalSec(["quad", "child"]));
});

test("cool-down targets the muscles you trained", () => {
  const legs = ["Squat (Barbell)", "Romanian Deadlift (Barbell)", "Leg Extension (Machine)", "Standing Calf Raise (Machine)"].map(byName);
  assert.ok(legs.every(Boolean), "exercise names exist");
  const cool = X.cooldownFor(legs);
  const areas = new Set(cool.flatMap((id) => X.STRETCHES[id].areas));
  for (const m of ["quads", "hamstrings", "calves"]) assert.ok(areas.has(m), `covers ${m}: ${cool}`);
  assert.ok(!cool.includes("doorway"), "no chest stretch after legs");
  const push = X.cooldownFor(["Bench Press (Barbell)", "Overhead Press (Barbell)", "Triceps Pushdown (Cable)"].map(byName).filter(Boolean));
  const pa = new Set(push.flatMap((id) => X.STRETCHES[id].areas));
  for (const m of ["chest", "shoulders", "triceps"]) assert.ok(pa.has(m), `push covers ${m}: ${push}`);
  assert.ok(cool.length >= 4 && cool.length <= 6 && push.length >= 4);
  assert.ok(!cool.some((id) => X.STRETCHES[id].warm), "no warm-up drills in a cool-down");
  assert.equal(X.cooldownFor([]).length, 6); // falls back to full body
});

test("stretch days counts distinct days this week", () => {
  const s = { a: { date: "2026-10-14" }, b: { date: "2026-10-14" }, c: { date: "2026-10-10" }, d: { date: "2026-10-01" } };
  assert.equal(X.stretchDays(s, "2026-10-15"), 2);
});
