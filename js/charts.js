/* IZEX — animated SVG charts (area, bars, donut, hbar) */

var Charts = {
  _uid: 0,

  fmtVal: function (v, format) {
    if (format === "money") return Data.fmtMoney(v);
    if (format === "moneyCompact") return Data.fmtMoneyCompact(v);
    if (format === "kg") return (Math.round(v * 10) / 10) + " kg";
    return Math.round(v).toLocaleString("en-US");
  },

  _reveal: function (root, cb) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.classList.add("in");
        if (cb) cb();
      });
    });
  },

  _empty: function (container, title, sub) {
    container.classList.add("chart");
    container.innerHTML =
      "<div class='chart-empty'>" + icon("chart", 26) +
        "<div class='chart-empty-title'>" + UI.escape(title || "No data yet") + "</div>" +
        "<div class='chart-empty-sub'>" + UI.escape(sub || "Data will appear here as the practice records activity.") + "</div>" +
      "</div>";
    container.classList.add("in");
    return container;
  },

  /* ---------------- area / line ---------------- */

  area: function (container, opts) {
    var w = container.clientWidth || 640;
    var h = opts.height || 230;
    var padL = 48, padR = 16, padT = 16, padB = 26;
    var labels = opts.labels || [];
    var values = opts.values || [];
    var color = opts.color || "#0d9488";
    var fmt = opts.format || "int";
    var n = values.length;
    var sum = 0;
    values.forEach(function (v) { sum += Number(v) || 0; });
    if (!n || sum === 0) return Charts._empty(container, opts.emptyText, opts.emptySub);
    var max = Math.max.apply(null, values.concat([1])) * 1.18;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var baseY = padT + plotH;
    var uid = "cg" + (++Charts._uid);

    function X(i) { return n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1); }
    function Y(v) { return padT + plotH - (v / max) * plotH; }

    var pts = values.map(function (v, i) { return [X(i), Y(v)]; });

    var d = "";
    if (pts.length) {
      d = "M" + pts[0][0] + "," + pts[0][1];
      for (var i = 1; i < pts.length; i++) {
        var p0 = pts[i - 1], p1 = pts[i];
        var mx = (p0[0] + p1[0]) / 2;
        d += " C" + mx + "," + p0[1] + " " + mx + "," + p1[1] + " " + p1[0] + "," + p1[1];
      }
    }
    var areaD = d + " L" + pts[pts.length - 1][0] + "," + baseY + " L" + pts[0][0] + "," + baseY + " Z";

    var out = "<svg viewBox='0 0 " + w + " " + h + "' width='100%' height='" + h + "'>";
    out += "<defs><linearGradient id='" + uid + "' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='.30'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='.02'/></linearGradient></defs>";

    for (var g = 0; g < 4; g++) {
      var gy = padT + (plotH * g) / 3;
      var gv = max * (1 - g / 3);
      out += "<line class='grid-line' x1='" + padL + "' y1='" + gy + "' x2='" + (w - padR) + "' y2='" + gy + "'/>";
      out += "<text class='axis-label' x='" + (padL - 8) + "' y='" + (gy + 3.5) + "' text-anchor='end'>" +
        Charts.fmtVal(gv, fmt === "money" ? "moneyCompact" : fmt) + "</text>";
    }

    var step = n > 14 ? Math.ceil(n / 12) : 1;
    for (var l = 0; l < n; l += step) {
      out += "<text class='axis-label' x='" + X(l) + "' y='" + (h - 6) + "' text-anchor='middle'>" +
        UI.escape(labels[l] != null ? labels[l] : "") + "</text>";
    }

    if (pts.length) {
      out += "<path class='chart-area-fill' d='" + areaD + "' fill='url(#" + uid + ")'/>";
      out += "<path class='chart-line' d='" + d + "' stroke='" + color + "'/>";
      var last = pts[pts.length - 1];
      out += "<circle class='chart-pulse-dot' cx='" + last[0] + "' cy='" + last[1] + "' r='4.5' fill='" + color + "'/>";
      out += "<circle cx='" + last[0] + "' cy='" + last[1] + "' r='2' fill='#fff'/>";
    }
    out += "</svg>";

    container.classList.add("chart");
    container.innerHTML = out;

    var path = container.querySelector(".chart-line");
    if (path) {
      var len = 0;
      try { len = path.getTotalLength(); } catch (e) { len = 1200; }
      container.style.setProperty("--len", len + "px");
    }
    Charts._reveal(container);
    return container;
  },

  /* ---------------- vertical bars ---------------- */

  bars: function (container, opts) {
    var w = container.clientWidth || 640;
    var h = opts.height || 210;
    var padL = 40, padR = 12, padT = 14, padB = 26;
    var labels = opts.labels || [];
    var values = opts.values || [];
    var color = opts.color || "#0ea5e9";
    var fmt = opts.format || "int";
    var n = values.length;
    var sum = 0;
    values.forEach(function (v) { sum += Number(v) || 0; });
    if (!n || sum === 0) return Charts._empty(container, opts.emptyText, opts.emptySub);
    var max = Math.max.apply(null, values.concat([1])) * 1.15;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var uid = "bg" + (++Charts._uid);
    var slot = plotW / Math.max(n, 1);
    var bw = Math.min(34, slot * 0.55);

    var out = "<svg viewBox='0 0 " + w + " " + h + "' width='100%' height='" + h + "'>";
    out += "<defs><linearGradient id='" + uid + "' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0%' stop-color='" + color + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='.55'/></linearGradient></defs>";

    for (var g = 0; g < 3; g++) {
      var gy = padT + (plotH * g) / 2;
      var gv = max * (1 - g / 2);
      out += "<line class='grid-line' x1='" + padL + "' y1='" + gy + "' x2='" + (w - padR) + "' y2='" + gy + "'/>";
      out += "<text class='axis-label' x='" + (padL - 8) + "' y='" + (gy + 3.5) + "' text-anchor='end'>" +
        Charts.fmtVal(gv, fmt) + "</text>";
    }

    for (var i = 0; i < n; i++) {
      var vh = (values[i] / max) * plotH;
      var x = padL + slot * i + (slot - bw) / 2;
      var y = padT + plotH - vh;
      out += "<rect class='bar-rect' style='--i:" + i + "' x='" + x + "' y='" + y + "' width='" + bw + "' height='" + Math.max(vh, 2) + "' rx='5' fill='url(#" + uid + ")'/>";
      out += "<text class='axis-label' x='" + (x + bw / 2) + "' y='" + (h - 6) + "' text-anchor='middle'>" +
        UI.escape(labels[i] != null ? labels[i] : "") + "</text>";
    }
    out += "</svg>";

    container.classList.add("chart");
    container.innerHTML = out;
    Charts._reveal(container);
    return container;
  },

  /* ---------------- donut + legend ---------------- */

  donut: function (container, opts) {
    var segments = opts.segments || [];
    var total = 0;
    segments.forEach(function (s) { total += s.value; });
    if (!segments.length || !total) return Charts._empty(container, opts.emptyText, opts.emptySub);

    var size = 178, cx = size / 2, cy = size / 2, r = 62, sw = 19;
    var C = 2 * Math.PI * r;
    var acc = 0;

    var svg = "<svg viewBox='0 0 " + size + " " + size + "' width='" + size + "' height='" + size + "' style='flex:none'>";
    svg += "<circle cx='" + cx + "' cy='" + cy + "' r='" + r + "' fill='none' stroke='var(--surface-3)' stroke-width='" + sw + "'/>";
    segments.forEach(function (s, i) {
      var len = (s.value / total) * C;
      svg += "<circle class='donut-seg' cx='" + cx + "' cy='" + cy + "' r='" + r + "'" +
        " fill='none' stroke='" + s.color + "' stroke-width='" + sw + "'" +
        " stroke-dasharray='" + Math.max(len - 2.5, 0.5) + " " + (C - len + 2.5) + "'" +
        " transform='rotate(-90 " + cx + " " + cy + ")'" +
        " style='stroke-dashoffset:" + C + ";transition-delay:" + (i * 130 + 120) + "ms' data-offset='" + (-acc) + "'/>";
      acc += len;
    });
    svg += "<text class='donut-center-value' x='" + cx + "' y='" + (cy - 2) + "' text-anchor='middle' data-count='" + total + "'>0</text>";
    svg += "<text class='donut-center-label' x='" + cx + "' y='" + (cy + 18) + "' text-anchor='middle'>" + UI.escape(opts.centerLabel || "total") + "</text>";
    svg += "</svg>";

    var legend = "<div class='legend grow'>";
    segments.forEach(function (s) {
      legend += "<div class='legend-item'>" +
        "<span class='legend-dot' style='background:" + s.color + "'></span>" +
        "<span class='legend-label'>" + UI.escape(s.label) + "</span>" +
        "<span class='legend-value'>" + s.value + " · " + Math.round((s.value / total) * 100) + "%</span>" +
        "</div>";
    });
    legend += "</div>";

    container.classList.add("chart");
    container.innerHTML = "<div style='display:flex;align-items:center;gap:22px;flex-wrap:wrap'>" + svg + legend + "</div>";

    var segs = container.querySelectorAll(".donut-seg");
    var counter = container.querySelector("[data-count]");
    Charts._reveal(container, function () {
      for (var i = 0; i < segs.length; i++) segs[i].style.strokeDashoffset = segs[i].getAttribute("data-offset");
      if (counter) UI.countUp(counter, parseFloat(counter.getAttribute("data-count")), { duration: 900 });
    });
    return container;
  },

  /* ---------------- horizontal bars (HTML) ---------------- */

  hbar: function (container, opts) {
    var items = opts.items || [];
    var vals = items.map(function (it) { return Number(it.value) || 0; });
    var max = Math.max.apply(null, vals.concat([1]));
    var fmt = opts.format || "money";
    var total = 0;
    vals.forEach(function (v) { total += v; });
    if (!items.length || total === 0) return Charts._empty(container, opts.emptyText, opts.emptySub);

    var html = "";
    items.forEach(function (it, i) {
      var pct = Math.max(3, Math.round((it.value / max) * 100));
      html += "<div style='display:flex;align-items:center;gap:12px;padding:7px 0'>" +
        "<div style='width:150px;flex:none;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis'>" + UI.escape(it.label) + "</div>" +
        "<div style='flex:1;height:9px;border-radius:99px;background:var(--surface-3);overflow:hidden'>" +
          "<div class='hbar-fill' data-w='" + pct + "' style='--i:" + i + ";height:100%;border-radius:99px;background:linear-gradient(90deg," + (opts.color || "#0d9488") + "," + (opts.color2 || "#2dd4bf") + ")'></div>" +
        "</div>" +
        "<div style='width:70px;flex:none;text-align:right;font-size:12.5px;font-weight:700;font-variant-numeric:tabular-nums'>" + Charts.fmtVal(it.value, fmt) + "</div>" +
      "</div>";
    });

    container.classList.add("chart");
    container.innerHTML = html;
    Charts._reveal(container, function () {
      var fills = container.querySelectorAll(".hbar-fill");
      for (var i = 0; i < fills.length; i++) fills[i].style.width = fills[i].getAttribute("data-w") + "%";
    });
    return container;
  }
};
