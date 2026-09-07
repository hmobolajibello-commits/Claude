"use strict";
/* Fisch Field Guide — shared client script for the static site.
   Every page loads this; each block no-ops unless its DOM hooks are present.
   window.BASE is the relative prefix back to the site root for this page, and
   generated HTML carries a {{B}} token wherever a path prefix belongs.       */

var B = window.BASE || "";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var fix = function (h) { return String(h).split("{{B}}").join(B); };
var commas = function (n) { return Math.round(n).toLocaleString("en-US"); };
var cash = function (n) { return commas(n) + " C$"; };
var strip = function (h) { return String(h).replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " "); };
var store = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ── theme ───────────────────────────────────────────────────────────── */
(function () {
  var btn = $("#themebtn"); if (!btn) return;
  var modes = ["system", "light", "dark"], labels = {system: "Theme: auto", light: "Theme: light", dark: "Theme: dark"};
  var mode = store.get("fisch.theme", "system");
  function apply() {
    if (mode === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", mode);
    btn.textContent = labels[mode]; store.set("fisch.theme", mode);
  }
  btn.addEventListener("click", function () { mode = modes[(modes.indexOf(mode) + 1) % 3]; apply(); });
  apply();
})();

/* ── search ──────────────────────────────────────────────────────────── */
(function () {
  var box = $("#search"), out = $("#results"), IDX = window.SEARCH_INDEX;
  if (!box || !out || !IDX) return;
  var hits = [], cur = -1;
  function run() {
    var q = box.value.trim().toLowerCase();
    if (!q) { out.hidden = true; return; }
    hits = IDX.map(function (r) {
      var n = strip(r.n).toLowerCase(), s = -1;
      if (n === q) s = 0; else if (n.indexOf(q) === 0) s = 1; else if (n.indexOf(q) > 0) s = 2; else if (r.h.indexOf(q) >= 0) s = 3;
      return s < 0 ? null : {r: r, s: s};
    }).filter(Boolean).sort(function (a, b) { return a.s - b.s || strip(a.r.n).length - strip(b.r.n).length; })
      .slice(0, 12).map(function (x) { return x.r; });
    cur = -1;
    out.innerHTML = hits.length
      ? hits.map(function (r) { return '<a href="' + B + r.u + '"><span class="rn">' + r.n + '</span><span class="rt">' + r.t + "</span></a>"; }).join("")
      : '<div class="none">No page matches &ldquo;' + strip(box.value) + "&rdquo;.</div>";
    out.hidden = false;
  }
  function mark() { $$("a", out).forEach(function (a, i) { a.classList.toggle("sel", i === cur); }); }
  box.addEventListener("input", run);
  box.addEventListener("focus", function () { if (box.value.trim()) run(); });
  box.addEventListener("blur", function () { setTimeout(function () { out.hidden = true; }, 160); });
  box.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") { box.value = ""; out.hidden = true; box.blur(); }
    else if (ev.key === "ArrowDown" && hits.length) { ev.preventDefault(); cur = (cur + 1) % hits.length; mark(); }
    else if (ev.key === "ArrowUp" && hits.length) { ev.preventDefault(); cur = (cur - 1 + hits.length) % hits.length; mark(); }
    else if (ev.key === "Enter" && hits.length) { ev.preventDefault(); location.href = B + hits[cur < 0 ? 0 : cur].u; }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "/" && document.activeElement !== box && !/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      ev.preventDefault(); box.focus();
    }
  });
  var rnd = $("#randbtn");
  if (rnd) rnd.addEventListener("click", function () {
    var pool = IDX.filter(function (r) { return r.t !== "Index" && r.t !== "Guide" && r.t !== "Tool"; });
    location.href = B + pool[Math.floor(Math.random() * pool.length)].u;
  });
})();

