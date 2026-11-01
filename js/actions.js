/* IZEX — shared dialogs and flows (appointments, clients, patients, invoices, payments) */

var Actions = {
  APPT_TYPES: ["Wellness Exam", "Vaccination", "Dental", "Surgery", "Follow-up", "Grooming", "Boarding Check-in", "Emergency", "Lab Work"],
  ROOMS: ["Exam 1", "Exam 2", "Exam 3", "Surgery", "Dental Suite", "Grooming", "Lab", "Front Desk"],

  statusChip: function (status) {
    var map = {
      "scheduled": ["Scheduled", "sky"],
      "arrived": ["Arrived", "amber"],
      "in-progress": ["In progress", "violet"],
      "completed": ["Completed", "teal"],
      "no-show": ["No-show", "rose"],
      "cancelled": ["Cancelled", "slate"]
    };
    var m = map[status] || [status, "slate"];
    return UI.chip(m[0], m[1], true);
  },

  /* ---------- option builders ---------- */

  patientOptions: function (selectedId, clientId) {
    var pts = clientId ? Store.patientsOf(clientId) : Store.db.patients;
    return pts.map(function (p) {
      var owner = Store.ownerOf(p);
      var label = p.name + " — " + (owner ? Store.clientName(owner) : "?") + " (" + p.species + ")";
      return "<option value='" + p.id + "'" + (p.id === selectedId ? " selected" : "") + ">" + UI.escape(label) + "</option>";
    }).join("");
  },

  clientOptions: function (selectedId) {
    return Store.db.clients.map(function (c) {
      return "<option value='" + c.id + "'" + (c.id === selectedId ? " selected" : "") + ">" + UI.escape(Store.clientName(c)) + "</option>";
    }).join("");
  },

  vetOptions: function (selectedId) {
    return Store.db.vets.map(function (v) {
      return "<option value='" + v.id + "'" + (v.id === selectedId ? " selected" : "") + ">" + UI.escape(v.name) + "</option>";
    }).join("");
  },

  drugOptions: function (selectedId) {
    return Store.db.drugs.map(function (d) {
      return "<option value='" + d.id + "'" + (d.id === selectedId ? " selected" : "") + ">" + UI.escape(d.name) + " (" + d.category + ")</option>";
    }).join("");
  },

  serviceOptions: function () {
    return Data.services.map(function (s, i) {
      return "<option value='" + i + "'>" + UI.escape(s.name) + " — " + Data.fmtMoney(s.price) + "</option>";
    }).join("");
  },

  /* ---------- appointment dialog ---------- */

  appointmentDialog: function (opts) {
    opts = opts || {};
    var appt = opts.appointment;
    var isNew = !appt;
    if (!Store.db.patients.length) {
      UI.toast({ kind: "warn", title: "No patients yet", msg: "Register a client and their pet before booking a visit." });
      return null;
    }
    var date = appt ? appt.date : (opts.date || Data.todayISO());
    var start = appt ? appt.start : (opts.start || "09:00");

    var body =
      "<div class='field'><label>Patient</label><select class='select' data-f='patient'>" +
        "<option value=''>Select patient…</option>" + Actions.patientOptions(appt ? appt.patientId : null) + "</select></div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Date</label><input class='input' type='date' data-f='date' value='" + date + "'></div>" +
        "<div class='field'><label>Time</label><input class='input' type='time' data-f='start' value='" + start + "' step='300'></div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Type</label><select class='select' data-f='type'>" +
          Actions.APPT_TYPES.map(function (t) { return "<option" + (appt && appt.type === t ? " selected" : "") + ">" + t + "</option>"; }).join("") +
        "</select></div>" +
        "<div class='field'><label>Veterinarian</label><select class='select' data-f='vet'>" + Actions.vetOptions(appt ? appt.vetId : null) + "</select></div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Duration (minutes)</label><select class='select' data-f='duration'>" +
          [20, 30, 45, 60, 90].map(function (d) { return "<option" + (appt && appt.duration === d ? " selected" : d === 30 && !appt ? " selected" : "") + ">" + d + "</option>"; }).join("") +
        "</select></div>" +
        "<div class='field'><label>Room</label><select class='select' data-f='room'>" +
          Actions.ROOMS.map(function (r) { return "<option" + (appt && appt.room === r ? " selected" : "") + ">" + r + "</option>"; }).join("") +
        "</select></div>" +
      "</div>" +
      "<div class='field'><label>Notes</label><textarea class='textarea' data-f='notes' placeholder='Optional instructions for the team…'>" + (appt ? UI.escape(appt.notes || "") : "") + "</textarea></div>";

    var m = UI.modal({
      title: isNew ? "New appointment" : "Edit appointment",
      sub: isNew ? "Book a visit and assign a veterinarian and room." : UI.escape(appt.id),
      body: body,
      size: "lg",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button>" +
            "<button class='btn btn-primary' data-save>" + icon("check", 15) + (isNew ? "Book appointment" : "Save changes") + "</button>",
      onMount: function (root, close) {
        root.querySelector("[data-cancel]").addEventListener("click", close);
        root.querySelector("[data-save]").addEventListener("click", function () {
          var f = function (name) { return root.querySelector("[data-f='" + name + "']").value; };
          if (!f("patient")) { UI.toast({ kind: "warn", title: "Pick a patient", msg: "An appointment needs a patient." }); return; }

          var rec = {
            patientId: f("patient"),
            vetId: f("vet"),
            date: f("date"),
            start: f("start"),
            duration: parseInt(f("duration"), 10),
            type: f("type"),
            room: f("room"),
            notes: f("notes").trim()
          };
          if (isNew) {
            rec.id = Data.nextId("A", Store.db.appointments, 3001);
            rec.status = "scheduled";
            Store.db.appointments.push(rec);
            UI.toast({ kind: "success", title: "Appointment booked", msg: Store.patientById(rec.patientId).name + " · " + Data.fmtDate(rec.date) + " at " + Data.fmtTime(rec.start) });
          } else {
            for (var k in rec) appt[k] = rec[k];
            UI.toast({ kind: "success", title: "Appointment updated" });
          }
          Store.commit();
          close();
          if (opts.onDone) opts.onDone(rec, isNew);
        });
      }
    });
    return m;
  },

  /* ---------- appointment detail ---------- */

  apptDetail: function (appt, onDone) {
    var patient = Store.patientById(appt.patientId);
    var owner = Store.ownerOf(patient);
    var vet = Store.vet(appt.vetId);

    function row(label, value) {
      return "<div style='display:flex;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)'>" +
        "<div style='width:112px;flex:none;font-size:12px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.05em;padding-top:1px'>" + label + "</div>" +
        "<div style='font-size:13.5px;color:var(--text-2)'>" + value + "</div></div>";
    }

    var body =
      row("When", Data.fmtDateLong(appt.date) + " · " + Data.fmtTime(appt.start) + " – " + Data.fmtTime(Actions._endTime(appt))) +
      row("Type", "<b>" + UI.escape(appt.type) + "</b>") +
      row("Patient", UI.avatar(patient.name, Data.colorFor(patient.name), "avatar-sm") + " <b style='margin-left:6px'>" + UI.escape(patient.name) + "</b> <span class='muted'>· " + UI.escape(patient.breed) + "</span>") +
      row("Owner", UI.escape(Store.clientName(owner)) + " <span class='muted'>· " + UI.escape(owner ? owner.phone : "") + "</span>") +
      row("Veterinarian", "<span style='display:inline-flex;align-items:center;gap:8px'><span style='width:9px;height:9px;border-radius:50%;background:" + vet.color + "'></span> " + UI.escape(vet.name) + "</span>") +
      row("Room", UI.escape(appt.room)) +
      row("Status", Actions.statusChip(appt.status)) +
      (appt.notes ? row("Notes", UI.escape(appt.notes)) : "");

    var actions = [];
    if (appt.status === "scheduled") {
      actions.push(["Check in", "btn-primary", function () { Actions._setStatus(appt, "arrived", onDone); }]);
      actions.push(["No-show", "btn-outline", function () { Actions._setStatus(appt, "no-show", onDone); }]);
      actions.push(["Cancel", "btn-ghost", function () { Actions._setStatus(appt, "cancelled", onDone); }]);
    } else if (appt.status === "arrived") {
      actions.push(["Start exam", "btn-primary", function () { Actions._setStatus(appt, "in-progress", onDone); }]);
      actions.push(["Cancel", "btn-ghost", function () { Actions._setStatus(appt, "cancelled", onDone); }]);
    } else if (appt.status === "in-progress") {
      actions.push(["Complete", "btn-primary", function () { Actions._setStatus(appt, "completed", onDone); }]);
    }

    var foot = "<button class='btn btn-ghost' data-delete style='margin-right:auto;color:var(--rose)'>" + icon("trash", 14) + "Delete</button>" +
      "<button class='btn btn-outline' data-edit>" + icon("edit", 14) + "Edit</button>" +
      actions.map(function (a, i) { return "<button class='btn " + a[1] + "' data-act='" + i + "'>" + a[0] + "</button>"; }).join("");

    UI.modal({
      title: patient.name + " — " + appt.type,
      sub: appt.id,
      body: body,
      foot: foot,
      onMount: function (root, close) {
        root.querySelector("[data-edit]").addEventListener("click", function () {
          close();
          Actions.appointmentDialog({ appointment: appt, onDone: onDone });
        });
        root.querySelector("[data-delete]").addEventListener("click", function () {
          UI.confirm({ title: "Delete appointment?", message: "This removes " + appt.id + " permanently.", confirmText: "Delete", danger: true }).then(function (ok) {
            if (!ok) return;
            var arr = Store.db.appointments;
            var ix = arr.indexOf(appt);
            if (ix >= 0) arr.splice(ix, 1);
            Store.commit();
            close();
            UI.toast({ kind: "plain", title: "Appointment deleted" });
            if (onDone) onDone();
          });
        });
        actions.forEach(function (a, i) {
          var btn = root.querySelector("[data-act='" + i + "']");
          if (btn) btn.addEventListener("click", function () { a[2](); });
        });
      }
    });
  },

  _endTime: function (appt) {
    var p = appt.start.split(":");
    var mins = parseInt(p[0], 10) * 60 + parseInt(p[1], 10) + appt.duration;
    return Data.pad(Math.floor(mins / 60), 2) + ":" + Data.pad(mins % 60, 2);
  },

  _setStatus: function (appt, status, onDone) {
    appt.status = status;
    Store.commit();
    var labels = { arrived: "Patient checked in", "in-progress": "Exam started", completed: "Appointment completed", "no-show": "Marked as no-show", cancelled: "Appointment cancelled" };
    UI.toast({ kind: status === "no-show" || status === "cancelled" ? "warn" : "success", title: labels[status] || "Updated", msg: Store.patientById(appt.patientId).name + " · " + Data.fmtTime(appt.start) });
    if (onDone) onDone();
  },

  /* ---------- client dialog ---------- */

  clientDialog: function (opts) {
    opts = opts || {};
    var c = opts.client;
    var isNew = !c;
    var body =
      "<div class='field-row'>" +
        "<div class='field'><label>First name</label><input class='input' data-f='firstName' value='" + (c ? UI.escape(c.firstName) : "") + "'></div>" +
        "<div class='field'><label>Last name</label><input class='input' data-f='lastName' value='" + (c ? UI.escape(c.lastName) : "") + "'></div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Phone</label><input class='input' data-f='phone' placeholder='(555) 000-0000' value='" + (c ? UI.escape(c.phone) : "") + "'></div>" +
        "<div class='field'><label>Email</label><input class='input' data-f='email' placeholder='name@mail.com' value='" + (c ? UI.escape(c.email) : "") + "'></div>" +
      "</div>" +
      "<div class='field'><label>Address</label><input class='input' data-f='address' value='" + (c ? UI.escape(c.address) : "") + "'></div>" +
      "<div class='field'><label>Notes</label><textarea class='textarea' data-f='notes'>" + (c ? UI.escape(c.notes || "") : "") + "</textarea></div>";

    UI.modal({
      title: isNew ? "New client" : "Edit client",
      sub: isNew ? "Register an owner in the practice." : c.id,
      body: body,
      size: "lg",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("check", 15) + (isNew ? "Create client" : "Save changes") + "</button>",
      onMount: function (root, close) {
        root.querySelector("[data-cancel]").addEventListener("click", close);
        root.querySelector("[data-save]").addEventListener("click", function () {
          var f = function (n) { return root.querySelector("[data-f='" + n + "']").value.trim(); };
          if (!f("firstName") || !f("lastName")) { UI.toast({ kind: "warn", title: "Name required", msg: "First and last name are required." }); return; }
          if (isNew) {
            c = {
              id: Data.nextId("C", Store.db.clients, 1001),
              firstName: f("firstName"), lastName: f("lastName"),
              phone: f("phone"), email: f("email"), address: f("address"),
              since: Data.todayISO(), notes: f("notes"), tags: []
            };
            Store.db.clients.push(c);
            UI.toast({ kind: "success", title: "Client created", msg: Store.clientName(c) + " · " + c.id });
          } else {
            c.firstName = f("firstName"); c.lastName = f("lastName");
            c.phone = f("phone"); c.email = f("email");
            c.address = f("address"); c.notes = f("notes");
            UI.toast({ kind: "success", title: "Client updated" });
          }
          Store.commit();
          close();
          if (opts.onDone) opts.onDone(c, isNew);
        });
      }
    });
  },

  /* ---------- patient dialog ---------- */

  patientDialog: function (opts) {
    opts = opts || {};
    var p = opts.patient;
    var isNew = !p;
    if (!Store.db.clients.length) {
      UI.toast({ kind: "warn", title: "No clients yet", msg: "Register the owner first, then add their pet." });
      return null;
    }
    var speciesList = ["dog", "cat", "rabbit", "parrot", "other"];

    var body =
      "<div class='field-row'>" +
        "<div class='field'><label>Name</label><input class='input' data-f='name' value='" + (p ? UI.escape(p.name) : "") + "'></div>" +
        "<div class='field'><label>Species</label><select class='select' data-f='species'>" +
          speciesList.map(function (s) { return "<option value='" + s + "'" + (p && p.species === s ? " selected" : "") + ">" + s.charAt(0).toUpperCase() + s.slice(1) + "</option>"; }).join("") +
        "</select></div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Breed</label><input class='input' data-f='breed' value='" + (p ? UI.escape(p.breed) : "") + "'></div>" +
        "<div class='field'><label>Owner</label><select class='select' data-f='owner'>" + Actions.clientOptions(p ? p.ownerId : opts.ownerId) + "</select></div>" +
      "</div>" +
      "<div class='field-row-3'>" +
        "<div class='field'><label>Sex</label><select class='select' data-f='sex'>" +
          ["Female", "Male"].map(function (s) { return "<option" + (p && p.sex === s ? " selected" : "") + ">" + s + "</option>"; }).join("") +
        "</select></div>" +
        "<div class='field'><label>Neutered</label><select class='select' data-f='neutered'>" +
          "<option value='true'" + (p && p.neutered ? " selected" : "") + ">Yes</option>" +
          "<option value='false'" + (p && !p.neutered ? " selected" : "") + ">No</option>" +
        "</select></div>" +
        "<div class='field'><label>Birth date</label><input class='input' type='date' data-f='birthDate' value='" + (p ? p.birthDate : Data.iso(Data.addDays(new Date(), -365))) + "'></div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Weight (kg)</label><input class='input' type='number' step='0.1' min='0' data-f='weightKg' value='" + (p ? p.weightKg : "") + "'></div>" +
        "<div class='field'><label>Microchip</label><input class='input' data-f='microchip' value='" + (p ? UI.escape(p.microchip) : "") + "'></div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Allergies <span class='faint'>(comma separated)</span></label><input class='input' data-f='allergies' value='" + (p && p.allergies ? UI.escape(p.allergies.join(", ")) : "") + "'></div>" +
        "<div class='field'><label>Chronic conditions</label><input class='input' data-f='chronic' value='" + (p && p.chronic ? UI.escape(p.chronic.join(", ")) : "") + "'></div>" +
      "</div>";

    UI.modal({
      title: isNew ? "New patient" : "Edit patient",
      sub: isNew ? "Register an animal under an owner." : p.id,
      body: body,
      size: "lg",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("check", 15) + (isNew ? "Create patient" : "Save changes") + "</button>",
      onMount: function (root, close) {
        root.querySelector("[data-cancel]").addEventListener("click", close);
        root.querySelector("[data-save]").addEventListener("click", function () {
          var f = function (n) { return root.querySelector("[data-f='" + n + "']").value.trim(); };
          if (!f("name")) { UI.toast({ kind: "warn", title: "Name required", msg: "The patient needs a name." }); return; }
          var weight = parseFloat(f("weightKg")) || 0;
          if (!(weight > 0)) { UI.toast({ kind: "warn", title: "Weight required", msg: "Enter the patient's current weight in kg — dosing depends on it." }); return; }
          var vals = {
            name: f("name"), species: f("species"), breed: f("breed") || "Mixed",
            ownerId: f("owner"), sex: f("sex"), neutered: f("neutered") === "true",
            birthDate: f("birthDate"), weightKg: weight, microchip: f("microchip"),
            allergies: f("allergies") ? f("allergies").split(",").map(function (s) { return s.trim(); }).filter(Boolean) : [],
            chronic: f("chronic") ? f("chronic").split(",").map(function (s) { return s.trim(); }).filter(Boolean) : []
          };
          if (isNew) {
            p = Object.assign({}, vals, {
              id: Data.nextId("P", Store.db.patients, 2001),
              color: "—",
              weights: [{ date: Data.todayISO(), kg: weight }],
              vaccines: [],
              photo_hue: Math.floor(Math.random() * 360)
            });
            Store.db.patients.push(p);
            UI.toast({ kind: "success", title: "Patient created", msg: p.name + " · " + p.id });
          } else {
            for (var k in vals) p[k] = vals[k];
            UI.toast({ kind: "success", title: "Patient updated" });
          }
          Store.commit();
          close();
          if (opts.onDone) opts.onDone(p, isNew);
        });
      }
    });
  },

  /* ---------- invoice builder ---------- */

  invoiceDialog: function (opts) {
    opts = opts || {};
    if (!Store.db.clients.length) {
      UI.toast({ kind: "warn", title: "No clients yet", msg: "Register a client before creating an invoice." });
      return null;
    }
    var initialClient = Store.db.clients.length ? Store.db.clients[0].id : null;
    var body =
      "<div class='field-row'>" +
        "<div class='field'><label>Client</label><select class='select' data-f='client'>" + Actions.clientOptions(null) + "</select></div>" +
        "<div class='field'><label>Patient (optional)</label><select class='select' data-f='patient'><option value=''>— none —</option>" + Actions.patientOptions(null, initialClient) + "</select></div>" +
      "</div>" +
      "<div class='sec-title'>Line items</div>" +
      "<datalist id='invSvcList'>" + Data.services.map(function (s) {
        return "<option value='" + UI.escape(s.name) + "' label='" + Data.fmtMoney(s.price) + "'></option>";
      }).join("") + "</datalist>" +
      "<div class='line-head'><span>Service or item</span><span>Price (Rs)</span><span>Qty</span><span>Amount</span><span></span></div>" +
      "<div data-lines></div>" +
      "<button class='btn btn-outline btn-sm' data-addline style='margin-top:10px'>" + icon("plus", 14) + "Add line</button>" +
      "<div class='totals-box' style='margin-top:18px'>" +
        "<div class='totals-row grand'><span>Total</span><span class='v' data-total>" + Data.fmtMoney(0) + "</span></div>" +
      "</div>";

    UI.modal({
      title: "New invoice",
      sub: "Pick from the catalog or type your own item — price and quantity are editable.",
      body: body,
      size: "lg",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("receipt", 15) + "Create invoice</button>",
      onMount: function (root, close) {
        var linesEl = root.querySelector("[data-lines]");
        var patientSel = root.querySelector("[data-f='patient']");
        var clientSel = root.querySelector("[data-f='client']");

        clientSel.addEventListener("change", function () {
          patientSel.innerHTML = "<option value=''>— none —</option>" + Actions.patientOptions(null, clientSel.value);
        });

        function svcMatch(name) {
          name = (name || "").trim().toLowerCase();
          if (!name) return null;
          for (var i = 0; i < Data.services.length; i++) {
            if (Data.services[i].name.toLowerCase() === name) return Data.services[i];
          }
          return null;
        }

        function parseNum(v) {
          v = String(v == null ? "" : v).replace(/,/g, "").replace(/[^0-9.]/g, "");
          var n = parseFloat(v);
          return isNaN(n) || n < 0 ? 0 : n;
        }

        function linePrice(row) {
          return parseNum(row.querySelector("[data-price]").value);
        }

        function addLine() {
          var row = UI.el(
            "<div class='line-item' style='margin-bottom:8px'>" +
              "<input class='input' list='invSvcList' placeholder='Type or pick a service…' data-svc>" +
              "<input class='input num' type='text' inputmode='decimal' autocomplete='off' placeholder='0' title='Price per unit (Rs) — you can edit this' data-price>" +
              "<input class='input' type='number' min='1' value='1' title='Quantity' data-qty>" +
              "<input class='input num' readonly title='Line amount' data-amt>" +
              "<button class='line-remove' data-del>" + icon("x", 13) + "</button>" +
            "</div>"
          );
          linesEl.appendChild(row);
          var svcInp = row.querySelector("[data-svc]");
          var priceInp = row.querySelector("[data-price]");
          svcInp.addEventListener("input", function () {
            var s = svcMatch(svcInp.value);
            if (s && !priceInp._touched) priceInp.value = s.price;
            recalc();
          });
          priceInp.addEventListener("input", function () {
            priceInp._touched = true;
            recalc();
          });
          row.querySelector("[data-qty]").addEventListener("input", recalc);
          row.querySelector("[data-del]").addEventListener("click", function () { row.remove(); recalc(); });
          recalc();
        }

        function recalc() {
          var total = 0;
          linesEl.querySelectorAll(".line-item").forEach(function (row) {
            var qty = parseInt(row.querySelector("[data-qty]").value, 10) || 0;
            var amt = Math.round(linePrice(row) * qty * 100) / 100;
            row.querySelector("[data-amt]").value = Data.fmtMoney(amt);
            total += amt;
          });
          root.querySelector("[data-total]").textContent = Data.fmtMoney(total);
        }

        root.querySelector("[data-addline]").addEventListener("click", function () { addLine(); });
        root.querySelector("[data-cancel]").addEventListener("click", close);
        addLine();

        root.querySelector("[data-save]").addEventListener("click", function () {
          var lines = [];
          var badQty = false;
          linesEl.querySelectorAll(".line-item").forEach(function (row) {
            var desc = row.querySelector("[data-svc]").value.trim();
            var qty = parseInt(row.querySelector("[data-qty]").value, 10) || 0;
            if (!desc) return;                        /* empty row — just ignore it */
            if (qty <= 0) { badQty = true; return; }  /* named row needs a quantity */
            lines.push({ desc: desc, qty: qty, price: linePrice(row) });
          });
          if (badQty) { UI.toast({ kind: "warn", title: "Check quantity", msg: "Every line needs a quantity of 1 or more." }); return; }
          if (!lines.length) { UI.toast({ kind: "warn", title: "Add at least one line", msg: "Pick or type a service first." }); return; }

          var maxN = 1000;
          Store.db.invoices.forEach(function (inv) {
            var n = parseInt(String(inv.id).split("-").pop(), 10);
            if (!isNaN(n) && n >= maxN) maxN = n + 1;
          });
          var today = Data.todayISO();
          var inv = {
            id: "INV-" + new Date().getFullYear() + "-" + Data.pad(maxN, 4),
            clientId: clientSel.value,
            patientId: patientSel.value || null,
            date: today,
            due: Data.iso(Data.addDays(new Date(), 14)),
            lines: lines,
            payments: [],
            notes: ""
          };
          Store.db.invoices.unshift(inv);
          Store.commit();
          close();
          UI.toast({ kind: "success", title: "Invoice created", msg: inv.id + " · " + Data.fmtMoney(Data.invoiceTotals(inv).total) });
          if (opts.onDone) opts.onDone(inv);
        });
      }
    });
  },

  /* ---------- payment ---------- */

  paymentDialog: function (opts) {
    var inv = opts.invoice;
    var totals = Data.invoiceTotals(inv);
    var client = Store.clientById(inv.clientId);

    var body =
      "<div class='dose-panel' style='margin-bottom:16px'>" +
        "<div style='font-size:12px;font-weight:700;color:var(--faint);text-transform:uppercase;letter-spacing:.06em'>Balance due</div>" +
        "<div class='dose-value' style='font-size:26px'>" + Data.fmtMoney(totals.balance) + "</div>" +
        "<div class='dose-rule'>" + UI.escape(inv.id) + " · " + UI.escape(Store.clientName(client)) + " · total " + Data.fmtMoney(totals.total) + "</div>" +
      "</div>" +
      "<div class='field-row'>" +
        "<div class='field'><label>Amount</label><input class='input' type='number' step='0.01' min='0' max='" + totals.balance + "' data-f='amount' value='" + totals.balance.toFixed(2) + "'></div>" +
        "<div class='field'><label>Method</label><select class='select' data-f='method'>" +
          ["Card", "Cash", "Bank transfer", "Insurance"].map(function (mth) { return "<option>" + mth + "</option>"; }).join("") +
        "</select></div>" +
      "</div>";

    UI.modal({
      title: "Record payment",
      sub: "Split payments are supported — record multiple payments per invoice.",
      body: body,
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("check", 15) + "Record payment</button>",
      onMount: function (root, close) {
        root.querySelector("[data-cancel]").addEventListener("click", close);
        root.querySelector("[data-save]").addEventListener("click", function () {
          var amount = parseFloat(root.querySelector("[data-f='amount']").value);
          var method = root.querySelector("[data-f='method']").value;
          if (!(amount > 0)) { UI.toast({ kind: "warn", title: "Enter an amount" }); return; }
          if (amount > totals.balance + 0.005) { UI.toast({ kind: "warn", title: "Overpayment blocked", msg: "Amount exceeds the outstanding balance of " + Data.fmtMoney(totals.balance) + "." }); return; }
          inv.payments = inv.payments || [];
          inv.payments.push({ method: method, amount: Math.round(amount * 100) / 100, date: Data.todayISO() });
          Store.commit();
          var status = Data.invoiceStatus(inv);
          close();
          UI.toast({
            kind: status === "paid" ? "success" : "info",
            title: status === "paid" ? "Invoice paid in full" : "Partial payment recorded",
            msg: inv.id + " · " + Data.fmtMoney(amount) + " via " + method
          });
          if (opts.onDone) opts.onDone(inv);
        });
      }
    });
  },

  /* ---------- delete confirmations ---------- */

  deleteSummary: function (rows) {
    var html = rows.filter(function (r) { return r[1] > 0; }).map(function (r) {
      return "<div class='del-row'><span class='muted'>" + r[0] + "</span><b>" + r[1] + "</b></div>";
    }).join("");
    return html ? "<div class='del-summary'>" + html + "</div>" : "";
  },

  confirmDeleteClient: function (client, onConfirm) {
    var pets = Store.patientsOf(client.id);
    var petIds = pets.map(function (p) { return p.id; });
    function recCount(arr) {
      return arr.filter(function (x) { return petIds.indexOf(x.patientId) >= 0; }).length;
    }
    var apptN = recCount(Store.db.appointments);
    var encN = recCount(Store.db.encounters);
    var rxN = recCount(Store.db.prescriptions);
    var invN = Store.db.invoices.filter(function (inv) { return inv.clientId === client.id; }).length;
    var name = Store.clientName(client);

    UI.confirm({
      danger: true,
      title: "Delete client?",
      confirmText: "Delete client",
      html:
        "<div class='row' style='gap:13px;align-items:flex-start'>" +
          "<span class='del-icon'>" + icon("alert", 18) + "</span>" +
          "<div style='font-size:13px;color:var(--text-2);line-height:1.6'><b style='color:var(--text)'>" + UI.escape(name) + "</b> and everything linked to this client will be permanently deleted.</div>" +
        "</div>" +
        Actions.deleteSummary([
          ["Patients", pets.length],
          ["Appointments", apptN],
          ["Medical records", encN],
          ["Prescriptions", rxN],
          ["Invoices", invN]
        ]) +
        (invN ? "<div class='muted small' style='margin-top:10px'>" + invN + " invoice" + (invN === 1 ? "" : "s") + " will be kept for billing history and unlinked from the client.</div>" : "") +
        "<div class='muted small' style='margin-top:10px'>This action cannot be undone.</div>"
    }).then(function (ok) {
      if (!ok) return;
      Store.deleteClient(client.id);
      UI.toast({ kind: "info", title: "Client deleted", msg: name + " and their records were removed" });
      if (onConfirm) onConfirm();
    });
  },

  confirmDeletePatient: function (patient, onConfirm) {
    var apptN = Store.db.appointments.filter(function (a) { return a.patientId === patient.id; }).length;
    var encN = Store.db.encounters.filter(function (e) { return e.patientId === patient.id; }).length;
    var rxN = Store.db.prescriptions.filter(function (rx) { return rx.patientId === patient.id; }).length;
    var invN = Store.db.invoices.filter(function (inv) { return inv.patientId === patient.id; }).length;

    UI.confirm({
      danger: true,
      title: "Delete patient?",
      confirmText: "Delete patient",
      html:
        "<div class='row' style='gap:13px;align-items:flex-start'>" +
          "<span class='del-icon'>" + icon("alert", 18) + "</span>" +
          "<div style='font-size:13px;color:var(--text-2);line-height:1.6'><b style='color:var(--text)'>" + UI.escape(patient.name) + "</b> and everything linked to this patient will be permanently deleted.</div>" +
        "</div>" +
        Actions.deleteSummary([
          ["Appointments", apptN],
          ["Medical records", encN],
          ["Prescriptions", rxN],
          ["Invoices", invN]
        ]) +
        (invN ? "<div class='muted small' style='margin-top:10px'>" + invN + " invoice" + (invN === 1 ? "" : "s") + " will be kept for billing history and unlinked from the patient.</div>" : "") +
        "<div class='muted small' style='margin-top:10px'>This action cannot be undone.</div>"
    }).then(function (ok) {
      if (!ok) return;
      Store.deletePatient(patient.id);
      UI.toast({ kind: "info", title: "Patient deleted", msg: patient.name + " and their records were removed" });
      if (onConfirm) onConfirm();
    });
  },

  /* ---------- printable bill ---------- */

  printBill: function (inv) {
    var c = Store.clientById(inv.clientId);
    var p = inv.patientId ? Store.patientById(inv.patientId) : null;
    var t = Data.invoiceTotals(inv);
    var status = Data.invoiceStatus(inv);
    var statusLabel = { paid: "Paid", partial: "Partially paid", overdue: "Overdue", sent: "Balance due", draft: "Draft" }[status] || status;

    var area = document.getElementById("printArea");
    if (!area) {
      area = document.createElement("div");
      area.id = "printArea";
      document.body.appendChild(area);
    }

    var rows = inv.lines.map(function (l, i) {
      return "<tr><td class='bill-num'>" + (i + 1) + "</td><td>" + UI.escape(l.desc) + "</td>" +
        "<td class='bill-num'>" + l.qty + "</td>" +
        "<td class='bill-num'>" + Data.fmtMoney(l.price) + "</td>" +
        "<td class='bill-num'>" + Data.fmtMoney(l.qty * l.price) + "</td></tr>";
    }).join("");

    var payRows = (inv.payments || []).map(function (pm) {
      return "<tr><td>" + Data.fmtDateLong(pm.date) + "</td><td>" + UI.escape(pm.method) + "</td>" +
        "<td class='bill-num'>" + Data.fmtMoney(pm.amount) + "</td></tr>";
    }).join("");

    area.innerHTML =
      "<div class='bill'>" +
        "<div class='bill-head'>" +
          "<div class='bill-brand'>" +
            "<span class='bill-logo'>" + icon("paw", 26) + "</span>" +
            "<div><div class='bill-hosp'>IZEX — Animal Hospital</div>" +
            "<div class='bill-hosp-sub'>Quality veterinary care for every patient</div></div>" +
          "</div>" +
          "<div class='bill-title-wrap'>" +
            "<div class='bill-title'>BILL</div>" +
            "<div class='bill-status'>" + UI.escape(statusLabel) + "</div>" +
          "</div>" +
        "</div>" +

        "<div class='bill-meta'>" +
          "<div><span class='k'>Invoice #</span><span class='v'>" + UI.escape(inv.id) + "</span></div>" +
          "<div><span class='k'>Issued</span><span class='v'>" + Data.fmtDateLong(inv.date) + "</span></div>" +
          "<div><span class='k'>Due</span><span class='v'>" + Data.fmtDateLong(inv.due) + "</span></div>" +
        "</div>" +

        "<div class='bill-parties'>" +
          "<div class='bill-party'><div class='bill-party-label'>Billed to</div>" +
            "<div class='bill-party-name'>" + UI.escape(Store.clientName(c)) + "</div>" +
            (c && c.phone ? "<div>" + UI.escape(c.phone) + "</div>" : "") +
            (c && c.email ? "<div>" + UI.escape(c.email) + "</div>" : "") +
            (c && c.address ? "<div>" + UI.escape(c.address) + "</div>" : "") +
          "</div>" +
          (p ? "<div class='bill-party'><div class='bill-party-label'>Patient</div>" +
            "<div class='bill-party-name'>" + UI.escape(p.name) + "</div>" +
            "<div>" + UI.escape(p.breed) + " · " + UI.escape(p.species) + "</div>" +
            "<div>Owner: " + UI.escape(Store.clientName(c)) + "</div>" +
          "</div>" : "") +
        "</div>" +

        "<table class='bill-table'><thead><tr><th class='bill-num'>#</th><th>Description</th>" +
          "<th class='bill-num'>Qty</th><th class='bill-num'>Unit price</th><th class='bill-num'>Amount</th></tr></thead>" +
          "<tbody>" + rows + "</tbody></table>" +

        "<div class='bill-bottom'>" +
          "<div class='bill-side'>" +
            (payRows ? "<div class='bill-party-label'>Payments received</div>" +
              "<table class='bill-table small'><tbody>" + payRows + "</tbody></table>" : "") +
            (inv.notes ? "<div class='bill-note'>Notes: " + UI.escape(inv.notes) + "</div>" : "") +
          "</div>" +
          "<div class='bill-totals'>" +
            "<div class='bill-row grand'><span>Total</span><span>" + Data.fmtMoney(t.total) + "</span></div>" +
            (t.paid > 0 ? "<div class='bill-row'><span>Paid</span><span>− " + Data.fmtMoney(t.paid) + "</span></div>" : "") +
            "<div class='bill-row balance'><span>Balance due</span><span>" + Data.fmtMoney(t.balance) + "</span></div>" +
          "</div>" +
        "</div>" +

        "<div class='bill-foot'>Thank you for trusting IZEX with your pet's care. Please keep this bill for your records.</div>" +
      "</div>";

    if (area._t) clearTimeout(area._t);
    document.body.classList.add("printing-bill");
    var clear = function () {
      area.innerHTML = "";
      document.body.classList.remove("printing-bill");
      window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    area._t = setTimeout(clear, 3000);
    window.print();
  }
};
