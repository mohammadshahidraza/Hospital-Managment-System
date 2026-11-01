/* IZEX — Prescriptions view + dosing calculator (implements FR-RX-002) */

var Views = window.Views || {};

function rxChip(status) {
  var map = { active: ["Active", "teal"], dispensed: ["Dispensed", "sky"], expired: ["Expired", "slate"], void: ["Void", "rose"] };
  var m = map[status] || [status, "slate"];
  return UI.chip(m[0], m[1], true);
}

/* persistent across re-renders (refresh() re-invokes the view function) */
var prescState = { q: "", filter: "all" };

Views.prescriptions = function (root) {
  var state = prescState;

  function refresh() { Views.prescriptions(root); }

  function filtered() {
    var q = state.q.toLowerCase();
    return Store.db.prescriptions.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).filter(function (rx) {
      if (state.filter !== "all" && rx.status !== state.filter) return false;
      if (!q) return true;
      var p = Store.patientById(rx.patientId);
      var drug = Store.drugById(rx.drugId);
      return (p.name + " " + drug.name).toLowerCase().indexOf(q) >= 0;
    });
  }

  function row(rx) {
    var p = Store.patientById(rx.patientId);
    var owner = Store.ownerOf(p);
    var drug = Store.drugById(rx.drugId);
    var vet = Store.vet(rx.prescriberId);
    return "<tr data-rx='" + rx.id + "'>" +
      "<td class='cell-main nowrap'>" + rx.id + "</td>" +
      "<td><div class='cell-flex'>" + UI.avatar(p.name, Data.colorFor(p.name), "avatar-sm") +
        "<div><div class='cell-main'>" + UI.escape(p.name) + "</div><div class='cell-sub'>" + UI.escape(Store.clientName(owner)) + " · " + p.weightKg + " kg</div></div></div></td>" +
      "<td><div class='cell-main'>" + UI.escape(drug.name) + "</div><div class='cell-sub'>" + drug.category + "</div></td>" +
      "<td class='nowrap'>" + (rx.doseMg ? "<b>" + rx.doseMg + " mg</b>" : "<span class='muted'>fixed dose</span>") + "</td>" +
      "<td class='nowrap muted small'>" + UI.escape(rx.freq) + "</td>" +
      "<td class='nowrap muted'>" + Data.fmtDate(rx.createdAt) + "</td>" +
      "<td class='nowrap muted small'>" + UI.escape(vet.name.replace("Dr. ", "")) + "</td>" +
      "<td>" + rxChip(rx.status) + "</td>" +
    "</tr>";
  }

  var list = filtered();

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Prescriptions</h1><div class='page-sub'>Weight-based dosing with formulary rules and allergy checks — see FR-RX-002.</div></div>" +
      "<div class='page-actions'><button class='btn btn-primary' data-new>" + icon("plus", 15) + "New prescription</button></div>" +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:16px'>" +
      "<div style='position:relative;width:300px'>" +
        "<span style='position:absolute;left:11px;top:11px;color:var(--faint)'>" + icon("search", 15) + "</span>" +
        "<input class='input' data-q placeholder='Search patient or drug…' style='padding-left:36px' value='" + UI.escape(state.q) + "'></div>" +
      "<div class='filter-chips'>" +
        ["all:All", "active:Active", "dispensed:Dispensed", "expired:Expired", "void:Void"].map(function (f) {
          var parts = f.split(":");
          return "<button class='filter-chip" + (state.filter === parts[0] ? " active" : "") + "' data-f='" + parts[0] + "'>" + parts[1] + "</button>";
        }).join("") +
      "</div>" +
    "</div>" +

    "<div class='grid grid-32' style='align-items:start'>" +
      "<div class='card'>" +
        (list.length
          ? "<div class='tbl-wrap'><table class='tbl'><thead><tr><th>Rx</th><th>Patient</th><th>Drug</th><th>Dose</th><th>Frequency</th><th>Date</th><th>Prescriber</th><th>Status</th></tr></thead><tbody class='stagger'>" + list.map(row).join("") + "</tbody></table></div>"
          : (Store.db.prescriptions.length === 0
              ? "<div class='empty'><div class='empty-icon'>" + icon("pill", 24) + "</div><div class='empty-title'>No prescriptions yet</div><div class='empty-sub'>Create one with the New prescription button above.</div></div>"
              : "<div class='empty'><div class='empty-icon'>" + icon("pill", 24) + "</div><div class='empty-title'>No prescriptions match</div><div class='empty-sub'>Adjust the filters or create a new prescription.</div></div>")) +
      "</div>" +

      "<div class='card'><div class='card-head'><div><div class='card-title'>Formulary</div><div class='card-sub'>Dose rules used by the calculator</div></div></div>" +
        "<div class='card-body' style='padding-top:10px'>" +
          Store.db.drugs.map(function (d) {
            var rule = d.doseMin !== null ? d.doseMin + "–" + d.doseMax + " " + d.unit : "fixed dose";
            return "<div style='padding:9px 0;border-bottom:1px solid var(--border)'>" +
              "<div class='row'><span style='font-weight:700;font-size:13px'>" + UI.escape(d.name) + "</span>" +
              "<span class='grow'></span>" + UI.chip(rule, "sky") + "</div>" +
              "<div class='faint' style='font-size:11.5px;margin-top:2px'>" + d.category + " · " + UI.escape(d.freq) + (d.species.length < 4 ? " · " + d.species.join(", ") : "") + "</div>" +
            "</div>";
          }).join("") +
        "</div></div>" +
    "</div>";

  /* wire */
  var q = root.querySelector("[data-q]");
  q.addEventListener("input", function () {
    state.q = q.value;
    clearTimeout(q._t);
    q._t = setTimeout(refresh, 280);
    /* keep focus after refresh */
    setTimeout(function () {
      var again = root.querySelector("[data-q]");
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    }, 300);
  });
  root.querySelectorAll("[data-f]").forEach(function (b) {
    b.addEventListener("click", function () { state.filter = b.getAttribute("data-f"); refresh(); });
  });
  root.querySelector("[data-new]").addEventListener("click", function () {
    Views.openRxDialog(null, refresh);
  });
  root.querySelectorAll("tr[data-rx]").forEach(function (tr) {
    tr.addEventListener("click", function () {
      var rx = Store.find(Store.db.prescriptions, tr.getAttribute("data-rx"));
      if (rx) openRxDetail(rx, refresh);
    });
  });
};

