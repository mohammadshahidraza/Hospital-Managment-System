/* IZEX — helpers + seed data generator */

var Data = {
  currency: { code: "PKR", symbol: "Rs" },
  taxRate: 0,

  /* Prices in PKR (Pakistani Rupees) */
  services: [
    { name: "Consultation", price: 1500 },
    { name: "Emergency Consultation", price: 3000 },
    { name: "Vaccination (DHPP / FVRCP)", price: 1500 },
    { name: "Vaccination (Rabies)", price: 1200 },
    { name: "Microchip Implant", price: 1500 },
    { name: "Blood Panel (CBC + Chemistry)", price: 4500 },
    { name: "Urinalysis", price: 1500 },
    { name: "Radiograph (2 views)", price: 5000 },
    { name: "Dental Cleaning", price: 15000 },
    { name: "Spay / Neuter", price: 20000 },
    { name: "Ear Cytology", price: 1200 },
    { name: "Fluid Therapy (per day)", price: 2500 },
    { name: "Boarding (per night)", price: 1200 },
    { name: "Grooming — Full Service", price: 2500 },
    { name: "Nail Trim", price: 500 },
    { name: "Medication Dispensing", price: 800 }
  ],

  /* ---------- utilities ---------- */

  rng: function (seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  },

  pad: function (n, w) {
    var str = String(n);
    while (str.length < w) str = "0" + str;
    return str;
  },

  iso: function (d) {
    return d.getFullYear() + "-" + Data.pad(d.getMonth() + 1, 2) + "-" + Data.pad(d.getDate(), 2);
  },

  parseISO: function (s) {
    var p = String(s).split("-");
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  },

  addDays: function (d, n) {
    var x = new Date(d.getTime());
    x.setDate(x.getDate() + n);
    return x;
  },

  startOfWeek: function (d) { /* Monday */
    var x = new Date(d.getTime());
    var day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  },

  todayISO: function () { return Data.iso(new Date()); },

  daysUntil: function (iso) {
    var t = Data.parseISO(Data.todayISO()).getTime();
    var d = Data.parseISO(iso).getTime();
    return Math.round((d - t) / 86400000);
  },

  nextId: function (prefix, arr, start) {
    var max = start - 1;
    for (var i = 0; i < arr.length; i++) {
      var n = parseInt(String(arr[i].id).replace(/[^0-9]/g, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    }
    return prefix + "-" + (max + 1);
  },

  /* ---------- formatting ---------- */

  fmtMoney: function (n) {
    var v = Math.round((Number(n) || 0) * 100) / 100;
    var neg = v < 0; v = Math.abs(v);
    var s = v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + Data.currency.symbol + " " + s;
  },

  fmtMoneyCompact: function (n) {
    var v = Math.round(Number(n) || 0);
    var sign = v < 0 ? "-" : ""; v = Math.abs(v);
    if (v >= 1000000) return sign + Data.currency.symbol + " " + (v / 1000000).toFixed(1) + "M";
    if (v >= 1000) return sign + Data.currency.symbol + " " + (v / 1000).toFixed(1) + "k";
    return sign + Data.currency.symbol + " " + v;
  },

  fmtDate: function (iso) {
    var d = Data.parseISO(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  },

  fmtDateLong: function (iso) {
    var d = Data.parseISO(iso);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  },

  fmtTime: function (hm) {
    var p = String(hm).split(":");
    var h = parseInt(p[0], 10), m = p[1] || "00";
    var ap = h >= 12 ? "PM" : "AM";
    var hh = h % 12; if (hh === 0) hh = 12;
    return hh + ":" + m + " " + ap;
  },

  monthKey: function (d) { return d.getFullYear() + "-" + Data.pad(d.getMonth() + 1, 2); },

  monthLabel: function (key) {
    var p = key.split("-");
    var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  },

  relTime: function (isoDate, isoTime) {
    var d = Data.parseISO(isoDate);
    if (isoTime) { var p = String(isoTime).split(":"); d.setHours(parseInt(p[0], 10), parseInt(p[1], 10), 0, 0); }
    var mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return mins + "m ago";
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + "h ago";
    var days = Math.round(hrs / 24);
    if (days < 30) return days + "d ago";
    return Data.fmtDate(isoDate);
  },

  petAge: function (birthIso) {
    var b = Data.parseISO(birthIso), t = new Date();
    var months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
    if (t.getDate() < b.getDate()) months -= 1;
    if (months < 1) return "newborn";
    if (months < 12) return months + " mo";
    var yrs = Math.floor(months / 12);
    var rem = months % 12;
    return rem >= 4 ? yrs + " yr " + rem + " mo" : (rem > 0 ? yrs + "½ yr" : yrs + " yr");
  },

  initials: function (name) {
    var parts = String(name || "?").replace(/^(Dr\.|Mrs\.|Mr\.|Ms\.)\s*/i, "").split(/\s+/);
    var a = (parts[0] || "?")[0] || "?";
    var b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  },

  colorFor: function (str) {
    var palette = ["#0d9488", "#8b5cf6", "#0ea5e9", "#f59e0b", "#e11d48", "#10b981", "#6366f1", "#ec4899", "#14b8a6", "#f97316"];
    var s = String(str || ""), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  },

  speciesIcon: function (species) {
    var s = String(species || "").toLowerCase();
    if (s.indexOf("dog") >= 0) return "dog";
    if (s.indexOf("cat") >= 0) return "cat";
    return "paw";
  },

  vaccineStatus: function (dueIso) {
    var d = Data.daysUntil(dueIso);
    if (d < 0) return "overdue";
    if (d <= 30) return "due";
    return "current";
  },

  expiryState: function (iso) {
    var d = Data.daysUntil(iso);
    if (d < 0) return { kind: "expired", label: "Expired " + Math.abs(d) + "d ago", chip: "rose" };
    if (d <= 30) return { kind: "soon", label: d + "d left", chip: "amber" };
    if (d <= 90) return { kind: "notice", label: d + "d left", chip: "slate" };
    return { kind: "ok", label: Data.fmtDate(iso), chip: "teal" };
  },

  invoiceTotals: function (inv) {
    var subtotal = 0;
    (inv.lines || []).forEach(function (l) { subtotal += (Number(l.qty) || 0) * (Number(l.price) || 0); });
    var total = Math.round(subtotal * 100) / 100;
    var paid = 0;
    (inv.payments || []).forEach(function (p) { paid += Number(p.amount) || 0; });
    paid = Math.round(paid * 100) / 100;
    return { subtotal: total, tax: 0, total: total, paid: paid, balance: Math.round((total - paid) * 100) / 100 };
  },

  invoiceStatus: function (inv) {
    var t = Data.invoiceTotals(inv);
    if (t.paid >= t.total - 0.005) return "paid";
    if (t.paid > 0) return "partial";
    if (inv.date && Data.daysUntil(inv.due) < 0) return "overdue";
    return "sent";
  }
};

/* ============================================================
   Seed — reference config + optional sample dataset
   ============================================================ */

var Seed = {
  /* Reference configuration — kept even when the practice is empty.
     Booking, charting and prescribing need staff and a drug formulary. */
  /* Single-doctor practice — one veterinarian runs the hospital. */
  staff: [
    { id: "V1", name: "Dr. Israr Rao", role: "Veterinarian", color: "#0d9488", initials: "IR" }
  ],

  formulary: [
    { id: "D1", name: "Meloxicam (Metacam)", category: "NSAID", species: ["dog", "cat"], doseMin: 0.1, doseMax: 0.2, unit: "mg/kg", conc: "1.5 mg/ml", freq: "Once daily", maxDays: 7, warns: ["GI upset — give with food", "Avoid in dehydration or renal disease"] },
    { id: "D2", name: "Amoxicillin-Clavulanate", category: "Antibiotic", species: ["dog", "cat"], doseMin: 12.5, doseMax: 25, unit: "mg/kg", conc: "62.5 mg/ml", freq: "Twice daily", maxDays: 14, tags: ["penicillin"], warns: ["Check allergy history — penicillin class"] },
    { id: "D3", name: "Apoquel (Oclacitinib)", category: "Dermatology", species: ["dog"], doseMin: 0.4, doseMax: 0.6, unit: "mg/kg", conc: "5.4 mg tablet", freq: "Twice daily x14d, then once daily", maxDays: 90, warns: ["Dogs only", "Monitor for infections during therapy"] },
    { id: "D4", name: "Cerenia (Maropitant)", category: "Anti-emetic", species: ["dog", "cat"], doseMin: 1, doseMax: 2, unit: "mg/kg", conc: "10 mg/ml", freq: "Once daily", maxDays: 5, warns: ["Inject subcutaneously; rotate sites"] },
    { id: "D5", name: "Otomax Ointment", category: "Otic", species: ["dog"], doseMin: null, doseMax: null, unit: "fixed", conc: "Gentamicin/betamethasone/clotrimazole", freq: "Twice daily", maxDays: 14, warns: ["Fixed dose — apply to affected ear(s) as directed", "Dogs only"] },
    { id: "D6", name: "Bravecto (Fluralaner)", category: "Parasiticide", species: ["dog", "cat"], doseMin: 25, doseMax: 56, unit: "mg/kg", conc: "chewable", freq: "Every 12 weeks", maxDays: 84, warns: ["Chewable — confirm pet will accept oral dosing"] },
    { id: "D7", name: "Pimobendan (Vetmedin)", category: "Cardiology", species: ["dog"], doseMin: 0.2, doseMax: 0.6, unit: "mg/kg", conc: "1.25 mg capsule", freq: "Twice daily", maxDays: 365, warns: ["Divide daily dose into two administrations", "Recheck renal values at 2 weeks"] },
    { id: "D8", name: "Gabapentin", category: "Analgesic / Neuro", species: ["dog", "cat"], doseMin: 5, doseMax: 10, unit: "mg/kg", conc: "100 mg capsule", freq: "Twice daily", maxDays: 30, warns: ["Sedation may occur — caution with stairs", "Compounding may be needed for cats"] }
  ],

  /* A blank practice — no clients, patients or records.
     Staff and the formulary stay so every workflow works from day one. */
  empty: function () {
    return {
      meta: { hospital: "IZEX", created: Data.todayISO() },
      vets: JSON.parse(JSON.stringify(Seed.staff)),
      clients: [],
      patients: [],
      appointments: [],
      encounters: [],
      drugs: JSON.parse(JSON.stringify(Seed.formulary)),
      prescriptions: [],
      inventory: [],
      invoices: [],
      activity: [],
      notifications: []
    };
  },

  /* Optional demo dataset — loaded on demand from the sidebar. */
  build: function () {
    var rnd = Data.rng(20261017);
    var now = new Date();
    var today = Data.iso(now);

    var vets = JSON.parse(JSON.stringify(Seed.staff));

    /* ---------- clients ---------- */
    var clientDefs = [
      ["Olivia", "Bennett", "(555) 014-2231", "olivia.bennett@mail.com", "12 Maple Grove, Brookside"],
      ["Liam", "Harper", "(555) 014-8842", "liam.harper@mail.com", "48 Cedar Lane, Brookside"],
      ["Sofia", "Rodriguez", "(555) 012-5510", "sofia.rodriguez@mail.com", "7 Birch Court, Riverside"],
      ["Noah", "Kim", "(555) 017-3345", "noah.kim@mail.com", "221 Oak Street, Riverside"],
      ["Emma", "Thompson", "(555) 011-9928", "emma.thompson@mail.com", "5 Willow Way, Maple Heights"],
      ["Ava", "Patel", "(555) 019-4417", "ava.patel@mail.com", "90 Sunset Blvd, Maple Heights"],
      ["Jackson", "Reed", "(555) 018-2203", "jackson.reed@mail.com", "34 Elm Drive, Brookside"],
      ["Mia", "Novak", "(555) 013-7781", "mia.novak@mail.com", "16 Aspen Row, Riverside"],
      ["Ethan", "Brooks", "(555) 015-6692", "ethan.brooks@mail.com", "309 Pine Hill Rd, Fairview"],
      ["Layla", "Hassan", "(555) 016-3014", "layla.hassan@mail.com", "73 Magnolia Ave, Fairview"],
      ["Grace", "O'Connor", "(555) 010-5568", "grace.oconnor@mail.com", "8 Juniper Close, Brookside"],
      ["Daniel", "Varga", "(555) 014-9973", "daniel.varga@mail.com", "145 Harbor Road, Fairview"],
      ["Chloe", "Simmons", "(555) 017-1160", "chloe.simmons@mail.com", "27 Rosewood Terr, Maple Heights"],
      ["Henry", "Wu", "(555) 018-8045", "henry.wu@mail.com", "61 Chestnut St, Riverside"]
    ];
    var clients = clientDefs.map(function (c, i) {
      return {
        id: "C-" + (1001 + i),
        firstName: c[0], lastName: c[1],
        phone: c[2], email: c[3], address: c[4],
        since: Data.iso(Data.addDays(now, -(60 + i * 57 % 1300))),
        notes: "",
        tags: i % 5 === 0 ? ["Insured"] : []
      };
    });

    /* ---------- patients ---------- */
    var petDefs = [
      ["Bella", "dog", "Labrador Retriever", "Female", true, 54, 28.4, "Golden", 0, ["Penicillin"], []],
      ["Max", "dog", "German Shepherd", "Male", true, 38, 34.2, "Black & Tan", 1, [], ["Hip dysplasia"]],
      ["Luna", "cat", "Domestic Shorthair", "Female", true, 27, 4.3, "Grey Tabby", 2, ["Penicillin"], []],
      ["Charlie", "dog", "Beagle", "Male", false, 72, 12.8, "Tricolor", 3, [], ["Arthritis"]],
      ["Milo", "cat", "Maine Coon", "Male", true, 18, 6.1, "Cream", 4, [], []],
      ["Daisy", "dog", "French Bulldog", "Female", false, 46, 11.2, "Fawn", 5, [], ["Brachycephalic airway syndrome"]],
      ["Rocky", "dog", "Golden Retriever", "Male", true, 96, 31.7, "Golden", 6, ["Chicken protein"], []],
      ["Zoe", "cat", "Siamese", "Female", true, 60, 3.9, "Seal Point", 7, [], ["CKD — stage 2"]],
      ["Cooper", "dog", "Poodle (Standard)", "Male", false, 33, 22.5, "Apricot", 8, [], []],
      ["Coco", "dog", "Chihuahua", "Female", true, 88, 2.8, "White", 9, [], ["Dental disease"]],
      ["Bailey", "dog", "Border Collie", "Male", true, 61, 19.4, "Black & White", 10, [], []],
      ["Nala", "cat", "British Shorthair", "Female", false, 42, 5.2, "Blue", 11, ["Flea treatment sensitivity"], []],
      ["Oscar", "dog", "Dachshund", "Male", false, 29, 7.6, "Red", 12, [], []],
      ["Willow", "cat", "Ragdoll", "Female", true, 15, 4.8, "Seal Bicolor", 13, [], []],
      ["Pepper", "dog", "Australian Shepherd", "Female", false, 26, 16.9, "Merle", 0, [], []],
      ["Simba", "cat", "Bengal", "Male", true, 51, 5.6, "Spotted", 1, [], []],
      ["Mango", "parrot", "African Grey", "Male", false, 90, 0.5, "Grey & Red", 2, [], []],
      ["Hazel", "rabbit", "Holland Lop", "Female", true, 14, 1.8, "Chestnut", 3, [], []],
      ["Teddy", "dog", "Shih Tzu", "Male", true, 117, 6.4, "Gold & White", 4, [], ["Heart murmur — grade 3"]],
      ["Frankie", "dog", "Corgi (Pembroke)", "Male", false, 19, 10.3, "Red", 5, [], []]
    ];
    var patients = petDefs.map(function (p, i) {
      var ageMonths = p[5];
      var birth = Data.addDays(now, -Math.round(ageMonths * 30.44));
      var weights = [];
      var cur = p[6];
      var startFactor = ageMonths < 24 ? 0.45 : 0.85;
      for (var w = 0; w < 7; w++) {
        var back = (6 - w) * 90;
        var f = startFactor + (1 - startFactor) * (w / 6);
        var jitter = (rnd() - 0.5) * 0.03;
        weights.push({ date: Data.iso(Data.addDays(now, -back)), kg: Math.round(cur * (f + jitter) * 10) / 10 });
      }
      var vaxNames = p[1] === "cat" ? ["Rabies (1-yr)", "FVRCP"] : ["Rabies (3-yr)", "DHPP"];
      var offsetBase = [-9, 45, 120, 200, 300][i % 5];
      var vaccines = vaxNames.map(function (v, vi) {
        return { name: v, due: Data.iso(Data.addDays(now, offsetBase + vi * 25 + (i % 7) * 9 - 20)), lot: "LOT-" + (2400 + i * 3 + vi) };
      });
      return {
        id: "P-" + (2001 + i),
        ownerId: clients[p[8]].id,
        name: p[0], species: p[1], breed: p[2], sex: p[3], neutered: p[4],
        birthDate: Data.iso(birth),
        weightKg: cur,
        color: p[7],
        microchip: "985" + Data.pad(121131400 + i * 7919, 12, "0").slice(0, 12),
        allergies: p[9], chronic: p[10],
        weights: weights,
        vaccines: vaccines,
        photo_hue: (i * 47) % 360
      };
    });

    /* weight values are decimals; recompute jitter-free base for current */
    patients.forEach(function (pt, i) { pt.weights[6].kg = petDefs[i][6]; });

    /* ---------- appointments ---------- */
    var apptTimes = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
    var typeDefs = [
      ["Wellness Exam", 30, "Exam 1"],
      ["Vaccination", 20, "Exam 2"],
      ["Dental", 60, "Dental Suite"],
      ["Surgery", 90, "Surgery"],
      ["Follow-up", 20, "Exam 1"],
      ["Grooming", 60, "Grooming"],
      ["Boarding Check-in", 20, "Front Desk"],
      ["Emergency", 45, "Exam 3"],
      ["Lab Work", 30, "Lab"]
    ];
    var appts = [];
    var apptSeq = 3001;
    for (var off = -14; off <= 10; off++) {
      var day = Data.addDays(now, off);
      if (day.getDay() === 0) continue; /* closed Sundays */
      var count = off < 0 ? (3 + Math.abs(off) % 4) : off === 0 ? 9 : (4 + off % 3);
      for (var a = 0; a < count; a++) {
        var def = typeDefs[(Math.abs(off) * 3 + a * 5) % typeDefs.length];
        var tm = apptTimes[(a * 3 + Math.abs(off)) % apptTimes.length];
        var status;
        if (off < 0) status = rnd() < 0.1 ? "no-show" : "completed";
        else if (off === 0) status = a < 3 ? "completed" : a === 3 ? "in-progress" : a === 4 ? "arrived" : "scheduled";
        else status = "scheduled";
        appts.push({
          id: "A-" + (apptSeq++),
          patientId: patients[(Math.abs(off) * 2 + a * 3) % patients.length].id,
          vetId: vets[(a + Math.abs(off)) % vets.length].id,
          date: Data.iso(day),
          start: tm,
          duration: def[1],
          type: def[0],
          room: def[2],
          status: status,
          notes: ""
        });
      }
    }

    /* ---------- encounters (SOAP) ---------- */
    var encDefs = [
      [0, "V1", 0, "Wellness Exam", { s: "Annual wellness visit. Owner reports Bella is bright, eating and drinking normally. Mild seasonal scratching.", o: "T 38.4°C, HR 92, RR 24. BCS 5/9. Mild tartar, no otitis. Coat healthy.", a: "Healthy adult. Grade 1-2 dental tartar.", p: "DHPP booster administered. Recommend dental cleaning within 6 months. Continue monthly flea prevention." }, "Healthy — wellness", "signed"],
      [2, "V1", 1, "Sick Visit", { s: "3 days of right ear scratching and head shaking. No discharge noted by owner.", o: "Right ear canal erythematous with brown waxy discharge. Left ear unremarkable. T 38.9°C.", a: "Otitis externa, right ear — suspected yeast.", p: "Ear cytology performed (yeast ++). Otic flush done. Continue therapy as dispensed; recheck in 14 days if not resolved." }, "Otitis externa, right ear", "signed"],
      [1, "V1", 3, "Post-op Check", { s: "Day 10 after TPLO. Owner reports good weight bearing, mild stiffness in mornings.", o: "Incision healed. Mild effusion in left stifle. No instability on drawer test.", a: "Post-op TPLO — healing appropriately.", p: "Continue physiotherapy. Reduce Meloxicam to every other day for 1 week then discontinue. Recheck 6 weeks." }, "Post-op TPLO recovery", "signed"],
      [7, "V1", 2, "Follow-up", { s: "CKD recheck. Increased water intake persists; appetite fair. Owner administering renal diet.", o: "Weight down 0.2 kg since last visit. Mild dehydration. BCS 4/9. T 38.1°C.", a: "CKD — stage 2 (IRIS). Stable creatinine.", p: "Continue renal diet. Add omega-3 supplement. Recheck SDMA and UPC in 4 weeks." }, "CKD — stage 2", "signed"],
      [6, "V1", 5, "Vaccination", { s: "Booster visit. No adverse reactions previously. No current concerns.", o: "BAR. T 38.3°C. Injection sites clean.", a: "Healthy — due for routine boosters.", p: "Rabies and DHPP boosters administered. Next boosters due in 12 months. Avoid chicken-based treats for 48h per known sensitivity." }, "Healthy — booster", "signed"],
      [9, "V1", 6, "Dentistry", { s: "Owner reports bad breath and chewing on one side.", o: "Grade 2 periodontal disease, heavy calculus on upper molars. Gingivitis present.", a: "Periodontal disease — stage 2. Probable painful tooth, 108.", p: "Dental cleaning under anesthesia recommended; pre-anesthetic bloodwork discussed and scheduled." }, "Periodontal disease — stage 2", "signed"],
      [12, "V1", 0, "Sick Visit", { s: "Vomited 3 times since last night after scavenging at the park. Still drinking; declined breakfast.", o: "T 38.7°C. Mild abdominal discomfort on palpation. Slightly tacky mucous membranes.", a: "Acute gastroenteritis — suspected dietary indiscretion.", p: "Subcutaneous fluids given. Anti-emetic injected. Bland diet 3 days. Recheck if not improved in 48h." }, "Gastroenteritis", "draft"],
      [3, "V1", 8, "Surgery", { s: "Scheduled neuter. Fasted since 10pm yesterday. No prior anesthetic events.", o: "Pre-op exam unremarkable. T 38.5°C. PCV 44%. Anesthesia protocol: medetomidine-ketamine-midazolam induction.", a: "Healthy — elective procedure.", p: "Routine orchiectomy performed without complication. Recovery uneventful; discharged same day with Meloxicam." }, "Elective neuter", "signed"],
      [13, "V1", 4, "Kitten Visit", { s: "First visit for Willow. Eating well, playful. No concerns.", o: "BAR. T 38.6°C. Weight 4.6 kg. Mild ear debris.", a: "Healthy young adult — due first boosters with our practice.", p: "FVRCP booster #3 given. Ear cleaning demonstrated. Discussed microchip (declined today)." }, "Healthy — vaccine series", "signed"],
      [4, "V1", 9, "Emergency", { s: "Acute onset limp after jumping off the couch. Cries when getting up. Not weight bearing on left hind.", o: "Marked pain on left hip extension. No swelling. T 38.8°C.", a: "Left hindlimb lameness — suspected soft tissue injury; radiographs pending.", p: "X-ray of left hip and stifle taken. Rest and analgesia dispensed pending review. Recheck in 3 days." }, "Acute left hindlimb lameness", "signed"]
    ];
    var encounters = encDefs.map(function (e, i) {
      var d = Data.addDays(now, -e[2]);
      return {
        id: "E-" + (5001 + i),
        patientId: patients[e[0]].id,
        vetId: e[1],
        date: Data.iso(d),
        time: ["09:15", "10:40", "11:20", "14:05", "15:30", "16:10", "17:00", "09:45", "13:20", "18:05"][i],
        type: e[3],
        soap: e[4],
        diagnosis: e[5],
        status: e[6]
      };
    });

    /* ---------- drugs + prescriptions ---------- */
    var drugs = JSON.parse(JSON.stringify(Seed.formulary));

    var prescDefs = [
      [0, "D3", "active", 20], [1, "D1", "active", 12], [7, "D7", "active", 10], [3, "D8", "active", 8],
      [5, "D6", "dispensed", 6], [2, "D8", "dispensed", 5], [6, "D4", "dispensed", 4], [9, "D1", "active", 3],
      [4, "D2", "expired", 45], [10, "D3", "active", 15], [11, "D5", "void", 20], [13, "D1", "active", 2]
    ];
    var prescriptions = prescDefs.map(function (p, i) {
      var pt = patients[p[0]];
      var drug = null;
      drugs.forEach(function (d) { if (d.id === p[1]) drug = d; });
      var dose = null;
      if (drug.doseMin !== null) {
        var mid = (drug.doseMin + drug.doseMax) / 2;
        dose = Math.round(mid * pt.weightKg * 10) / 10;
      }
      return {
        id: "RX-" + (4001 + i),
        patientId: pt.id,
        drugId: drug.id,
        weightKg: pt.weightKg,
        doseMg: dose,
        freq: drug.freq,
        days: drug.maxDays,
        prescriberId: vets[i % vets.length].id,
        status: p[2],
        createdAt: Data.iso(Data.addDays(now, -p[3])),
        notes: ""
      };
    });

    /* ---------- inventory (prices in PKR) ---------- */
    var invDefs = [
      ["Rabies Vaccine (Imrab 3)", "Vaccine", "vial", "RAB-2409", 42, 15, 280, 110],
      ["DHPP Vaccine", "Vaccine", "vial", "DHPP-2411", 12, 15, 150, 170],
      ["FVRCP Vaccine (feline)", "Vaccine", "vial", "FVC-2408", 26, 10, 310, 155],
      ["Bordetella Oral Vaccine", "Vaccine", "dose", "BOR-2406", 18, 12, 24, 135],
      ["Amoxicillin-Clavulanate 62.5mg/ml", "Medication", "bottle", "AMX-2451", 9, 12, 220, 610],
      ["Meloxicam 1.5mg/ml (10ml)", "Medication", "bottle", "MEL-2477", 14, 8, 190, 780],
      ["Apoquel 5.4mg — 100 tabs", "Medication", "box", "APQ-2461", 6, 6, 260, 2450],
      ["Cerenia Injectable 10ml", "Medication", "vial", "CER-2450", 5, 4, 120, 1400],
      ["Otomax Ointment 15g", "Medication", "tube", "OTO-2433", 11, 10, -12, 700],
      ["Bravecto Chewable 10-20kg", "Medication", "pack", "BRV-2462", 22, 10, 340, 1180],
      ["Gabapentin 100mg — 100 caps", "Medication", "bottle", "GAB-2459", 8, 10, 410, 490],
      ["IV Fluid Ringer's 1000ml", "Consumable", "bag", "IVF-2407", 58, 24, 500, 75],
      ["IV Catheter 20G", "Consumable", "pack", "CAT-2405", 30, 20, 600, 310],
      ["Syringe 3ml — box of 100", "Consumable", "box", "SYR-2404", 44, 15, 700, 245],
      ["Self-adhesive Bandage 5cm", "Consumable", "roll", "BND-2403", 9, 20, 650, 75],
      ["Royal Canin Renal Feline 2kg", "Food", "bag", "RCR-2412", 16, 8, 210, 860],
      ["Hill's i/d Digestive 3.5kg", "Food", "bag", "HID-2410", 7, 8, 90, 750],
      ["Dental Chews — pack of 7", "Consumable", "pack", "DEN-2402", 25, 10, 160, 225],
      ["Microchip (ISO 11784)", "Consumable", "unit", "MCH-2401", 35, 15, 900, 160],
      ["Ear Cleanser 100ml", "Medication", "bottle", "EAR-2439", 13, 6, 300, 355]
    ];
    var inventory = invDefs.map(function (r, i) {
      return {
        id: "I-" + (6001 + i),
        name: r[0], category: r[1], unit: r[2], lot: r[3],
        qty: r[4], reorderAt: r[5],
        expiry: Data.iso(Data.addDays(now, r[6])),
        price: r[7]
      };
    });

    /* ---------- invoices ---------- */
    var invoices = [];
    var invSeq = 1000;
    for (var i = 0; i < 132; i++) {
      var daysAgo = Math.round(i * 3.45);
      var d = Data.addDays(now, -daysAgo);
      if (d.getDay() === 0) d = Data.addDays(d, -1);
      var client = clients[i % clients.length];
      var lineCount = 1 + ((i * 7) % 3);
      var lines = [];
      for (var l = 0; l < lineCount; l++) {
        var svc = Data.services[(i * 3 + l * 5) % Data.services.length];
        lines.push({ desc: svc.name, qty: ((i + l) % 4 === 0) ? 2 : 1, price: svc.price });
      }
      var inv = {
        id: "INV-" + d.getFullYear() + "-" + Data.pad(invSeq + i, 4),
        clientId: client.id,
        patientId: patients[i % patients.length].id,
        date: Data.iso(d),
        due: Data.iso(Data.addDays(d, 14)),
        lines: lines,
        payments: [],
        notes: ""
      };
      var totals = Data.invoiceTotals(inv);
      var pattern = i % 8;
      if (pattern <= 2 || pattern === 4 || pattern === 6) {
        inv.payments.push({ method: pattern % 2 === 0 ? "Card" : "Cash", amount: totals.total, date: Data.iso(Data.addDays(d, 1)) });
      } else if (pattern === 3) {
        inv.payments.push({ method: "Card", amount: Math.round(totals.total * 0.55 * 100) / 100, date: Data.iso(Data.addDays(d, 2)) });
      }
      invoices.push(inv);
    }

    /* ---------- activity + notifications ---------- */
    var activity = [
      { icon: "syringe", kind: "teal", text: "Vaccination reminder sent to <b>Olivia Bennett</b> for Bella", mins: 12 },
      { icon: "receipt", kind: "green", text: "Invoice <b>INV-" + now.getFullYear() + "-1001</b> paid — " + Data.fmtMoney(15420), mins: 34 },
      { icon: "file", kind: "sky", text: "Lab results received for <b>Zoe</b> — reviewed by Dr. Rao", mins: 62 },
      { icon: "alert", kind: "amber", text: "Low stock alert: <b>DHPP Vaccine</b> at 12 vials (reorder at 15)", mins: 128 },
      { icon: "calendar", kind: "violet", text: "New appointment booked — <b>Surgery</b> for Cooper, tomorrow 09:00", mins: 190 },
      { icon: "check", kind: "teal", text: "<b>Bella</b> checked in for Wellness Exam", mins: 240 },
      { icon: "users", kind: "sky", text: "New client registered: <b>Henry Wu</b>", mins: 1500 },
      { icon: "pill", kind: "violet", text: "Prescription refill approved — <b>Bravecto</b> for Daisy", mins: 1620 }
    ];
    activity = activity.map(function (a) {
      return { icon: a.icon, kind: a.kind, text: a.text, at: Data.iso(new Date(Date.now() - a.mins * 60000)) + " " + new Date(Date.now() - a.mins * 60000).getHours() + ":" + Data.pad(new Date(Date.now() - a.mins * 60000).getMinutes(), 2) };
    });

    var notifications = [
      { id: "N1", icon: "alert", kind: "amber", title: "Low stock", body: "DHPP Vaccine at 12 vials — reorder point 15.", at: Data.iso(now) + " 09:12", read: false },
      { id: "N2", icon: "file", kind: "sky", title: "Lab results ready", body: "Zoe — CBC & Chemistry panel. Awaiting vet review.", at: Data.iso(now) + " 08:47", read: false },
      { id: "N3", icon: "receipt", kind: "rose", title: "Invoice overdue", body: "INV-" + now.getFullYear() + "-1005 is 12 days overdue — " + Data.fmtMoney(41230) + ".", at: Data.iso(now) + " 08:02", read: false },
      { id: "N4", icon: "calendar", kind: "violet", title: "Booking request", body: "Willow — dental cleaning, requested by phone for next week.", at: Data.iso(Data.addDays(now, -1)) + " 16:40", read: true },
      { id: "N5", icon: "syringe", kind: "teal", title: "Vaccinations due", body: "3 vaccination certificates expire within 30 days.", at: Data.iso(Data.addDays(now, -1)) + " 11:15", read: true }
    ];

    return {
      meta: { hospital: "IZEX", created: today },
      vets: vets,
      clients: clients,
      patients: patients,
      appointments: appts,
      encounters: encounters,
      drugs: drugs,
      prescriptions: prescriptions,
      inventory: inventory,
      invoices: invoices,
      activity: activity,
      notifications: notifications
    };
  }
};
