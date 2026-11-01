/* IZEX — Dashboard view */

var Views = window.Views || {};

Views.dashboard = function (root) {
  var stats = Store.stats();
  var revenue = Store.revenueSeries(12);
  var mix = Store.speciesMix();
  var todays = Store.apptsOn(Data.todayISO());
  var feed = Store.db.activity;
  var hospital = Store.db.meta.hospital;

  var now = new Date();
  var hour = now.getHours();
  var greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  var dateLine = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  var me = Store.db.vets.length ? Store.db.vets[0] : null;

  function refresh() { Views.dashboard(root); }

  /* ---------- schedule rows ---------- */
  function scheduleRow(a) {
    var patient = Store.patientById(a.patientId);
    var vet = Store.vet(a.vetId);
    var checkin = a.status === "scheduled"
      ? "<button class='btn btn-outline btn-xs' data-checkin='" + a.id + "'>Check in</button>"
      : "";
    return "<div class='row sched-row' data-appt='" + a.id + "' style='padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer'>" +
      "<div style='width:66px;flex:none;font-size:11.5px;font-weight:700;color:var(--muted)'>" + Data.fmtTime(a.start) + "</div>" +
      "<span style='width:9px;height:9px;border-radius:50%;background:" + vet.color + ";flex:none'></span>" +
      "<div class='grow' style='min-width:0'>" +
        "<div style='font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + UI.escape(patient.name) +
          " <span class='muted' style='font-weight:500'>· " + UI.escape(a.type) + "</span></div>" +
        "<div class='faint' style='font-size:11.5px'>" + UI.escape(vet.name) + " · " + UI.escape(a.room) + "</div>" +
      "</div>" +
      Actions.statusChip(a.status) + checkin +
    "</div>";
  }

  /* ---------- alerts ---------- */
  var alerts = [];
  Store.lowStock().slice(0, 3).forEach(function (it) {
    alerts.push({ icon: "alert", kind: "amber", text: "<b>" + UI.escape(it.name) + "</b> — " + it.qty + " " + it.unit + "s left (reorder at " + it.reorderAt + ")", href: "#/inventory" });
  });
  Store.expiringSoon(30).slice(0, 2).forEach(function (it) {
    var st = Data.expiryState(it.expiry);
    alerts.push({ icon: "box", kind: "rose", text: "<b>" + UI.escape(it.name) + "</b> — " + st.label, href: "#/inventory" });
  });
  Store.overdueInvoices().slice(0, 2).forEach(function (inv) {
    alerts.push({ icon: "receipt", kind: "rose", text: "<b>" + inv.id + "</b> overdue — " + Data.fmtMoney(Data.invoiceTotals(inv).balance) + " unpaid", href: "#/billing" });
  });
  if (!alerts.length) alerts.push({ icon: "check", kind: "teal", text: "All clear — nothing needs attention right now.", href: "" });

  var kindColor = { teal: "var(--c-teal-fg);var(--c-teal-bg)", green: "var(--c-green-fg);var(--c-green-bg)", sky: "var(--c-sky-fg);var(--c-sky-bg)", amber: "var(--c-amber-fg);var(--c-amber-bg)", rose: "var(--c-rose-fg);var(--c-rose-bg)", violet: "var(--c-violet-fg);var(--c-violet-bg)" };

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>" + greeting + (me ? ", " + UI.escape(me.name) : "") + "</h1>" +
      "<div class='page-sub'>" + dateLine + " · <span id='dashClock'>" + now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + "</span> · " + UI.escape(hospital) + "</div></div>" +
      "<div class='page-actions'>" +
        "<button class='btn btn-outline' data-newinvoice>" + icon("receipt", 15) + "New invoice</button>" +
        "<button class='btn btn-primary' data-newappt>" + icon("plus", 15) + "New appointment</button>" +
      "</div>" +
    "</div>" +

    (Store.isEmpty()
      ? "<div class='card' style='margin-bottom:18px'><div class='card-body row wrap' style='align-items:center;gap:14px;padding:16px 20px'>" +
          "<div class='kpi-icon' style='width:40px;height:40px;background:var(--c-teal-bg);color:var(--c-teal-fg);border-radius:11px'>" + icon("paw", 20) + "</div>" +
          "<div class='grow' style='min-width:220px'><div style='font-weight:800;font-size:15px'>Welcome to IZEX</div>" +
          "<div class='muted small' style='margin-top:2px'>The practice is empty. Register your first client, or load the sample dataset to explore every module.</div></div>" +
          "<button class='btn btn-primary btn-sm' data-onboard-client>" + icon("plus", 14) + "New client</button>" +
          "<button class='btn btn-outline btn-sm' data-onboard-sample>" + icon("download", 14) + "Load sample data</button>" +
        "</div></div>"
      : "") +

    /* KPI row */
    "<div class='grid grid-4 stagger'>" +
      kpiCard("calendar", "teal", "Appointments today", stats.apptsToday, "count", { html: "<span class='kpi-delta up'>" + stats.remainingToday + " remaining</span><span class='kpi-note'>" + stats.doneToday + " completed</span>" }) +
      kpiCard("paw", "violet", "Active patients", stats.patientsActive, "count", { html: "<span class='kpi-note'>" + stats.visits30 + " visits completed in 30 days</span>" }) +
      kpiCard("rupee", "green", "Revenue (30 days)", stats.revenue30, "money", { html: "<span class='kpi-delta " + (stats.revenueDelta >= 0 ? "up" : "down") + "'>" + icon(stats.revenueDelta >= 0 ? "trendUp" : "trendDown", 12) + Math.abs(stats.revenueDelta) + "%</span><span class='kpi-note'>vs previous 30 days</span>" }) +
      kpiCard("alert", "amber", "Needs attention", stats.lowStock + stats.overdue, "count", { html: "<span class='kpi-note'>" + stats.lowStock + " low stock · " + stats.overdue + " overdue invoices</span>" }) +
    "</div>" +

    /* charts row */
    "<div class='grid grid-32 mt-18'>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Revenue — last 12 months</div><div class='card-sub'>Payments received across all services</div></div>" +
        "<div class='card-actions'>" + UI.chip("MTD " + Data.fmtMoneyCompact(stats.revenueMtd), "teal", true) + "</div></div>" +
        "<div class='card-body'><div id='chartRevenue'></div></div></div>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Species mix</div><div class='card-sub'>Active patients by species</div></div></div>" +
        "<div class='card-body'><div id='chartMix'></div></div></div>" +
    "</div>" +

    /* schedule + alerts */
    "<div class='grid grid-32 mt-18'>" +
      "<div class='card'><div class='card-head'><div><div class='card-title'>Today's schedule</div><div class='card-sub'>" + todays.length + " appointments · " + stats.remainingToday + " still to come</div></div>" +
        "<div class='card-actions'><button class='btn btn-ghost btn-sm' data-gocal>'Open calendar " + icon("arrowR", 14) + "</button></div></div>" +
        "<div class='card-body stagger' style='padding-top:6px'>" +
          (todays.length ? todays.map(scheduleRow).join("") : "<div class='empty'><div class='empty-icon'>" + icon("calendar", 24) + "</div><div class='empty-title'>Nothing booked today</div><div class='empty-sub'>Enjoy the quiet — or book a visit.</div></div>") +
        "</div></div>" +
      "<div style='display:flex;flex-direction:column;gap:18px'>" +
        "<div class='card'><div class='card-head'><div><div class='card-title'>Alerts</div><div class='card-sub'>Things that need a human</div></div></div>" +
          "<div class='card-body stagger' style='padding-top:8px'>" +
            alerts.map(function (al) {
              var c = kindColor[al.kind] || kindColor.sky;
              var parts = c.split(";");
              return "<div class='row' " + (al.href ? "data-goto='" + al.href + "' style='padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer'" : "style='padding:9px 0;border-bottom:1px solid var(--border)'") + ">" +
                "<div class='kpi-icon' style='width:32px;height:32px;background:" + parts[1] + ";color:" + parts[0] + ";border-radius:9px'>" + icon(al.icon, 15) + "</div>" +
                "<div class='grow' style='font-size:12.5px;line-height:1.45'>" + al.text + "</div>" +
                (al.href ? icon("arrowR", 14) : "") +
              "</div>";
            }).join("") +
          "</div></div>" +
        "<div class='card grow'><div class='card-head'><div><div class='card-title'>Recent activity</div></div></div>" +
          "<div class='card-body' style='padding-top:10px'><div class='timeline stagger'>" +
            (feed.length ? feed.map(function (f) {
              return "<div class='tl-item'><span class='tl-dot'>" + icon(f.icon, 9) + "</span>" +
                "<div class='tl-time'>" + Data.relTime(f.at.split(" ")[0], f.at.split(" ")[1]) + "</div>" +
                "<div class='tl-text'>" + f.text + "</div></div>";
            }).join("") : "<div class='muted small' style='padding:6px 0 10px'>No activity yet — actions you take will appear here.</div>") +
          "</div></div></div>" +
      "</div>" +
    "</div>";

  /* ---------- wire ---------- */

  function kpiCard(iconName, kind, label, value, fmt, foot) {
    var kinds = {
      teal: ["var(--c-teal-bg)", "var(--c-teal-fg)"],
      violet: ["var(--c-violet-bg)", "var(--c-violet-fg)"],
      green: ["var(--c-green-bg)", "var(--c-green-fg)"],
      amber: ["var(--c-amber-bg)", "var(--c-amber-fg)"]
    };
    var k = kinds[kind] || kinds.teal;
    return "<div class='card kpi hoverable'>" +
      "<div class='kpi-top'><div class='kpi-icon' style='background:" + k[0] + ";color:" + k[1] + "'>" + icon(iconName, 19) + "</div>" +
      "<div class='kpi-label'>" + label + "</div></div>" +
      "<div class='kpi-value' data-value='" + value + "' data-fmt='" + fmt + "'>0</div>" +
      "<div class='kpi-foot'>" + foot.html + "</div></div>";
  }

  /* KPI count-ups */
  root.querySelectorAll("[data-value]").forEach(function (el) {
    var v = parseFloat(el.getAttribute("data-value"));
    var fmt = el.getAttribute("data-fmt");
    UI.countUp(el, v, fmt === "money" ? { money: true } : {});
  });

  /* charts */
  Charts.area(root.querySelector("#chartRevenue"), {
    labels: revenue.labels, values: revenue.values, color: "#0d9488", format: "money", height: 236,
    emptyText: "No payments recorded yet", emptySub: "Invoice and payment history will chart here."
  });
  Charts.donut(root.querySelector("#chartMix"), {
    segments: mix, centerLabel: "patients",
    emptyText: "No patients yet", emptySub: "Register patients to see the species mix."
  });

  /* schedule interactions */
  root.querySelectorAll(".sched-row").forEach(function (row) {
    row.addEventListener("click", function () {
      var appt = Store.find(Store.db.appointments, row.getAttribute("data-appt"));
      if (appt) Actions.apptDetail(appt, refresh);
    });
  });
  root.querySelectorAll("[data-checkin]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var appt = Store.find(Store.db.appointments, btn.getAttribute("data-checkin"));
      if (appt) Actions._setStatus(appt, "arrived", refresh);
    });
  });

  /* buttons */
  root.querySelector("[data-newappt]").addEventListener("click", function () { Actions.appointmentDialog({ onDone: refresh }); });
  root.querySelector("[data-newinvoice]").addEventListener("click", function () { Actions.invoiceDialog({ onDone: refresh }); });
  var obClient = root.querySelector("[data-onboard-client]");
  if (obClient) obClient.addEventListener("click", function () { Actions.clientDialog({ onDone: refresh }); });
  var obSample = root.querySelector("[data-onboard-sample]");
  if (obSample) obSample.addEventListener("click", function () {
    UI.confirm({
      title: "Load sample data?",
      message: "This replaces everything currently in the app with a demo dataset you can explore freely.",
      confirmText: "Load sample"
    }).then(function (ok) {
      if (!ok) return;
      Store.loadSample();
      App.renderSidebar();
      UI.toast({ kind: "success", title: "Sample data loaded", msg: "Explore the modules — clear it anytime." });
      refresh();
    });
  });
  var gocal = root.querySelector("[data-gocal]");
  if (gocal) gocal.addEventListener("click", function () { location.hash = "#/appointments"; });
  root.querySelectorAll("[data-goto]").forEach(function (el) {
    el.addEventListener("click", function () { location.hash = el.getAttribute("data-goto"); });
  });

  /* live clock */
  var clockEl = root.querySelector("#dashClock");
  var timer = setInterval(function () {
    if (!document.body.contains(clockEl)) { clearInterval(timer); return; }
    clockEl.textContent = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }, 30000);
  if (window.Router && Router.onCleanup) Router.onCleanup(function () { clearInterval(timer); });
};
