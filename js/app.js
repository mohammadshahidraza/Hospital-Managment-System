/* IZEX — app bootstrap: sidebar, topbar, search, theme, notifications */

var App = {
  THEME_KEY: "izex.theme",

  NAV: [
    { name: "dashboard", label: "Dashboard", icon: "grid" },
    { name: "appointments", label: "Appointments", icon: "calendar" },
    { name: "clients", label: "Clients", icon: "users" },
    { name: "patients", label: "Patients", icon: "paw" },
    { name: "records", label: "Medical Records", icon: "file" },
    { name: "prescriptions", label: "Prescriptions", icon: "pill" },
    { name: "inventory", label: "Inventory", icon: "box" },
    { name: "billing", label: "Billing", icon: "receipt" },
    { name: "reports", label: "Reports", icon: "chart" }
  ],

  init: function () {
    Store.init();
    this.applyTheme(this.readTheme());
    this.renderSidebar();
    this.renderTopbar();
    this.registerRoutes();
    Router.init(document.getElementById("content"));
    Router.start();
    UI.bindRipples(document);
    this.bindShortcuts();
    this.hideSplash();
  },

  readTheme: function () {
    try { return localStorage.getItem(this.THEME_KEY) || "light"; } catch (e) { return "light"; }
  },

  hideSplash: function () {
    var splash = document.getElementById("splash");
    if (!splash) return;

    /* let the opening animation play, then fade the splash away.
       Reduced-motion users get the same sequence in a compact form; a click skips it. */
    var reduce = false;
    try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { /* noop */ }

    var removed = false;
    function done() {
      if (removed) return;
      removed = true;
      splash.classList.add("done");
      setTimeout(function () { if (splash.parentNode) splash.remove(); }, reduce ? 420 : 570);
    }
    setTimeout(done, reduce ? 1400 : 2700);
    splash.addEventListener("click", done);
  },

  registerRoutes: function () {
    var defs = [
      ["dashboard", "Dashboard", "Overview of today's hospital activity", "views.dashboard"],
      ["appointments", "Appointments", "Calendar, booking and check-in", "views.appointments"],
      ["clients", "Clients", "Animal owners and contacts", "views.clients"],
      ["patients", "Patients", "Animals under care", "views.patients"],
      ["records", "Medical Records", "SOAP charting and diagnoses", "views.records"],
      ["prescriptions", "Prescriptions", "Dosing calculator and pharmacy", "views.prescriptions"],
      ["inventory", "Inventory", "Stock, lots and expiries", "views.inventory"],
      ["billing", "Billing", "Invoices and payments", "views.billing"],
      ["reports", "Reports", "Analytics and exports", "views.reports"]
    ];
    defs.forEach(function (d) {
      Router.register(d[0], {
        title: d[1],
        sub: d[2],
        render: function (root) { window.Views[d[0]](root); }
      });
    });
  },

  /* ---------- theme ---------- */

  applyTheme: function (theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(this.THEME_KEY, theme); } catch (e) { /* storage may be blocked on file:// */ }
    var btn = document.querySelector("[data-theme-btn]");
    if (btn) btn.innerHTML = icon(theme === "dark" ? "sun" : "moon", 17);
  },

  toggleTheme: function () {
    var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    this.applyTheme(cur);
    UI.toast({ kind: "plain", title: cur === "dark" ? "Dark mode on" : "Light mode on", timeout: 1600 });
  },

  /* ---------- sidebar ---------- */

  renderSidebar: function () {
    var today = Data.todayISO();
    var counts = {
      appointments: Store.apptsOn(today).length,
      inventory: Store.lowStock().length,
      billing: Store.overdueInvoices().length
    };

    var sidebar = document.getElementById("sidebar");
    sidebar.innerHTML =
      "<div class='brand'>" +
        "<div class='brand-badge'>" + icon("paw", 21) + "</div>" +
        "<div><div class='brand-name'>IZEX</div><div class='brand-sub'>Animal Hospital</div></div>" +
      "</div>" +
      "<nav class='nav' id='mainNav'><div class='nav-pill' id='navPill'></div>" +
        this.NAV.map(function (n) {
          var cnt = counts[n.name] ? "<span class='nav-count'>" + counts[n.name] + "</span>" : "";
          return "<div class='nav-item' data-nav='" + n.name + "'>" + icon(n.icon, 18) +
            "<span class='label'>" + n.label + "</span>" + cnt + "</div>";
        }).join("") +
      "</nav>" +
      "<div class='sidebar-foot'>" +
        "<div class='side-user'>" + UI.avatar(this.me().name, this.me().color) +
          "<div><div class='side-user-name'>" + UI.escape(this.me().name) + "</div><div class='side-user-role'>" + UI.escape(this.me().role) + "</div></div></div>" +
        "<div class='side-action' data-sample>" + icon("download", 15) + "<span>Load sample data</span></div>" +
        "<div class='side-action' data-clear>" + icon("trash", 15) + "<span>Clear all data</span></div>" +
      "</div>";

    var self = this;
    sidebar.querySelectorAll("[data-nav]").forEach(function (item) {
      item.addEventListener("click", function () { Router.go("#/" + item.getAttribute("data-nav")); });
    });
    sidebar.querySelector("[data-sample]").addEventListener("click", function () {
      UI.confirm({
        title: "Load sample data?",
        message: "This replaces everything currently in the app with a demo dataset you can explore freely.",
        confirmText: "Load sample"
      }).then(function (ok) {
        if (!ok) return;
        Store.loadSample();
        self.renderSidebar();
        UI.toast({ kind: "success", title: "Sample data loaded", msg: "Explore the modules — clear it anytime." });
        Router.handle();
      });
    });
    sidebar.querySelector("[data-clear]").addEventListener("click", function () {
      UI.confirm({
        title: "Clear all data?",
        message: "Removes every client, patient, appointment, record, prescription, invoice and stock item stored in this browser. This cannot be undone.",
        confirmText: "Clear everything",
        danger: true
      }).then(function (ok) {
        if (!ok) return;
        Store.reset();
        self.renderSidebar();
        UI.toast({ kind: "warn", title: "All data cleared", msg: "The practice is now empty." });
        Router.handle();
      });
    });
  },

  /* signed-in user (first staff member) */
  me: function () {
    return Store.db.vets.length ? Store.db.vets[0] : { name: "IZEX Admin", role: "Administrator", color: "#0d9488" };
  },

  setActiveNav: function (name) {
    var nav = document.getElementById("mainNav");
    if (!nav) return;
    var items = nav.querySelectorAll(".nav-item");
    var activeIx = 0;
    items.forEach(function (item, i) {
      var isActive = item.getAttribute("data-nav") === name;
      item.classList.toggle("active", isActive);
      if (isActive) activeIx = i;
    });
    var pill = document.getElementById("navPill");
    var item = items[activeIx];
    if (pill && item) {
      pill.style.transform = "translateY(" + item.offsetTop + "px)";
      pill.style.height = item.offsetHeight + "px";
      pill.style.opacity = "1";
    }
    var def = Router.routes[name];
    var titleEl = document.querySelector("[data-topbar-title]");
    var crumbEl = document.querySelector("[data-topbar-crumb]");
    if (titleEl && def) titleEl.textContent = def.title;
    if (crumbEl && def) crumbEl.textContent = "Hospital / " + def.title;
    document.title = def ? def.title + " — IZEX" : "IZEX";
  },

  /* ---------- topbar ---------- */

  renderTopbar: function () {
    var unread = Store.db.notifications.filter(function (n) { return !n.read; }).length;
    var topbar = document.getElementById("topbar");
    topbar.innerHTML =
      "<div><div class='topbar-title' data-topbar-title>Dashboard</div><div class='topbar-crumb' data-topbar-crumb>Hospital / Dashboard</div></div>" +
      "<div class='topbar-spacer'></div>" +
      "<div class='search-wrap'>" +
        "<div class='search-box'>" + icon("search", 16) +
          "<input data-global-search placeholder='Search clients, patients…' autocomplete='off'>" +
          "<span class='kbd'>/</span>" +
        "</div>" +
        "<div data-search-results></div>" +
      "</div>" +
      "<button class='icon-btn' data-theme-btn title='Toggle theme'>" + icon(document.documentElement.getAttribute("data-theme") === "dark" ? "sun" : "moon", 17) + "</button>" +
      "<div style='position:relative'>" +
        "<button class='icon-btn' data-bell title='Notifications'>" + icon("bell", 17) +
          (unread ? "<span class='badge-dot'></span>" : "") + "</button>" +
        "<div data-bell-panel></div>" +
      "</div>" +
      "<button class='user-chip' data-user>" + UI.avatar(this.me().name, this.me().color, "avatar-sm") +
        "<div style='text-align:left'><div class='user-chip-name'>" + UI.escape(this.me().name) + "</div><div class='user-chip-role'>" + UI.escape(this.me().role) + "</div></div>" +
      "</button>";

    topbar.querySelector("[data-theme-btn]").addEventListener("click", function () { App.toggleTheme(); });
    this.wireSearch(topbar);
    this.wireBell(topbar);
    topbar.querySelector("[data-user]").addEventListener("click", function () {
      var me = App.me();
      UI.toast({ kind: "info", title: "Signed in as " + me.name, msg: "Role: " + me.role });
    });
  },

  wireSearch: function (topbar) {
    var input = topbar.querySelector("[data-global-search]");
    var panel = topbar.querySelector("[data-search-results]");

    function close() { panel.innerHTML = ""; }
    function render() {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { close(); return; }
      var clients = Store.db.clients.filter(function (c) {
        return (Store.clientName(c) + " " + c.phone + " " + c.email).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 4);
      var patients = Store.db.patients.filter(function (p) {
        var owner = Store.ownerOf(p);
        return (p.name + " " + p.breed + " " + (owner ? Store.clientName(owner) : "")).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 4);

      if (!clients.length && !patients.length) {
        panel.innerHTML = "<div class='popover'><div class='pop-empty'>No matches for \u201c" + UI.escape(input.value) + "\u201d</div></div>";
        return;
      }
      var html = "<div class='popover'>";
      if (clients.length) {
        html += "<div class='pop-head'><span class='pop-title'>Clients</span></div>";
        html += clients.map(function (c) {
          return "<div class='pop-row' data-go='clients' data-q='" + UI.escape(Store.clientName(c)) + "'>" +
            UI.avatar(Store.clientName(c), Data.colorFor(c.id), "avatar-sm") +
            "<div><div class='pop-row-title'>" + UI.escape(Store.clientName(c)) + "</div>" +
            "<div class='pop-row-sub'>" + UI.escape(c.phone) + "</div></div></div>";
        }).join("");
      }
      if (patients.length) {
        html += "<div class='pop-head'><span class='pop-title'>Patients</span></div>";
        html += patients.map(function (p) {
          var owner = Store.ownerOf(p);
          return "<div class='pop-row' data-go='patients' data-q='" + UI.escape(p.name) + "'>" +
            UI.avatar(p.name, Data.colorFor(p.name), "avatar-sm") +
            "<div><div class='pop-row-title'>" + UI.escape(p.name) + " <span class='faint'>· " + UI.escape(p.breed) + "</span></div>" +
            "<div class='pop-row-sub'>" + UI.escape(owner ? Store.clientName(owner) : "") + "</div></div></div>";
        }).join("");
      }
      html += "</div>";
      panel.innerHTML = html;
      panel.querySelectorAll("[data-go]").forEach(function (row) {
        row.addEventListener("click", function () {
          var target = row.getAttribute("data-go");
          close();
          input.value = "";
          Router.go("#/" + target + "?q=" + encodeURIComponent(row.getAttribute("data-q")));
        });
      });
    }

    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { input.blur(); close(); }
      if (e.key === "Enter") {
        var first = panel.querySelector("[data-go]");
        if (first) first.click();
      }
    });
    input.addEventListener("blur", function () { setTimeout(close, 180); });
  },

  wireBell: function (topbar) {
    var btn = topbar.querySelector("[data-bell]");
    var panel = topbar.querySelector("[data-bell-panel]");

    btn.addEventListener("click", function () {
      if (panel.innerHTML) { panel.innerHTML = ""; return; }
      var notes = Store.db.notifications;
      var html = "<div class='popover'>" +
        "<div class='pop-head'><span class='pop-title'>Notifications</span>" +
        "<span class='pop-action' data-readall>Mark all read</span></div>";
      html += notes.length ? notes.map(function (n) {
        var kinds = { amber: "var(--c-amber-bg);var(--c-amber-fg)", sky: "var(--c-sky-bg);var(--c-sky-fg)", rose: "var(--c-rose-bg);var(--c-rose-fg)", violet: "var(--c-violet-bg);var(--c-violet-fg)", teal: "var(--c-teal-bg);var(--c-teal-fg)" };
        var parts = (kinds[n.kind] || kinds.teal).split(";");
        return "<div class='pop-row' style='" + (n.read ? "opacity:.62" : "") + "'>" +
          "<div class='kpi-icon' style='width:32px;height:32px;border-radius:9px;background:" + parts[1] + ";color:" + parts[0] + "'>" + icon(n.icon, 15) + "</div>" +
          "<div><div class='pop-row-title'>" + UI.escape(n.title) + "</div>" +
          "<div class='pop-row-sub'>" + UI.escape(n.body) + "</div>" +
          "<div class='pop-row-time'>" + UI.escape(n.at) + "</div></div></div>";
      }).join("") : "<div class='pop-empty'>No notifications yet.</div>";
      html += "</div>";
      panel.innerHTML = html;
      var ra = panel.querySelector("[data-readall]");
      if (ra) ra.addEventListener("click", function () {
        Store.db.notifications.forEach(function (n) { n.read = true; });
        Store.commit();
        panel.innerHTML = "";
        var dot = btn.querySelector(".badge-dot");
        if (dot) dot.remove();
        UI.toast({ kind: "plain", title: "All notifications marked read", timeout: 1800 });
      });
    });

    document.addEventListener("click", function (e) {
      if (panel.innerHTML && !btn.contains(e.target) && !panel.contains(e.target)) panel.innerHTML = "";
    });
  },

  bindShortcuts: function () {
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        e.preventDefault();
        var s = document.querySelector("[data-global-search]");
        if (s) s.focus();
      }
    });
  }
};

if (typeof document !== "undefined" && document.addEventListener) {
  document.addEventListener("DOMContentLoaded", function () { App.init(); });
}
