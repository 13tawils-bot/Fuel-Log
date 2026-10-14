// Workout maths: estimated one-rep max, personal records, previous sets,
// progressive-overload targets and weekly sets per muscle. Pure functions.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Workouts = api;
})(typeof self !== "undefined" ? self : this, function () {
  const SET_TYPES = { n: "Working", w: "Warm-up", d: "Drop set", f: "Failure" };
  const r1 = (n) => Math.round(n * 10) / 10;

  // Epley estimate; beyond ~12 reps it stops being meaningful, so cap there.
  function e1rm(kg, reps) {
    if (!(kg > 0) || !(reps > 0)) return 0;
    if (reps === 1) return kg;
    return r1(kg * (1 + Math.min(reps, 12) / 30));
  }

  const working = (s) => s.done && s.type !== "w";

  // Every finished session of an exercise, oldest first.
  function sessions(exId, workouts, before = Infinity) {
    const out = [];
    for (const w of Object.values(workouts)) {
      if (!(w.start < before)) continue;
      for (const ex of w.exercises || []) {
        if (ex.exId !== exId) continue;
        const sets = (ex.sets || []).filter((s) => s.done);
        if (sets.length) out.push({ workoutId: w.id, start: w.start, date: w.date, sets });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  function previous(exId, workouts, before = Infinity) {
    const s = sessions(exId, workouts, before);
    return s.length ? s[s.length - 1] : null;
  }

  function bests(exId, workouts, before = Infinity) {
    const b = { kg: null, e1rm: null, reps: null, volume: null, sessionVolume: null, duration: null, distance: null };
    for (const ses of sessions(exId, workouts, before)) {
      let vol = 0;
      for (const s of ses.sets.filter(working)) {
        const kg = s.kg || 0, reps = s.reps || 0;
        if (kg > 0 && (!b.kg || kg > b.kg.kg || (kg === b.kg.kg && reps > b.kg.reps))) b.kg = { kg, reps, date: ses.date };
        const e = e1rm(kg, reps);
        if (e > 0 && (!b.e1rm || e > b.e1rm.value)) b.e1rm = { value: e, kg, reps, date: ses.date };
        if (reps > 0 && (!b.reps || reps > b.reps.reps)) b.reps = { reps, kg, date: ses.date };
        if (kg * reps > 0 && (!b.volume || kg * reps > b.volume.value)) b.volume = { value: r1(kg * reps), kg, reps, date: ses.date };
        if (s.sec > 0 && (!b.duration || s.sec > b.duration.sec)) b.duration = { sec: s.sec, date: ses.date };
        if (s.km > 0 && (!b.distance || s.km > b.distance.km)) b.distance = { km: s.km, sec: s.sec, date: ses.date };
        vol += kg * reps;
      }
      if (vol > 0 && (!b.sessionVolume || vol > b.sessionVolume.value)) b.sessionVolume = { value: r1(vol), date: ses.date };
    }
    return b;
  }

  // Which records a just-completed set beats, against history before this workout.
  function setPRs(set, exercise, workouts, before) {
    if (!set.done || set.type === "w") return [];
    const b = bests(exercise.id, workouts, before), out = [];
    const t = exercise.type;
    if (t === "wr" || (t === "bw" && set.kg > 0)) {
      if (set.kg > 0 && b.kg && set.kg > b.kg.kg) out.push("weight");
      const e = e1rm(set.kg, set.reps);
      if (e > 0 && b.e1rm && e > b.e1rm.value) out.push("1RM");
    }
    if (t === "bw" && !(set.kg > 0) && set.reps > 0 && b.reps && set.reps > b.reps.reps) out.push("reps");
    if (t === "du" && set.sec > 0 && b.duration && set.sec > b.duration.sec) out.push("time");
    if (t === "cd" && set.km > 0 && b.distance && set.km > b.distance.km) out.push("distance");
    return out;
  }

  // Smallest sensible jump for the kit and the muscle.
  function increment(exercise) {
    const lower = ["quads", "glutes", "hamstrings", "lower back"].includes(exercise.primary);
    if (exercise.equipment === "Dumbbell" || exercise.equipment === "Kettlebell") return 2;
    if (exercise.equipment === "Barbell" || exercise.equipment === "Trap Bar") return lower ? 5 : 2.5;
    return lower ? 5 : 2.5;
  }

  // Double progression: add reps until every working set reaches the top of
  // the range, then add weight and start again at the bottom.
  function nextTarget(exercise, workouts, range = [8, 12], before = Infinity) {
    const prev = previous(exercise.id, workouts, before);
    if (!prev) return null;
    const ws = prev.sets.filter((s) => s.type !== "w");
    if (!ws.length) return null;
    const [lo, hi] = range;
    if (exercise.type === "wr" || exercise.type === "bw") {
      const kg = Math.max(...ws.map((s) => s.kg || 0));
      const top = ws.filter((s) => (s.kg || 0) === kg);
      const minReps = Math.min(...top.map((s) => s.reps || 0));
      if (exercise.type === "bw" && !(kg > 0)) {
        return { kg: 0, reps: Math.min(minReps + 1, hi + 5), text: `Last time ${top.map((s) => s.reps).join(", ")} reps. Aim for ${minReps + 1}+ on every set.` };
      }
      if (minReps >= hi) {
        const nk = r1(kg + increment(exercise));
        return { kg: nk, reps: lo, up: true, text: `You hit ${hi}+ reps on every set at ${kg} kg. Go up to ${nk} kg for ${lo}+ reps.` };
      }
      if (minReps < lo) return { kg, reps: lo, text: `Stay at ${kg} kg and build every set to ${lo} reps.` };
      return { kg, reps: Math.min(minReps + 1, hi), text: `Stay at ${kg} kg and aim for ${Math.min(minReps + 1, hi)} reps on every set (last time ${top.map((s) => s.reps).join(", ")}).` };
    }
    if (exercise.type === "as") {
      const kg = Math.min(...ws.map((s) => s.kg || 0)), minReps = Math.min(...ws.map((s) => s.reps || 0));
      if (minReps >= hi && kg > 0) return { kg: Math.max(0, kg - 5), reps: lo, up: true, text: `Take 5 kg less help (${Math.max(0, kg - 5)} kg).` };
      return { kg, reps: Math.min(minReps + 1, hi), text: `Same help (${kg} kg), aim for ${Math.min(minReps + 1, hi)} reps.` };
    }
    return null;
  }

  // Best estimated 1RM (or best set) per session, for charts.
  function series(exercise, workouts) {
    return sessions(exercise.id, workouts).map((ses) => {
      const ws = ses.sets.filter(working);
      const top = ws.reduce((a, s) => ((s.kg || 0) > (a.kg || 0) ? s : a), ws[0] || {});
      return {
        date: ses.date,
        e1rm: Math.max(0, ...ws.map((s) => e1rm(s.kg, s.reps))),
        topKg: top.kg || 0,
        reps: Math.max(0, ...ws.map((s) => s.reps || 0)),
        volume: r1(ws.reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0)),
        sec: Math.max(0, ...ws.map((s) => s.sec || 0)),
        km: Math.max(0, ...ws.map((s) => s.km || 0)),
      };
    }).filter((p) => p.e1rm || p.reps || p.sec || p.km);
  }

  // Hard sets per muscle in the last 7 days: a primary muscle counts a full set,
  // a secondary muscle half. 10-20 a week is the usual range for growth.
  function muscleSets(workouts, exIndex, now = Date.now(), days = 7) {
    const since = now - days * 86400000, out = {};
    for (const w of Object.values(workouts)) {
      if (w.start < since) continue;
      for (const ex of w.exercises || []) {
        const def = exIndex[ex.exId];
        if (!def || def.primary === "cardio") continue;
        const n = (ex.sets || []).filter(working).length;
        if (!n) continue;
        out[def.primary] = (out[def.primary] || 0) + n;
        for (const m of def.secondary) out[m] = (out[m] || 0) + n / 2;
      }
    }
    return out;
  }

  function summary(w, exIndex, history) {
    let volume = 0, sets = 0;
    const prs = [];
    for (const ex of w.exercises || []) {
      const def = exIndex[ex.exId];
      for (const s of ex.sets || []) {
        if (!working(s)) continue;
        sets++;
        volume += (s.kg || 0) * (s.reps || 0);
        if (def) for (const kind of setPRs(s, def, history, w.start)) prs.push({ exercise: def.name, kind, set: s });
      }
    }
    // One line per exercise and record type: keep the best.
    const seen = new Set();
    const uniq = prs.reverse().filter((p) => { const k = p.exercise + p.kind; if (seen.has(k)) return false; seen.add(k); return true; }).reverse();
    return { durationMin: Math.max(1, Math.round(((w.end || Date.now()) - w.start) / 60000)), volume: Math.round(volume), sets, prs: uniq };
  }

  function weeklyCounts(workouts, now = Date.now(), weeks = 8) {
    const out = Array(weeks).fill(0);
    for (const w of Object.values(workouts)) {
      const ago = Math.floor((now - w.start) / (7 * 86400000));
      if (ago >= 0 && ago < weeks) out[weeks - 1 - ago]++;
    }
    return out;
  }

  // Average change in estimated 1RM across the lifts trained at least twice
  // since a date, for the recomp scorecard. Top four lifts by sessions.
  function strengthTrend(workouts, exIndex, since) {
    const by = {};
    for (const wk of Object.values(workouts)) {
      if (wk.start < since) continue;
      for (const ex of wk.exercises || []) {
        const def = exIndex[ex.exId];
        if (!def || def.type !== "wr") continue;
        const best = Math.max(0, ...(ex.sets || []).filter(working).map((s) => e1rm(s.kg, s.reps)));
        if (best > 0) (by[ex.exId] ||= []).push({ start: wk.start, best });
      }
    }
    const lifts = Object.values(by).filter((a) => a.length >= 2).sort((a, b) => b.length - a.length).slice(0, 4);
    if (!lifts.length) return { pct: null, lifts: 0 };
    const pcts = lifts.map((a) => { a.sort((x, y) => x.start - y.start); return ((a[a.length - 1].best - a[0].best) / a[0].best) * 100; });
    return { pct: Math.round((pcts.reduce((x, y) => x + y, 0) / pcts.length) * 10) / 10, lifts: lifts.length };
  }

  const PR_LABELS = { weight: "Heaviest weight", "1RM": "Strongest set", volume: "Most weight × reps", reps: "Most reps", time: "Longest time", distance: "Furthest distance" };

  // Every record an exercise has set, in order. The first session is the
  // baseline; each later set that beats a best is a PR, like a gym app's records tab.
  function prHistory(exercise, workouts) {
    const out = [], b = { kg: 0, e1rm: 0, volume: 0, reps: 0, sec: 0, km: 0 };
    sessions(exercise.id, workouts).forEach((ses, n) => {
      const found = {};
      for (const s of ses.sets.filter(working)) {
        const kg = s.kg || 0, reps = s.reps || 0, e = e1rm(kg, reps), v = kg * reps;
        const weighted = exercise.type === "wr" || (exercise.type === "bw" && kg > 0);
        if (weighted && kg > b.kg) { b.kg = kg; found.weight = s; }
        if (weighted && e > b.e1rm) { b.e1rm = e; found["1RM"] = s; }
        if (exercise.type === "wr" && v > b.volume) { b.volume = v; found.volume = s; }
        if (exercise.type !== "wr" && exercise.type !== "du" && exercise.type !== "cd" && !(kg > 0) && reps > b.reps) { b.reps = reps; found.reps = s; }
        if (exercise.type === "du" && (s.sec || 0) > b.sec) { b.sec = s.sec; found.time = s; }
        if (exercise.type === "cd" && (s.km || 0) > b.km) { b.km = s.km; found.distance = s; }
      }
      if (n > 0) for (const [kind, set] of Object.entries(found)) out.push({ date: ses.date, start: ses.start, workoutId: ses.workoutId, exId: exercise.id, kind, label: PR_LABELS[kind], set, e1rm: e1rm(set.kg, set.reps) });
    });
    return out;
  }

  function recentPRs(workouts, exIndex, limit = 10) {
    const ids = new Set();
    for (const w of Object.values(workouts)) for (const ex of w.exercises || []) ids.add(ex.exId);
    const all = [];
    for (const id of ids) if (exIndex[id]) all.push(...prHistory(exIndex[id], workouts));
    return all.sort((a, b) => b.start - a.start).slice(0, limit);
  }

  // How a set of sets compares with the last time you did the exercise.
  function sessionStats(sets, type) {
    const ws = (sets || []).filter(working);
    return {
      volume: ws.reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0),
      reps: ws.reduce((a, s) => a + (s.reps || 0), 0),
      sec: ws.reduce((a, s) => a + (s.sec || 0), 0),
      km: ws.reduce((a, s) => a + (s.km || 0), 0),
      top: Math.max(0, ...ws.map((s) => e1rm(s.kg, s.reps))),
      sets: ws.length,
      metric: type === "wr" ? "volume" : type === "du" ? "sec" : type === "cd" ? "km" : "reps",
    };
  }
  // `sameSets` compares like with like mid-workout: your first N working sets
  // against the first N from last time.
  function compareToLast(exercise, sets, workouts, before, sameSets = false) {
    const prev = previous(exercise.id, workouts, before);
    if (!prev) return null;
    const done = (sets || []).filter(working);
    const prevSets = sameSets ? prev.sets.filter(working).slice(0, done.length) : prev.sets;
    const a = sessionStats(prevSets, exercise.type), b = sessionStats(sets, exercise.type);
    const m = a.metric;
    if (!(a[m] > 0) || !(b[m] > 0)) return { prev: a, now: b, metric: m, pct: null };
    return { prev: a, now: b, metric: m, pct: Math.round(((b[m] - a[m]) / a[m]) * 100) };
  }

  // Progressive overload: of the sessions in the window, how many beat the
  // previous session of the same exercise (higher est. 1RM, volume or reps).
  function overloadScore(workouts, exIndex, now = Date.now(), days = 28) {
    const since = now - days * 86400000;
    let improved = 0, total = 0;
    for (const w of Object.values(workouts)) {
      if (w.start < since) continue;
      for (const ex of w.exercises || []) {
        const def = exIndex[ex.exId]; if (!def) continue;
        const c = compareToLast(def, ex.sets, workouts, w.start);
        if (!c) continue;
        total++;
        const up = def.type === "wr" ? c.now.top > c.prev.top || c.now.volume > c.prev.volume : c.now[c.metric] > c.prev[c.metric];
        if (up) improved++;
      }
    }
    return { improved, total, pct: total ? Math.round((improved / total) * 100) : null };
  }

  // Gym days for a calendar: workouts grouped by date with exact times.
  function calendarMonth(workouts, year, month) {
    const days = {};
    for (const w of Object.values(workouts)) {
      const d = new Date(w.start);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      (days[d.getDate()] ||= []).push(w);
    }
    const list = Object.values(days).flat();
    const mins = list.map((w) => Math.max(1, Math.round(((w.end || w.start) - w.start) / 60000)));
    return {
      days, sessions: list.length, gymDays: Object.keys(days).length,
      totalMin: mins.reduce((a, b) => a + b, 0),
      avgMin: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : 0,
    };
  }

  return { calendarMonth, strengthTrend, prHistory, recentPRs, compareToLast, overloadScore, PR_LABELS, SET_TYPES, e1rm, sessions, previous, bests, setPRs, increment, nextTarget, series, muscleSets, summary, weeklyCounts };
});
