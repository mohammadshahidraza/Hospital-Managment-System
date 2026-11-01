/* IZEX — hash router with animated transitions */

var Router = {
  routes: {},
  cleanups: [],
  container: null,
  current: null,

  register: function (name, def) { this.routes[name] = def; },

  onCleanup: function (fn) { this.cleanups.push(fn); },

  init: function (container) {
    this.container = container;
    window.addEventListener("hashchange", function () { Router.handle(); });
  },

  start: function () { this.handle(); },

  go: function (hash) {
    if (location.hash === hash) this.handle();
    else location.hash = hash;
  },

  parse: function () {
    var raw = location.hash.replace(/^#\/?/, "");
    var name = raw.split("?")[0].split("/")[0] || "dashboard";
    return { name: this.routes[name] ? name : "dashboard" };
  },

  handle: function () {
    var self = this;
    var p = this.parse();
    var def = this.routes[p.name];
    this.current = p.name;

    /* dispose previous view */
    this.cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
    this.cleanups = [];
    UI._modalStack.slice().forEach(function (m) { try { m.close(); } catch (e) { /* noop */ } });

    var content = this.container;
    var progress = document.getElementById("routeProgress");

    content.classList.add("page-exit");
    if (progress) {
      progress.classList.remove("active");
      progress.style.width = "0%";
      void progress.offsetWidth;
      progress.classList.add("active");
      progress.style.width = "62%";
    }

    setTimeout(function () {
      content.classList.remove("page-exit");
      content.innerHTML = "";
      def.render(content);
      UI.applyStagger(content);
      var first = content.firstElementChild;
      if (first) first.classList.add("view-enter");
      else content.classList.add("view-enter");
      content.scrollTop = 0;

      if (progress) {
        progress.style.width = "100%";
        setTimeout(function () {
          progress.classList.remove("active");
          progress.style.width = "0%";
        }, 260);
      }

      if (window.App && App.setActiveNav) App.setActiveNav(self.current);
    }, 170);
  }
};