/* ---------- detail ---------- */

function openRxDetail(rx, onDone) {
  var p = Store.patientById(rx.patientId);
  var drug = Store.drugById(rx.drugId);
  var vet = Store.vet(rx.prescriberId);
  var volume = null;
  if (rx.doseMg && drug.conc && drug.conc.indexOf("mg/ml") >= 0) {
    var conc = parseFloat(drug.conc);
    if (conc > 0) volume = Math.round((rx.doseMg / conc) * 100) / 100;
  }

  var body =
    "<div class='dose-panel' style='margin-bottom:14px'>" +
      "<div style='font-size:12px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em'>Prescribed dose</div>" +
      "<div class='dose-value'>" + (rx.doseMg ? rx.doseMg + " mg" : "Fixed dose") + "</div>" +
      "<div class='dose-rule'>" + UI.escape(drug.name) + " · " + (rx.doseMg ? (Math.round((rx.doseMg / rx.weightKg) * 100) / 100) + " mg/kg on " + rx.weightKg + " kg" : UI.escape(drug.conc)) + (volume ? " · ≈ " + volume + " ml" : "") + "</div>" +
    "</div>" +
    "<div class='stat-row' style='margin-bottom:14px'>" +
      "<div class='stat-box'><div class='label'>Patient</div><div class='value sm'>" + UI.escape(p.name) + "</div></div>" +
      "<div class='stat-box'><div class='label'>Frequency</div><div class='value sm'>" + UI.escape(rx.freq) + "</div></div>" +
      "<div class='stat-box'><div class='label'>Duration</div><div class='value sm'>" + rx.days + " days</div></div>" +
    "</div>" +
    "<div class='row' style='gap:10px;flex-wrap:wrap;margin-bottom:12px'>" +
      rxChip(rx.status) +
      UI.chip("Prescriber: " + vet.name.replace("Dr. ", ""), "slate") +
      UI.chip("Created " + Data.fmtDateLong(rx.createdAt), "slate") +
    "</div>" +
    drug.warns.map(function (w) {
      return "<div class='dose-warn' style='margin-top:8px'>" + icon("alert", 15) + "<span>" + UI.escape(w) + "</span></div>";
    }).join("");

  var actions = "";
  if (rx.status === "active") {
    actions = "<button class='btn btn-outline' data-dispense>" + icon("box", 15) + "Mark dispensed</button>" +
      "<button class='btn btn-danger' data-void>" + icon("x", 15) + "Void</button>";
  } else if (rx.status === "dispensed") {
    actions = "<button class='btn btn-outline' data-repeat>" + icon("refresh", 15) + "Repeat prescription</button>";
  }

  UI.modal({
    title: p.name + " — " + drug.name,
    sub: rx.id,
    body: body,
    foot: actions + "<button class='btn btn-ghost' data-close2>Close</button>",
    onMount: function (rootEl, close) {
      rootEl.querySelector("[data-close2]").addEventListener("click", close);
      var disp = rootEl.querySelector("[data-dispense]");
      if (disp) disp.addEventListener("click", function () {
        rx.status = "dispensed";
        Store.commit();
        close();
        UI.toast({ kind: "success", title: "Marked as dispensed", msg: rx.id });
        onDone();
      });
      var vd = rootEl.querySelector("[data-void]");
      if (vd) vd.addEventListener("click", function () {
        UI.confirm({ title: "Void this prescription?", message: rx.id + " will be marked void. This is recorded in the audit trail.", confirmText: "Void", danger: true }).then(function (ok) {
          if (!ok) return;
          rx.status = "void";
          Store.commit();
          close();
          UI.toast({ kind: "warn", title: "Prescription voided", msg: rx.id });
          onDone();
        });
      });
      var rep = rootEl.querySelector("[data-repeat]");
      if (rep) rep.addEventListener("click", function () {
        close();
        Views.openRxDialog(p.id, onDone, drug.id);
      });
    }
  });
}