/* ── sortable / filterable index tables ──────────────────────────────── */
(function () {
  var tbl = $("table.sortable"); if (!tbl) return;
  var tbody = tbl.tBodies[0], rows = $$("tr", tbody), state = {i: -1, dir: 1}, filter = "";
  function num(td) { var v = parseFloat(strip(td.innerHTML).replace(/,/g, "")); return isNaN(v) ? null : v; }
  function draw() {
    rows.forEach(function (r) { r.hidden = !!filter && r.dataset.facet !== filter; });
    if (state.i >= 0) {
      var vis = rows.slice().sort(function (a, b) {
        var av = a.cells[state.i], bv = b.cells[state.i];
        var an = num(av), bn = num(bv);
        var c = (an !== null && bn !== null) ? an - bn : strip(av.innerHTML).trim().localeCompare(strip(bv.innerHTML).trim());
        return c * state.dir;
      });
      vis.forEach(function (r) { tbody.appendChild(r); });
    }
  }
  $$("th.s", tbl).forEach(function (th) {
    th.addEventListener("click", function () {
      var i = +th.dataset.i;
      state.dir = (state.i === i) ? -state.dir : 1; state.i = i;
      $$("th.s", tbl).forEach(function (x) { x.classList.remove("asc", "desc"); });
      th.classList.add(state.dir > 0 ? "asc" : "desc");
      draw();
    });
  });
  $$(".fbtn").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".fbtn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on"); filter = b.dataset.f; draw();
    });
  });
})();

/* ── codes: copy buttons ─────────────────────────────────────────────── */
$$(".copy").forEach(function (b) {
  b.addEventListener("click", function () {
    navigator.clipboard.writeText(b.dataset.c).then(function () {
      b.textContent = "Copied"; b.classList.add("ok");
      setTimeout(function () { b.textContent = "Copy"; b.classList.remove("ok"); }, 1400);
    }).catch(function () { b.textContent = "Select it"; });
  });
});

/* ── roadmap checklist ───────────────────────────────────────────────── */
(function () {
  var line = $("#pcount"); if (!line || !window.MILESTONES) return;
  var KEY = "fisch.progress.v1", done = store.get(KEY, {});
  var total = window.MILESTONES.length;
  function paint() {
    var n = window.MILESTONES.filter(function (m) { return done[m.id]; }).length;
    line.textContent = n + " / " + total + " done";
    $("#pfill").style.width = (n / total * 100) + "%";
  }
  $$(".task").forEach(function (li) {
    li.innerHTML = fix(li.innerHTML);
    var k = li.dataset.k;
    if (done[k]) { li.classList.add("done"); $("input", li).checked = true; }
    li.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") return;
      done[k] = !done[k]; store.set(KEY, done);
      li.classList.toggle("done", !!done[k]); $("input", li).checked = !!done[k];
      paint();
    });
  });
  $("#reset").addEventListener("click", function () {
    done = {}; store.set(KEY, done);
    $$(".task").forEach(function (li) { li.classList.remove("done"); $("input", li).checked = false; });
    paint();
  });
  paint();
})();

