(function () {
  if (window.__abxInstalled) {
    alert("Antibiyotik eklentisi zaten aktif.");
    return;
  }
  window.__abxInstalled = true;

  var DATA_URL = "https://raw.githubusercontent.com/mcelilaslan/antibiyotik/main/data.js";
  var CACHE_KEY = "abx_cache_v2";
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var SCAN_INTERVAL_MS = 800;
  var HAS_POPOVER = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
  var NEFRO_COLORS = {
    "Düşük": "#2e7d32",
    "Düşük-Orta": "#9e9d24",
    "Orta": "#ef6c00",
    "Yüksek": "#c62828"
  };

  var drugs = [];
  var index = [];

  function tokenize(text) {
    return (text || "")
      .toLocaleUpperCase("tr")
      .replace(/İ/g, "I")
      .split(/[^A-ZÇĞÖŞÜ]+/)
      .filter(function (t) { return t.length > 2; });
  }

  function commonPrefixLength(a, b) {
    var max = Math.min(a.length, b.length);
    var i = 0;
    while (i < max && a.charAt(i) === b.charAt(i)) i++;
    return i;
  }

  function tokensMatch(a, b) {
    return a === b || commonPrefixLength(a, b) >= 6;
  }

  function buildIndex() {
    index = drugs
      .map(function (d) { return { drug: d, tokens: tokenize(d.etken) }; })
      .filter(function (e) { return e.tokens.length > 0; });
  }

  function findDrug(text) {
    var cellTokens = tokenize(text);
    if (!cellTokens.length) return null;
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < index.length; i++) {
      var entry = index[i];
      var score = 0;
      for (var j = 0; j < entry.tokens.length; j++) {
        for (var k = 0; k < cellTokens.length; k++) {
          if (tokensMatch(entry.tokens[j], cellTokens[k])) {
            score++;
            break;
          }
        }
      }
      if (score > 0 && (score > bestScore || (score === bestScore && (!best || entry.tokens.length > best.tokens.length)))) {
        best = entry;
        bestScore = score;
      }
    }
    return best ? best.drug : null;
  }

  function queryAllDeep(tagName, root) {
    var found = [];
    var nodes = (root || document).querySelectorAll("*");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.tagName && node.tagName.toLowerCase() === tagName) found.push(node);
      if (node.shadowRoot) found = found.concat(queryAllDeep(tagName, node.shadowRoot));
    }
    return found;
  }

  function esc(text) {
    return (text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function multiline(text) {
    return esc(text).replace(/\n/g, "<br>");
  }

  function section(title, text) {
    if (!text) return "";
    return '<div style="margin:0 0 12px;">' +
      '<div style="font-weight:700;color:#1565c0;margin-bottom:3px;">' + esc(title) + "</div>" +
      "<div>" + multiline(text) + "</div>" +
      "</div>";
  }

  function synergySection(list) {
    if (!list || !list.length) return "";
    var items = list.map(function (item) {
      return '<div style="margin:0 0 8px;padding:8px 10px;background:#eef3fb;border-radius:8px;">' +
        '<div style="font-weight:700;">' + esc(item.kombinasyon) + "</div>" +
        "<div>" + esc(item.not) + "</div>" +
        "</div>";
    }).join("");
    return '<div style="margin:0 0 12px;">' +
      '<div style="font-weight:700;color:#1565c0;margin-bottom:3px;">Sinerji / Kombinasyonlar</div>' +
      items +
      "</div>";
  }

  function nefroBox(drug) {
    var color = NEFRO_COLORS[drug.nefroSeviye] || "#616161";
    return '<div style="margin:10px 0;padding:8px 10px;border-radius:8px;background:' + color + "18;border-left:4px solid " + color + ';">' +
      "<b>Nefrotoksisite: </b>" +
      '<span style="color:' + color + ';font-weight:700;">' + esc(drug.nefroSeviye || "-") + "</span>" +
      (drug.nefroNot ? '<div style="margin-top:4px;">' + multiline(drug.nefroNot) + "</div>" : "") +
      "</div>";
  }

  function panelHtml(drug) {
    return '<div style="position:sticky;top:0;background:#1565c0;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;">' +
      "<div>" +
      '<div style="font-size:16px;font-weight:700;">' + esc(drug.etken) + "</div>" +
      '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + esc(drug.pazar || "") + "</div>" +
      '<div style="font-size:11px;opacity:.75;margin-top:4px;">' + esc(drug.kategoriKisa || "") + (drug.grup ? " · " + esc(drug.grup) : "") + "</div>" +
      "</div>" +
      '<span id="abx-close" style="cursor:pointer;font-size:22px;line-height:1;padding:4px 8px;font-weight:700;">&times;</span>' +
      "</div>" +
      '<div style="padding:8px 16px 4px;text-align:right;">' +
      '<button id="abx-close2" style="cursor:pointer;background:#eee;border:none;border-radius:6px;padding:6px 12px;font-size:12px;">Kapat (Esc)</button>' +
      "</div>" +
      '<div style="padding:6px 16px 14px;">' +
      section("Özellikler", drug.ozellikler) +
      section("Endikasyon", drug.endikasyon) +
      section("Standart Doz", drug.standartDoz) +
      section("Renal Doz Ayarı", drug.renalDoz) +
      section("Sınırlamalar", drug.sinirlamalar) +
      synergySection(drug.sinerji) +
      section("Yan Etki", drug.yanEtki) +
      nefroBox(drug) +
      section("Eliminasyon", drug.eliminasyon) +
      "</div>";
  }

  function closePanel() {
    var panel = document.getElementById("abx-info-panel");
    if (panel) panel.remove();
    var backdrop = document.getElementById("abx-panel-backdrop");
    if (backdrop) backdrop.remove();
  }

  function openPanel(drug) {
    var backdrop = document.getElementById("abx-panel-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.id = "abx-panel-backdrop";
      backdrop.style.cssText = "position:fixed;inset:0;background:transparent;z-index:2147483646;";
      backdrop.addEventListener("click", closePanel);
      document.body.appendChild(backdrop);
    }

    var panel = document.getElementById("abx-info-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "abx-info-panel";
      panel.style.cssText = "position:fixed;top:0;right:0;left:auto;bottom:auto;margin:0;width:420px;max-width:92vw;height:100vh;background:#fff;color:#111;box-shadow:-4px 0 24px rgba(0,0,0,.35);z-index:2147483647;overflow-y:auto;font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:13.5px;line-height:1.5;padding:0;";
      panel.addEventListener("click", function (e) { e.stopPropagation(); });
      if (HAS_POPOVER) panel.setAttribute("popover", "manual");
      document.body.appendChild(panel);
    }

    panel.innerHTML = panelHtml(drug);
    document.getElementById("abx-close").addEventListener("click", function (e) {
      e.stopPropagation();
      closePanel();
    });
    document.getElementById("abx-close2").addEventListener("click", function (e) {
      e.stopPropagation();
      closePanel();
    });

    if (HAS_POPOVER) {
      try { if (panel.matches(":popover-open")) panel.hidePopover(); } catch (e) {}
      try { panel.showPopover(); } catch (e) {}
    }
  }

  function keepPanelOnTop() {
    var panel = document.getElementById("abx-info-panel");
    if (!panel) return;
    if (HAS_POPOVER) {
      try {
        if (panel.matches(":popover-open")) {
          panel.hidePopover();
          panel.showPopover();
        }
      } catch (e) {}
    } else {
      var backdrop = document.getElementById("abx-panel-backdrop");
      if (backdrop) document.body.appendChild(backdrop);
      document.body.appendChild(panel);
    }
  }

  function drugBySlug(slug) {
    for (var i = 0; i < drugs.length; i++) {
      if (drugs[i].slug === slug) return drugs[i];
    }
    return null;
  }

  function decorateCells() {
    var cells = queryAllDeep("vaadin-grid-cell-content", document);
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var text = (cell.textContent || "").trim();
      var drug = text ? findDrug(text) : null;
      var button = cell.querySelector(".abx-btn");

      if (!drug) {
        if (button) button.remove();
        continue;
      }
      if (button && button.getAttribute("data-slug") === drug.slug) continue;
      if (button) button.remove();

      var pill = document.createElement("span");
      pill.className = "abx-btn";
      pill.textContent = "💊";
      pill.title = "Antibiyotik bilgisi: " + drug.etken;
      pill.setAttribute("data-slug", drug.slug);
      pill.style.cssText = "cursor:pointer;margin-left:6px;font-size:13px;";
      pill.addEventListener("click", function (e) {
        e.stopPropagation();
        e.preventDefault();
        var target = drugBySlug(this.getAttribute("data-slug"));
        if (target) openPanel(target);
      });
      cell.appendChild(pill);
    }
    keepPanelOnTop();
  }

  function readCache() {
    try {
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      return cached && cached.data ? cached : null;
    } catch (e) {
      return null;
    }
  }

  function loadData(force, done) {
    var cached = readCache();
    if (!force && cached && Date.now() - cached.t < CACHE_TTL_MS) {
      done(cached.data);
      return;
    }
    fetch(DATA_URL + (force ? "?t=" + Date.now() : ""))
      .then(function (r) { return r.text(); })
      .then(function (text) {
        var data = new Function(text + ";return DRUG_DATA;")();
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: data }));
        } catch (e) {}
        done(data);
      })
      .catch(function (err) {
        console.error("Antibiyotik verisi alınamadı", err);
        if (cached) {
          done(cached.data);
        } else {
          alert("Antibiyotik verisi yüklenemedi (ağ engeli olabilir).");
        }
      });
  }

  function applyData(data) {
    drugs = data;
    buildIndex();
    showBadge();
  }

  function showBadge() {
    var old = document.getElementById("abx-status-badge");
    if (old) old.remove();
    var badge = document.createElement("div");
    badge.id = "abx-status-badge";
    badge.textContent = "💊 " + drugs.length + " ilaç yüklendi";
    badge.title = "Antibiyotik rehberi aktif. Tıkla: veriyi yeniden indir.";
    badge.style.cssText = "position:fixed;bottom:16px;left:16px;z-index:2147483647;background:#1565c0;color:#fff;padding:6px 10px;border-radius:16px;font-size:11px;font-family:system-ui,Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3);opacity:.85;";
    badge.onclick = function () {
      badge.textContent = "💊 yükleniyor...";
      loadData(true, applyData);
    };
    document.body.appendChild(badge);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closePanel();
  }, true);

  loadData(false, function (data) {
    applyData(data);
    decorateCells();
    setInterval(decorateCells, SCAN_INTERVAL_MS);
  });
})();
