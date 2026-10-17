// Importers for Fuel Log: Hevy workout CSV exports and Apple Health's
// export.xml. Pure functions so they run in the page and under node --test.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Importers = api;
})(typeof self !== "undefined" ? self : this, function () {
  // ---------- CSV ----------
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
        else field += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  // Hevy writes dates like "26 Sep 2024, 18:05"; accept ISO too.
  function parseDate(s) {
    if (!s) return null;
    const m = String(s).match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
    if (m && MONTHS[m[2].toLowerCase()] != null) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +m[4], +m[5]).getTime();
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  }
  const iso = (ms) => { const d = new Date(ms); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9()]+/g, " ").replace(/\s+/g, " ").trim();
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // A best guess at the main muscle for an exercise we don't know, from its name.
  const MUSCLE_WORDS = [["bench|chest|fly|pec|push up|dip|squeeze", "chest"], ["shoulder|overhead|lateral|delt|arnold|military", "shoulders"], ["curl", "biceps"], ["tricep|pushdown|skull|extension", "triceps"],
    ["row|pulldown|pull up|chin up|lat ", "lats"], ["shrug", "traps"], ["squat|leg press|lunge|leg extension|step up", "quads"], ["deadlift|good morning|back extension", "lower back"],
    ["leg curl|hamstring|nordic", "hamstrings"], ["hip thrust|glute|bridge|kickback", "glutes"], ["calf", "calves"], ["crunch|plank|ab |abs|sit up|leg raise", "abs"],
    ["run|cycl|bike|row(ing)? machine|elliptical|stair|walk|swim|treadmill", "cardio"]];
  const guessMuscle = (name) => { const n = " " + norm(name) + " "; for (const [re, m] of MUSCLE_WORDS) if (new RegExp(re).test(n)) return m; return "full body"; };

  const SET_TYPE = { normal: "n", warmup: "w", "warm up": "w", dropset: "d", "drop set": "d", failure: "f" };

  // Hevy CSV → Fuel Log workouts. `library` is the exercise list to match names against.
  function parseHevy(text, library) {
    const rows = parseCSV(text.replace(/^﻿/, ""));
    if (rows.length < 2) throw new Error("That file is empty.");
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (name) => head.indexOf(name);
    const c = { title: col("title"), start: col("start_time"), end: col("end_time"), ex: col("exercise_title"), note: col("exercise_notes"), type: col("set_type"),
      kg: col("weight_kg"), lbs: col("weight_lbs"), reps: col("reps"), km: col("distance_km"), miles: col("distance_miles"), sec: col("duration_seconds") };
    if (c.ex < 0 || c.start < 0) throw new Error("This doesn't look like a Hevy workout export. It should have exercise_title and start_time columns.");
    const byName = {}, byBase = {};
    for (const e of library) {
      byName[norm(e.name)] = e;
      (byBase[norm(e.name.replace(/\s*\(.*\)$/, ""))] ||= []).push(e);
    }
    // Exact name first; otherwise the same movement under a different equipment label,
    // preferring the plain or machine version (e.g. "Treadmill" → "Treadmill (Machine)").
    const find = (name) => {
      const n = norm(name);
      if (byName[n]) return byName[n];
      const base = byBase[norm(name.replace(/\s*\(.*\)$/, ""))];
      if (!base) return null;
      return base.length === 1 ? base[0] : base.find((e) => /Machine|Bodyweight|Cable/.test(e.equipment)) || base[0];
    };
    const custom = {}, matched = new Set(), created = new Set();
    const num = (i, r) => (i >= 0 && r[i] !== "" && r[i] != null && !isNaN(+r[i]) ? +r[i] : null);
    const workouts = {};
    for (const r of rows.slice(1)) {
      const start = parseDate(r[c.start]);
      const exName = (r[c.ex] || "").trim();
      if (!start || !exName) continue;
      const end = parseDate(r[c.end]) || start;
      const title = (r[c.title] || "Workout").trim();
      const id = "hevy-" + start.toString(36) + "-" + slug(title).slice(0, 20);
      const w = (workouts[id] ||= { id, name: title, start, end: Math.max(end, start), date: iso(start), source: "hevy", exercises: [] });
      let def = find(exName);
      if (def) matched.add(def.id);
      else {
        const cid = "cx-hevy-" + slug(exName);
        if (!custom[cid]) {
          const hasKg = c.kg >= 0 || c.lbs >= 0;
          custom[cid] = { id: cid, name: exName, primary: guessMuscle(exName), secondary: [], equipment: /barbell/i.test(exName) ? "Barbell" : /dumbbell/i.test(exName) ? "Dumbbell" : /cable/i.test(exName) ? "Cable" : /machine/i.test(exName) ? "Machine" : "Other", type: "wr", custom: true, imported: "hevy", _seen: { kg: false, reps: false, sec: false, km: false, hasKg } };
          created.add(cid);
        }
        def = custom[cid];
      }
      let ex = w.exercises[w.exercises.length - 1];
      if (!ex || ex.exId !== def.id) { ex = { exId: def.id, note: c.note >= 0 ? r[c.note] || "" : "", sets: [] }; w.exercises.push(ex); }
      const kg = num(c.kg, r) ?? (num(c.lbs, r) != null ? Math.round(num(c.lbs, r) * 0.453592 * 100) / 100 : null);
      const km = num(c.km, r) ?? (num(c.miles, r) != null ? Math.round(num(c.miles, r) * 1.60934 * 100) / 100 : null);
      const set = { type: SET_TYPE[(r[c.type] || "normal").toLowerCase()] || "n", kg: kg || null, reps: num(c.reps, r), sec: num(c.sec, r), km: km || null, done: true };
      ex.sets.push(set);
      if (def._seen) { if (set.kg) def._seen.kg = true; if (set.reps) def._seen.reps = true; if (set.sec) def._seen.sec = true; if (set.km) def._seen.km = true; }
    }
    // Decide what each new exercise logs from the numbers it actually has.
    for (const e of Object.values(custom)) {
      const s = e._seen; delete e._seen;
      e.type = s.km ? "cd" : s.sec && !s.reps ? "du" : s.reps && !s.kg ? "bw" : "wr";
      if (e.type === "cd") e.primary = "cardio";
    }
    const list = Object.values(workouts).filter((w) => w.exercises.length);
    return { workouts: list, exercises: Object.values(custom), matched: matched.size, created: created.size, sets: list.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0) };
  }

  // ---------- Apple Health export.xml ----------
  // Feed lines one at a time (the file can be huge), then call finish().
  // Each source is totalled separately and the biggest wins, so an iPhone and
  // a Watch counting the same steps don't double up.
  function healthScanner(sinceIso) {
    const acc = { steps: {}, active: {}, sleep: {}, weight: {} };
    const attr = (line, name) => { const m = line.match(new RegExp(name + '="([^"]*)"')); return m ? m[1] : null; };
    const add = (bucket, day, source, v) => { const d = (bucket[day] ||= {}); d[source] = (d[source] || 0) + v; };
    const dayOf = (s) => s && s.slice(0, 10);
    const toMs = (s) => Date.parse(s.replace(" ", "T").replace(/ ([+-]\d{2})(\d{2})$/, "$1:$2"));
    let records = 0;
    function line(l) {
      if (l.indexOf("<Record ") < 0) return;
      const type = attr(l, "type");
      if (!type) return;
      const watch = type === "HKQuantityTypeIdentifierStepCount" || type === "HKQuantityTypeIdentifierActiveEnergyBurned" || type === "HKCategoryTypeIdentifierSleepAnalysis" || type === "HKQuantityTypeIdentifierBodyMass";
      if (!watch) return;
      const startS = attr(l, "startDate"), endS = attr(l, "endDate");
      const day = dayOf(type === "HKCategoryTypeIdentifierSleepAnalysis" ? endS : startS);
      if (!day || day < sinceIso) return;
      records++;
      const src = attr(l, "sourceName") || "?", val = attr(l, "value"), unit = attr(l, "unit");
      if (type === "HKQuantityTypeIdentifierStepCount") add(acc.steps, day, src, +val || 0);
      else if (type === "HKQuantityTypeIdentifierActiveEnergyBurned") add(acc.active, day, src, unit === "kJ" ? (+val || 0) / 4.184 : +val || 0);
      else if (type === "HKQuantityTypeIdentifierBodyMass") {
        let kg = +val; if (unit === "lb") kg *= 0.453592; else if (unit === "st") kg *= 6.35029;
        if (kg > 25 && kg < 350) { const prev = acc.weight[day]; if (!prev || startS > prev.at) acc.weight[day] = { kg: Math.round(kg * 10) / 10, at: startS }; }
      } else if (/Asleep/.test(val || "")) {
        const mins = (toMs(endS) - toMs(startS)) / 60000;
        if (mins > 0 && mins < 16 * 60) add(acc.sleep, day, src, mins);
      }
    }
    function finish() {
      const best = (o) => Math.max(...Object.values(o));
      const health = {}, weights = {};
      for (const [d, o] of Object.entries(acc.steps)) (health[d] ||= {}).steps = Math.round(best(o));
      for (const [d, o] of Object.entries(acc.active)) (health[d] ||= {}).active = Math.round(best(o));
      for (const [d, o] of Object.entries(acc.sleep)) { const h = best(o) / 60; if (h >= 1) (health[d] ||= {}).sleepH = Math.round(h * 100) / 100; }
      for (const [d, w] of Object.entries(acc.weight)) weights[d] = w.kg;
      return { health, weights, records, days: Object.keys(health).length };
    }
    return { line, finish };
  }

  return { parseCSV, parseDate, parseHevy, healthScanner, guessMuscle };
});