/* ── the path planner ────────────────────────────────────────────────── */
(function () {
  var root = $("#p-out"); if (!root || !window.MILESTONES) return;
  var RODS = window.RODS, MS = window.MILESTONES, PHASES = window.PHASES, FARMS = window.FARMS;
  var ORD = {}; RODS.forEach(function (r, i) { ORD[r.id] = i; });
  var FLAGS = [
    ["boat", "I own a boat"],
    ["altar", "Keepers Altar unlocked (the 400 C$ bribe)"],
    ["easybest", "Moosewood / Roslit / Terrapin / Ocean bestiary filled"],
    ["enchanted", "My rod carries an enchant"],
    ["best70", "Total bestiary is at 70% or more"],
    ["vertigo", "Vertigo bestiary is at 100%"],
    ["depths", "I have The Depths Key"],
    ["exalted", "I&#8217;ve landed an exalted enchant"],
    ["moneymeta", "I&#8217;m farming Castaway Cliffs or the Calm Zone"]
  ];
  var GOALS = {
    route: ["Just progress", "Following the main route is the fastest way to everything else, so this is the right default."],
    money: ["Make money", "Money is location-first. The fastest raise available to you is almost always moving to a better farm, not buying a better rod &mdash; and the rod you are saving for gets cheaper in hours once you do."],
    level: ["Level up", "Levels come from stacking multipliers, not from fishing longer. Before another session, get the friend bonus (+10% each, up to +50%), an XP potion and a shell on."],
    dex: ["Fill the bestiary", "Percentage is percentage: finish whole easy locations before chasing hard species. And a stuck bestiary is usually a <em>condition</em> problem &mdash; buy the totem for the weather the fish wants rather than waiting for it."],
    gear: ["Chase endgame gear", "Endgame gear is gated by bestiary work and level far more than by C$. If a milestone below is blocked on level or on Vertigo, no amount of farming moves it."]
  };
  var HOURLY = function (s) { return s <= 1 ? 5000 : s <= 3 ? 250000 : s <= 5 ? 400000 : s <= 7 ? 1500000 : 3000000; };
  var xpBetween = function (a, b) { a = Math.max(1, a); return b <= a ? 0 : 190 * ((b - 1) * b / 2 - (a - 1) * a / 2); };

  var KEY = "fisch.planner.v2";
  var DEF = {lvl: 25, rod: "carbon-rod", cash: 5000, goal: "route", f: {}};
  var S = store.get(KEY, null) || JSON.parse(JSON.stringify(DEF));
  if (!S.f) S.f = {};

  $("#p-rod").innerHTML = RODS.map(function (r) {
    return '<option value="' + r.id + '"' + (S.rod === r.id ? " selected" : "") + ">" + r.n + "</option>";
  }).join("");
  $("#p-goal").innerHTML = Object.keys(GOALS).map(function (k) {
    return '<option value="' + k + '"' + (S.goal === k ? " selected" : "") + ">" + GOALS[k][0] + "</option>";
  }).join("");
  $("#p-flags").innerHTML = FLAGS.map(function (f) {
    return '<label><input type="checkbox" data-f="' + f[0] + '"' + (S.f[f[0]] ? " checked" : "") + "> " + f[1] + "</label>";
  }).join("");
  $("#p-lvl").value = S.lvl; $("#p-cash").value = S.cash;

  function read() {
    S.lvl = Math.max(1, +$("#p-lvl").value || 1);
    S.rod = $("#p-rod").value;
    S.cash = Math.max(0, +$("#p-cash").value || 0);
    S.goal = $("#p-goal").value;
    $$("#p-flags input").forEach(function (c) { S.f[c.dataset.f] = c.checked; });
    store.set(KEY, S);
    /* some flags are proved by the rod you carry: you cannot own a Steady Rod
       without having sailed, or a Rod of the Depths without clearing Vertigo */
    var ord = ORD[S.rod] === undefined ? 0 : ORD[S.rod];
    var f = {}; Object.keys(S.f).forEach(function (k) { f[k] = S.f[k]; });
    if (ord >= ORD["steady-rod"]) f.boat = true;
    if (ord >= ORD["destiny-rod"]) f.best70 = true;
    if (ord >= ORD["rod-of-the-depths"]) { f.vertigo = true; f.depths = true; }
    return {lvl: S.lvl, ord: ord, cash: S.cash, f: f};
  }

  function plan() {
    var s = read(), rod = RODS[s.ord], stage = rod.stage;
    var doneL = MS.filter(function (m) { return m.done(s); });
    var todo = MS.filter(function (m) { return !m.done(s); });
    var next = todo.slice(0, 5);
    var phIdx = doneL.length ? Math.max.apply(null, doneL.map(function (m) { return m.ph; })) : (next.length ? next[0].ph : 0);
    var phase = PHASES[phIdx], farm = FARMS[stage], rate = HOURLY(stage);

    var where = '<div class="youare"><span>You are here</span><b>' + phase.n + "</b><p>"
      + "Level <strong>" + commas(s.lvl) + '</strong>, carrying the <a href="' + B + rod.u + '">' + rod.n
      + "</a> (stage " + stage + " &mdash; " + window.STAGES[stage] + "), with <strong>" + cash(s.cash) + "</strong> banked. "
      + doneL.length + " of " + MS.length + " milestones behind you."
      + (next.length ? " Next up: <strong>" + strip(next[0].t) + "</strong>."
                     : " You have cleared the whole route &mdash; from here it is mutations, enchants and money.")
      + "</p><div class=\"gapgrid\">"
      + '<div class="gap"><b>' + commas(190 * s.lvl) + "</b><small>XP to your next level</small></div>"
      + '<div class="gap"><b>' + (s.lvl >= 180 ? "cleared" : commas(180 - s.lvl)) + "</b><small>levels to the Atlantis gate</small></div>"
      + '<div class="gap"><b>' + cash(rate) + "</b><small>roughly earnable per hour now</small></div>"
      + '<div class="gap"><b>' + doneL.length + " / " + MS.length + "</b><small>route milestones done</small></div></div></div>";

    var steps = next.map(function (m, i) {
      var shortCash = m.cost ? Math.max(0, m.cost - s.cash) : 0;
      var shortLvl = m.lvl ? Math.max(0, m.lvl - s.lvl) : 0;
      var blocked = shortCash > 0 || shortLvl > 0, extra = "";
      if (shortCash > 0) {
        extra += "<p><strong>You are " + cash(shortCash) + " short.</strong> At your stage that is roughly <strong>"
          + (shortCash / rate < 1 ? "under an hour" : (shortCash / rate).toFixed(1) + " hours")
          + '</strong> at <a href="' + fix(farm.u) + '">' + farm.n + "</a> (" + farm.r + ").</p>";
      }
      if (shortLvl > 0) {
        extra += "<p><strong>You are " + shortLvl + " levels short</strong> &mdash; " + commas(xpBetween(s.lvl, m.lvl))
          + " XP. Stack your XP bonuses before grinding it.</p>";
      }
      return '<div class="stepcard' + (blocked ? " block" : "") + '"><div class="n">' + (i + 1) + "</div><div>"
        + "<h4>" + m.t + "</h4><p>" + fix(m.body) + "</p>" + extra
        + '<div class="meta">' + (m.ph < phIdx ? '<span style="color:var(--violet);border-color:var(--violet)">Skipped &mdash; catch-up</span>' : "")
        + (m.cost ? "<span>" + cash(m.cost) + "</span>" : "<span>No cost</span>")
        + (m.lvl ? "<span>Level " + m.lvl + "</span>" : "")
        + "<span>" + fix(m.where) + "</span>"
        + (blocked ? '<span style="color:var(--warn);border-color:var(--warn)">Blocked</span>'
                   : '<span style="color:var(--good);border-color:var(--good)">Do it now</span>')
        + "</div></div></div>";
    }).join("");

    var warn = [];
    if (s.lvl >= 60 && stage <= 1) warn.push("You are level " + s.lvl + " on a stage-" + stage + " rod. The rod is your bottleneck, not your level &mdash; the free Fungal Rod from Agaric costs nothing and would fix most of it today.");
    if (s.cash >= 200000 && stage <= 3) warn.push("You are sitting on " + cash(s.cash) + " with a stage-" + stage + " rod. Money that is not spent is not doing anything &mdash; the Trident Rod at 150,000 C$ starts paying itself back the moment you buy it.");
    if (!s.f.altar && s.lvl > 30) warn.push("The Keepers Altar is still closed. It is a one-time <strong>400 C$</strong> bribe, it gates every enchant in the game, and the King&#8217;s Rod is sitting down there next to a skeleton.");
    if (!s.f.boat && s.lvl > 10) warn.push("Still no boat. The Rowboat is 400 C$ and it is the difference between one island and the whole map.");
    if (s.f.vertigo && !s.f.depths) warn.push("Vertigo is done but you have no key &mdash; go fish the <strong>Strange Whirlpool</strong>. That is the only thing between you and a 750,000 C$ rod shop.");
    if (stage >= 6 && !s.f.enchanted) warn.push("An endgame rod with no enchant is leaving a quarter of its value on the table. Go farm relics at Ancient Isle.");

    var goal = GOALS[S.goal];
    root.innerHTML = where
      + '<h2 class="sh">Do these next</h2>'
      + (steps ? '<div class="steps">' + steps + "</div>"
               : '<div class="goodbox">Nothing left on the route. Pick a farm from the money guide and start chasing mutations and exalted enchants instead.</div>')
      + '<div class="goodbox"><strong>Because you picked &ldquo;' + goal[0] + '&rdquo;:</strong> ' + goal[1] + "</div>"
      + (warn.length ? '<h2 class="sh">Worth fixing</h2>' + warn.map(function (w) { return '<div class="warnbox">' + w + "</div>"; }).join("") : "")
      + (doneL.length ? '<h2 class="sh">Already behind you</h2><div class="tablewrap"><table><tbody>'
          + doneL.map(function (m) { return '<tr><td style="width:1%;color:var(--good)">&#10003;</td><td><strong>' + m.t + "</strong></td><td>" + fix(m.where) + "</td></tr>"; }).join("")
          + "</tbody></table></div>" : "")
      + '<p class="note">The planner reads what you tell it, so tell it the truth &mdash; especially the checkboxes. Costs are the community figures from this wiki and hourly rates are rough; use them to sequence decisions, not to budget an evening precisely.</p>';
  }
  ["#p-lvl", "#p-rod", "#p-cash", "#p-goal"].forEach(function (sel) {
    $(sel).addEventListener("input", plan); $(sel).addEventListener("change", plan);
  });
  $$("#p-flags input").forEach(function (c) { c.addEventListener("change", plan); });
  $("#p-reset").addEventListener("click", function () {
    S = JSON.parse(JSON.stringify(DEF)); store.set(KEY, S);
    $("#p-lvl").value = S.lvl; $("#p-cash").value = S.cash; $("#p-rod").value = S.rod; $("#p-goal").value = S.goal;
    $$("#p-flags input").forEach(function (c) { c.checked = false; });
    plan();
  });
  plan();
})();

