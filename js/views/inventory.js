/* IZEX — Inventory view */

var Views = window.Views || {};

/* persistent across re-renders (refresh() re-invokes the view function) */
var inventoryState = { q: "", category: "all" };

Views.inventory = function (root) {
  var state = inventoryState;

  function refresh() { Views.inventory(root); }

  function stockState(it) {
    if (it.qty <= 0) return { kind: "out", label: "Out of stock", chip: "rose", meter: "danger" };
    if (it.qty <= it.reorderAt / 2) return { kind: "critical", label: "Critical", chip: "rose", meter: "danger" };
    if (it.qty <= it.reorderAt) return { kind: "low", label: "Low", chip: "amber", meter: "warn" };
    return { kind: "ok", label: "In stock", chip: "teal", meter: "ok" };
  }

  function sorted() {
    var q = state.q.toLowerCase();
    var list = Store.db.inventory.filter(function (it) {
      if (state.category !== "all" && it.category !== state.category) return false;
      if (!q) return true;
      return (it.name + " " + it.lot + " " + it.category).toLowerCase().indexOf(q) >= 0;
    });
    var weight = { out: 0, critical: 1, low: 2, ok: 3 };
    return list.sort(function (a, b) {
      var ea = Data.daysUntil(a.expiry), eb = Data.daysUntil(b.expiry);
      if (ea < 0 && eb >= 0) return -1;
      if (eb < 0 && ea >= 0) return 1;
      var wa = weight[stockState(a).kind], wb = weight[stockState(b).kind];
      if (wa !== wb) return wa - wb;
      return a.name < b.name ? -1 : 1;
    });
  }

  function row(it, i) {
    var st = stockState(it);
    var exp = Data.expiryState(it.expiry);
    var meterPct = it.reorderAt > 0 ? Math.min(100, Math.round((it.qty / (it.reorderAt * 3)) * 100)) : (it.qty > 0 ? 100 : 0);
    return "<tr data-item='" + it.id + "'>" +
      "<td><div class='cell-main'>" + UI.escape(it.name) + "</div><div class='cell-sub'>" + it.category + "</div></td>" +
      "<td class='nowrap muted small'>" + UI.escape(it.lot) + "</td>" +
      "<td class='nowrap'>" + UI.chip(exp.label, exp.chip, exp.kind !== "ok") + "</td>" +
      "<td><div class='row' style='gap:10px'><span class='bold tnum' style='width:52px'>" + it.qty + " <span class='faint small'>" + it.unit + "</span></span>" +
        "<div class='meter'><div class='meter-fill " + st.meter + "' data-w='" + meterPct + "'></div></div></div></td>" +
      "<td class='nowrap muted small'>" + it.reorderAt + "</td>" +
      "<td class='num'>" + Data.fmtMoney(it.price) + "</td>" +
      "<td>" + UI.chip(st.label, st.chip, true) + "</td>" +
    "</tr>";
  }

  var list = sorted();
  var low = Store.lowStock().length;
  var expiring = Store.expiringSoon(30).length;
  var value = Store.db.inventory.reduce(function (s, it) { return s + it.qty * it.price; }, 0);
  var categories = ["all", "Vaccine", "Medication", "Consumable", "Food"];

  function kpi(label, valueNode, iconName, kind) {
    var kinds = { teal: ["var(--c-teal-bg)", "var(--c-teal-fg)"], amber: ["var(--c-amber-bg)", "var(--c-amber-fg)"], rose: ["var(--c-rose-bg)", "var(--c-rose-fg)"], violet: ["var(--c-violet-bg)", "var(--c-violet-fg)"] };
    var k = kinds[kind] || kinds.teal;
    return "<div class='card kpi hoverable'><div class='kpi-top'><div class='kpi-icon' style='background:" + k[0] + ";color:" + k[1] + "'>" + icon(iconName, 19) + "</div>" +
      "<div class='kpi-label'>" + label + "</div></div><div class='kpi-value'>" + valueNode + "</div></div>";
  }

  root.innerHTML =
    "<div class='page-head'>" +
      "<div><h1 class='page-title'>Inventory</h1><div class='page-sub'>Stock levels, lot tracking and expiry watch.</div></div>" +
      "<div class='page-actions'><button class='btn btn-outline' data-receive>" + icon("download", 15) + "Receive stock</button>" +
      "<button class='btn btn-primary' data-newitem>" + icon("plus", 15) + "New item</button></div>" +
    "</div>" +

    "<div class='grid grid-4 stagger' style='margin-bottom:18px'>" +
      kpi("Items tracked", Store.db.inventory.length, "box", "teal") +
      kpi("Low / critical", low, "alert", "amber") +
      kpi("Expiring ≤ 30 days", expiring, "clock", "rose") +
      kpi("Stock value", "<span data-stockvalue>" + Data.fmtMoneyCompact(value) + "</span>", "rupee", "violet") +
    "</div>" +

    "<div class='row wrap' style='margin-bottom:16px'>" +
      "<div style='position:relative;width:280px'>" +
        "<span style='position:absolute;left:11px;top:11px;color:var(--faint)'>" + icon("search", 15) + "</span>" +
        "<input class='input' data-q placeholder='Search item or lot…' style='padding-left:36px' value='" + UI.escape(state.q) + "'></div>" +
      "<div class='filter-chips'>" +
        categories.map(function (c) {
          var n = c === "all" ? Store.db.inventory.length : Store.db.inventory.filter(function (it) { return it.category === c; }).length;
          return "<button class='filter-chip" + (state.category === c ? " active" : "") + "' data-cat='" + c + "'>" + c + " <span class='count'>" + n + "</span></button>";
        }).join("") +
      "</div>" +
    "</div>" +

    "<div class='card'>" +
      (list.length
        ? "<div class='tbl-wrap'><table class='tbl'><thead><tr><th>Item</th><th>Lot</th><th>Expiry</th><th>Stock</th><th>Reorder at</th><th class='num'>Unit price</th><th>Status</th></tr></thead><tbody class='stagger'>" + list.map(row).join("") + "</tbody></table></div>"
        : (Store.db.inventory.length === 0
            ? "<div class='empty'><div class='empty-icon'>" + icon("box", 24) + "</div><div class='empty-title'>No items yet</div><div class='empty-sub'>Add your first stock item with the New item button above.</div></div>"
            : "<div class='empty'><div class='empty-icon'>" + icon("box", 24) + "</div><div class='empty-title'>No items match</div><div class='empty-sub'>Adjust the search or category filter.</div></div>")) +
    "</div>";

  /* meters animate in */
  requestAnimationFrame(function () {
    root.querySelectorAll(".meter-fill[data-w]").forEach(function (m) {
      setTimeout(function () { m.style.width = m.getAttribute("data-w") + "%"; }, 80);
    });
  });

  /* wire */
  var q = root.querySelector("[data-q]");
  q.addEventListener("input", function () {
    state.q = q.value;
    clearTimeout(q._t);
    q._t = setTimeout(function () {
      refresh();
      var again = root.querySelector("[data-q]");
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    }, 280);
  });
  root.querySelectorAll("[data-cat]").forEach(function (b) {
    b.addEventListener("click", function () { state.category = b.getAttribute("data-cat"); refresh(); });
  });
  root.querySelectorAll("tr[data-item]").forEach(function (tr) {
    tr.addEventListener("click", function () {
      var it = Store.invById(tr.getAttribute("data-item"));
      if (it) openItem(it, refresh);
    });
  });
  root.querySelector("[data-receive]").addEventListener("click", function () {
    if (!Store.db.inventory.length) {
      UI.toast({ kind: "info", title: "Nothing to receive", msg: "Create an item first, then receive stock against it." });
      return;
    }
    UI.toast({ kind: "info", title: "Pick an item", msg: "Open any item below to receive stock against it." });
  });
  root.querySelector("[data-newitem]").addEventListener("click", function () {
    UI.modal({
      title: "New inventory item",
      body:
        "<div class='field-row'><div class='field'><label>Name</label><input class='input' data-f='name'></div>" +
        "<div class='field'><label>Category</label><select class='select' data-f='category'>" +
          ["Vaccine", "Medication", "Consumable", "Food"].map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div></div>" +
        "<div class='field-row-3'><div class='field'><label>Unit</label><input class='input' data-f='unit' placeholder='vial, bottle…'></div>" +
        "<div class='field'><label>Quantity</label><input class='input' type='number' min='0' data-f='qty' value='0'></div>" +
        "<div class='field'><label>Reorder at</label><input class='input' type='number' min='0' data-f='reorder' value='10'></div></div>" +
        "<div class='field-row'><div class='field'><label>Lot</label><input class='input' data-f='lot' placeholder='LOT-0000'></div>" +
        "<div class='field'><label>Expiry</label><input class='input' type='date' data-f='expiry' value='" + Data.iso(Data.addDays(new Date(), 365)) + "'></div></div>" +
        "<div class='field'><label>Unit price</label><input class='input' type='number' step='0.01' min='0' data-f='price' value='0.00'></div>",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("check", 15) + "Create item</button>",
      onMount: function (rootEl, close) {
        rootEl.querySelector("[data-cancel]").addEventListener("click", close);
        rootEl.querySelector("[data-save]").addEventListener("click", function () {
          var f = function (n) { return rootEl.querySelector("[data-f='" + n + "']").value; };
          if (!f("name")) { UI.toast({ kind: "warn", title: "Name required" }); return; }
          Store.db.inventory.push({
            id: Data.nextId("I", Store.db.inventory, 6001),
            name: f("name").trim(), category: f("category"), unit: f("unit") || "unit",
            lot: f("lot") || "LOT-NEW", qty: parseInt(f("qty"), 10) || 0,
            reorderAt: parseInt(f("reorder"), 10) || 10,
            expiry: f("expiry"), price: parseFloat(f("price")) || 0
          });
          Store.commit();
          close();
          UI.toast({ kind: "success", title: "Item created" });
          refresh();
        });
      }
    });
  });

  /* ---------- item detail ---------- */

  function openItem(it, onDone) {
    var exp = Data.expiryState(it.expiry);
    var st = stockState(it);

    function render() {
      return "<div class='stat-row' style='margin-bottom:14px'>" +
          "<div class='stat-box'><div class='label'>On hand</div><div class='value'>" + it.qty + " <span style='font-size:12px;color:var(--faint)'>" + it.unit + "</span></div></div>" +
          "<div class='stat-box'><div class='label'>Reorder at</div><div class='value'>" + it.reorderAt + "</div></div>" +
          "<div class='stat-box'><div class='label'>Value</div><div class='value sm'>" + Data.fmtMoney(it.qty * it.price) + "</div></div>" +
        "</div>" +
        "<div class='row' style='gap:8px;flex-wrap:wrap;margin-bottom:14px'>" +
          UI.chip(it.category, "sky") + UI.chip("Lot " + it.lot, "slate") + UI.chip(exp.label, exp.chip, exp.kind !== "ok") + UI.chip(st.label, st.chip, true) +
        "</div>" +
        "<div class='muted small' style='margin-bottom:16px'>Expiry " + Data.fmtDateLong(it.expiry) + " · unit price " + Data.fmtMoney(it.price) + " · " + it.id + "</div>";
    }

    UI.modal({
      title: it.name,
      sub: "Inventory item",
      body: "<div data-body>" + render() + "</div>",
      foot: "<button class='btn btn-ghost' data-adjust style='margin-right:auto'>" + icon("sliders", 14) + "Adjust count</button>" +
            "<button class='btn btn-outline' data-close2>Close</button>" +
            "<button class='btn btn-primary' data-receive2>" + icon("download", 15) + "Receive stock</button>",
      onMount: function (rootEl, close) {
        rootEl.querySelector("[data-close2]").addEventListener("click", close);

        rootEl.querySelector("[data-receive2]").addEventListener("click", function () {
          close();
          receiveDialog(it, onDone);
        });
        rootEl.querySelector("[data-adjust]").addEventListener("click", function () {
          close();
          UI.modal({
            title: "Adjust count — " + it.name,
            body: "<div class='field'><label>New quantity on hand</label><input class='input' type='number' min='0' data-f='qty' value='" + it.qty + "'></div>" +
              "<div class='field'><label>Reason</label><select class='select' data-f='reason'><option>Stock count correction</option><option>Damaged / spoiled</option><option>Expired — write-off</option><option>Used in treatment</option></select></div>",
            foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("check", 15) + "Save adjustment</button>",
            onMount: function (r2, close2) {
              r2.querySelector("[data-cancel]").addEventListener("click", close2);
              r2.querySelector("[data-save]").addEventListener("click", function () {
                it.qty = Math.max(0, parseInt(r2.querySelector("[data-f='qty']").value, 10) || 0);
                Store.commit();
                close2();
                UI.toast({ kind: "warn", title: "Stock adjusted", msg: it.name + " → " + it.qty + " " + it.unit + "s" });
                onDone();
              });
            }
          });
        });
      }
    });
  }

  function receiveDialog(it, onDone) {
    UI.modal({
      title: "Receive stock — " + it.name,
      sub: "Adds to the current count and optionally refreshes lot and expiry.",
      body:
        "<div class='field-row'>" +
          "<div class='field'><label>Quantity to add</label><input class='input' type='number' min='1' data-f='qty' value='12'></div>" +
          "<div class='field'><label>Lot (optional)</label><input class='input' data-f='lot' value='" + UI.escape(it.lot) + "'></div>" +
        "</div>" +
        "<div class='field-row'>" +
          "<div class='field'><label>Expiry (optional)</label><input class='input' type='date' data-f='expiry' value='" + it.expiry + "'></div>" +
          "<div class='field'><label>Unit price</label><input class='input' type='number' step='0.01' data-f='price' value='" + it.price + "'></div>" +
        "</div>",
      foot: "<button class='btn btn-ghost' data-cancel>Cancel</button><button class='btn btn-primary' data-save>" + icon("check", 15) + "Receive</button>",
      onMount: function (rootEl, close) {
        rootEl.querySelector("[data-cancel]").addEventListener("click", close);
        rootEl.querySelector("[data-save]").addEventListener("click", function () {
          var add = parseInt(rootEl.querySelector("[data-f='qty']").value, 10) || 0;
          if (add <= 0) { UI.toast({ kind: "warn", title: "Enter a quantity" }); return; }
          it.qty += add;
          var lot = rootEl.querySelector("[data-f='lot']").value.trim();
          if (lot) it.lot = lot;
          it.expiry = rootEl.querySelector("[data-f='expiry']").value || it.expiry;
          var price = parseFloat(rootEl.querySelector("[data-f='price']").value);
          if (price > 0) it.price = price;
          Store.commit();
          close();
          UI.toast({ kind: "success", title: "Stock received", msg: "+" + add + " " + it.unit + "s · " + it.name + " now at " + it.qty });
          onDone();
        });
      }
    });
  }
};
