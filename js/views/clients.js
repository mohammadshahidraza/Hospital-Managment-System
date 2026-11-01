/* IZEX — Clients view */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var clientsState = { q: "", filter: "all", _hash: "" };

Views.clients = function (root) {
  var state = clientsState;
  /* apply a search term arriving via the global search (#/clients?q=…) once */
  if (location.hash !== state._hash) {
    state._hash = location.hash;
    var m = location.hash.match(/[?&]q=([^&]+)/);
    if (m) state.q = decodeURIComponent(m[1]);
  }

  function refresh() { Views.clients(root); }

  function clientBalance(c) {
    var sum = 0;
    Store.db.invoices.forEach(function (inv) {
      if (inv.clientId === c.id && Data.invoiceStatus(inv) !== "paid") sum += Data.invoiceTotals(inv).balance;
    });
    return Math.round(sum * 100) / 100;
  }

  function clientVisits(c) {
    var petIds = Store.patientsOf(c.id).map(function (p) { return p.id; });
    return Store.db.appointments.filter(function (a) {
      return petIds.indexOf(a.patientId) >= 0 && a.status === "completed";
    }).length;
  }

  function lastVisit(c) {
    var petIds = Store.patientsOf(c.id).map(function (p) { return p.id; });
    var dates = Store.db.encounters
      .filter(function (e) { return petIds.indexOf(e.patientId) >= 0; })
      .map(function (e) { return e.date; });
    dates = dates.concat(Store.db.appointments.filter(function (a) {
      return petIds.indexOf(a.patientId) >= 0 && a.status === "completed" && a.date <= Data.todayISO();
    }).map(function (a) { return a.date; }));
    if (!dates.length) return null;
    dates.sort();
    return dates[dates.length - 1];
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return Store.db.clients.filter(function (c) {
      var bal = clientBalance(c);
      if (state.filter === "balance" && bal <= 0) return false;
      if (state.filter === "new" && Data.daysUntil(c.since) < -90) return false;
      if (!q) return true;
      var pets = Store.patientsOf(c.id).map(function (p) { return p.name; }).join(" ");
      return (Store.clientName(c) + " " + c.phone + " " + c.email + " " + pets).toLowerCase().indexOf(q) >= 0;
    });
  }

  function row(c) {
    var pets = Store.patientsOf(c.id);
    var bal = clientBalance(c);
    var lv = lastVisit(c);
    var petIcons = pets.slice(0, 4).map(function (p) {
      return "<span title='" + UI.escape(p.name) + "' style='color:" + Data.colorFor(p.name) + "'>" + icon(Data.speciesIcon(p.species), 15) + "</span>";
    }).join("");
    return "<tr data-client='" + c.id + "'>" +
      "<td><div class='cell-flex'>" + UI.avatar(Store.clientName(c), Data.colorFor(c.id)) +
        "<div><div class='cell-main'>" + UI.escape(Store.clientName(c)) + "</div><div class='cell-sub'>" + UI.escape(c.email) + "</div></div></div></td>" +
      "<td class='nowrap'>" + UI.escape(c.phone) + "</td>" +
      "<td><div class='cell-flex' style='gap:7px'>" + petIcons + "<span class='muted small'>" + pets.length + " pet" + (pets.length === 1 ? "" : "s") + "</span></div></td>" +
      "<td class='nowrap muted'>" + Data.fmtDate(c.since) + "</td>" +
      "<td class='nowrap muted'>" + (lv ? Data.fmtDate(lv) : "—") + "</td>" +
      "<td>" + (bal > 0 ? UI.chip(Data.fmtMoney(bal), "amber", true) : UI.chip("Settled", "teal")) + "</td>" +
    "</tr>";
  }

  var list = filtered();
  var totalBal = Store.db.clients.reduce(function (s, c) { return s + clientBalance(c); }, 0);

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Clients</h1><div class='page-sub'>" + Store.db.clients.length + " registered owners · " + Data.fmtMoney(totalBal) + " outstanding across the practice</div></div>" +
      "<div class='page-actions'><button class='btn btn-primary' data-new>" + icon("plus", 15) + "New client</button></div>" +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:16px'>" +
      "<div class='input-icon' style='width:300px'><span style='position:absolute;left:11px;top:11px;color:var(--faint)'>" + icon("search", 15) + "</span>" +
        "<input class='input' data-q placeholder='Search name, phone, email or pet…' value='" + UI.escape(state.q) + "'></div>" +
      "<div class='filter-chips'>" +
        "<button class='filter-chip" + (state.filter === "all" ? " active" : "") + "' data-filter='all'>All <span class='count'>" + Store.db.clients.length + "</span></button>" +
        "<button class='filter-chip" + (state.filter === "balance" ? " active" : "") + "' data-filter='balance'>With balance</button>" +
        "<button class='filter-chip" + (state.filter === "new" ? " active" : "") + "' data-filter='new'>New (90 days)</button>" +
      "</div>" +
      "<div class='grow'></div>" +
      "<span class='muted small'>" + list.length + " shown</span>" +
    "</div>" +

    "<div class='card'>" +
      (list.length
        ? "<div class='tbl-wrap'><table class='tbl'><thead><tr><th>Client</th><th>Phone</th><th>Patients</th><th>Client since</th><th>Last visit</th><th>Balance</th></tr></thead><tbody class='stagger'>" + list.map(row).join("") + "</tbody></table></div>"
        : (Store.db.clients.length === 0
            ? "<div class='empty'><div class='empty-icon'>" + icon("users", 24) + "</div><div class='empty-title'>No clients yet</div><div class='empty-sub'>Register your first client with the New client button above.</div></div>"
            : "<div class='empty'><div class='empty-icon'>" + icon("users", 24) + "</div><div class='empty-title'>No clients match</div><div class='empty-sub'>Adjust the search or filters.</div></div>")) +
    "</div>";

  /* wire */
  var input = root.querySelector("[data-q]");
  input.addEventListener("input", function () {
    state.q = input.value;
    var t = setTimeout(function () { /* live filtering without losing focus */
      var sel = document.activeElement === input ? input.selectionStart : null;
      Views.clients(root);
      var again = root.querySelector("[data-q]");
      again.focus();
      if (sel != null) again.setSelectionRange(sel, sel);
    }, 260);
    clearTimeout(input._t);
    input._t = t;
  });

  root.querySelectorAll("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () { state.filter = b.getAttribute("data-filter"); refresh(); });
  });
  root.querySelector("[data-new]").addEventListener("click", function () {
    Actions.clientDialog({ onDone: refresh });
  });
  root.querySelectorAll("tr[data-client]").forEach(function (tr) {
    tr.addEventListener("click", function () {
      var c = Store.clientById(tr.getAttribute("data-client"));
      if (c) openClientDrawer(c, refresh);
    });
  });

  /* ---------- client drawer ---------- */

  function openClientDrawer(c, onDone) {
    function headHtml() {
      return "<div class='row'>" + UI.avatar(Store.clientName(c), Data.colorFor(c.id), "avatar-lg") +
        "<div class='grow'><div style='font-size:18px;font-weight:800;letter-spacing:-.02em'>" + UI.escape(Store.clientName(c)) + "</div>" +
        "<div class='muted small' style='margin-top:2px'>Client since " + Data.fmtDateLong(c.since) + " · " + c.id + "</div></div>" +
        "<button class='icon-btn' data-close>" + icon("x", 16) + "</button></div>";
    }

    function bodyHtml() {
      var pets = Store.patientsOf(c.id);
      var bal = clientBalance(c);
      var visits = clientVisits(c);
      var log = Store.db.appointments
        .filter(function (a) {
          var p = Store.patientById(a.patientId);
          return p && p.ownerId === c.id;
        })
        .sort(function (a, b) { return (b.date + b.start) < (a.date + a.start) ? -1 : 1; })
        .slice(0, 6);

      return "<div class='stat-row'>" +
          "<div class='stat-box'><div class='label'>Patients</div><div class='value'>" + pets.length + "</div></div>" +
          "<div class='stat-box'><div class='label'>Visits</div><div class='value'>" + visits + "</div></div>" +
          "<div class='stat-box'><div class='label'>Balance</div><div class='value" + (bal > 0 ? " sm' style='color:var(--c-amber-fg)" : "") + "'>" + Data.fmtMoney(bal) + "</div></div>" +
        "</div>" +

        "<div class='sec-title'>Contact</div>" +
        contactRow("phone", c.phone) +
        contactRow("mail", c.email) +
        contactRow("mapPin", c.address) +
        (c.notes ? contactRow("file", c.notes) : "") +

        "<div class='sec-title'>Patients</div>" +
        (pets.length ? pets.map(function (p) {
          var status = worstVax(p);
          return "<div class='pet-mini' data-openpet='" + p.id + "'>" +
            "<span class='avatar avatar-sq' style='background:" + Data.colorFor(p.name) + "'>" + icon(Data.speciesIcon(p.species), 16) + "</span>" +
            "<div class='grow'><div style='font-weight:700;font-size:13.5px'>" + UI.escape(p.name) + "</div>" +
            "<div class='muted' style='font-size:12px'>" + UI.escape(p.breed) + " · " + Data.petAge(p.birthDate) + " · " + p.weightKg + " kg</div></div>" +
            status.chip + icon("chevR", 15) +
          "</div>";
        }).join("") : "<div class='muted small'>No patients registered yet.</div>") +

        "<div class='sec-title'>Recent appointments</div>" +
        (log.length ? "<div class='timeline'>" + log.map(function (a) {
          var p = Store.patientById(a.patientId);
          return "<div class='tl-item'><span class='tl-dot'>" + icon("calendar", 9) + "</span>" +
            "<div class='tl-time'>" + Data.fmtDate(a.date) + " · " + Data.fmtTime(a.start) + "</div>" +
            "<div class='tl-text'><b>" + UI.escape(p ? p.name : "?") + "</b> — " + UI.escape(a.type) + " " + Actions.statusChip(a.status) + "</div></div>";
        }).join("") + "</div>" : "<div class='muted small'>No appointments yet.</div>");
    }

    function contactRow(ic, val) {
      if (!val) return "";
      return "<div class='row' style='padding:6px 0;gap:10px;color:var(--text-2)'>" + icon(ic, 15) + "<span style='font-size:13px'>" + UI.escape(val) + "</span></div>";
    }

    function worstVax(p) {
      var worst = "current";
      (p.vaccines || []).forEach(function (v) {
        var s = Data.vaccineStatus(v.due);
        if (s === "overdue") worst = "overdue";
        else if (s === "due" && worst !== "overdue") worst = "due";
      });
      if (worst === "overdue") return { chip: UI.chip("Overdue", "rose") };
      if (worst === "due") return { chip: UI.chip("Due soon", "amber") };
      return { chip: UI.chip("Up to date", "teal") };
    }

    var d = UI.drawer({
      head: headHtml(),
      body: bodyHtml(),
      foot: "<button class='btn btn-danger-outline btn-sm' data-del>" + icon("trash", 14) + "Delete</button>" +
            "<button class='btn btn-outline btn-sm' data-edit>" + icon("edit", 14) + "Edit</button>" +
            "<button class='btn btn-outline btn-sm' data-addpet>" + icon("paw", 14) + "Add patient</button>" +
            "<button class='btn btn-primary btn-sm' data-book>" + icon("calendar", 14) + "Book</button>",
      onMount: function (rootEl, close) {
        function rewire() {
          rootEl.querySelectorAll("[data-openpet]").forEach(function (el) {
            el.addEventListener("click", function () {
              Views.openPatientDrawer(el.getAttribute("data-openpet"), function () {
                refresh();
                /* the patient may have been edited or deleted — rebuild this drawer too */
                var bodyEl = rootEl.querySelector(".drawer-body");
                if (bodyEl) { bodyEl.innerHTML = bodyHtml(); rewire(); }
              });
            });
          });
        }
        rewire();
        rootEl.querySelector("[data-del]").addEventListener("click", function () {
          Actions.confirmDeleteClient(c, function () { close(); onDone(); });
        });
        rootEl.querySelector("[data-edit]").addEventListener("click", function () {
          Actions.clientDialog({ client: c, onDone: function () { close(); onDone(); } });
        });
        rootEl.querySelector("[data-addpet]").addEventListener("click", function () {
          Actions.patientDialog({ ownerId: c.id, onDone: function () { close(); onDone(); } });
        });
        rootEl.querySelector("[data-book]").addEventListener("click", function () {
          Actions.appointmentDialog({ onDone: function () { close(); onDone(); } });
        });
      }
    });
  }
};
