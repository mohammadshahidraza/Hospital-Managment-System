/* IZEX — Patients view + patient drawer (shared) */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var patientsState = { q: "", species: "all", _hash: "" };

Views.patients = function (root) {
  var state = patientsState;
  /* apply a search term arriving via the global search (#/patients?q=…) once */
  if (location.hash !== state._hash) {
    state._hash = location.hash;
    var m = location.hash.match(/[?&]q=([^&]+)/);
    if (m) state.q = decodeURIComponent(m[1]);
  }

  function refresh() { Views.patients(root); }

  function worstVax(p) {
    var worst = "current";
    (p.vaccines || []).forEach(function (v) {
      var s = Data.vaccineStatus(v.due);
      if (s === "overdue") worst = "overdue";
      else if (s === "due" && worst !== "overdue") worst = "due";
    });
    return worst;
  }

  function filtered() {
    var q = state.q.toLowerCase();
    return Store.db.patients.filter(function (p) {
      if (state.species === "dog" && p.species !== "dog") return false;
      if (state.species === "cat" && p.species !== "cat") return false;
      if (state.species === "other" && (p.species === "dog" || p.species === "cat")) return false;
      if (!q) return true;
      var owner = Store.ownerOf(p);
      return (p.name + " " + p.breed + " " + (owner ? Store.clientName(owner) : "")).toLowerCase().indexOf(q) >= 0;
    });
  }

  function card(p, i) {
    var owner = Store.ownerOf(p);
    var vax = worstVax(p);
    var vaxChip = vax === "overdue" ? UI.chip("Vaccines overdue", "rose", true)
      : vax === "due" ? UI.chip("Vaccines due", "amber", true)
      : UI.chip("Vaccines current", "teal", true);
    return "<div class='card hoverable' data-patient='" + p.id + "' style='cursor:pointer;padding:18px'>" +
      "<div class='row'>" +
        "<span class='avatar avatar-lg avatar-sq' style='background:" + Data.colorFor(p.name) + "'>" + icon(Data.speciesIcon(p.species), 24) + "</span>" +
        "<div class='grow' style='min-width:0'>" +
          "<div class='bold' style='font-size:15px'>" + UI.escape(p.name) + "</div>" +
          "<div class='muted small' style='white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + UI.escape(p.breed) + "</div>" +
        "</div>" + vaxChip +
      "</div>" +
      "<div class='row' style='margin-top:14px;gap:14px;flex-wrap:wrap'>" +
        "<span class='small muted'>" + Data.petAge(p.birthDate) + " · " + p.sex + (p.neutered ? " (neutered)" : "") + "</span>" +
        "<span class='small muted'>" + p.weightKg + " kg</span>" +
      "</div>" +
      "<div class='divider' style='margin:12px 0'></div>" +
      "<div class='row'><span class='small muted grow'>Owner: <b style='color:var(--text-2)'>" + UI.escape(owner ? Store.clientName(owner) : "—") + "</b></span>" +
        (p.chronic && p.chronic.length ? UI.chip(p.chronic[0], "violet") : "") +
        icon("chevR", 15) +
      "</div>" +
    "</div>";
  }

  var list = filtered();

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Patients</h1><div class='page-sub'>" + Store.db.patients.length + " animals under care</div></div>" +
      "<div class='page-actions'><button class='btn btn-primary' data-new>" + icon("plus", 15) + "New patient</button></div>" +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:16px'>" +
      "<div style='position:relative;width:300px'>" +
        "<span style='position:absolute;left:11px;top:11px;color:var(--faint)'>" + icon("search", 15) + "</span>" +
        "<input class='input' data-q placeholder='Search patient, breed or owner…' style='padding-left:36px' value='" + UI.escape(state.q) + "'></div>" +
      "<div class='filter-chips'>" +
        "<button class='filter-chip" + (state.species === "all" ? " active" : "") + "' data-sp='all'>All</button>" +
        "<button class='filter-chip" + (state.species === "dog" ? " active" : "") + "' data-sp='dog'>" + icon("dog", 14) + " Dogs</button>" +
        "<button class='filter-chip" + (state.species === "cat" ? " active" : "") + "' data-sp='cat'>" + icon("cat", 14) + " Cats</button>" +
        "<button class='filter-chip" + (state.species === "other" ? " active" : "") + "' data-sp='other'>" + icon("paw", 14) + " Other</button>" +
      "</div>" +
      "<div class='grow'></div><span class='muted small'>" + list.length + " shown</span>" +
    "</div>" +

    "<div class='grid grid-cards stagger'>" + list.map(card).join("") + "</div>" +
    (list.length ? "" : (Store.db.patients.length === 0
      ? "<div class='card'><div class='empty'><div class='empty-icon'>" + icon("paw", 24) + "</div><div class='empty-title'>No patients yet</div><div class='empty-sub'>Register your first patient with the New patient button above.</div></div></div>"
      : "<div class='card'><div class='empty'><div class='empty-icon'>" + icon("paw", 24) + "</div><div class='empty-title'>No patients match</div><div class='empty-sub'>Adjust the search or filters.</div></div></div>"));

  /* wire */
  var input = root.querySelector("[data-q]");
  input.addEventListener("input", function () {
    clearTimeout(input._t);
    input._t = setTimeout(function () {
      state.q = input.value;
      Views.patients(root);
      var again = root.querySelector("[data-q]");
      again.focus();
      again.setSelectionRange(again.value.length, again.value.length);
    }, 260);
  });
  root.querySelectorAll("[data-sp]").forEach(function (b) {
    b.addEventListener("click", function () { state.species = b.getAttribute("data-sp"); refresh(); });
  });
  root.querySelector("[data-new]").addEventListener("click", function () {
    Actions.patientDialog({ onDone: refresh });
  });
  root.querySelectorAll("[data-patient]").forEach(function (el) {
    el.addEventListener("click", function () { Views.openPatientDrawer(el.getAttribute("data-patient"), refresh); });
  });
};

