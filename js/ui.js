/* IZEX — UI kit: toasts, modals, drawers, chips, count-up, ripple */

var UI = {
  _modalStack: [],

  el: function (html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  },

  escape: function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },

  chip: function (text, kind, withDot) {
    return "<span class='chip chip-" + (kind || "slate") + "'>" +
      (withDot ? "<span class='dot'></span>" : "") + UI.escape(text) + "</span>";
  },

  avatar: function (name, color, cls) {
    return "<span class='avatar " + (cls || "") + "' style='background:" + (color || Data.colorFor(name)) + "'>" +
      UI.escape(Data.initials(name)) + "</span>";
  },

  /* ---------- toasts ---------- */

  toast: function (opts) {
    if (typeof opts === "string") opts = { title: opts };
    var kindMap = {
      success: { icon: "check", bg: "var(--c-teal-bg)", fg: "var(--c-teal-fg)" },
      info: { icon: "bell", bg: "var(--c-sky-bg)", fg: "var(--c-sky-fg)" },
      warn: { icon: "alert", bg: "var(--c-amber-bg)", fg: "var(--c-amber-fg)" },
      error: { icon: "alert", bg: "var(--c-rose-bg)", fg: "var(--c-rose-fg)" },
      plain: { icon: "check", bg: "var(--c-slate-bg)", fg: "var(--c-slate-fg)" }
    };
    var k = kindMap[opts.kind || "success"];
    var el = UI.el(
      "<div class='toast'>" +
        "<div class='toast-icon' style='background:" + k.bg + ";color:" + k.fg + "'>" + icon(k.icon, 15) + "</div>" +
        "<div class='grow'>" +
          "<div class='toast-title'>" + UI.escape(opts.title || "Done") + "</div>" +
          (opts.msg ? "<div class='toast-msg'>" + UI.escape(opts.msg) + "</div>" : "") +
        "</div>" +
        "<button class='toast-close' aria-label='Close'>" + icon("x", 14) + "</button>" +
        "<div class='toast-progress'></div>" +
      "</div>"
    );
    var root = document.getElementById("toast-root");
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });

    var timer = setTimeout(dismiss, opts.timeout || 3600);
    function dismiss() {
      clearTimeout(timer);
      el.classList.remove("in");
      el.classList.add("out");
      setTimeout(function () { el.remove(); }, 360);
    }
    el.querySelector(".toast-close").addEventListener("click", dismiss);
    el.addEventListener("mouseenter", function () { clearTimeout(timer); });
    el.addEventListener("mouseleave", function () { timer = setTimeout(dismiss, 1200); });
    return dismiss;
  },

  /* ---------- modal ---------- */

  modal: function (opts) {
    var sizeCls = opts.size === "xl" ? "modal-xl" : opts.size === "lg" ? "modal-lg" : "";
    var overlay = UI.el("<div class='overlay'></div>");
    var wrap = UI.el("<div class='modal-wrap'></div>");
    var modal = UI.el(
      "<div class='modal " + sizeCls + "' role='dialog' aria-modal='true'>" +
        "<div class='modal-head'>" +
          "<div>" +
            "<div class='modal-title'>" + UI.escape(opts.title || "") + "</div>" +
            (opts.sub ? "<div class='modal-sub'>" + opts.sub + "</div>" : "") +
          "</div>" +
          "<button class='icon-btn modal-close' aria-label='Close'>" + icon("x", 16) + "</button>" +
        "</div>" +
        "<div class='modal-body'>" + (opts.body || "") + "</div>" +
        (opts.foot ? "<div class='modal-foot'>" + opts.foot + "</div>" : "") +
      "</div>"
    );
    wrap.appendChild(modal);
    var root = document.getElementById("overlay-root");
    root.appendChild(overlay);
    root.appendChild(wrap);

    requestAnimationFrame(function () {
      overlay.classList.add("open");
      modal.classList.add("in");
    });

    var entry = { close: close };
    UI._modalStack.push(entry);

    function close() {
      var ix = UI._modalStack.indexOf(entry);
      if (ix >= 0) UI._modalStack.splice(ix, 1);
      overlay.classList.remove("open");
      modal.classList.remove("in");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { overlay.remove(); wrap.remove(); }, 320);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === "Escape" && UI._modalStack[UI._modalStack.length - 1] === entry) close();
    }
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", close);
    modal.querySelector(".modal-close").addEventListener("click", close);
    if (opts.onMount) opts.onMount(modal, close);
    return { root: modal, close: close };
  },

  confirm: function (opts) {
    return new Promise(function (resolve) {
      var done = false;
      function finish(val) { if (!done) { done = true; resolve(val); } }
      UI.modal({
        title: opts.title || "Are you sure?",
        body: opts.html || ("<p class='muted' style='line-height:1.6'>" + UI.escape(opts.message || "") + "</p>"),
        foot: "<button class='btn btn-outline' data-no>Cancel</button>" +
              "<button class='btn " + (opts.danger ? "btn-danger" : "btn-primary") + "' data-yes>" + UI.escape(opts.confirmText || "Confirm") + "</button>",
        onMount: function (root, close) {
          root.querySelector("[data-no]").addEventListener("click", function () { finish(false); close(); });
          root.querySelector("[data-yes]").addEventListener("click", function () { finish(true); close(); });
        },
        onClose: function () { finish(false); }
      });
    });
  },

  /* ---------- drawer ---------- */

  drawer: function (opts) {
    var overlay = UI.el("<div class='overlay'></div>");
    var wrap = UI.el("<div class='drawer-wrap'></div>");
    var drawer = UI.el(
      "<div class='drawer' role='dialog' aria-modal='true'>" +
        "<div class='drawer-head'>" + (opts.head || "") + "</div>" +
        "<div class='drawer-body'>" + (opts.body || "") + "</div>" +
        (opts.foot ? "<div class='drawer-foot'>" + opts.foot + "</div>" : "") +
      "</div>"
    );
    wrap.appendChild(drawer);
    var root = document.getElementById("overlay-root");
    root.appendChild(overlay);
    root.appendChild(wrap);

    requestAnimationFrame(function () {
      overlay.classList.add("open");
      drawer.classList.add("in");
    });

    var entry = { close: close };
    UI._modalStack.push(entry);

    function close() {
      var ix = UI._modalStack.indexOf(entry);
      if (ix >= 0) UI._modalStack.splice(ix, 1);
      overlay.classList.remove("open");
      drawer.classList.remove("in");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { overlay.remove(); wrap.remove(); }, 380);
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) {
      if (e.key === "Escape" && UI._modalStack[UI._modalStack.length - 1] === entry) close();
    }
    document.addEventListener("keydown", onKey);
    overlay.addEventListener("click", close);
    var closeBtn = drawer.querySelector("[data-close]");
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (opts.onMount) opts.onMount(drawer, close);
    return { root: drawer, close: close };
  },

  /* ---------- count-up ---------- */

  countUp: function (el, target, opts) {
    opts = opts || {};
    var dur = opts.duration || 950;
    var start = null;
    function fmt(v) {
      if (opts.money) return Data.fmtMoney(v);
      if (opts.moneyCompact) return Data.fmtMoneyCompact(v);
      if (opts.percent) return (Math.round(v * 10) / 10) + "%";
      return Math.round(v).toLocaleString("en-US");
    }
    function tick(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    }
    requestAnimationFrame(tick);
  },

  /* ---------- ripple on buttons ---------- */

  bindRipples: function (scope) {
    (scope || document).addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".btn") : null;
      if (!btn || btn.disabled) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = (e.clientX - rect.left - size / 2) + "px";
      span.style.top = (e.clientY - rect.top - size / 2) + "px";
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 650);
    });
  },

  /* ---------- stagger ---------- */

  applyStagger: function (scope) {
    var lists = scope.querySelectorAll(".stagger");
    for (var i = 0; i < lists.length; i++) {
      var kids = lists[i].children;
      for (var k = 0; k < kids.length; k++) kids[k].style.setProperty("--i", k);
    }
  }
};