/* ---------- dosing calculator dialog (FR-RX-002) ---------- */

Views.openRxDialog = function (patientId, onDone, prefillDrugId) {
  if (!Store.db.patients.length) {
    UI.toast({ kind: "warn", title: "No patients yet", msg: "Register a client and patient before prescribing." });
    return;
  }
  var body =
    "<div class='field-row'>" +
      "<div class='field'><label>Patient</label><select class='select' data-f='patient'>" +
        "<option value=''>Select patient…</option>" + Actions.patientOptions(patientId) + "</select></div>" +
      "<div class='field'><label>Drug (formulary)</label><select class='select' data-f='drug'>" + Actions.drugOptions(prefillDrugId) + "</select></div>" +
    "</div>" +
    "<div data-weight></div>" +
    "<div data-dose class='dose-panel' style='margin-bottom:14px'></div>" +
    "<div data-warns></div>" +
    "<div class='field-row' style='margin-top:14px'>" +
      "<div class='field'><label>Confirmed dose (mg)</label><input class='input' type='number' step='0.1' min='0' data-f='dose'></div>" +
      "<div class='field'><label>Duration (days)</label><input class='input' type='number' min='1' data-f='days' value='7'></div>" +
    "</div>" +
    "<div class='field-row'>" +
      "<div class='field'><label>Frequency</label><input class='input' data-f='freq'></div>" +
      "<div class='field'><label>Prescriber</label><select class='select' data-f='vet'>" + Actions.vetOptions(null) + "</select></div>" +
    "</div>" +
    "<div class='field'><label>Notes</label><input class='input' data-f='notes' placeholder='Optional sig / instructions'></div>";

  UI.modal({
    title: "New prescription",
    sub: "Dose is computed from the patient's most recent weight and the formulary rule.",
    body: body,
    size: "lg",
    foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("pill", 15) + "Create prescription</button>",
    onMount: function (rootEl, close) {
      var patientSel = rootEl.querySelector("[data-f='patient']");
      var drugSel = rootEl.querySelector("[data-f='drug']");
      var doseInput = rootEl.querySelector("[data-f='dose']");
      var weightEl = rootEl.querySelector("[data-weight]");
      var doseEl = rootEl.querySelector("[data-dose]");
      var warnEl = rootEl.querySelector("[data-warns]");

      function currentPatient() { return patientSel.value ? Store.patientById(patientSel.value) : null; }
      function currentDrug() { return Store.drugById(drugSel.value); }

      function renderWeight() {
        var p = currentPatient();
        if (!p) { weightEl.innerHTML = ""; return; }
        var last = p.weights && p.weights.length ? p.weights[p.weights.length - 1] : { date: p.birthDate, kg: p.weightKg };
        var age = Data.daysUntil(last.date);
        var stale = Math.abs(age) > 30;
        var note = stale
          ? "<div class='dose-warn' style='margin-bottom:10px'>" + icon("alert", 15) + "<span>Last weight recorded " + Math.abs(age) + " days ago — weigh the patient before confirming a dose.</span></div>"
          : "<div class='faint small' style='margin:-4px 0 10px'>Last recorded " + Data.fmtDate(last.date) + " (" + Math.abs(age) + "d ago) · entered automatically.</div>";
        weightEl.innerHTML = "<div class='row' style='gap:10px;margin-bottom:8px'>" +
          "<span class='bold' style='font-size:13px'>Patient weight</span>" +
          UI.chip(last.kg + " kg", "sky", true) +
          "<div class='grow'></div>" +
          "<input class='input' type='number' step='0.1' min='0' data-newwt placeholder='Record new weight (kg)' style='width:210px'>" +
          "<button class='btn btn-outline btn-sm' data-savewt>Update</button></div>" + note;
        weightEl.querySelector("[data-savewt]").addEventListener("click", function () {
          var v = parseFloat(weightEl.querySelector("[data-newwt]").value);
          if (!(v > 0)) { UI.toast({ kind: "warn", title: "Enter a valid weight" }); return; }
          p.weightKg = v;
          p.weights = p.weights || [];
          p.weights.push({ date: Data.todayISO(), kg: v });
          Store.commit();
          UI.toast({ kind: "success", title: "Weight recorded", msg: p.name + " · " + v + " kg" });
          renderWeight();
          recalc(true);
        });
      }

      function renderWarns() {
        var p = currentPatient(), d = currentDrug();
        var warns = [];
        (d.warns || []).forEach(function (w) { warns.push({ text: w, kind: "" }); });
        if (p && p.allergies && p.allergies.length) {
          var tags = d.tags || [];
          var hit = tags.some(function (t) {
            return p.allergies.some(function (a) { return a.toLowerCase().indexOf(t) >= 0; });
          }) || p.allergies.some(function (a) { return d.name.toLowerCase().indexOf(a.toLowerCase()) >= 0; });
          if (hit) warns.push({ text: "Allergy conflict: " + p.name + " is flagged for " + p.allergies.join(", ") + ". Confirm necessity before prescribing.", kind: "rose" });
        }
        warnEl.innerHTML = warns.map(function (w) {
          return "<div class='dose-warn " + w.kind + "' style='margin-bottom:8px'>" + icon("alert", 15) + "<span>" + UI.escape(w.text) + "</span></div>";
        }).join("");
      }

      function recalc(resetDose) {
        var p = currentPatient(), d = currentDrug();
        if (!p || !d) {
          doseEl.innerHTML = "<div class='dose-rule'>Select a patient and a drug to compute the dose.</div>";
          return;
        }
        var wt = p.weightKg;
        var html;
        if (d.doseMin === null) {
          html = "<div style='font-size:12px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em'>Fixed dose</div>" +
            "<div class='dose-value' style='font-size:22px'>" + UI.escape(d.conc) + "</div>" +
            "<div class='dose-rule'>" + UI.escape(d.name) + " — " + UI.escape(d.freq) + ". No mg/kg calculation for this product.</div>";
          doseInput.value = "";
          doseInput.disabled = true;
        } else {
          var lo = Math.round(d.doseMin * wt * 100) / 100;
          var hi = Math.round(d.doseMax * wt * 100) / 100;
          var mid = Math.round(((lo + hi) / 2) * 10) / 10;
          html = "<div style='font-size:12px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em'>Suggested dose</div>" +
            "<div class='dose-value' data-doseval>" + mid + " mg</div>" +
            "<div class='dose-rule'>" + d.doseMin + "–" + d.doseMax + " " + d.unit + " × " + wt + " kg = " + lo + "–" + hi + " mg" +
            (d.conc && d.conc.indexOf("mg/ml") >= 0 ? " · " + UI.escape(d.conc) + " → ≈ " + (Math.round((mid / parseFloat(d.conc)) * 100) / 100) + " ml" : "") + "</div>";
          doseInput.disabled = false;
          if (resetDose || !parseFloat(doseInput.value)) doseInput.value = mid;
        }
        doseEl.innerHTML = html;
        var val = doseEl.querySelector("[data-doseval]");
        if (val) {
          val.classList.add("flash");
          setTimeout(function () { val.classList.remove("flash"); }, 950);
        }
        rootEl.querySelector("[data-f='freq']").value = d.freq;
        rootEl.querySelector("[data-f='days']").value = d.maxDays;
        renderWarns();
      }

      patientSel.addEventListener("change", function () { renderWeight(); recalc(true); });
      drugSel.addEventListener("change", function () { recalc(true); });

      renderWeight();
      recalc(true);

      rootEl.querySelector("[data-cancel]").addEventListener("click", close);
      rootEl.querySelector("[data-save]").addEventListener("click", function () {
        var p = currentPatient();
        var d = currentDrug();
        if (!p) { UI.toast({ kind: "warn", title: "Select a patient" }); return; }
        var doseVal = parseFloat(doseInput.value);
        if (d.doseMin !== null && !(doseVal > 0)) { UI.toast({ kind: "warn", title: "Confirm a dose", msg: "Enter the dose in mg before saving." }); return; }
        var rx = {
          id: Data.nextId("RX", Store.db.prescriptions, 4001),
          patientId: p.id,
          drugId: d.id,
          weightKg: p.weightKg,
          doseMg: d.doseMin !== null ? Math.round(doseVal * 10) / 10 : null,
          freq: rootEl.querySelector("[data-f='freq']").value || d.freq,
          days: parseInt(rootEl.querySelector("[data-f='days']").value, 10) || d.maxDays,
          prescriberId: rootEl.querySelector("[data-f='vet']").value,
          status: "active",
          createdAt: Data.todayISO(),
          notes: rootEl.querySelector("[data-f='notes']").value.trim()
        };
        Store.db.prescriptions.push(rx);
        Store.commit();
        close();
        UI.toast({ kind: "success", title: "Prescription created", msg: p.name + " · " + d.name + (rx.doseMg ? " · " + rx.doseMg + " mg" : "") });
        if (onDone) onDone(rx);
      });
    }
  });
};