/* ---------- shared patient drawer ---------- */

Views.openPatientDrawer = function (patientId, onDone) {
  var patient = Store.patientById(patientId);
  if (!patient) return;
  var tab = "overview";

  var d = UI.drawer({
    head: headHtml(),
    body: "<div data-tabbody></div>",
    foot: "<button class='btn btn-danger-outline btn-sm' data-del>" + icon("trash", 14) + "Delete</button>" +
          "<button class='btn btn-outline btn-sm' data-edit>" + icon("edit", 14) + "Edit</button>" +
          "<button class='btn btn-outline btn-sm' data-rx>" + icon("pill", 14) + "Prescribe</button>" +
          "<button class='btn btn-primary btn-sm' data-book>" + icon("calendar", 14) + "Book visit</button>",
    onMount: function (rootEl, close) {
      var bodyEl = rootEl.querySelector("[data-tabbody]");
      renderBody(bodyEl);
      rootEl.querySelector("[data-del]").addEventListener("click", function () {
        Actions.confirmDeletePatient(patient, function () { close(); if (onDone) onDone(); });
      });
      rootEl.querySelector("[data-edit]").addEventListener("click", function () {
        Actions.patientDialog({ patient: patient, onDone: function () { close(); if (onDone) onDone(); } });
      });
      rootEl.querySelector("[data-rx]").addEventListener("click", function () {
        close();
        Views.openRxDialog(patient.id, onDone);
      });
      rootEl.querySelector("[data-book]").addEventListener("click", function () {
        close();
        Actions.appointmentDialog({ onDone: onDone });
      });
    }
  });

  function headHtml() {
    var owner = Store.ownerOf(patient);
    var allergy = (patient.allergies || []).length ? UI.chip("Allergy: " + patient.allergies.join(", "), "rose", true) : "";
    return "<div class='row'>" +
      "<span class='avatar avatar-lg avatar-sq' style='background:" + Data.colorFor(patient.name) + "'>" + icon(Data.speciesIcon(patient.species), 26) + "</span>" +
      "<div class='grow'><div style='font-size:18px;font-weight:800;letter-spacing:-.02em'>" + UI.escape(patient.name) + "</div>" +
      "<div class='muted small' style='margin-top:2px'>" + UI.escape(patient.breed) + " · " + Data.petAge(patient.birthDate) + " · " + patient.sex + "</div>" +
      "<div style='margin-top:6px'>" + allergy + "</div></div>" +
      "<button class='icon-btn' data-close>" + icon("x", 16) + "</button>" +
    "</div>";
  }

  function renderBody(bodyEl) {
    var owner = Store.ownerOf(patient);
    var weights = patient.weights || [];
    var last = weights.length ? weights[weights.length - 1].kg : patient.weightKg;
    var first = weights.length ? weights[0].kg : patient.weightKg;
    var delta = Math.round((last - first) * 10) / 10;

    var tabs = "<div class='tabs' style='margin-bottom:16px'>" +
      ["overview:Overview", "timeline:Timeline", "vaccines:Vaccines"].map(function (t) {
        var parts = t.split(":");
        return "<button class='tab" + (tab === parts[0] ? " active" : "") + "' data-tab='" + parts[0] + "'>" + parts[1] + "</button>";
      }).join("") + "</div>";

    var content = "";
    if (tab === "overview") {
      content =
        "<div class='stat-row'>" +
          "<div class='stat-box'><div class='label'>Weight</div><div class='value'>" + last + " <span style='font-size:12px;color:var(--faint)'>kg</span></div>" +
            "<div class='weight-delta' style='color:var(--c-" + (delta >= 0 ? "green" : "amber") + "-fg)'>" + (delta >= 0 ? "+" : "") + delta + " kg since first record</div></div>" +
          "<div class='stat-box'><div class='label'>Age</div><div class='value sm'>" + Data.petAge(patient.birthDate) + "</div></div>" +
          "<div class='stat-box'><div class='label'>Microchip</div><div class='value sm tnum' style='font-size:12px'>" + UI.escape(patient.microchip) + "</div></div>" +
        "</div>" +
        "<div class='sec-title'>Weight history</div>" +
        "<div data-weightchart></div>" +
        "<div class='sec-title'>Owner</div>" +
        "<div class='pet-mini' data-owner><span class='avatar' style='background:" + Data.colorFor(owner ? owner.id : "x") + "'>" + UI.escape(Data.initials(owner ? Store.clientName(owner) : "?")) + "</span>" +
          "<div class='grow'><div style='font-weight:700;font-size:13.5px'>" + UI.escape(owner ? Store.clientName(owner) : "—") + "</div>" +
          "<div class='muted small'>" + UI.escape(owner ? owner.phone : "") + "</div></div>" + icon("chevR", 15) + "</div>" +
        "<div class='sec-title'>Medical flags</div>" +
        (((patient.allergies || []).length || (patient.chronic || []).length)
          ? "<div class='row wrap' style='gap:8px'>" +
              (patient.allergies || []).map(function (a) { return UI.chip("Allergy: " + a, "rose", true); }).join("") +
              (patient.chronic || []).map(function (c) { return UI.chip(c, "violet", true); }).join("") + "</div>"
          : "<div class='muted small'>No allergies or chronic conditions recorded.</div>");
    } else if (tab === "timeline") {
      var events = [];
      Store.db.encounters.forEach(function (e) {
        if (e.patientId === patient.id) events.push({ date: e.date, time: e.time, icon: "file", text: "<b>" + UI.escape(e.type) + "</b> — " + UI.escape(e.diagnosis), chip: e.status === "draft" ? UI.chip("Draft", "amber") : "" });
      });
      Store.db.prescriptions.forEach(function (rx) {
        if (rx.patientId === patient.id) {
          var drug = Store.drugById(rx.drugId);
          events.push({ date: rx.createdAt, time: "", icon: "pill", text: "<b>" + UI.escape(drug.name) + "</b> — " + (rx.doseMg ? rx.doseMg + " mg" : "fixed dose") + " · " + UI.escape(rx.freq), chip: rx.status === "active" ? UI.chip("Active", "teal") : "" });
        }
      });
      events.sort(function (a, b) { return (b.date + (b.time || "")) < (a.date + (a.time || "")) ? -1 : 1; });
      content = events.length
        ? "<div class='timeline'>" + events.slice(0, 14).map(function (ev) {
            return "<div class='tl-item'><span class='tl-dot'>" + icon(ev.icon, 9) + "</span>" +
              "<div class='tl-time'>" + Data.fmtDateLong(ev.date) + (ev.time ? " · " + Data.fmtTime(ev.time) : "") + "</div>" +
              "<div class='tl-text'>" + ev.text + " " + ev.chip + "</div></div>";
          }).join("") + "</div>"
        : "<div class='muted small'>No clinical events recorded yet.</div>";
    } else {
      var vax = patient.vaccines || [];
      content = vax.length
        ? vax.map(function (v) {
            var st = Data.vaccineStatus(v.due);
            var chip = st === "overdue" ? UI.chip("Overdue", "rose", true) : st === "due" ? UI.chip("Due soon", "amber", true) : UI.chip("Current", "teal", true);
            return "<div class='pet-mini' style='cursor:default'>" +
              "<span class='avatar avatar-sq' style='background:" + (st === "overdue" ? "var(--rose)" : st === "due" ? "var(--amber)" : "var(--primary)") + "'>" + icon("syringe", 15) + "</span>" +
              "<div class='grow'><div style='font-weight:700;font-size:13.5px'>" + UI.escape(v.name) + "</div>" +
              "<div class='muted small'>Lot " + UI.escape(v.lot) + " · due " + Data.fmtDateLong(v.due) + "</div></div>" + chip + "</div>";
          }).join("")
        : "<div class='muted small'>No vaccination records yet.</div>";
    }

    bodyEl.innerHTML = tabs + content;

    bodyEl.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () {
        tab = b.getAttribute("data-tab");
        renderBody(bodyEl);
      });
    });

    var chartEl = bodyEl.querySelector("[data-weightchart]");
    if (chartEl) {
      Charts.area(chartEl, {
        labels: weights.map(function (w) { return Data.fmtDate(w.date); }),
        values: weights.map(function (w) { return w.kg; }),
        color: "#8b5cf6",
        format: "kg",
        height: 160
      });
    }
    var ownerEl = bodyEl.querySelector("[data-owner]");
    if (ownerEl && owner) {
      ownerEl.addEventListener("click", function () {
        UI.toast({ kind: "info", title: Store.clientName(owner), msg: "Open the Clients module to see the full owner profile." });
        location.hash = "#/clients?q=" + encodeURIComponent(Store.clientName(owner));
      });
    }
  }
};