/* ── rod budget planner ──────────────────────────────────────────────── */
(function () {
  var out = $("#b-out"); if (!out || !window.RODS) return;
  var HOURLY = function (s) { return s <= 1 ? 5000 : s <= 3 ? 250000 : s <= 5 ? 400000 : s <= 7 ? 1500000 : 3000000; };
  $("#b-stage").innerHTML = [[1, "Moosewood / Roslit Bay"], [3, "Forsaken Shores"], [5, "Forsaken Shores, with a mid-game rod"],
    [7, "The Calm Zone"], [8, "Castaway Cliffs"]].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === 3 ? " selected" : "") + ">" + o[1] + "</option>";
    }).join("");
  function draw() {
    var c = Math.max(0, +$("#b-cash").value || 0), st = +$("#b-stage").value, rate = HOURLY(st);
    var priced = window.RODS.filter(function (r) { return r.cost; }).sort(function (a, b) { return a.cost - b.cost; });
    var afford = priced.filter(function (r) { return r.cost <= c; });
    var later = priced.filter(function (r) { return r.cost > c; });
    var hrs = function (gap) { return gap / rate < 1 ? "under an hour" : (gap / rate).toFixed(1) + " hrs"; };
    out.innerHTML = '<div class="readout"><div class="ro"><b>' + afford.length + "</b><small>rods you can buy now</small></div>"
      + '<div class="ro"><b>' + cash(rate) + "</b><small>roughly per hour</small></div>"
      + '<div class="ro"><b>' + (later.length ? hrs(later[0].cost - c) : "&mdash;") + "</b><small>to the next one up</small></div></div>"
      + '<div class="tablewrap"><table><thead><tr><th>Rod</th><th>Price</th><th>Where</th><th>Status</th></tr></thead><tbody>'
      + priced.map(function (r) {
          var ok = r.cost <= c, gap = r.cost - c;
          return '<tr><td><a href="' + B + r.u + '">' + r.n + '</a></td><td class="num">' + commas(r.cost) + "</td><td>" + fix(r.src) + "</td><td>"
            + (ok ? '<span style="color:var(--good)">Affordable now</span>'
                  : '<span style="color:var(--warn)">' + commas(gap) + " C$ short &mdash; " + hrs(gap) + "</span>") + "</td></tr>";
        }).join("") + "</tbody></table></div>";
  }
  ["#b-cash", "#b-stage"].forEach(function (s) { $(s).addEventListener("input", draw); $(s).addEventListener("change", draw); });
  draw();
})();

