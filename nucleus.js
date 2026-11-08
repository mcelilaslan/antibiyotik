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
  var THEME = {
    header: "#1565c0",
    risk: {
      low: { fg: "#15a349", bg: "#dbf3e2" },
      mid: { fg: "#d9790a", bg: "#fbecd2" },
      high: { fg: "#dc2b2b", bg: "#fbdad7" }
    },
    riskClass: { "Düşük": "low", "Düşük-Orta": "mid", "Orta": "mid", "Yüksek": "high" },
    good: "#15a349",
    alert: "#c62828",
    plainCaps: { ESCMID: true },
    tones: {
      plain: { bar: "#90a4ae", bg: "transparent", title: "#546e7a" },
      dose: { bar: "#2e7d32", bg: "#eef7ee", title: "#2e7d32" },
      renal: { bar: "#6a1b9a", bg: "#f6eefa", title: "#6a1b9a" },
      warn: { bar: "#c62828", bg: "#fdeeed", title: "#c62828" },
      synergy: { bar: "#1565c0", bg: "#eaf2fc", title: "#1565c0" },
      adverse: { bar: "#ef6c00", bg: "#fff4e5", title: "#d9790a" }
    }
  };

  var SECTIONS = [
    { key: "ozellikler", title: "Özellikler", tone: "plain", kind: "text" },
    { key: "endikasyon", title: "Endikasyon", tone: "plain", kind: "text" },
    { key: "standartDoz", title: "Standart Doz", tone: "dose", kind: "doses" },
    { key: "renalDoz", title: "Renal Doz Ayarı", tone: "renal", kind: "rows" },
    { key: "sinirlamalar", title: "Sınırlamalar", tone: "warn", kind: "text" },
    { key: "sinerji", title: "Sinerji / Kombinasyonlar", tone: "synergy", kind: "synergy" },
    { key: "yanEtki", title: "Yan Etki", tone: "adverse", kind: "text", nefroNote: true },
    { key: "eliminasyon", title: "Eliminasyon", tone: "plain", kind: "text" }
  ];

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

  var EMPHASIS_RE = /(Doz ayarı (?:gerekmez|GEREKMEZ))|(^|[^A-Za-zÇĞİÖŞÜçğıöşü])([A-ZÇĞİÖŞÜ]{6,})(?![A-Za-zÇĞİÖŞÜçğıöşü])/g;

  function rich(text) {
    return esc(text)
      .replace(EMPHASIS_RE, function (all, phrase, pre, caps) {
        if (phrase) return '<b style="color:' + THEME.good + ';">' + phrase + "</b>";
        if (THEME.plainCaps[caps]) return pre + caps;
        var color = caps === "GEREKMEZ" ? THEME.good : THEME.alert;
        return pre + '<b style="color:' + color + ';">' + caps + "</b>";
      })
      .replace(/\n/g, "<br>");
  }

  function lines(text) {
    return (text || "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function splitLabel(line) {
    var m = line.match(/^([^:]{2,40}):\s*(.+)$/);
    return m ? { label: m[1], body: m[2] } : { label: null, body: line };
  }

  function riskColors(drug) {
    return THEME.risk[THEME.riskClass[drug.nefroSeviye] || "mid"];
  }

  function textBody(text) {
    return "<div>" + rich(text) + "</div>";
  }

  function dosesBody(text, tone) {
    return lines(text).map(function (line) {
      var part = splitLabel(line);
      return '<div style="background:#fff;border:1px solid ' + tone.bar + '40;border-radius:8px;padding:7px 10px;margin:0 0 6px;">' +
        (part.label ? '<div style="font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:' + tone.title + ';margin-bottom:1px;">' + esc(part.label) + "</div>" : "") +
        "<div>" + rich(part.body) + "</div>" +
        "</div>";
    }).join("");
  }

  function rowsBody(text, tone) {
    return lines(text).map(function (line, i) {
      var part = splitLabel(line);
      var divider = i ? "border-top:1px solid " + tone.bar + "30;" : "";
      if (!part.label) {
        return '<div style="padding:6px 0;' + divider + '">' + rich(part.body) + "</div>";
      }
      return '<div style="display:flex;align-items:flex-start;gap:10px;padding:6px 0;' + divider + '">' +
        '<span style="flex:0 0 auto;max-width:45%;background:' + tone.bar + ';color:#fff;border-radius:6px;padding:1px 8px;font-weight:700;font-size:12px;">' + esc(part.label) + "</span>" +
        '<span style="flex:1 1 auto;">' + rich(part.body) + "</span>" +
        "</div>";
    }).join("");
  }

  function synergyBody(list, tone) {
    return list.map(function (item) {
      return '<div style="background:#fff;border:1px solid ' + tone.bar + '40;border-radius:8px;padding:7px 10px;margin:0 0 6px;">' +
        '<div style="font-weight:700;color:' + tone.title + ';">' + esc(item.kombinasyon) + "</div>" +
        "<div>" + esc(item.not) + "</div>" +
        "</div>";
    }).join("");
  }

  function sectionHtml(sec, drug) {
    var value = drug[sec.key];
    if (!value || (Array.isArray(value) && !value.length)) return "";
    var tone = THEME.tones[sec.tone];
    var body;
    if (sec.kind === "doses") body = dosesBody(value, tone);
    else if (sec.kind === "rows") body = rowsBody(value, tone);
    else if (sec.kind === "synergy") body = synergyBody(value, tone);
    else body = textBody(value);
    if (sec.nefroNote && drug.nefroNot) {
      body += '<div style="margin-top:6px;font-weight:600;color:' + riskColors(drug).fg + ';">' + rich(drug.nefroNot) + "</div>";
    }
    return '<div style="margin:0 0 12px;padding:10px 12px;border-left:4px solid ' + tone.bar + ";background:" + tone.bg + ';border-radius:0 8px 8px 0;">' +
      '<div style="font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:' + tone.title + ';margin-bottom:6px;">' + esc(sec.title) + "</div>" +
      body +
      "</div>";
  }

  function riskBadge(drug) {
    var c = riskColors(drug);
    return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:5px 11px;border-radius:999px;background:' + c.bg + ";color:" + c.fg + ';">' +
      '<span style="width:7px;height:7px;border-radius:999px;background:currentColor;display:inline-block;"></span>' +
      "Nefrotoksisite: " + esc(drug.nefroSeviye || "-") +
      "</span>";
  }

  function panelHtml(drug) {
    return '<div style="position:sticky;top:0;background:' + THEME.header + ';color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;z-index:1;">' +
      "<div>" +
      '<div style="font-size:16px;font-weight:700;">' + esc(drug.etken) + "</div>" +
      '<div style="font-size:12px;opacity:.85;margin-top:2px;">' + esc(drug.pazar || "") + "</div>" +
      '<div style="font-size:11px;opacity:.75;margin-top:4px;">' + esc(drug.kategoriKisa || "") + (drug.grup ? " · " + esc(drug.grup) : "") + "</div>" +
      "</div>" +
      '<span id="abx-close" style="cursor:pointer;font-size:22px;line-height:1;padding:4px 8px;font-weight:700;">&times;</span>' +
      "</div>" +
      '<div style="padding:10px 16px 6px;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
      riskBadge(drug) +
      '<button id="abx-close2" style="cursor:pointer;background:#eee;border:none;border-radius:6px;padding:6px 12px;font-size:12px;">Kapat (Esc)</button>' +
      "</div>" +
      '<div style="padding:6px 16px 18px;">' +
      SECTIONS.map(function (sec) { return sectionHtml(sec, drug); }).join("") +
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
      panel.setAttribute("lang", "tr");
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
