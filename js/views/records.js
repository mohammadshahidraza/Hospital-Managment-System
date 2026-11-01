/* IZEX — Medical Records view (SOAP editor) */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var recordsState = { q: "", filter: "all", selectedId: null };

Views.records = function (root) {
  var encs = Store.db.encounters.slice().sort(function (a, b) { return (b.date + b.time) < (a.date + a.time) ? -1 : 1; });
  var state = recordsState;
  if (!state.selectedId || !Store.find(encs, state.selectedId)) {
    state.selectedId = encs.length ? encs[0].id : null;
  }

  function refresh() { Views.records(root); }

  function encList() {
    var q = state.q.toLowerCase();
    return encs.filter(function (e) {
      if (state.filter === "draft" && e.status !== "draft") return false;
      if (state.filter === "signed" && e.status !== "signed") return false;
      if (!q) return true;
      var p = Store.patientById(e.patientId);
      return (p.name + " " + e.type + " " + e.diagnosis).toLowerCase().indexOf(q) >= 0;
    });
  }

  function listItem(e) {
    var p = Store.patientById(e.patientId);
    var vet = Store.vet(e.vetId);
    var active = e.id === state.selectedId;
    return "<div data-enc='" + e.id + "' style='display:flex;gap:11px;align-items:center;padding:11px 12px;border-radius:12px;cursor:pointer;border:1px solid " + (active ? "var(--primary)" : "transparent") + ";background:" + (active ? "color-mix(in srgb, var(--primary) 6%, transparent)" : "transparent") + ";transition:background .15s ease' class='enc-item'>" +
      UI.avatar(p.name, Data.colorFor(p.name), "avatar-sm") +
      "<div class='grow' style='min-width:0'>" +
        "<div style='font-weight:700;font-size:13px'>" + UI.escape(p.name) + "</div>" +
        "<div class='faint' style='font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + Data.fmtDate(e.date) + " · " + UI.escape(e.type) + " · " + UI.escape(vet.name.replace("Dr. ", "")) + "</div>" +
      "</div>" +
      (e.status === "draft" ? UI.chip("Draft", "amber") : UI.chip("Signed", "teal")) +
    "</div>";
  }

  function listHtml() {
    var ls = encList();
    if (!ls.length) {
      return "<div class='muted small' style='padding:6px 4px'>" + (encs.length ? "No encounters match this filter." : "No encounters yet — create the first one.") + "</div>";
    }
    return ls.map(listItem).join("");
  }

  function editor(e) {
    if (!e) {
      return "<div class='card grow'><div class='empty'><div class='empty-icon'>" + icon("file", 24) + "</div>" +
        "<div class='empty-title'>Select an encounter</div><div class='empty-sub'>Or create a new one to start charting.</div></div></div>";
    }
    var p = Store.patientById(e.patientId);
    var vet = Store.vet(e.vetId);
    var soap = e.soap || { s: "", o: "", a: "", p: "" };
    var allergyChip = (p.allergies || []).length ? UI.chip("Allergies: " + p.allergies.join(", "), "rose", true) : "";

    function block(letter, name, key, color) {
      return "<div class='soap-block'><div class='soap-head'>" +
        "<span class='soap-letter' style='background:" + color + "'>" + letter + "</span>" +
        "<span class='soap-name'>" + name + "</span></div>" +
        "<textarea data-soap='" + key + "' placeholder='" + name + "…'>" + UI.escape(soap[key] || "") + "</textarea></div>";
    }

    return "<div class='card grow' style='display:flex;flex-direction:column'>" +
      "<div class='card-head' style='padding-bottom:14px'>" +
        UI.avatar(p.name, Data.colorFor(p.name)) +
        "<div class='grow'><div class='card-title'>" + UI.escape(p.name) + " — " + UI.escape(e.type) + "</div>" +
        "<div class='card-sub'>" + Data.fmtDateLong(e.date) + " · " + Data.fmtTime(e.time) + " · " + UI.escape(vet.name) + " · " + e.id + "</div></div>" +
        allergyChip +
        "<span class='save-flag' data-flag>" + icon("check", 13) + "All changes saved</span>" +
      "</div>" +
      "<div class='card-body' style='padding-top:6px'>" +
        "<div class='soap-grid'>" +
          block("S", "Subjective", "s", "#0d9488") +
          block("O", "Objective", "o", "#0ea5e9") +
          block("A", "Assessment", "a", "#8b5cf6") +
          block("P", "Plan", "p", "#f59e0b") +
        "</div>" +
        "<div class='field' style='margin-top:14px'><label>Diagnosis</label>" +
          "<input class='input' data-dx value='" + UI.escape(e.diagnosis || "") + "' placeholder='e.g., Otitis externa, right ear'></div>" +
        "<div class='row' style='justify-content:flex-end;margin-top:16px'>" +
          "<button class='btn btn-outline' data-savedraft>" + icon("clipboard", 15) + "Save draft</button>" +
          "<button class='btn btn-primary' data-sign>" + icon("check", 15) + "Sign & save</button>" +
        "</div>" +
      "</div>" +
    "</div>";
  }

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Medical Records</h1><div class='page-sub'>Chart encounters with SOAP notes and diagnoses.</div></div>" +
      "<div class='page-actions'><button class='btn btn-primary' data-new>" + icon("plus", 15) + "New encounter</button></div>" +
    "</div>" +
    "<div class='grid' style='grid-template-columns:340px 1fr;gap:18px;align-items:start'>" +
      "<div class='card' style='padding:14px'>" +
        "<div style='position:relative;margin-bottom:10px'>" +
          "<span style='position:absolute;left:11px;top:11px;color:var(--faint)'>" + icon("search", 15) + "</span>" +
          "<input class='input' data-q placeholder='Search encounters…' style='padding-left:36px' value='" + UI.escape(state.q) + "'></div>" +
        "<div class='filter-chips' style='margin-bottom:10px'>" +
          "<button class='filter-chip" + (state.filter === "all" ? " active" : "") + "' data-f='all'>All</button>" +
          "<button class='filter-chip" + (state.filter === "draft" ? " active" : "") + "' data-f='draft'>Drafts</button>" +
          "<button class='filter-chip" + (state.filter === "signed" ? " active" : "") + "' data-f='signed'>Signed</button>" +
        "</div>" +
        "<div data-enclist>" + listHtml() + "</div>" +
      "</div>" +
      "<div data-editor style='display:flex'>" + editor(Store.find(encs, state.selectedId)) + "</div>" +
    "</div>";

  /* ---------- wire ---------- */

  function wireList() {
    root.querySelectorAll("[data-enc]").forEach(function (el) {
      el.addEventListener("click", function () {
        state.selectedId = el.getAttribute("data-enc");
        refresh();
      });
    });
  }
  wireList();

  var q = root.querySelector("[data-q]");
  q.addEventListener("input", function () {
    state.q = q.value;
    root.querySelector("[data-enclist]").innerHTML = listHtml();
    wireList();
  });
  root.querySelectorAll("[data-f]").forEach(function (b) {
    b.addEventListener("click", function () { state.filter = b.getAttribute("data-f"); refresh(); });
  });
  root.querySelector("[data-new]").addEventListener("click", function () {
    if (!Store.db.patients.length) {
      UI.toast({ kind: "warn", title: "No patients yet", msg: "Register a client and patient before charting." });
      return;
    }
    UI.modal({
      title: "New encounter",
      sub: "Start a SOAP note for a visit.",
      body:
        "<div class='field'><label>Patient</label><select class='select' data-f='patient'>" + Actions.patientOptions(null) + "</select></div>" +
        "<div class='field-row'>" +
          "<div class='field'><label>Veterinarian</label><select class='select' data-f='vet'>" + Actions.vetOptions(null) + "</select></div>" +
          "<div class='field'><label>Date</label><input class='input' type='date' data-f='date' value='" + Data.todayISO() + "'></div>" +
        "</div>" +
        "<div class='field'><label>Type</label><select class='select' data-f='type'>" +
          Actions.APPT_TYPES.map(function (t) { return "<option>" + t + "</option>"; }).join("") +
        "</select></div>",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("plus", 15) + "Create draft</button>",
      onMount: function (rootEl, close) {
        rootEl.querySelector("[data-cancel]").addEventListener("click", close);
        rootEl.querySelector("[data-save]").addEventListener("click", function () {
          var nowD = new Date();
          var e = {
            id: Data.nextId("E", Store.db.encounters, 5001),
            patientId: rootEl.querySelector("[data-f='patient']").value,
            vetId: rootEl.querySelector("[data-f='vet']").value,
            date: rootEl.querySelector("[data-f='date']").value,
            time: Data.pad(nowD.getHours(), 2) + ":" + Data.pad(nowD.getMinutes(), 2),
            type: rootEl.querySelector("[data-f='type']").value,
            soap: { s: "", o: "", a: "", p: "" },
            diagnosis: "",
            status: "draft"
          };
          Store.db.encounters.push(e);
          Store.commit();
          close();
          state.selectedId = e.id;
          UI.toast({ kind: "success", title: "Draft created", msg: Store.patientById(e.patientId).name + " · " + e.id });
          refresh();
        });
      }
    });
  });

  /* editor wiring */
  var flag = root.querySelector("[data-flag]");
  var editorEl = root.querySelector("[data-editor]");
  if (flag) {
    editorEl.querySelectorAll("textarea, input").forEach(function (el) {
      el.addEventListener("input", function () {
        flag.className = "save-flag saving";
        flag.innerHTML = icon("edit", 13) + "Unsaved changes";
      });
    });
    function collect() {
      var e = Store.find(encs, state.selectedId);
      if (!e) return null;
      e.soap = {
        s: editorEl.querySelector("[data-soap='s']").value,
        o: editorEl.querySelector("[data-soap='o']").value,
        a: editorEl.querySelector("[data-soap='a']").value,
        p: editorEl.querySelector("[data-soap='p']").value
      };
      e.diagnosis = editorEl.querySelector("[data-dx]").value.trim();
      return e;
    }
    function save(status, title) {
      var e = collect();
      if (!e) return;
      e.status = status;
      Store.commit();
      flag.className = "save-flag saved";
      flag.innerHTML = icon("check", 13) + "Saved just now";
      UI.toast({ kind: "success", title: title, msg: Store.patientById(e.patientId).name + " · " + e.id });
      setTimeout(refresh, 500);
    }
    editorEl.querySelector("[data-savedraft]").addEventListener("click", function () { save("draft", "Draft saved"); });
    editorEl.querySelector("[data-sign]").addEventListener("click", function () { save("signed", "Encounter signed & saved"); });
  }
};
