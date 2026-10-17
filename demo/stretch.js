// Stretching: a small library of stretches, ready-made routines, a cool-down
// built from what you just trained, and a hands-free follow-along player.
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.Stretch = data;
})(typeof self !== "undefined" ? self : this, function () {
  // id: [name, areas (same names as exercise muscles), seconds per hold, per side?, how to do it, warm-up move?]
  const RAW = {
    quad: ["Standing quad stretch", ["quads"], 30, true, "Hold a wall. Pull one heel to your bum, knees together, and squeeze that glute. Stand tall."],
    hipflexor: ["Kneeling hip flexor stretch", ["quads", "lower back"], 40, true, "Kneel on one knee, other foot in front. Tuck your hips under and shift forward until the front of the back hip stretches."],
    hamstring: ["Standing hamstring stretch", ["hamstrings"], 30, true, "Heel on a low step, leg straight. Keep your back flat and hinge forward from the hips until you feel the back of the leg."],
    figure4: ["Figure-4 glute stretch", ["glutes", "lower back"], 40, true, "Lie on your back. Cross one ankle over the other knee, then pull that leg towards your chest."],
    pigeon: ["Pigeon stretch", ["glutes", "abductors"], 40, true, "From all fours, bring one knee forward behind your wrist, back leg long. Sink your hips and lean over the front leg."],
    butterfly: ["Butterfly stretch", ["adductors"], 40, false, "Sit with the soles of your feet together, knees out. Hold your feet and gently lean forward with a straight back."],
    calf: ["Wall calf stretch", ["calves"], 30, true, "Hands on a wall, one foot back with the heel down and the leg straight. Lean in until the calf stretches."],
    child: ["Child's pose", ["lats", "lower back"], 45, false, "Kneel, sit back on your heels and walk your hands forward. Let your chest sink and breathe into your back."],
    catcow: ["Cat-cow", ["lower back", "upper back"], 40, false, "On all fours, slowly round your back up, then let it dip as you lift your chest. Move with your breath."],
    kneeschest: ["Knees to chest", ["lower back", "glutes"], 30, false, "Lie on your back and hug both knees in. Rock gently side to side if it feels good."],
    twist: ["Lying spinal twist", ["lower back", "obliques"], 30, true, "On your back, drop both knees to one side and look the other way. Keep both shoulders on the floor."],
    doorway: ["Doorway chest stretch", ["chest", "shoulders"], 30, false, "Forearms on a door frame at shoulder height. Step through slowly until the chest opens. Don't arch your back."],
    crossbody: ["Cross-body shoulder stretch", ["shoulders", "upper back"], 30, true, "Pull one straight arm across your chest with the other hand, just above the elbow. Keep the shoulder down."],
    triceps: ["Overhead triceps stretch", ["triceps", "lats"], 30, true, "Reach one hand down your back, elbow up. Use the other hand to ease the elbow back."],
    biceps: ["Wall biceps stretch", ["biceps", "chest"], 30, true, "Palm flat on a wall behind you at shoulder height, thumb up. Turn your body away until the arm stretches."],
    wrist: ["Wrist and forearm stretch", ["forearms"], 20, true, "Arm straight out, palm up. Gently pull the fingers back with the other hand, then flip the palm down and repeat."],
    lat: ["Standing side bend", ["lats", "obliques"], 30, true, "Reach one arm overhead and lean to the other side. Push the hip out to feel it down your side."],
    thread: ["Thread the needle", ["upper back", "shoulders"], 30, true, "On all fours, slide one arm under your body along the floor and rest that shoulder down. Breathe."],
    cobra: ["Cobra", ["abs", "lower back"], 30, false, "Lie face down, hands under shoulders. Press your chest up with hips on the floor. Only go as high as feels easy."],
    neck: ["Neck side stretch", ["neck", "traps"], 20, true, "Sit tall. Tilt one ear towards your shoulder and let the other shoulder drop. Hold, don't pull hard."],
    squat: ["Deep squat hold", ["quads", "glutes", "adductors", "calves"], 45, false, "Feet shoulder-width, sit down as low as you can with heels down. Push knees out with your elbows."],
    openbook: ["Open book", ["upper back", "chest"], 30, true, "Lie on your side, knees bent, arms out in front. Open the top arm across to the other side and follow it with your eyes."],
    wgs: ["World's greatest stretch", ["full body", "quads", "hamstrings", "upper back"], 30, true, "Lunge forward, same-side hand down inside the foot. Rotate and reach the other arm to the ceiling, then back. Repeat slowly."],
    armcircles: ["Arm circles", ["shoulders"], 30, false, "Arms out to the sides. Small circles forwards, getting bigger, then backwards.", true],
    legswing: ["Leg swings, front to back", ["hamstrings", "quads", "glutes"], 20, true, "Hold a wall and swing one leg forward and back, a little higher each time.", true],
    legswingside: ["Leg swings, side to side", ["adductors", "abductors"], 20, true, "Face a wall and swing one leg across your body and out to the side.", true],
    hipcircles: ["Hip circles", ["glutes", "lower back"], 20, false, "Hands on hips, draw big slow circles with your hips. Switch direction halfway.", true],
    inchworm: ["Inchworm", ["hamstrings", "chest", "abs"], 40, false, "Fold forward, walk your hands out to a press-up position, then walk them back. Repeat at an easy pace.", true],
    bwsquat: ["Bodyweight squats", ["quads", "glutes"], 30, false, "Easy squats, full depth, to warm the knees and hips. Don't rush.", true],
    wallslide: ["Wall slides", ["shoulders", "upper back"], 30, false, "Back and arms against a wall in a goalpost shape. Slide arms up and down, keeping them touching the wall.", true],
  };
  const STRETCHES = Object.fromEntries(Object.entries(RAW).map(([id, [name, areas, sec, sides, how, warm]]) => [id, { id, name, areas, sec, sides, how, warm: !!warm }]));

  const ROUTINES = [
    { id: "warmup", name: "Before you lift", blurb: "Warm-up to loosen hips and shoulders", ids: ["armcircles", "wallslide", "legswing", "legswingside", "hipcircles", "inchworm", "bwsquat", "wgs"] },
    { id: "full", name: "Full body", blurb: "Everything, once through", ids: ["quad", "hipflexor", "hamstring", "figure4", "calf", "child", "doorway", "crossbody", "triceps", "twist"] },
    { id: "back", name: "Hips & lower back", blurb: "For desk days and a stiff back", ids: ["catcow", "kneeschest", "hipflexor", "pigeon", "butterfly", "twist", "child"] },
    { id: "morning", name: "Morning wake-up", blurb: "Five minutes to get moving", ids: ["catcow", "wgs", "thread", "neck", "squat", "cobra"] },
  ];

  // Seconds for one stretch, both sides included.
  const stretchSec = (s) => s.sec * (s.sides ? 2 : 1);
  // Short pauses to get into position: before each stretch and when switching sides.
  const PREP = 5, SWITCH = 4;
  function totalSec(ids) {
    return ids.reduce((a, id) => { const s = STRETCHES[id]; return s ? a + stretchSec(s) + PREP + (s.sides ? SWITCH : 0) : a; }, 0);
  }
  const minutes = (ids) => Math.max(1, Math.round(totalSec(ids) / 60));

  // The follow-along timeline: get ready, hold, switch sides, hold, next...
  function segments(ids) {
    const out = [];
    for (const id of ids) {
      const s = STRETCHES[id]; if (!s) continue;
      out.push({ kind: "prep", id, side: s.sides ? "Left side" : null, sec: PREP });
      out.push({ kind: "hold", id, side: s.sides ? "Left side" : null, sec: s.sec });
      if (s.sides) { out.push({ kind: "prep", id, side: "Right side", sec: SWITCH, switching: true }); out.push({ kind: "hold", id, side: "Right side", sec: s.sec }); }
    }
    return out;
  }

  // A cool-down for the muscles a workout hit: primary muscles count double.
  // exercises: [{ primary, secondary: [] }]. Returns 5 to 7 stretch ids.
  function cooldownFor(exercises, max = 6) {
    const load = {};
    for (const ex of exercises || []) {
      if (!ex) continue;
      load[ex.primary] = (load[ex.primary] || 0) + 2;
      for (const m of ex.secondary || []) load[m] = (load[m] || 0) + 1;
    }
    if (!Object.keys(load).length || Object.keys(load).every((m) => m === "cardio" || m === "full body")) return ROUTINES.find((r) => r.id === "full").ids.slice(0, max);
    const chosen = [], covered = {};
    const pool = Object.values(STRETCHES).filter((s) => !s.warm);
    while (chosen.length < max) {
      let best = null, bestScore = 0;
      for (const s of pool) {
        if (chosen.includes(s.id)) continue;
        // Favour muscles worked hard that aren't stretched yet.
        const score = s.areas.reduce((a, m) => a + (load[m] || 0) / (1 + (covered[m] || 0) * 2), 0) / Math.sqrt(s.areas.length);
        if (score > bestScore) { best = s; bestScore = score; }
      }
      if (!best || bestScore < 0.5) break;
      chosen.push(best.id);
      for (const m of best.areas) covered[m] = (covered[m] || 0) + 1;
    }
    if (chosen.length < 4) for (const id of ["child", "hipflexor", "doorway", "hamstring"]) if (chosen.length < 4 && !chosen.includes(id)) chosen.push(id);
    // Floor stretches last so you only get down once.
    const floor = new Set(["child", "catcow", "kneeschest", "twist", "figure4", "pigeon", "butterfly", "cobra", "thread", "openbook"]);
    return chosen.sort((a, b) => floor.has(a) - floor.has(b));
  }

  // Days in the last `days` with at least one stretch session.
  function stretchDays(sessions, today, days = 7) {
    const from = new Date(new Date(today + "T12:00").getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
    return new Set(Object.values(sessions || {}).filter((s) => s.date >= from && s.date <= today).map((s) => s.date)).size;
  }

  return { STRETCHES, ROUTINES, PREP, SWITCH, stretchSec, totalSec, minutes, segments, cooldownFor, stretchDays };
});

// ---------- Player and Workout-tab card (browser only) ----------
if (typeof window !== "undefined") window.StretchUI = function (app) {
  const X = window.Stretch, { S, store, esc, flash, uid, today } = app;
  const secOut = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
  const head = (title) => `<div class="row spread"><h2>${title}</h2><button class="x" type="button" data-close aria-label="Close">×</button></div>`;
  const R = 104, CIRC = 2 * Math.PI * R;
  let play = null, audio = null, wake = null, timer = null;

  const el = document.createElement("div");
  el.className = "restfull stretchfull"; el.hidden = true; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Stretch");
  document.body.append(el);

  function tone(freqs) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      freqs.forEach(([at, f]) => {
        const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + at;
        o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        o.start(t); o.stop(t + 0.4);
      });
    } catch (e) {}
  }
  const chimeStart = () => tone([[0, 660], [0.18, 990]]);
  const chimeEnd = () => tone([[0, 880], [0.2, 660]]);
  async function keepAwake() { try { if (navigator.wakeLock && !wake) { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null)); } } catch (e) {} }
  document.addEventListener("visibilitychange", () => { if (play && document.visibilityState === "visible") { keepAwake(); tick(); } });

  function start(name, ids, kind) {
    const segs = X.segments(ids);
    if (!segs.length) return;
    app.closeSheet();
    tone([]); // unlock audio during the tap
    play = { name, ids, kind, segs, i: 0, end: Date.now() + segs[0].sec * 1000, paused: null, held: 0, startedAt: Date.now() };
    keepAwake();
    el.hidden = false; document.body.style.overflow = "hidden";
    draw(); clearInterval(timer); timer = setInterval(tick, 250);
  }
  function go(i, now = Date.now()) {
    const p = play;
    if (i >= p.segs.length) return done(true);
    p.i = Math.max(0, i);
    p.end = now + p.segs[p.i].sec * 1000;
    if (p.paused != null) p.paused = p.segs[p.i].sec * 1000;
    draw();
  }
  function tick() {
    if (!play || play.paused != null) return;
    const now = Date.now();
    // Catch up if the phone was locked: walk through every segment that has ended.
    let moved = false;
    while (play && now >= play.end) {
      const seg = play.segs[play.i];
      if (seg.kind === "hold") play.held += seg.sec;
      const next = play.segs[play.i + 1];
      if (!next) { done(true); return; }
      play.i++; play.end += next.sec * 1000; moved = true;
    }
    if (!moved) { update(); return; }
    const cur = play.segs[play.i];
    if (document.visibilityState === "visible") {
      if (cur.kind === "hold") chimeStart(); else chimeEnd();
      if (navigator.vibrate) navigator.vibrate(cur.kind === "hold" ? 120 : [80, 80, 80]);
    }
    draw();
  }
  function left() { return Math.max(0, Math.ceil(((play.paused != null ? play.paused : play.end - Date.now())) / 1000)); }
  function update() {
    const seg = play.segs[play.i], l = left();
    const frac = Math.max(0, Math.min(1, (play.paused != null ? play.paused : play.end - Date.now()) / 1000 / seg.sec));
    const t = el.querySelector("#sf-left"); if (t) t.textContent = seg.kind === "prep" ? String(l) : secOut(l);
    const arc = el.querySelector("#sf-arc"); if (arc) arc.setAttribute("stroke-dashoffset", String(CIRC * (1 - frac)));
  }
  function draw() {
    const p = play, seg = p.segs[p.i], s = X.STRETCHES[seg.id];
    const stretchNo = p.ids.indexOf(seg.id) + 1;
    const nextHold = p.segs.slice(p.i + 1).find((x) => x.kind === "hold" && x.id !== seg.id);
    const label = seg.kind === "prep" ? (seg.switching ? "Switch to right side" : seg.side ? "Get ready · left side" : "Get into position") : seg.side || "Hold";
    el.innerHTML = `<div class="rf-top"><button type="button" class="rf-min" data-sf="close" aria-label="Stop stretching"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button><span>${esc(p.name)} · ${stretchNo} of ${p.ids.length}</span><span style="width:40px"></span></div>
      <div class="sf-body">
        <h2 class="sf-name">${esc(s.name)}</h2>
        <div class="rf-ring ${seg.kind === "prep" ? "prep" : ""}"><svg viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="${R}" class="rf-bg"/><circle cx="120" cy="120" r="${R}" class="rf-fg" id="sf-arc" stroke-dasharray="${CIRC}" stroke-dashoffset="0" transform="rotate(-90 120 120)"/></svg>
          <div class="rf-mid"><strong id="sf-left"></strong><span>${esc(label)}</span></div></div>
        <p class="sf-how">${esc(s.how)}</p>
      </div>
      <p class="rf-next">${nextHold ? `Up next: ${esc(X.STRETCHES[nextHold.id].name)}` : "Last one"}</p>
      <div class="rf-btns sf-btns"><button type="button" data-sf="back" aria-label="Previous">‹ Back</button><button type="button" data-sf="pause">${p.paused != null ? "Resume" : "Pause"}</button><button type="button" data-sf="skip" aria-label="Skip">Skip ›</button></div>`;
    update();
  }
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sf]"); if (!b || !play) return;
    const a = b.dataset.sf, now = Date.now();
    if (a === "close") { done(false); return; }
    if (a === "pause") {
      if (play.paused != null) { play.end = now + play.paused; play.paused = null; } else play.paused = Math.max(0, play.end - now);
      draw(); return;
    }
    // Back and skip move a whole stretch, not just a side or a countdown.
    const cur = play.segs[play.i];
    if (a === "skip") {
      if (cur.kind === "hold") play.held += Math.round(cur.sec - Math.max(0, (play.paused != null ? play.paused : play.end - now)) / 1000);
      let j = play.i + 1; while (j < play.segs.length && play.segs[j].id === cur.id) j++;
      go(j, now);
    } else {
      // Restart this stretch, or go to the previous one if it has only just begun.
      let j = play.i; while (j > 0 && play.segs[j - 1].id === cur.id) j--;
      if (play.i === j && j > 0) { j--; while (j > 0 && play.segs[j - 1].id === play.segs[j].id) j--; }
      go(j, now);
    }
  });
  function done(finished) {
    const p = play; if (!p) return;
    play = null; clearInterval(timer); el.hidden = true; document.body.style.overflow = "";
    if (wake) { wake.release().catch(() => {}); wake = null; }
    const heldMin = Math.round(p.held / 60);
    // Count it if you held stretches for at least two minutes.
    if (p.held >= 120) {
      const s = { id: "st-" + uid(), date: today(), start: p.startedAt, end: Date.now(), name: p.name, kind: p.kind, mins: Math.max(1, Math.round((Date.now() - p.startedAt) / 60000)), stretches: p.ids.length };
      store.stretch(s);
      app.render();
      if (finished) { chimeEnd(); flash(`Stretch done · ${s.mins} min. ${X.stretchDays(S.stretches, today())} stretch day${X.stretchDays(S.stretches, today()) === 1 ? "" : "s"} this week.`, "good"); }
      else flash(`Saved ${heldMin || 2} min of stretching.`, "good");
    } else if (!finished) app.render();
  }

  // ---------- Workout tab ----------
  const lastWorkoutToday = () => Object.values(S.workouts).filter((w) => w.date === today()).sort((a, b) => b.end - a.end)[0] || null;
  const stretchedSince = (t) => Object.values(S.stretches || {}).some((s) => s.start >= t);
  function cooldownIds(w) { return X.cooldownFor(w.exercises.map((e) => app.exDef(e.exId))); }
  function preview(name, ids, kind) {
    app.sheet(head(esc(name)) + `<p class="small muted" style="margin:0">${ids.length} stretches · about ${X.minutes(ids)} min. The timer runs everything for you, with a chime when to hold and when to move on.</p>
      <div class="results" style="max-height:48vh">${ids.map((id) => { const s = X.STRETCHES[id]; return `<div class="rt-row"><div class="row spread" style="flex-wrap:nowrap"><strong style="font-weight:600">${esc(s.name)}</strong><span class="small muted num" style="white-space:nowrap">${s.sec}s${s.sides ? " each side" : ""}</span></div><span class="small muted">${esc(s.how)}</span></div>`; }).join("")}</div>
      <button class="btn wide" type="button" id="st-go">Start · ${X.minutes(ids)} min</button>`, (sh) => {
      sh.querySelector("#st-go").onclick = () => start(name, ids, kind);
    });
  }
  function card() {
    const w = lastWorkoutToday();
    const cool = w && !stretchedSince(w.end || w.start) ? cooldownIds(w) : null;
    const days = X.stretchDays(S.stretches, today());
    const row = (id, name, sub, mins, primary) => `<div class="entry" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="nm">${esc(name)}</div><div class="sub">${esc(sub)} · ${mins} min</div></div><button class="btn small ${primary ? "" : "ghost"}" type="button" data-stopen="${id}">Start</button></div>`;
    return `<section class="card">
      <div class="row spread"><h2>Stretch</h2><span class="small muted">${days ? `${days} day${days > 1 ? "s" : ""} this week` : "Follow along, hands-free"}</span></div>
      ${cool ? row("cool", "Cool-down", `For today's ${w.name}`, X.minutes(cool), true) : ""}
      ${X.ROUTINES.map((r) => row(r.id, r.name, r.blurb, X.minutes(r.ids), false)).join("")}
    </section>`;
  }
  function bind() {
    document.querySelectorAll("[data-stopen]").forEach((b) => (b.onclick = () => {
      const id = b.dataset.stopen;
      if (id === "cool") { const w = lastWorkoutToday(); preview(`Cool-down`, cooldownIds(w), "cool"); return; }
      const r = X.ROUTINES.find((x) => x.id === id); preview(r.name, r.ids, r.id);
    }));
  }
  return {
    card, bind, preview,
    startCooldown(w) { const ids = cooldownIds(w); start("Cool-down", ids, "cool"); },
    cooldownMinutes(w) { return X.minutes(cooldownIds(w)); },
    // For Today: a nudge after training if you haven't stretched yet.
    pendingCooldown() { const w = lastWorkoutToday(); return w && !stretchedSince(w.end || w.start) ? { w, mins: X.minutes(cooldownIds(w)) } : null; },
    datesIn(y, m) { const pre = `${y}-${String(m + 1).padStart(2, "0")}-`; return new Set(Object.values(S.stretches || {}).filter((s) => s.date.startsWith(pre)).map((s) => Number(s.date.slice(8)))); },
    active: () => !!play,
  };
};
