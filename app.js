(function () {
  "use strict";

  /* ---------------------------------------------------------
     CONSTANTS
  --------------------------------------------------------- */
  var STORAGE_KEY = "uv4pHolidayTracker.v1";
  var PALETTE = ["#FF6B5B", "#1F9D8A", "#FFC93C", "#6C7BD1", "#E5679A", "#3FA796", "#F2914D", "#7C6CE5"];
  var DAY_MS = 24 * 60 * 60 * 1000;

  /* ---------------------------------------------------------
     STATE
  --------------------------------------------------------- */
  var state = null;
  var ui = {
    currentView: "dashboard",
    currentYear: new Date().getFullYear(),
    selectedWeeksChip: null,
    editingMemberId: null,
    detailMemberId: null
  };

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function defaultState() {
    return {
      meta: { practiceName: "Uxbridge Vets4Pets", createdAt: new Date().toISOString() },
      members: [
        seedMember("Oscar", "#FF6B5B"),
        seedMember("Claire", "#1F9D8A"),
        seedMember("Saba", "#FFC93C"),
        seedMember("Kajol", "#6C7BD1"),
        seedMember("Maria", "#E5679A")
      ],
      entries: [],
      customBankHolidays: {}, // { "2026": [{id,name,date}] }
      bhExceptions: {} // reserved for future per-date global exceptions
    };
  }

  function seedMember(name, color) {
    return {
      id: uid(),
      name: name,
      color: color,
      contractedHours: 40,
      allowanceWeeks: 5.6,
      includeBankHolidays: true,
      joinDate: "",
      leaveDate: "",
      archived: false,
      carryOver: {},
      bhExceptions: {}
    };
  }

  function loadState() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      state = defaultState();
      saveState();
      return;
    }
    try {
      state = JSON.parse(raw);
      if (!state.customBankHolidays) state.customBankHolidays = {};
      if (!state.members) state.members = [];
      if (!state.entries) state.entries = [];
    } catch (e) {
      state = defaultState();
      saveState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* ---------------------------------------------------------
     DATE HELPERS
  --------------------------------------------------------- */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function dateStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseISO(s) {
    var parts = s.split("-");
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  function fmtHuman(s) {
    if (!s) return "";
    var d = parseISO(s);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function isWeekend(d) { var day = d.getDay(); return day === 0 || day === 6; }

  // Adds n calendar days using field arithmetic (safe across DST changes).
  function addDays(d, n) {
    var copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    copy.setDate(copy.getDate() + n);
    return copy;
  }

  function countWeekdays(startStr, endStr) {
    var start = parseISO(startStr), end = parseISO(endStr);
    if (end < start) return 0;
    var count = 0;
    var cur = start;
    while (cur <= end) {
      if (!isWeekend(cur)) count++;
      cur = addDays(cur, 1);
    }
    return count;
  }

  /* ---------------------------------------------------------
     BANK HOLIDAYS (England & Wales), computed for any year
  --------------------------------------------------------- */
  function easterSunday(year) {
    // Anonymous Gregorian algorithm
    var a = year % 19, b = Math.floor(year / 100), c = year % 100;
    var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    var g = Math.floor((b - f + 1) / 3);
    var h = (19 * a + b - d - g + 15) % 30;
    var i = Math.floor(c / 4), k = c % 4;
    var l = (32 + 2 * e + 2 * i - h - k) % 7;
    var m = Math.floor((a + 11 * h + 22 * l) / 451);
    var month = Math.floor((h + l - 7 * m + 114) / 31);
    var day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
  }

  function firstMonday(year, monthIndex) {
    var d = new Date(year, monthIndex, 1);
    while (d.getDay() !== 1) d = addDays(d, 1);
    return d;
  }
  function lastMonday(year, monthIndex) {
    var d = new Date(year, monthIndex + 1, 0); // last day of month
    while (d.getDay() !== 1) d = addDays(d, -1);
    return d;
  }

  function computeStandardBankHolidays(year) {
    var list = [];
    // New Year's Day
    var ny = new Date(year, 0, 1);
    if (ny.getDay() === 6) ny = new Date(year, 0, 3);
    else if (ny.getDay() === 0) ny = new Date(year, 0, 2);
    list.push({ key: "new-year", name: "New Year's Day", date: ny });

    var easter = easterSunday(year);
    var goodFriday = addDays(easter, -2);
    var easterMonday = addDays(easter, 1);
    list.push({ key: "good-friday", name: "Good Friday", date: goodFriday });
    list.push({ key: "easter-monday", name: "Easter Monday", date: easterMonday });

    list.push({ key: "early-may", name: "Early May bank holiday", date: firstMonday(year, 4) });
    list.push({ key: "spring", name: "Spring bank holiday", date: lastMonday(year, 4) });
    list.push({ key: "summer", name: "Summer bank holiday", date: lastMonday(year, 7) });

    // Christmas & Boxing Day with substitution
    var xmas = new Date(year, 11, 25);
    var xmasDow = xmas.getDay();
    var xmasObs, boxingObs;
    if (xmasDow === 6) { xmasObs = new Date(year, 11, 27); boxingObs = new Date(year, 11, 28); }
    else if (xmasDow === 0) { xmasObs = new Date(year, 11, 27); boxingObs = new Date(year, 11, 26); }
    else if (xmasDow === 5) { xmasObs = new Date(year, 11, 25); boxingObs = new Date(year, 11, 28); }
    else { xmasObs = new Date(year, 11, 25); boxingObs = new Date(year, 11, 26); }
    list.push({ key: "christmas", name: "Christmas Day", date: xmasObs });
    list.push({ key: "boxing", name: "Boxing Day", date: boxingObs });

    list.sort(function (a, b) { return a.date - b.date; });
    return list;
  }

  function getAllBankHolidays(year) {
    var standard = computeStandardBankHolidays(year);
    var custom = (state.customBankHolidays[year] || []).map(function (c) {
      return { key: "custom-" + c.id, name: c.name, date: parseISO(c.date), custom: true, id: c.id };
    });
    return standard.concat(custom).sort(function (a, b) { return a.date - b.date; });
  }

  /* ---------------------------------------------------------
     HOLIDAY MATH
  --------------------------------------------------------- */
  function membershipFraction(member, year) {
    var yearStart = new Date(year, 0, 1);
    var yearEnd = new Date(year, 11, 31);
    var start = member.joinDate ? parseISO(member.joinDate) : yearStart;
    var end = member.leaveDate ? parseISO(member.leaveDate) : yearEnd;
    if (start < yearStart) start = yearStart;
    if (end > yearEnd) end = yearEnd;
    if (end < yearStart || start > yearEnd) return 0;
    var days = Math.round((end - start) / DAY_MS) + 1;
    var totalDays = Math.round((yearEnd - yearStart) / DAY_MS) + 1;
    var frac = days / totalDays;
    if (frac < 0) frac = 0;
    if (frac > 1) frac = 1;
    return frac;
  }

  function getMemberYearStats(member, year) {
    var frac = membershipFraction(member, year);
    var dailyHours = member.contractedHours / 5;
    var allowanceWeeksProrated = member.allowanceWeeks * frac;
    var carryOver = (member.carryOver && member.carryOver[year]) || 0;
    var allowanceHours = allowanceWeeksProrated * member.contractedHours + carryOver;

    var bankHolidayHours = 0;
    var bhList = [];
    if (member.includeBankHolidays) {
      var all = getAllBankHolidays(year);
      var exceptions = (member.bhExceptions && member.bhExceptions[year]) || [];
      all.forEach(function (bh) {
        var key = dateStr(bh.date);
        var excluded = exceptions.indexOf(key) !== -1;
        var withinMembership = bh.date >= (member.joinDate ? parseISO(member.joinDate) : new Date(year, 0, 1)) &&
          bh.date <= (member.leaveDate ? parseISO(member.leaveDate) : new Date(year, 11, 31));
        var counted = !excluded && withinMembership;
        if (counted) bankHolidayHours += dailyHours;
        bhList.push({ name: bh.name, date: bh.date, counted: counted, key: key });
      });
    }

    var takenHours = 0;
    state.entries.forEach(function (e) {
      if (e.memberId !== member.id) return;
      var y = parseISO(e.start).getFullYear();
      if (y !== year) return;
      takenHours += e.hours;
    });

    var remainingHours = allowanceHours - bankHolidayHours - takenHours;

    return {
      frac: frac,
      dailyHours: dailyHours,
      allowanceWeeksProrated: allowanceWeeksProrated,
      allowanceHours: allowanceHours,
      bankHolidayHours: bankHolidayHours,
      takenHours: takenHours,
      remainingHours: remainingHours,
      bhList: bhList,
      carryOver: carryOver
    };
  }

  function fmtH(n) {
    var r = Math.round(n * 10) / 10;
    return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + "h";
  }

  /* ---------------------------------------------------------
     DOM HELPERS
  --------------------------------------------------------- */
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add("hidden"); }, 2200);
  }

  /* ---------------------------------------------------------
     NAVIGATION
  --------------------------------------------------------- */
  function showView(name) {
    ui.currentView = name;
    $all(".view").forEach(function (v) { v.classList.remove("is-active"); });
    $("#view-" + name).classList.add("is-active");
    $all(".nav-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-view") === name);
    });
    renderAll();
  }

  function setYear(y) {
    ui.currentYear = y;
    $("#yearLabel").textContent = y;
    renderAll();
  }

  /* ---------------------------------------------------------
     RENDER: DASHBOARD
  --------------------------------------------------------- */
  function renderDashboard() {
    var wrap = $("#dashboardCards");
    wrap.innerHTML = "";
    var active = state.members.filter(function (m) { return !m.archived; });

    $("#dashboardEmpty").classList.toggle("hidden", active.length > 0);
    if (!active.length) {
      $("#dashSummary").textContent = "";
      return;
    }

    var totalRemaining = 0;
    active.forEach(function (m) {
      var stats = getMemberYearStats(m, ui.currentYear);
      totalRemaining += stats.remainingHours;
      var pct = stats.allowanceHours > 0 ? Math.max(0, Math.min(100, ((stats.allowanceHours - stats.bankHolidayHours - stats.takenHours) / stats.allowanceHours) * 100)) : 0;

      var card = el("div", "member-card");
      card.style.setProperty("--accent", m.color);
      card.innerHTML =
        '<div class="ring" style="--pct:' + pct.toFixed(0) + '"><span>' + Math.round(pct) + "%</span></div>" +
        '<div class="info">' +
        '<div class="name">' + escapeHtml(m.name) + "</div>" +
        '<div class="stat-line"><strong>' + fmtH(Math.max(0, stats.remainingHours)) + "</strong> left of " + fmtH(stats.allowanceHours) + "</div>" +
        "</div>" +
        '<button class="quick-log-btn" data-quick-log="' + m.id + '">+ Log</button>';
      card.addEventListener("click", function (ev) {
        if (ev.target.closest("[data-quick-log]")) return;
        openDetail(m.id);
      });
      wrap.appendChild(card);
      card.querySelector("[data-quick-log]").addEventListener("click", function (ev) {
        ev.stopPropagation();
        openEntryModal(m.id);
      });
    });

    $("#dashSummary").textContent = active.length + " team member" + (active.length === 1 ? "" : "s") + " · " + fmtH(totalRemaining) + " remaining in total";
  }

  /* ---------------------------------------------------------
     RENDER: TEAM
  --------------------------------------------------------- */
  function renderTeam() {
    var wrap = $("#teamList");
    wrap.innerHTML = "";
    state.members.forEach(function (m) {
      var stats = getMemberYearStats(m, ui.currentYear);
      var row = el("div", "team-row");
      row.style.setProperty("--accent", m.color);
      row.innerHTML =
        '<span class="swatch"></span>' +
        '<div class="info">' +
        '<div class="name">' + escapeHtml(m.name) + (m.archived ? ' <span class="archived-tag">Archived</span>' : "") + "</div>" +
        '<div class="meta">' + m.contractedHours + "h/week · " + m.allowanceWeeks + " weeks · " + fmtH(stats.remainingHours) + " left in " + ui.currentYear + "</div>" +
        "</div>";
      row.addEventListener("click", function () { openMemberModal(m.id); });
      wrap.appendChild(row);
    });
  }

  /* ---------------------------------------------------------
     RENDER: LOG
  --------------------------------------------------------- */
  function renderLogFilterOptions() {
    var sel = $("#logFilterMember");
    var current = sel.value;
    sel.innerHTML = '<option value="">Everyone</option>';
    state.members.forEach(function (m) {
      var o = el("option", null, escapeHtml(m.name));
      o.value = m.id;
      sel.appendChild(o);
    });
    sel.value = current || "";
  }

  function renderLog() {
    renderLogFilterOptions();
    var filterId = $("#logFilterMember").value;
    var wrap = $("#entryList");
    wrap.innerHTML = "";
    var entries = state.entries.filter(function (e) {
      var y = parseISO(e.start).getFullYear();
      if (y !== ui.currentYear) return false;
      if (filterId && e.memberId !== filterId) return false;
      return true;
    }).sort(function (a, b) { return parseISO(b.start) - parseISO(a.start); });

    $("#entryListEmpty").classList.toggle("hidden", entries.length > 0);

    entries.forEach(function (e) {
      var m = state.members.find(function (mm) { return mm.id === e.memberId; });
      if (!m) return;
      var row = el("div", "entry-row");
      var when = e.start === e.end ? fmtHuman(e.start) : fmtHuman(e.start) + " – " + fmtHuman(e.end);
      row.innerHTML =
        '<span class="dot" style="background:' + m.color + '"></span>' +
        '<div class="info"><div class="who">' + escapeHtml(m.name) + '</div><div class="when">' + when + (e.note ? " · " + escapeHtml(e.note) : "") + "</div></div>" +
        '<div class="hours">' + fmtH(e.hours) + "</div>" +
        '<button class="del-btn" data-del="' + e.id + '">×</button>';
      row.querySelector("[data-del]").addEventListener("click", function () {
        state.entries = state.entries.filter(function (x) { return x.id !== e.id; });
        saveState();
        renderAll();
        toast("Entry removed");
      });
      wrap.appendChild(row);
    });
  }

  /* ---------------------------------------------------------
     RENDER: BANK HOLIDAYS
  --------------------------------------------------------- */
  function renderBankHolidays() {
    var wrap = $("#bankHolidayTable");
    wrap.innerHTML = "";
    var list = getAllBankHolidays(ui.currentYear);
    list.forEach(function (bh) {
      var row = el("div", "bh-row");
      row.innerHTML =
        '<div><div class="bh-name">' + escapeHtml(bh.name) + '</div><div class="bh-date">' + bh.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + "</div></div>";
      wrap.appendChild(row);
    });

    var customWrap = $("#customBhList");
    customWrap.innerHTML = "";
    var custom = state.customBankHolidays[ui.currentYear] || [];
    custom.forEach(function (c) {
      var row = el("div", "custom-bh-row");
      row.innerHTML = "<span>" + escapeHtml(c.name) + " · " + fmtHuman(c.date) + "</span>";
      var delBtn = el("button", "del-btn", "×");
      delBtn.addEventListener("click", function () {
        state.customBankHolidays[ui.currentYear] = state.customBankHolidays[ui.currentYear].filter(function (x) { return x.id !== c.id; });
        saveState();
        renderAll();
      });
      row.appendChild(delBtn);
      customWrap.appendChild(row);
    });
  }

  /* ---------------------------------------------------------
     RENDER ALL
  --------------------------------------------------------- */
  function renderAll() {
    if (ui.currentView === "dashboard") renderDashboard();
    if (ui.currentView === "team") renderTeam();
    if (ui.currentView === "log") renderLog();
    if (ui.currentView === "bankholidays") renderBankHolidays();
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------------------------------------------------
     MEMBER MODAL
  --------------------------------------------------------- */
  function renderColorPicker(selected) {
    var wrap = $("#colorPicker");
    wrap.innerHTML = "";
    PALETTE.forEach(function (c) {
      var dot = el("div", "color-dot" + (c === selected ? " is-selected" : ""));
      dot.style.background = c;
      dot.dataset.color = c;
      dot.addEventListener("click", function () {
        $all(".color-dot").forEach(function (d) { d.classList.remove("is-selected"); });
        dot.classList.add("is-selected");
      });
      wrap.appendChild(dot);
    });
  }

  function openMemberModal(memberId) {
    ui.editingMemberId = memberId || null;
    var m = memberId ? state.members.find(function (x) { return x.id === memberId; }) : null;

    $("#memberModalTitle").textContent = m ? "Edit " + m.name : "Add team member";
    $("#memberId").value = m ? m.id : "";
    $("#memberName").value = m ? m.name : "";
    $("#memberHours").value = m ? m.contractedHours : "";
    $("#memberWeeks").value = m ? m.allowanceWeeks : "";
    $("#memberIncludeBH").checked = m ? m.includeBankHolidays : true;
    $("#memberJoinDate").value = m ? m.joinDate || "" : "";
    $("#memberLeaveDate").value = m ? m.leaveDate || "" : "";
    $("#memberCarryOver").value = m && m.carryOver && m.carryOver[ui.currentYear] ? m.carryOver[ui.currentYear] : "";
    $("#carryYearLabel").textContent = ui.currentYear;
    $("#archiveMemberBtn").classList.toggle("hidden", !m);
    $("#archiveMemberBtn").textContent = m && m.archived ? "Unarchive" : "Archive";

    renderColorPicker(m ? m.color : PALETTE[state.members.length % PALETTE.length]);
    syncWeeksChips();
    $("#memberModal").classList.remove("hidden");
  }

  function syncWeeksChips() {
    var val = $("#memberWeeks").value;
    $all(".chip").forEach(function (c) {
      c.classList.toggle("is-selected", c.dataset.weeks === val);
    });
  }

  function closeModal(modalEl) { modalEl.classList.add("hidden"); }

  $all(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      $("#memberWeeks").value = chip.dataset.weeks;
      syncWeeksChips();
    });
  });
  $("#memberWeeks").addEventListener("input", syncWeeksChips);

  $("#addMemberBtn").addEventListener("click", function () { openMemberModal(null); });
  $("#dashAddMemberBtn").addEventListener("click", function () { openMemberModal(null); });

  $("#memberForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var id = $("#memberId").value;
    var color = ($(".color-dot.is-selected") || {}).dataset ? $(".color-dot.is-selected").dataset.color : PALETTE[0];
    var carryVal = parseFloat($("#memberCarryOver").value);

    var data = {
      name: $("#memberName").value.trim(),
      color: color,
      contractedHours: parseFloat($("#memberHours").value),
      allowanceWeeks: parseFloat($("#memberWeeks").value),
      includeBankHolidays: $("#memberIncludeBH").checked,
      joinDate: $("#memberJoinDate").value || "",
      leaveDate: $("#memberLeaveDate").value || ""
    };

    if (!data.name) return;

    var m = state.members.find(function (x) { return x.id === id; });
    if (m) {
      Object.assign(m, data);
      if (!m.carryOver) m.carryOver = {};
      if (!isNaN(carryVal)) m.carryOver[ui.currentYear] = carryVal; else delete m.carryOver[ui.currentYear];
    } else {
      var nm = seedMember(data.name, data.color);
      Object.assign(nm, data);
      if (!isNaN(carryVal)) nm.carryOver[ui.currentYear] = carryVal;
      state.members.push(nm);
    }
    saveState();
    closeModal($("#memberModal"));
    renderAll();
    toast("Saved " + data.name);
  });

  $("#archiveMemberBtn").addEventListener("click", function () {
    var id = $("#memberId").value;
    var m = state.members.find(function (x) { return x.id === id; });
    if (!m) return;
    m.archived = !m.archived;
    saveState();
    closeModal($("#memberModal"));
    renderAll();
    toast(m.archived ? "Archived " + m.name : "Restored " + m.name);
  });

  /* ---------------------------------------------------------
     ENTRY MODAL
  --------------------------------------------------------- */
  function populateEntryMemberSelect(preselectId) {
    var sel = $("#entryMember");
    sel.innerHTML = "";
    state.members.filter(function (m) { return !m.archived; }).forEach(function (m) {
      var o = el("option", null, escapeHtml(m.name));
      o.value = m.id;
      sel.appendChild(o);
    });
    if (preselectId) sel.value = preselectId;
  }

  function suggestEntryHours() {
    var memberId = $("#entryMember").value;
    var m = state.members.find(function (x) { return x.id === memberId; });
    var start = $("#entryStart").value, end = $("#entryEnd").value;
    if (!m || !start || !end) return;
    if (parseISO(end) < parseISO(start)) return;
    var days = countWeekdays(start, end);
    var hours = days * (m.contractedHours / 5);
    $("#entryHours").value = Math.round(hours * 10) / 10;
  }

  function openEntryModal(preselectMemberId) {
    populateEntryMemberSelect(preselectMemberId);
    var today = dateStr(new Date());
    $("#entryStart").value = today;
    $("#entryEnd").value = today;
    $("#entryNote").value = "";
    suggestEntryHours();
    $("#entryModal").classList.remove("hidden");
  }

  $("#addEntryBtn").addEventListener("click", function () { openEntryModal(null); });
  $("#entryMember").addEventListener("change", suggestEntryHours);
  $("#entryStart").addEventListener("change", function () {
    if (parseISO($("#entryEnd").value) < parseISO($("#entryStart").value)) $("#entryEnd").value = $("#entryStart").value;
    suggestEntryHours();
  });
  $("#entryEnd").addEventListener("change", suggestEntryHours);

  $("#entryForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var entry = {
      id: uid(),
      memberId: $("#entryMember").value,
      start: $("#entryStart").value,
      end: $("#entryEnd").value,
      hours: parseFloat($("#entryHours").value) || 0,
      note: $("#entryNote").value.trim(),
      createdAt: new Date().toISOString()
    };
    state.entries.push(entry);
    saveState();
    closeModal($("#entryModal"));
    renderAll();
    toast("Logged time off");
  });

  $("#logFilterMember").addEventListener("change", renderLog);

  /* ---------------------------------------------------------
     DETAIL SHEET
  --------------------------------------------------------- */
  function openDetail(memberId) {
    ui.detailMemberId = memberId;
    var m = state.members.find(function (x) { return x.id === memberId; });
    if (!m) return;
    var stats = getMemberYearStats(m, ui.currentYear);
    $("#detailName").textContent = m.name;

    var body = $("#detailBody");
    body.innerHTML =
      '<div class="detail-stats">' +
      '<div><span class="num">' + fmtH(stats.allowanceHours) + '</span><span class="lbl">Allowance</span></div>' +
      '<div><span class="num">' + fmtH(stats.bankHolidayHours) + '</span><span class="lbl">Bank hols</span></div>' +
      '<div><span class="num">' + fmtH(stats.takenHours) + '</span><span class="lbl">Taken</span></div>' +
      '<div><span class="num">' + fmtH(Math.max(0, stats.remainingHours)) + '</span><span class="lbl">Remaining</span></div>' +
      "</div>" +
      '<div class="detail-actions">' +
      '<button class="btn btn-primary btn-sm" id="detailLogBtn">+ Log time off</button>' +
      '<button class="btn btn-secondary btn-sm" id="detailEditBtn">Edit details</button>' +
      "</div>" +
      '<div class="detail-history"><h3>' + ui.currentYear + ' history</h3><div id="detailHistoryList"></div></div>';

    $("#detailLogBtn").addEventListener("click", function () { closeModal($("#detailModal")); openEntryModal(m.id); });
    $("#detailEditBtn").addEventListener("click", function () { closeModal($("#detailModal")); openMemberModal(m.id); });

    var histWrap = $("#detailHistoryList");
    var entries = state.entries.filter(function (e) { return e.memberId === m.id && parseISO(e.start).getFullYear() === ui.currentYear; })
      .sort(function (a, b) { return parseISO(b.start) - parseISO(a.start); });
    if (!entries.length) {
      histWrap.innerHTML = '<p style="color:#9AA7AF;font-size:13px;">No time off logged yet.</p>';
    } else {
      entries.forEach(function (e) {
        var row = el("div", "entry-row");
        var when = e.start === e.end ? fmtHuman(e.start) : fmtHuman(e.start) + " – " + fmtHuman(e.end);
        row.innerHTML =
          '<span class="dot" style="background:' + m.color + '"></span>' +
          '<div class="info"><div class="when">' + when + (e.note ? " · " + escapeHtml(e.note) : "") + "</div></div>" +
          '<div class="hours">' + fmtH(e.hours) + "</div>";
        histWrap.appendChild(row);
      });
    }

    $("#detailModal").classList.remove("hidden");
  }

  /* ---------------------------------------------------------
     CUSTOM BANK HOLIDAYS
  --------------------------------------------------------- */
  $("#customBhForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = $("#customBhName").value.trim();
    var date = $("#customBhDate").value;
    if (!name || !date) return;
    var year = parseISO(date).getFullYear();
    if (!state.customBankHolidays[year]) state.customBankHolidays[year] = [];
    state.customBankHolidays[year].push({ id: uid(), name: name, date: date });
    saveState();
    $("#customBhName").value = "";
    $("#customBhDate").value = "";
    if (year === ui.currentYear) renderBankHolidays();
    toast("Added " + name);
  });

  /* ---------------------------------------------------------
     EXPORT / IMPORT / PRINT / RESET
  --------------------------------------------------------- */
  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  $("#exportJsonBtn").addEventListener("click", function () {
    downloadFile("uv4p-holidays-backup-" + dateStr(new Date()) + ".json", JSON.stringify(state, null, 2), "application/json");
    toast("Backup downloaded");
  });

  $("#exportCsvBtn").addEventListener("click", function () {
    var rows = [["Name", "Contracted hrs/wk", "Allowance (weeks)", "Allowance (hrs)", "Bank holiday hrs", "Taken hrs", "Remaining hrs", "Year"]];
    state.members.filter(function (m) { return !m.archived; }).forEach(function (m) {
      var s = getMemberYearStats(m, ui.currentYear);
      rows.push([m.name, m.contractedHours, m.allowanceWeeks, s.allowanceHours.toFixed(1), s.bankHolidayHours.toFixed(1), s.takenHours.toFixed(1), s.remainingHours.toFixed(1), ui.currentYear]);
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(","); }).join("\n");
    downloadFile("uv4p-holidays-" + ui.currentYear + ".csv", csv, "text/csv");
    toast("CSV downloaded");
  });

  $("#importFile").addEventListener("change", function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var incoming = JSON.parse(reader.result);
        if (!incoming.members || !incoming.entries) throw new Error("bad file");
        if (confirm("Replace all data on this phone with this backup?")) {
          state = incoming;
          if (!state.customBankHolidays) state.customBankHolidays = {};
          saveState();
          renderAll();
          toast("Backup imported");
        }
      } catch (e) {
        alert("That doesn't look like a valid backup file.");
      }
      $("#importFile").value = "";
    };
    reader.readAsText(file);
  });

  $("#resetBtn").addEventListener("click", function () {
    if (confirm("This deletes everything on this phone. Are you sure?")) {
      if (confirm("Really sure? This can't be undone.")) {
        state = defaultState();
        saveState();
        renderAll();
        toast("All data reset");
      }
    }
  });

  $("#printBtn").addEventListener("click", function () {
    var win = window.open("", "_blank");
    var active = state.members.filter(function (m) { return !m.archived; });
    var rowsHtml = active.map(function (m) {
      var s = getMemberYearStats(m, ui.currentYear);
      return "<tr><td>" + escapeHtml(m.name) + "</td><td>" + m.contractedHours + "</td><td>" + m.allowanceWeeks +
        "</td><td>" + fmtH(s.allowanceHours) + "</td><td>" + fmtH(s.bankHolidayHours) + "</td><td>" + fmtH(s.takenHours) +
        "</td><td>" + fmtH(s.remainingHours) + "</td></tr>";
    }).join("");
    var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Uxbridge Vets4Pets — Holidays " + ui.currentYear + "</title>" +
      "<style>body{font-family:Arial,sans-serif;padding:24px;color:#1B3A4B} h1{margin-bottom:2px} table{width:100%;border-collapse:collapse;margin-top:18px} th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;font-size:13px} th{background:#FFF3E4}</style>" +
      "</head><body><h1>Uxbridge Vets4Pets</h1><p>Holiday summary — " + ui.currentYear + "</p>" +
      "<table><thead><tr><th>Name</th><th>Hrs/week</th><th>Weeks</th><th>Allowance</th><th>Bank hols</th><th>Taken</th><th>Remaining</th></tr></thead><tbody>" +
      rowsHtml + "</tbody></table></body></html>";
    win.document.write(html);
    win.document.close();
    setTimeout(function () { win.print(); }, 300);
  });

  /* ---------------------------------------------------------
     GLOBAL EVENTS
  --------------------------------------------------------- */
  $all(".nav-btn").forEach(function (btn) {
    btn.addEventListener("click", function () { showView(btn.getAttribute("data-view")); });
  });

  $("#yearPrev").addEventListener("click", function () { setYear(ui.currentYear - 1); });
  $("#yearNext").addEventListener("click", function () { setYear(ui.currentYear + 1); });

  $all("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () { closeModal(btn.closest(".modal")); });
  });
  $all(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (ev) { if (ev.target === modal) closeModal(modal); });
  });

  /* ---------------------------------------------------------
     INIT
  --------------------------------------------------------- */
  function init() {
    loadState();
    $("#yearLabel").textContent = ui.currentYear;
    showView("dashboard");

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("service-worker.js").catch(function () {});
      });
    }
  }

  init();
})();
