/* IZEX — Billing view */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var billingState = { q: "", filter: "all" };

Views.billing = function (root) {
  var state = billingState;

  function refresh() { Views.billing(root); }

  function invChip(status) {
    var map = { paid: ["Paid", "teal"], partial: ["Partial", "amber"], overdue: ["Overdue", "rose"], sent: ["Sent", "sky"], draft: ["Draft", "slate"] };
    var m = map[status] || [status, "slate"];
    return UI.chip(m[0], m[1], true);
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return Store.db.invoices.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).filter(function (inv) {
      var status = Data.invoiceStatus(inv);
      if (state.filter !== "all" && status !== state.filter) return false;
      if (!q) return true;
      var c = Store.clientById(inv.clientId);
      return (inv.id + " " + (c ? Store.clientName(c) : "")).toLowerCase().indexOf(q) >= 0;
    });
  }

  function row(inv, i) {
    var t = Data.invoiceTotals(inv);
    var status = Data.invoiceStatus(inv);
    var c = Store.clientById(inv.clientId);
    var p = inv.patientId ? Store.patientById(inv.patientId) : null;
    return "<tr data-inv='" + inv.id + "'>" +
      "<td class='cell-main nowrap'>" + inv.id + "</td>" +
      "<td><div class='cell-flex'>" + UI.avatar(Store.clientName(c), Data.colorFor(inv.clientId), "avatar-sm") +
        "<div><div class='cell-main'>" + UI.escape(Store.clientName(c)) + "</div>" +
        (p ? "<div class='cell-sub'>" + UI.escape(p.name) + "</div>" : "") + "</div></div></td>" +
      "<td class='nowrap muted'>" + Data.fmtDate(inv.date) + "</td>" +
      "<td class='nowrap muted'>" + inv.lines.length + " item" + (inv.lines.length === 1 ? "" : "s") + "</td>" +
      "<td class='num bold'>" + Data.fmtMoney(t.total) + "</td>" +
      "<td class='num'>" + (t.balance > 0 ? "<span style='color:var(--c-amber-fg);font-weight:700'>" + Data.fmtMoney(t.balance) + "</span>" : "<span class='muted'>—</span>") + "</td>" +
      "<td>" + invChip(status) + "</td>" +
    "</tr>";
  }

  var list = filtered();
  var stats = Store.stats();
  var week = Store.paymentsBetween(Data.iso(Data.addDays(new Date(), -7)), Data.todayISO());

  /* aging buckets */
  var aging = { a: 0, b: 0, c: 0 };
  Store.db.invoices.forEach(function (inv) {
    if (Data.invoiceStatus(inv) === "paid") return;
    var bal = Data.invoiceTotals(inv).balance;
    var days = Math.abs(Data.daysUntil(inv.date));
    if (days <= 30) aging.a += bal;
    else if (days <= 60) aging.b += bal;
    else aging.c += bal;
  });

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Billing</h1><div class='page-sub'>Invoices, payments and receivables.</div></div>" +
      "<div class='page-actions'><button class='btn btn-primary' data-new>" + icon("plus", 15) + "New invoice</button></div>" +
    "</div>" +

    "<div class='grid grid-4 stagger' style='margin-bottom:18px'>" +
      "<div class='card kpi hoverable'><div class='kpi-top'><div class='kpi-icon' style='background:var(--c-teal-bg);color:var(--c-teal-fg)'>" + icon("rupee", 19) + "</div><div class='kpi-label'>Revenue MTD</div></div><div class='kpi-value'>" + Data.fmtMoney(stats.revenueMtd) + "</div><div class='kpi-foot'><span class='kpi-note'>" + Data.fmtMoney(week) + " in the last 7 days</span></div></div>" +
      "<div class='card kpi hoverable'><div class='kpi-top'><div class='kpi-icon' style='background:var(--c-amber-bg);color:var(--c-amber-fg)'>" + icon("clock", 19) + "</div><div class='kpi-label'>Outstanding</div></div><div class='kpi-value'>" + Data.fmtMoney(stats.outstanding) + "</div><div class='kpi-foot'><span class='kpi-note'>across open invoices</span></div></div>" +
      "<div class='card kpi hoverable'><div class='kpi-top'><div class='kpi-icon' style='background:var(--c-rose-bg);color:var(--c-rose-fg)'>" + icon("alert", 19) + "</div><div class='kpi-label'>Overdue invoices</div></div><div class='kpi-value'>" + stats.overdue + "</div><div class='kpi-foot'><span class='kpi-note'>need follow-up</span></div></div>" +
      "<div class='card kpi hoverable'><div class='kpi-top'><div class='kpi-icon' style='background:var(--c-violet-bg);color:var(--c-violet-fg)'>" + icon("card", 19) + "</div><div class='kpi-label'>Invoices issued</div></div><div class='kpi-value'>" + Store.db.invoices.length + "</div><div class='kpi-foot'><span class='kpi-note'>lifetime issued</span></div></div>" +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:16px'>" +
      "<div style='position:relative;width:300px'>" +
        "<span style='position:absolute;left:11px;top:11px;color:var(--faint)'>" + icon("search", 15) + "</span>" +
        "<input class='input' data-q placeholder='Search invoice or client…' style='padding-left:36px' value='" + UI.escape(state.q) + "'></div>" +
      "<div class='filter-chips'>" +
        ["all:All", "paid:Paid", "partial:Partial", "sent:Sent", "overdue:Overdue"].map(function (f) {
          var parts = f.split(":");
          return "<button class='filter-chip" + (state.filter === parts[0] ? " active" : "") + "' data-f='" + parts[0] + "'>" + parts[1] + "</button>";
        }).join("") +
      "</div>" +
    "</div>" +

    "<div class='grid grid-23' style='align-items:start'>" +
      "<div class='card'><div class='card-head'><div class='card-title'>Aging</div></div>" +
        "<div class='card-body' style='padding-top:8px'><div id='agingChart'></div>" +
        "<div class='divider'></div>" +
        "<div class='row'><span class='muted small grow'>Total receivable</span><span class='bold'>" + Data.fmtMoney(aging.a + aging.b + aging.c) + "</span></div></div></div>" +
      "<div class='card'>" +
        (list.length
          ? "<div class='tbl-wrap'><table class='tbl'><thead><tr><th>Invoice</th><th>Client</th><th>Date</th><th>Items</th><th class='num'>Total</th><th class='num'>Balance</th><th>Status</th></tr></thead><tbody class='stagger'>" + list.map(row).join("") + "</tbody></table></div>"
          : (Store.db.invoices.length === 0
              ? "<div class='empty'><div class='empty-icon'>" + icon("receipt", 24) + "</div><div class='empty-title'>No invoices yet</div><div class='empty-sub'>Create your first invoice with the New invoice button above.</div></div>"
              : "<div class='empty'><div class='empty-icon'>" + icon("receipt", 24) + "</div><div class='empty-title'>No invoices match</div><div class='empty-sub'>Adjust the filters or create a new invoice.</div></div>")) +
      "</div>" +
    "</div>";

  Charts.hbar(root.querySelector("#agingChart"), {
    items: [
      { label: "0 – 30 days", value: Math.round(aging.a) },
      { label: "31 – 60 days", value: Math.round(aging.b) },
      { label: "60+ days", value: Math.round(aging.c) }
    ],
    color: "#f59e0b",
    color2: "#fbbf24",
    emptyText: "All settled",
    emptySub: "No outstanding balances right now."
  });

  /* wire */
  var q = root.querySelector("[data-q]");
  q.addEventListener("input", function () {
    state.q = q.value;
    clearTimeout(q._t);
    q._t = setTimeout(function () {
      refresh();
      var again = root.querySelector("[data-q]");
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    }, 280);
  });
  root.querySelectorAll("[data-f]").forEach(function (b) {
    b.addEventListener("click", function () { state.filter = b.getAttribute("data-f"); refresh(); });
  });
  root.querySelector("[data-new]").addEventListener("click", function () {
    Actions.invoiceDialog({ onDone: refresh });
  });
  root.querySelectorAll("tr[data-inv]").forEach(function (tr) {
    tr.addEventListener("click", function () {
      var inv = Store.find(Store.db.invoices, tr.getAttribute("data-inv"));
      if (inv) openInvoice(inv, refresh);
    });
  });

  /* ---------- invoice drawer ---------- */

  function openInvoice(inv, onDone) {
    var c = Store.clientById(inv.clientId);
    var status = Data.invoiceStatus(inv);

    function bodyHtml() {
      var t = Data.invoiceTotals(inv);
      status = Data.invoiceStatus(inv);
      var lines = inv.lines.map(function (l) {
        return "<tr><td>" + UI.escape(l.desc) + "</td><td class='num'>" + l.qty + "</td><td class='num'>" + Data.fmtMoney(l.price) + "</td><td class='num bold'>" + Data.fmtMoney(l.qty * l.price) + "</td></tr>";
      }).join("");
      var payments = (inv.payments || []).length
        ? inv.payments.map(function (p) {
            return "<div class='row' style='padding:8px 0;border-bottom:1px solid var(--border)'>" +
              "<span class='avatar avatar-sm' style='width:26px;height:26px;background:var(--c-teal-bg);color:var(--c-teal-fg)'>" + icon("card", 13) + "</span>" +
              "<div class='grow'><div style='font-size:12.5px;font-weight:600'>" + UI.escape(p.method) + "</div><div class='faint' style='font-size:11px'>" + Data.fmtDateLong(p.date) + "</div></div>" +
              "<span class='bold tnum'>" + Data.fmtMoney(p.amount) + "</span></div>";
          }).join("")
        : "<div class='muted small'>No payments recorded yet.</div>";

      return "<div class='tbl-wrap'><table class='tbl'><thead><tr><th>Description</th><th class='num'>Qty</th><th class='num'>Price</th><th class='num'>Amount</th></tr></thead><tbody>" + lines +
        "</tbody></table></div>" +
        "<div class='totals-box' style='margin-top:14px'>" +
          "<div class='totals-row grand'><span>Total</span><span class='v'>" + Data.fmtMoney(t.total) + "</span></div>" +
          (t.paid > 0 ? "<div class='totals-row' style='color:var(--c-teal-fg)'><span>Paid</span><span class='v' style='color:inherit'>− " + Data.fmtMoney(t.paid) + "</span></div>" : "") +
          (t.balance > 0 ? "<div class='totals-row' style='color:var(--c-amber-fg);font-weight:700'><span>Balance due</span><span class='v' style='color:inherit'>" + Data.fmtMoney(t.balance) + "</span></div>" : "") +
        "</div>" +
        "<div class='sec-title'>Payments</div>" + payments;
    }

    UI.drawer({
      head: "<div class='row'>" +
          "<span class='avatar avatar-sq avatar-lg' style='background:" + Data.colorFor(inv.clientId) + "'>" + icon("receipt", 22) + "</span>" +
          "<div class='grow'><div style='font-size:17px;font-weight:800;letter-spacing:-.02em'>" + inv.id + "</div>" +
          "<div class='muted small' style='margin-top:2px'>" + UI.escape(Store.clientName(c)) + " · issued " + Data.fmtDateLong(inv.date) + " · due " + Data.fmtDateLong(inv.due) + "</div>" +
          "<div style='margin-top:6px'>" + invChip(status) + "</div></div>" +
          "<button class='icon-btn' data-close>" + icon("x", 16) + "</button></div>",
      body: "<div data-invbody>" + bodyHtml() + "</div>",
      foot: "<button class='btn btn-outline btn-sm' data-print>" + icon("printer", 14) + "Print bill</button>" +
            "<button class='btn btn-outline btn-sm' data-pay style='display:" + (Data.invoiceTotals(inv).balance > 0 ? "inline-flex" : "none") + "'>" + icon("rupee", 14) + "Record payment</button>",
      onMount: function (rootEl, close) {
        rootEl.querySelector("[data-print]").addEventListener("click", function () {
          Actions.printBill(inv);
        });
        var payBtn = rootEl.querySelector("[data-pay]");
        if (payBtn) payBtn.addEventListener("click", function () {
          Actions.paymentDialog({
            invoice: inv,
            onDone: function () {
              rootEl.querySelector("[data-invbody]").innerHTML = bodyHtml();
              var t = Data.invoiceTotals(inv);
              payBtn.style.display = t.balance > 0 ? "inline-flex" : "none";
              var newStatus = Data.invoiceStatus(inv);
              var chipEl = rootEl.querySelector(".drawer-head .chip");
              if (chipEl) chipEl.outerHTML = invChip(newStatus);
              onDone();
            }
          });
        });
      }
    });
  }
};
