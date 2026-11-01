/* IZEX — Appointments view (week calendar + list) */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var apptViewState = { weekStart: null, mode: "week", vetFilter: "all" };

Views.appointments = function (root) {
  var state = apptViewState;
  if (!state.weekStart) state.weekStart = Data.startOfWeek(new Date());
  if (state.vetFilter !== "all" && !Store.vet(state.vetFilter)) state.vetFilter = "all";

  var HOUR0 = 8, HOURS = 11, SLOT = 60; /* 8:00 – 18:00 */

  function isoAt(h) { return Data.iso(h); }

  function refresh() { Views.appointments(root); }

  function apptBlock(a, i) {
    var patient = Store.patientById(a.patientId);
    var vet = Store.vet(a.vetId);
    var startP = a.start.split(":");
    var top = (parseInt(startP[0], 10) - HOUR0) * SLOT + (parseInt(startP[1], 10) / 60) * SLOT;
    var height = Math.max((a.duration / 60) * SLOT - 3, 24);
    if (top < 0) { top = 0; }
    if (top + height > HOURS * SLOT) height = HOURS * SLOT - top;
    var dim = state.vetFilter !== "all" && a.vetId !== state.vetFilter;
    var showSub = height >= 46;
    return "<div class='appt st-" + a.status + "' style='--c:" + vet.color + ";--i:" + i + ";top:" + top + "px;height:" + height + "px;" + (dim ? "opacity:.22;" : "") + "' data-appt='" + a.id + "'>" +
      "<div class='appt-time'>" + Data.fmtTime(a.start) + "</div>" +
      "<div class='appt-title'>" + UI.escape(patient.name) + "</div>" +
      (showSub ? "<div class='appt-sub'>" + UI.escape(a.type) + " · " + UI.escape(vet.name.replace("Dr. ", "")) + "</div>" : "") +
    "</div>";
  }

  function dayColumn(day, di) {
    var iso = isoAt(day);
    var isToday = iso === Data.todayISO();
    var cls = "cal-col" + (day.getDay() === 6 ? " weekend" : "") + (isToday ? " today-col" : "");
    var slots = "";
    for (var h = HOUR0; h < HOUR0 + HOURS; h++) {
      slots += "<div class='cal-slot' data-date='" + iso + "' data-hour='" + h + "'></div>";
    }
    var appts = Store.apptsOn(iso).filter(function (a) { return a.status !== "cancelled"; });
    var blocks = appts.map(function (a, i) { return apptBlock(a, i); }).join("");

    var nowLine = "";
    if (isToday) {
      var nowD = new Date();
      var hd = nowD.getHours() + nowD.getMinutes() / 60;
      if (hd >= HOUR0 && hd <= HOUR0 + HOURS) {
        nowLine = "<div class='cal-now' style='top:" + ((hd - HOUR0) * SLOT) + "px'></div>";
      }
    }
    return "<div class='" + cls + "' style='height:" + (HOURS * SLOT) + "px'>" + slots + blocks + nowLine + "</div>";
  }

  function weekGrid() {
    var heads = "";
    var cols = "";
    for (var i = 0; i < 7; i++) {
      var day = Data.addDays(state.weekStart, i);
      var iso = isoAt(day);
      var isToday = iso === Data.todayISO();
      heads += "<div class='cal-day-head" + (isToday ? " today" : "") + "'>" +
        "<div class='cal-day-name'>" + day.toLocaleDateString("en-US", { weekday: "short" }) + "</div>" +
        "<div class='cal-day-num'>" + day.getDate() + "</div></div>";
      cols += dayColumn(day, i);
    }
    var times = "";
    for (var h = HOUR0; h < HOUR0 + HOURS; h++) {
      times += "<div class='cal-time'>" + (h === 12 ? "12 PM" : (h > 12 ? (h - 12) + " PM" : h + " AM")) + "</div>";
    }
    return "<div class='card cal-shell'>" +
      "<div class='cal-days'><div></div>" + heads + "</div>" +
      "<div class='cal-body'><div class='cal-grid'>" +
        "<div class='cal-times'>" + times + "</div>" + cols +
      "</div></div>" +
    "</div>";
  }

  function listView() {
    var from = isoAt(state.weekStart);
    var to = isoAt(Data.addDays(state.weekStart, 6));
    var rows = Store.apptsInRange(from, to)
      .filter(function (a) { return state.vetFilter === "all" || a.vetId === state.vetFilter; })
      .sort(function (a, b) { return (a.date + a.start) < (b.date + b.start) ? -1 : 1; });

    if (!rows.length) {
      return "<div class='card'><div class='empty'><div class='empty-icon'>" + icon("calendar", 24) + "</div><div class='empty-title'>No appointments this week</div><div class='empty-sub'>Try another week or clear the filters.</div></div></div>";
    }
    return "<div class='card'><div class='tbl-wrap'><table class='tbl'><thead><tr>" +
      "<th>When</th><th>Patient</th><th>Type</th><th>Veterinarian</th><th>Room</th><th>Status</th></tr></thead><tbody class='stagger'>" +
      rows.map(function (a) {
        var p = Store.patientById(a.patientId);
        var v = Store.vet(a.vetId);
        return "<tr data-appt='" + a.id + "'>" +
          "<td class='cell-main nowrap'>" + Data.fmtDate(a.date) + " · " + Data.fmtTime(a.start) + "</td>" +
          "<td><div class='cell-flex'>" + UI.avatar(p.name, Data.colorFor(p.name), "avatar-sm") + "<span>" + UI.escape(p.name) + "</span></div></td>" +
          "<td>" + UI.escape(a.type) + "</td>" +
          "<td><span style='display:inline-flex;align-items:center;gap:7px'><span style='width:8px;height:8px;border-radius:50%;background:" + v.color + "'></span>" + UI.escape(v.name) + "</span></td>" +
          "<td>" + UI.escape(a.room) + "</td>" +
          "<td>" + Actions.statusChip(a.status) + "</td>" +
        "</tr>";
      }).join("") +
      "</tbody></table></div></div>";
  }

  var weekEnd = Data.addDays(state.weekStart, 6);
  var rangeLabel = Data.fmtDate(isoAt(state.weekStart)) + " – " + Data.fmtDate(isoAt(weekEnd)) + ", " + weekEnd.getFullYear();
  var weekAppts = Store.apptsInRange(isoAt(state.weekStart), isoAt(weekEnd));
  var counts = { total: weekAppts.length, scheduled: 0, completed: 0, other: 0 };
  weekAppts.forEach(function (a) {
    if (a.status === "scheduled" || a.status === "arrived" || a.status === "in-progress") counts.scheduled++;
    else if (a.status === "completed") counts.completed++;
    else counts.other++;
  });

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Appointments</h1><div class='page-sub'>Book, track and check in visits across the week.</div></div>" +
      "<div class='page-actions'>" +
        "<div class='tabs' style='width:170px'>" +
          "<button class='tab" + (state.mode === "week" ? " active" : "") + "' data-mode='week'>Week</button>" +
          "<button class='tab" + (state.mode === "list" ? " active" : "") + "' data-mode='list'>List</button>" +
        "</div>" +
        "<button class='btn btn-primary' data-newappt>" + icon("plus", 15) + "New appointment</button>" +
      "</div>" +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:16px'>" +
      "<button class='icon-btn' data-nav='-1' title='Previous week'>" + icon("chevL", 16) + "</button>" +
      "<button class='btn btn-outline btn-sm' data-today>Today</button>" +
      "<button class='icon-btn' data-nav='1' title='Next week'>" + icon("chevR", 16) + "</button>" +
      "<div class='bold' style='font-size:14px;margin-left:6px'>" + rangeLabel + "</div>" +
      "<div class='grow'></div>" +
      (Store.db.vets.length > 1
        ? "<div class='filter-chips'>" +
            "<button class='filter-chip" + (state.vetFilter === "all" ? " active" : "") + "' data-vet='all'>All vets <span class='count'>" + counts.total + "</span></button>" +
            Store.db.vets.map(function (v) {
              var n = weekAppts.filter(function (a) { return a.vetId === v.id; }).length;
              return "<button class='filter-chip" + (state.vetFilter === v.id ? " active" : "") + "' data-vet='" + v.id + "'>" +
                "<span style='width:8px;height:8px;border-radius:50%;background:" + v.color + "'></span>" +
                UI.escape(v.name.replace("Dr. ", "")) + " <span class='count'>" + n + "</span></button>";
            }).join("") +
          "</div>"
        : "") +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:14px;gap:8px'>" +
      UI.chip(counts.scheduled + " upcoming / in progress", "sky", true) +
      UI.chip(counts.completed + " completed", "teal", true) +
      (counts.other ? UI.chip(counts.other + " no-show / cancelled", "rose", true) : "") +
    "</div>" +

    (state.mode === "week" ? weekGrid() : listView());

  /* ---------- wire ---------- */

  root.querySelectorAll("[data-nav]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.weekStart = Data.addDays(state.weekStart, 7 * parseInt(b.getAttribute("data-nav"), 10));
      refresh();
    });
  });
  root.querySelector("[data-today]").addEventListener("click", function () {
    state.weekStart = Data.startOfWeek(new Date());
    refresh();
  });
  root.querySelectorAll("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () { state.mode = b.getAttribute("data-mode"); refresh(); });
  });
  root.querySelectorAll("[data-vet]").forEach(function (b) {
    b.addEventListener("click", function () { state.vetFilter = b.getAttribute("data-vet"); refresh(); });
  });
  root.querySelector("[data-newappt]").addEventListener("click", function () {
    Actions.appointmentDialog({ date: Data.todayISO(), onDone: refresh });
  });
  root.querySelectorAll(".appt").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      var appt = Store.find(Store.db.appointments, el.getAttribute("data-appt"));
      if (appt) Actions.apptDetail(appt, refresh);
    });
  });
  root.querySelectorAll("tr[data-appt]").forEach(function (el) {
    el.addEventListener("click", function () {
      var appt = Store.find(Store.db.appointments, el.getAttribute("data-appt"));
      if (appt) Actions.apptDetail(appt, refresh);
    });
  });
  root.querySelectorAll(".cal-slot").forEach(function (el) {
    el.addEventListener("click", function () {
      var date = el.getAttribute("data-date");
      var hour = parseInt(el.getAttribute("data-hour"), 10);
      Actions.appointmentDialog({ date: date, start: Data.pad(hour, 2) + ":00", onDone: refresh });
    });
  });

  /* auto-scroll calendar to a useful hour */
  var body = root.querySelector(".cal-body");
  if (body && state.mode === "week") {
    var inWeek = Data.todayISO() >= isoAt(state.weekStart) && Data.todayISO() <= isoAt(weekEnd);
    var target = inWeek ? (new Date().getHours() - HOUR0 - 1) : 0;
    body.scrollTop = Math.max(0, Math.min(target * SLOT, body.scrollHeight));
  }
};
