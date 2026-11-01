/* IZEX — state, persistence, and query helpers */

var Store = {
  KEY: "izex.db.v2",
  OLD_KEYS: ["vethms.db.v1"],

  db: null,

  init: function () {
    var loaded = null;
    try {
      var raw = localStorage.getItem(this.KEY);
      if (raw) loaded = JSON.parse(raw);
      if (!loaded) {
        /* drop any stored demo data from earlier versions */
        for (var i = 0; i < this.OLD_KEYS.length; i++) {
          try { localStorage.removeItem(this.OLD_KEYS[i]); } catch (e2) { /* ignore */ }
        }
      }
    } catch (e) { loaded = null; }
    this.db = loaded && loaded.clients ? loaded : Seed.empty();
    this.migrate();
    this.save();
  },

  /* keep data stored by older versions of the app working */
  migrate: function () {
    var db = this.db;

    /* reference config must exist even in old saves */
    if (!db.vets || !db.vets.length) db.vets = JSON.parse(JSON.stringify(Seed.staff));
    if (!db.drugs || !db.drugs.length) db.drugs = JSON.parse(JSON.stringify(Seed.formulary));

    /* single-doctor practice: collapse any multi-vet saves to the first vet
       and point every record at them */
    if (db.vets.length > 1) db.vets = [db.vets[0]];
    var vet = db.vets[0];
    /* staff details are app-level config (there is no staff editor) */
    vet.name = Seed.staff[0].name;
    vet.role = Seed.staff[0].role;
    vet.initials = Seed.staff[0].initials;
    function fixVet(arr, key) {
      (arr || []).forEach(function (x) { x[key] = vet.id; });
    }
    fixVet(db.appointments, "vetId");
    fixVet(db.encounters, "vetId");
    fixVet(db.prescriptions, "prescriberId");
  },

  save: function () {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.db)); } catch (e) { /* in-memory only */ }
  },

  commit: function () { this.save(); return this.db; },

  /* start over with an empty practice */
  reset: function () { this.db = Seed.empty(); this.save(); },

  /* replace everything with the optional demo dataset */
  loadSample: function () { this.db = Seed.build(); this.save(); },

  /* ---------- deletion ---------- */

  /* remove a patient and their clinical records; invoices are kept for billing (unlinked) */
  deletePatient: function (id) {
    var db = this.db;
    db.patients = db.patients.filter(function (p) { return p.id !== id; });
    db.appointments = db.appointments.filter(function (a) { return a.patientId !== id; });
    db.encounters = db.encounters.filter(function (e) { return e.patientId !== id; });
    db.prescriptions = db.prescriptions.filter(function (rx) { return rx.patientId !== id; });
    db.invoices.forEach(function (inv) { if (inv.patientId === id) inv.patientId = null; });
    this.save();
  },

  /* remove a client together with their patients and every linked record */
  deleteClient: function (id) {
    var self = this;
    this.patientsOf(id).forEach(function (p) { self.deletePatient(p.id); });
    var db = this.db;
    db.clients = db.clients.filter(function (c) { return c.id !== id; });
    db.invoices.forEach(function (inv) { if (inv.clientId === id) inv.clientId = null; });
    this.save();
  },

  isEmpty: function () {
    var d = this.db;
    return !d.clients.length && !d.patients.length && !d.appointments.length &&
      !d.encounters.length && !d.prescriptions.length && !d.inventory.length && !d.invoices.length;
  },

  /* ---------- lookups ---------- */

  find: function (arr, id) {
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
    return null;
  },
  vet: function (id) { return this.find(this.db.vets, id); },
  clientById: function (id) { return this.find(this.db.clients, id); },
  patientById: function (id) { return this.find(this.db.patients, id); },
  drugById: function (id) { return this.find(this.db.drugs, id); },
  invById: function (id) { return this.find(this.db.inventory, id); },

  ownerOf: function (patient) { return patient ? this.clientById(patient.ownerId) : null; },
  patientsOf: function (clientId) {
    return this.db.patients.filter(function (p) { return p.ownerId === clientId; });
  },
  clientName: function (client) { return client ? client.firstName + " " + client.lastName : "—"; },
  patientTitle: function (patient) { return patient ? patient.name : "—"; },

  apptsOn: function (dateIso) {
    return this.db.appointments
      .filter(function (a) { return a.date === dateIso; })
      .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  },

  apptsInRange: function (fromIso, toIso) {
    return this.db.appointments.filter(function (a) { return a.date >= fromIso && a.date <= toIso; });
  },

  paymentsBetween: function (fromIso, toIso) {
    var sum = 0;
    this.db.invoices.forEach(function (inv) {
      (inv.payments || []).forEach(function (p) {
        if (p.date >= fromIso && p.date <= toIso) sum += Number(p.amount) || 0;
      });
    });
    return Math.round(sum * 100) / 100;
  },

  outstanding: function () {
    var sum = 0;
    this.db.invoices.forEach(function (inv) {
      if (Data.invoiceStatus(inv) !== "paid") sum += Data.invoiceTotals(inv).balance;
    });
    return Math.round(sum * 100) / 100;
  },

  lowStock: function () {
    return this.db.inventory.filter(function (it) { return it.qty <= it.reorderAt; });
  },

  expiringSoon: function (days) {
    return this.db.inventory
      .filter(function (it) { var d = Data.daysUntil(it.expiry); return d <= days; })
      .sort(function (a, b) { return Data.daysUntil(a.expiry) - Data.daysUntil(b.expiry); });
  },

  overdueInvoices: function () {
    return this.db.invoices.filter(function (inv) { return Data.invoiceStatus(inv) === "overdue"; });
  },

  stats: function () {
    var today = Data.todayISO();
    var now = new Date();
    var d30 = Data.iso(Data.addDays(now, -30));
    var d60 = Data.iso(Data.addDays(now, -60));
    var monthStart = Data.iso(new Date(now.getFullYear(), now.getMonth(), 1));

    var todays = this.apptsOn(today);
    var done = todays.filter(function (a) { return a.status === "completed"; }).length;

    var past30 = this.apptsInRange(d30, today);
    var noShows = past30.filter(function (a) { return a.status === "no-show"; }).length;
    var completed30 = past30.filter(function (a) { return a.status === "completed"; }).length;

    var rev30 = this.paymentsBetween(d30, today);
    var revPrev = this.paymentsBetween(d60, d30);

    return {
      apptsToday: todays.length,
      doneToday: done,
      remainingToday: todays.length - done,
      patientsActive: this.db.patients.length,
      revenueToday: this.paymentsBetween(today, today),
      revenue30: rev30,
      revenueDelta: revPrev > 0 ? Math.round(((rev30 - revPrev) / revPrev) * 1000) / 10 : 0,
      revenueMtd: this.paymentsBetween(monthStart, today),
      lowStock: this.lowStock().length,
      expiring: this.db.inventory.filter(function (it) { var d = Data.daysUntil(it.expiry); return d <= 30; }).length,
      overdue: this.overdueInvoices().length,
      outstanding: this.outstanding(),
      noShowRate: past30.length ? Math.round((noShows / past30.length) * 1000) / 10 : 0,
      visits30: completed30
    };
  },

  /* monthly revenue for last n months -> {labels, values} */
  revenueSeries: function (months) {
    var now = new Date();
    var out = { labels: [], values: [] };
    for (var i = months - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      var key = Data.monthKey(d);
      var from = key + "-01";
      var end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      var to = Data.iso(end);
      out.labels.push(Data.monthLabel(key));
      out.values.push(Math.round(this.paymentsBetween(from, to)));
    }
    return out;
  },

  speciesMix: function () {
    var counts = {};
    this.db.patients.forEach(function (p) {
      var key = p.species;
      counts[key] = (counts[key] || 0) + 1;
    });
    var colors = { dog: "#0d9488", cat: "#8b5cf6", parrot: "#0ea5e9", rabbit: "#f59e0b" };
    var caps = { dog: "Dogs", cat: "Cats", parrot: "Birds", rabbit: "Small mammals" };
    return Object.keys(counts).map(function (k) {
      return { label: caps[k] || k, value: counts[k], color: colors[k] || "#64748b" };
    });
  },

  apptsByDay: function (days) {
    var out = { labels: [], values: [] };
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = Data.addDays(now, -i);
      var iso = Data.iso(d);
      out.labels.push(d.toLocaleDateString("en-US", { weekday: "narrow" }));
      out.values.push(this.apptsOn(iso).length);
    }
    return out;
  }
};
