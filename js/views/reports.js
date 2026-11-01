/* IZEX — Reports view */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var reportsState = { range: 30 };

Views.reports = function (root) {
  var state = reportsState;

  function refresh() { Views.reports(root); }

  var to = Data.todayISO();
  var from = Data.iso(Data.addDays(new Date(), -(state.range - 1)));
  var rangeLabel = state.range === 365 ? "last 12 months" : "last " + state.range + " days";

  /* KPIs */
  var revenue = Store.paymentsBetween(from, to);
  var appts = Store.apptsInRange(from, to);
  var completed = appts.filter(function (a) { return a.status === "completed"; }).length;
  var noShows = appts.filter(function (a) { return a.status === "no-show"; }).length;
  var cancelled = appts.filter(function (a) { return a.status === "cancelled"; }).length;
  var noShowRate = appts.length ? Math.round((noShows / appts.length) * 1000) / 10 : 0;

  var invs = Store.db.invoices.filter(function (inv) { return inv.date >= from && inv.date <= to; });
  var avgInvoice = invs.length ? invs.reduce(function (s, inv) { return s + Data.invoiceTotals(inv).total; }, 0) / invs.length : 0;

  /* revenue series */
  var series;
  if (state.range === 365) {
    series = Store.revenueSeries(12);
  } else {
    var labels = [], values = [];
    for (var i = state.range - 1; i >= 0; i--) {
      var d = Data.addDays(new Date(), -i);
      labels.push(d.getDate() + "");
      values.push(Math.round(Store.paymentsBetween(Data.iso(d), Data.iso(d))));
    }
    series = { labels: labels, values: values };
  }

  /* revenue by service */
  var bySvc = {};
  invs.forEach(function (inv) {
    inv.lines.forEach(function (l) { bySvc[l.desc] = (bySvc[l.desc] || 0) + l.qty * l.price; });
  });
  var svcItems = Object.keys(bySvc).map(function (k) {
    return { label: k, value: Math.round(bySvc[k]) };
  }).sort(function (a, b) { return b.value - a.value; }).slice(0, 8);

  /* vet productivity */
  var vetItems = Store.db.vets.map(function (v) {
    return {
      label: v.name.replace("Dr. ", ""),
      value: appts.filter(function (a) { return a.vetId === v.id && a.status === "completed"; }).length
    };
  });

  /* payments by method */
  var methodMap = { "Card": "#0d9488", "Cash": "#f59e0b", "Bank transfer": "#0ea5e9", "Insurance": "#8b5cf6" };
  var byMethod = {};
  Store.db.invoices.forEach(function (inv) {
    (inv.payments || []).forEach(function (p) {
      if (p.date >= from && p.date <= to) byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
    });
  });
  var methodSegments = Object.keys(methodMap).map(function (m) {
    return { label: m, value: Math.round(byMethod[m] || 0), color: methodMap[m] };
  }).filter(function (s) { return s.value > 0; });

  var bars14 = Store.apptsByDay(14);
  var completion = appts.length ? Math.round((completed / appts.length) * 100) : 0;

  function kpiCard(iconName, kind, label, value, note) {
    var kinds = {
      teal: ["var(--c-teal-bg)", "var(--c-teal-fg)"],
      amber: ["var(--c-amber-bg)", "var(--c-amber-fg)"],
      rose: ["var(--c-rose-bg)", "var(--c-rose-fg)"],
      violet: ["var(--c-violet-bg)", "var(--c-violet-fg)"]
    };
    var k = kinds[kind] || kinds.teal;
    return "<div class='card kpi hoverable'><div class='kpi-top'><div class='kpi-icon' style='background:" + k[0] + ";color:" + k[1] + "'>" + icon(iconName, 19) + "</div>" +
      "<div class='kpi-label'>" + label + "</div></div><div class='kpi-value'>" + value + "</div><div class='kpi-foot'><span class='kpi-note'>" + note + "</span></div></div>";
  }

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Reports</h1><div class='page-sub'>Practice performance — " + rangeLabel + ".</div></div>" +
      "<div class='page-actions'>" +
        "<button class='btn btn-outline' data-csv>" + icon("download", 15) + "Export CSV</button>" +
      "</div>" +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:18px'>" +
      "<div class='filter-chips'>" +
        [["30", "30 days"], ["90", "90 days"], ["365", "12 months"]].map(function (r) {
          return "<button class='filter-chip" + (state.range === parseInt(r[0], 10) ? " active" : "") + "' data-range='" + r[0] + "'>" + r[1] + "</button>";
        }).join("") +
      "</div>" +
    "</div>" +

    "<div class='grid grid-4 stagger' style='margin-bottom:18px'>" +
      kpiCard("rupee", "teal", "Revenue", Data.fmtMoney(revenue), rangeLabel) +
      kpiCard("check", "violet", "Visits completed", completed, appts.length + " appointments scheduled") +
      kpiCard("alert", "amber", "No-show rate", noShowRate + "%", noShows + " no-shows recorded") +
      kpiCard("receipt", "rose", "Avg invoice value", Data.fmtMoney(avgInvoice), invs.length + " invoices issued") +
    "</div>" +

    "<div class='grid grid-32' style='margin-bottom:18px'>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Revenue</div><div class='card-sub'>" + (state.range === 365 ? "Monthly" : "Daily") + " payments received</div></div></div>" +
        "<div class='card-body'><div id='repRevenue'></div></div></div>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Payments by method</div><div class='card-sub'>" + rangeLabel + "</div></div></div>" +
        "<div class='card-body'><div id='repMethod'></div></div></div>" +
    "</div>" +

    "<div class='grid grid-2' style='margin-bottom:18px'>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Appointments</div><div class='card-sub'>Last 14 days</div></div></div>" +
        "<div class='card-body'><div id='repBars'></div></div></div>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Revenue by service</div><div class='card-sub'>Top services in range</div></div></div>" +
        "<div class='card-body'><div id='repSvc'></div></div></div>" +
    "</div>" +

    "<div class='grid grid-2'>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Vet productivity</div><div class='card-sub'>Completed visits " + rangeLabel + "</div></div></div>" +
        "<div class='card-body'><div id='repVet'></div></div></div>" +
      "<div class='card hoverable'><div class='card-head'><div><div class='card-title'>Operations</div><div class='card-sub'>Scheduling health</div></div></div>" +
        "<div class='card-body'>" +
          "<div class='row' style='justify-content:space-between;margin-bottom:8px'><span class='muted small'>Completion rate</span><span class='bold'>" + completion + "%</span></div>" +
          "<div class='meter' style='width:100%;height:9px'><div class='meter-fill ok' data-w='" + completion + "' style='width:0'></div></div>" +
          "<div class='divider'></div>" +
          "<div class='row' style='justify-content:space-between;padding:5px 0'><span class='muted small'>Appointments in range</span><span class='bold tnum'>" + appts.length + "</span></div>" +
          "<div class='row' style='justify-content:space-between;padding:5px 0'><span class='muted small'>Completed</span><span class='bold tnum' style='color:var(--c-teal-fg)'>" + completed + "</span></div>" +
          "<div class='row' style='justify-content:space-between;padding:5px 0'><span class='muted small'>No-shows</span><span class='bold tnum' style='color:var(--c-rose-fg)'>" + noShows + "</span></div>" +
          "<div class='row' style='justify-content:space-between;padding:5px 0'><span class='muted small'>Cancelled</span><span class='bold tnum' style='color:var(--muted)'>" + cancelled + "</span></div>" +
        "</div></div>" +
    "</div>";

  /* charts */
  Charts.area(root.querySelector("#repRevenue"), {
    labels: series.labels, values: series.values, color: "#0d9488", format: "money", height: 230,
    emptyText: "No payments in this range", emptySub: "Revenue will chart here once payments are recorded."
  });
  Charts.donut(root.querySelector("#repMethod"), {
    segments: methodSegments,
    centerLabel: "received",
    emptyText: "No payments in this range", emptySub: "Recorded payments will break down by method here."
  });
  Charts.bars(root.querySelector("#repBars"), {
    labels: bars14.labels, values: bars14.values, color: "#0ea5e9", height: 200,
    emptyText: "No appointments in the last 14 days", emptySub: "Booked appointments will appear here."
  });
  Charts.hbar(root.querySelector("#repSvc"), {
    items: svcItems, color: "#0d9488",
    emptyText: "No services billed in this range", emptySub: "Invoice lines for the selected period will rank here."
  });
  Charts.hbar(root.querySelector("#repVet"), {
    items: vetItems, color: "#8b5cf6", color2: "#c4b5fd",
    emptyText: "No completed visits in this range", emptySub: "Completed appointments per veterinarian will appear here."
  });

  requestAnimationFrame(function () {
    var m = root.querySelector(".meter-fill[data-w]");
    if (m) setTimeout(function () { m.style.width = m.getAttribute("data-w") + "%"; }, 80);
  });

  /* wire */
  root.querySelectorAll("[data-range]").forEach(function (b) {
    b.addEventListener("click", function () { state.range = parseInt(b.getAttribute("data-range"), 10); refresh(); });
  });
  root.querySelector("[data-csv]").addEventListener("click", function () {
    var rows = [["IZEX export", "Revenue (" + rangeLabel + ")"], ["Generated", new Date().toLocaleString()], [], ["Month", "Revenue"]];
    var ms = Store.revenueSeries(12);
    ms.labels.forEach(function (l, i) { rows.push([l, ms.values[i]]); });
    rows.push([]);
    rows.push(["Range", rangeLabel]);
    rows.push(["Revenue in range", revenue]);
    rows.push(["Appointments", appts.length]);
    rows.push(["Completed", completed]);
    rows.push(["No-show rate", noShowRate + "%"]);
    var csv = "\ufeff" + rows.map(function (r) { return r.join(","); }).join("\r\n");
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "izex-report.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    UI.toast({ kind: "success", title: "Report exported", msg: "izex-report.csv downloaded" });
  });
};
