// Run with: node --test importers.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("./importers.js");
const EX = require("./exercises.js");

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push Day","26 Sep 2024, 18:05","26 Sep 2024, 19:12","","Bench Press (Barbell)","","Felt strong, ""easy""",0,"warmup",40,10,,,
"Push Day","26 Sep 2024, 18:05","26 Sep 2024, 19:12","","Bench Press (Barbell)","","",1,"normal",80,8,,,8
"Push Day","26 Sep 2024, 18:05","26 Sep 2024, 19:12","","Bench Press (Barbell)","","",2,"normal",80,7,,,
"Push Day","26 Sep 2024, 18:05","26 Sep 2024, 19:12","","Pull Up","","",0,"normal",,10,,,
"Push Day","26 Sep 2024, 18:05","26 Sep 2024, 19:12","","Plank","","",0,"normal",,,,60,
"Push Day","26 Sep 2024, 18:05","26 Sep 2024, 19:12","","Landmine Squeeze Press","","",0,"dropset",20,12,,,
"Legs","28 Sep 2024, 09:00","28 Sep 2024, 10:01","","Squat (Barbell)","","",0,"normal",100,5,,,
"Legs","28 Sep 2024, 09:00","28 Sep 2024, 10:01","","Treadmill","","",0,"normal",,,2.5,900,
`;

test("CSV parsing handles quotes, commas and doubled quotes", () => {
  const r = I.parseCSV('a,"b, c","say ""hi"""\n1,,3\n');
  assert.deepEqual(r, [["a", "b, c", 'say "hi"'], ["1", "", "3"]]);
});

test("Hevy dates", () => {
  const t = I.parseDate("26 Sep 2024, 18:05"), d = new Date(t);
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2024, 8, 26, 18, 5]);
  assert.equal(I.parseDate("nonsense"), null);
});

test("Hevy import groups workouts, matches exercises and keeps set types", () => {
  const r = I.parseHevy(HEVY, EX);
  assert.equal(r.workouts.length, 2);
  const push = r.workouts.find((w) => w.name === "Push Day");
  assert.equal(push.date, "2024-09-26");
  assert.equal(Math.round((push.end - push.start) / 60000), 67);
  const bench = push.exercises[0];
  assert.equal(bench.exId, "x-bench-press-barbell");
  assert.equal(bench.note, 'Felt strong, "easy"');
  assert.deepEqual(bench.sets.map((s) => [s.type, s.kg, s.reps]), [["w", 40, 10], ["n", 80, 8], ["n", 80, 7]]);
  assert.equal(push.exercises[1].exId, "x-pull-up");
  assert.equal(push.exercises[2].exId, "x-plank");
  assert.equal(push.exercises[2].sets[0].sec, 60);
  assert.equal(r.created, 1, "Landmine Squeeze Press isn't in the library");
  assert.equal(r.exercises[0].name, "Landmine Squeeze Press");
  assert.equal(r.exercises[0].primary, "chest");
  assert.equal(push.exercises[3].sets[0].type, "d");
  const legs = r.workouts.find((w) => w.name === "Legs");
  assert.equal(legs.exercises[1].exId, "x-treadmill-machine");
  assert.equal(legs.exercises[1].sets[0].km, 2.5);
  assert.equal(r.sets, 8);
  assert.throws(() => I.parseHevy("a,b\n1,2\n", EX), /Hevy/);
});

test("Hevy pounds convert to kilograms", () => {
  const csv = `"title","start_time","end_time","exercise_title","set_type","weight_lbs","reps"\n"A","1 Oct 2024, 10:00","1 Oct 2024, 11:00","Bench Press (Barbell)","normal",225,5\n`;
  assert.equal(I.parseHevy(csv, EX).workouts[0].exercises[0].sets[0].kg, 102.06);
});

test("Apple Health export: steps de-duplicated across sources, sleep by night, weight", () => {
  const s = I.healthScanner("2026-10-01");
  const rec = (type, src, start, end, value, unit = "") => s.line(` <Record type="${type}" sourceName="${src}" unit="${unit}" creationDate="${end}" startDate="${start}" endDate="${end}" value="${value}"/>`);
  rec("HKQuantityTypeIdentifierStepCount", "iPhone", "2026-10-10 08:00:00 +0100", "2026-10-10 09:00:00 +0100", 4000, "count");
  rec("HKQuantityTypeIdentifierStepCount", "iPhone", "2026-10-10 12:00:00 +0100", "2026-10-10 13:00:00 +0100", 3000, "count");
  rec("HKQuantityTypeIdentifierStepCount", "Watch", "2026-10-10 08:00:00 +0100", "2026-10-10 13:00:00 +0100", 7400, "count");
  rec("HKQuantityTypeIdentifierStepCount", "iPhone", "2026-09-10 08:00:00 +0100", "2026-09-10 09:00:00 +0100", 9999, "count");
  rec("HKQuantityTypeIdentifierActiveEnergyBurned", "Watch", "2026-10-10 08:00:00 +0100", "2026-10-10 09:00:00 +0100", 1046, "kJ");
  rec("HKCategoryTypeIdentifierSleepAnalysis", "Watch", "2026-10-09 23:30:00 +0100", "2026-10-10 03:30:00 +0100", "HKCategoryValueSleepAnalysisAsleepCore");
  rec("HKCategoryTypeIdentifierSleepAnalysis", "Watch", "2026-10-10 03:30:00 +0100", "2026-10-10 06:45:00 +0100", "HKCategoryValueSleepAnalysisAsleepDeep");
  rec("HKCategoryTypeIdentifierSleepAnalysis", "Watch", "2026-10-09 23:00:00 +0100", "2026-10-10 07:00:00 +0100", "HKCategoryValueSleepAnalysisInBed");
  rec("HKQuantityTypeIdentifierBodyMass", "Scale", "2026-10-10 07:10:00 +0100", "2026-10-10 07:10:00 +0100", 180, "lb");
  s.line("<Workout workoutActivityType=\"HKWorkoutActivityTypeTraditionalStrengthTraining\"/>");
  const r = I.healthScanner && s.finish();
  assert.equal(r.health["2026-10-10"].steps, 7400, "max source, not the sum of phone and watch");
  assert.equal(r.health["2026-10-10"].active, 250);
  assert.equal(r.health["2026-10-10"].sleepH, 7.25);
  assert.equal(r.weights["2026-10-10"], 81.6);
  assert.equal(r.health["2026-09-10"], undefined, "older than the window");
});