/* ── drop & catch odds ───────────────────────────────────────────────── */
(function () {
  var out = $("#o-out"); if (!out) return;
  var T = [
    {n: "Ethereal Prism Rod &mdash; Prismize proc", p: 0.50, note: "A published rod passive, and the strongest one in the game: half your catches at 8&times; value."},
    {n: "Trident Rod &mdash; Atlantean proc", p: 0.30, note: "A published rod passive, so this rate is about as solid as Fisch rates get."},
    {n: "Quantum enchant &mdash; Subspace mutation", p: 0.25, note: "25% per catch, per the exalted enchant&#8217;s description."},
    {n: "Volcanic Rod &mdash; Ashen Fortune proc", p: 0.20, note: "20% for a 5&times; multiplier &mdash; compare it with the Trident Rod&#8217;s 30% at 3&times;."},
    {n: "Midas Rod &mdash; Golden catch", p: 0.60, note: "Roughly 60% for double value."},
    {n: "Fungal Rod &mdash; luck window", p: 0.60, note: "Roughly 60% after each catch, for about 45 seconds."},
    {n: "A 5% drop", p: 0.05, note: "Use this shape for anything a guide calls &ldquo;uncommon&rdquo;."},
    {n: "A 1% drop", p: 0.01, note: "The shape most relic and key grinds feel like."},
    {n: "A 0.1% drop", p: 0.001, note: "Secret-tier territory. Bring a podcast."}
  ];
  $("#o-t").innerHTML = T.map(function (t, i) { return '<option value="' + i + '">' + t.n + " &mdash; " + (t.p * 100) + "%</option>"; })
    .join("") + '<option value="-1">Custom&hellip;</option>';
  var att = function (p, conf) { return Math.ceil(Math.log(1 - conf) / Math.log(1 - p)); };
  function chart(p, n) {
    var w = 620, h = 150, pad = 26, max = Math.max(n, att(p, 0.97)), d = "", g = "";
    for (var i = 0; i <= 100; i++) {
      var x = pad + (w - pad - 8) * i / 100, y = h - 18 - (h - 34) * (1 - Math.pow(1 - p, max * i / 100));
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    [0, .25, .5, .75, 1].forEach(function (v) {
      var y = h - 18 - (h - 34) * v;
      g += '<line x1="' + pad + '" y1="' + y + '" x2="' + (w - 8) + '" y2="' + y + '" stroke="var(--line2)"/>'
        + '<text x="2" y="' + (y + 3) + '" font-size="9" fill="var(--muted)" font-family="monospace">' + (v * 100) + "%</text>";
    });
    var cx = pad + (w - pad - 8) * Math.min(1, n / max), cy = h - 18 - (h - 34) * (1 - Math.pow(1 - p, n));
    $("#o-chart").innerHTML = g + '<path d="' + d + '" fill="none" stroke="var(--teal)" stroke-width="2"/>'
      + '<line x1="' + cx + '" y1="16" x2="' + cx + '" y2="' + (h - 18) + '" stroke="var(--gold)" stroke-dasharray="3 3"/>'
      + '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="var(--gold)"/>'
      + '<text x="' + (w - 8) + '" y="' + (h - 5) + '" font-size="9" fill="var(--muted)" text-anchor="end" font-family="monospace">' + max + " attempts</text>";
  }
  function odds() {
    var p = Math.min(0.999, Math.max(0.00001, (+$("#o-p").value || 1) / 100)), n = Math.max(1, +$("#o-n").value || 1);
    var cum = 1 - Math.pow(1 - p, n);
    out.innerHTML = '<div class="ro"><b>' + (cum * 100).toFixed(1) + "%</b><small>chance in " + commas(n) + " attempts</small></div>"
      + '<div class="ro"><b>' + commas(att(p, 0.5)) + "</b><small>coin-toss point</small></div>"
      + '<div class="ro"><b>' + commas(att(p, 0.95)) + "</b><small>for 95% confidence</small></div>"
      + '<div class="ro"><b>' + commas(1 / p) + "</b><small>attempts per success, on average</small></div>";
    chart(p, n);
  }
  $("#o-t").addEventListener("change", function () {
    var i = +$("#o-t").value;
    if (i >= 0) { $("#o-p").value = T[i].p * 100; $("#o-note").innerHTML = T[i].note; }
    else $("#o-note").innerHTML = "Custom rate &mdash; whatever you believe the drop is. If a guide gives you a number, remember it is a community estimate too.";
    odds();
  });
  ["#o-p", "#o-n"].forEach(function (s) {
    $(s).addEventListener("input", function () { $("#o-slide").value = Math.min(200, +$("#o-n").value || 1); odds(); });
  });
  $("#o-slide").addEventListener("input", function () { $("#o-n").value = $("#o-slide").value; odds(); });
  $("#o-note").innerHTML = T[0].note; $("#o-p").value = 50; odds();
})();

/* ── fish value calculator ───────────────────────────────────────────── */
(function () {
  var out = $("#v-out"); if (!out || !window.MUTS) return;
  $("#v-mut").innerHTML = '<option value="1">None</option>'
    + window.MUTS.map(function (m) { return '<option value="' + m.v + '">' + m.n + " &mdash; " + m.v + "&times;</option>"; }).join("");
  $("#v-weight").innerHTML = [[0.7, "Small (0.7&times;)"], [1, "Average (1&times;)"], [1.4, "Big (1.4&times;)"], [2, "Huge (2&times;)"]]
    .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === 1 ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
  function calc() {
    var base = Math.max(1, +$("#v-base").value || 1), mut = +$("#v-mut").value, wt = +$("#v-weight").value, ov = +$("#v-overlord").value;
    var sh = $("#v-shiny").checked ? 1.85 : 1, sp = $("#v-spark").checked ? 1.85 : 1;
    var total = base * wt * ov * mut * sh * sp;
    var rows = [["Plain sale value", cash(base)], ["Weight", "&times;" + wt]];
    if (ov > 1) rows.push(["Sea Overlord", "&times;" + ov]);
    if (mut > 1) rows.push([$("#v-mut").selectedOptions[0].textContent.split(" —")[0], "&times;" + mut]);
    if (sh > 1) rows.push(["Shiny", "&times;1.85"]);
    if (sp > 1) rows.push(["Sparkling", "&times;1.85"]);
    out.innerHTML = '<div class="ro"><b>' + cash(total) + "</b><small>estimated sale</small></div>"
      + '<div class="ro"><b>&times;' + (total / base).toFixed(2) + "</b><small>total multiplier</small></div>"
      + '<div class="ro"><b>' + cash(total - base) + "</b><small>added by the stack</small></div>";
    $("#v-stack").innerHTML = rows.map(function (r) { return '<div class="stackrow"><span>' + r[0] + '</span><span class="amt">' + r[1] + "</span></div>"; }).join("")
      + '<div class="stackrow total"><span>Estimated sale</span><span class="amt">' + cash(total) + "</span></div>";
  }
  ["#v-base", "#v-mut", "#v-weight", "#v-overlord", "#v-shiny", "#v-spark"].forEach(function (s) {
    $(s).addEventListener("input", calc); $(s).addEventListener("change", calc);
  });
  calc();
})();

/* ── XP calculator (on the XP guide) ─────────────────────────────────── */
(function () {
  var host = $("#xp-tool"); if (!host) return;
  host.innerHTML = '<div class="tool"><div class="controls">'
    + '<div class="field"><label for="x-from">Current level</label><input id="x-from" type="number" min="1" max="2000" value="50"></div>'
    + '<div class="field"><label for="x-to">Target level</label><input id="x-to" type="number" min="2" max="2000" value="180"></div>'
    + '<div class="field"><label for="x-per">XP per catch</label><input id="x-per" type="number" min="1" value="400"></div>'
    + '<div class="field"><label for="x-mult">XP stack</label><select id="x-mult">'
    + '<option value="1">No bonuses</option><option value="1.45">Potion +20% &amp; Shell +25%</option>'
    + '<option value="1.95">Those, plus 5 friends (+50%)</option><option value="2.9" selected>All of the above, doubled (gamepass)</option>'
    + '<option value="8.7">Stacked, in a 3&times; night-multiplier spot</option></select></div></div>'
    + '<div class="readout" id="x-out"></div>'
    + '<p class="note">XP to go from level L to L+1 is 190 &times; L, so the total between two levels is 190 &times; the sum of the levels in between. Past level 1001 the cost is reported to double every 500 levels &mdash; this calculator does not model that, so treat targets above 1000 as a floor.</p></div>';
  var between = function (a, b) { a = Math.max(1, a); return b <= a ? 0 : 190 * ((b - 1) * b / 2 - (a - 1) * a / 2); };
  function calc() {
    var a = Math.max(1, +$("#x-from").value || 1), b = Math.max(a + 1, +$("#x-to").value || a + 1);
    var per = Math.max(1, +$("#x-per").value || 1), m = +$("#x-mult").value;
    var need = between(a, b), eff = per * m;
    $("#x-out").innerHTML = '<div class="ro"><b>' + commas(190 * a) + "</b><small>XP for your next level</small></div>"
      + '<div class="ro"><b>' + commas(need) + "</b><small>XP from " + a + " to " + b + "</small></div>"
      + '<div class="ro"><b>' + commas(eff) + "</b><small>XP per catch, stacked</small></div>"
      + '<div class="ro"><b>' + commas(need / eff) + "</b><small>catches needed</small></div>"
      + '<div class="ro"><b>' + commas(need / per) + "</b><small>catches with no stack at all</small></div>";
  }
  ["#x-from", "#x-to", "#x-per", "#x-mult"].forEach(function (s) { $(s).addEventListener("input", calc); $(s).addEventListener("change", calc); });
  calc();
})();
