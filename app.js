(function () {
  "use strict";

  /* ---------------- Kategori sırası ve renkleri ---------------- */
  var CATEGORY_ORDER = [
    "BETA-LAKTAMLAR",
    "GLİKOPEPTİTLER / LİPOPEPTİTLER / LİNEZOLİD",
    "POLİMİKSİNLER / AMİNOGLİKOZİTLER / TİGESİKLİN",
    "FLOROKİNOLONLAR & DİĞERLERİ",
    "ANTİFUNGALLER"
  ];

  var RISK_CLASS = {
    "Düşük": "low",
    "Düşük-Orta": "mid",
    "Orta": "mid",
    "Yüksek": "high"
  };

  var els = {
    search: document.getElementById("search"),
    clearSearch: document.getElementById("clearSearch"),
    chipRow: document.getElementById("chipRow"),
    categoryList: document.getElementById("categoryList"),
    resultCount: document.getElementById("resultCount"),
    emptyState: document.getElementById("emptyState"),
    listView: document.getElementById("listView"),
    detailView: document.getElementById("detailView"),
    detailBody: document.getElementById("detailBody"),
    backBtn: document.getElementById("backBtn"),
    shareBtn: document.getElementById("shareBtn"),
    hCat: document.getElementById("hCat"),
    hName: document.getElementById("hName"),
    themeToggle: document.getElementById("themeToggle"),
    themeIconMoon: document.getElementById("themeIconMoon"),
    themeIconSun: document.getElementById("themeIconSun")
  };

  var state = {
    query: "",
    activeCategory: "all",
    openCategories: {} // kategori -> bool
  };

  /* ---------------- Yardımcılar ---------------- */

  function byCategory(list) {
    var map = {};
    CATEGORY_ORDER.forEach(function (c) { map[c] = []; });
    list.forEach(function (d) {
      if (!map[d.kategori]) map[d.kategori] = [];
      map[d.kategori].push(d);
    });
    return map;
  }

  function normalize(s) {
    return (s || "")
      .toLocaleLowerCase("tr")
      .replace(/ı/g, "i");
  }

  function matchesQuery(drug, q) {
    if (!q) return true;
    var haystack = [
      drug.etken, drug.pazar, drug.ozellikler, drug.endikasyon,
      drug.grup, drug.kategoriKisa
    ].join(" ");
    return normalize(haystack).indexOf(normalize(q)) !== -1;
  }

  function filteredDrugs() {
    return DRUG_DATA.filter(function (d) {
      if (state.activeCategory !== "all" && d.kategori !== state.activeCategory) return false;
      return matchesQuery(d, state.query);
    });
  }

  function multiline(text) {
    if (!text) return "";
    return text.split("\n").filter(Boolean);
  }

  // "Etiket: değer" gibi satırları kalın etiketle böler.
  function renderLabeledLines(text, containerClass) {
    var lines = multiline(text);
    if (!lines.length) return "";
    var html = lines.map(function (line) {
      var m = line.match(/^([^:]{2,40}):\s*(.+)$/);
      if (m) {
        return '<p class="info-line"><b>' + escapeHtml(m[1]) + ':</b> <span>' + escapeHtml(m[2]) + "</span></p>";
      }
      return '<p class="info-line">' + escapeHtml(line) + "</p>";
    }).join("");
    return '<div class="' + (containerClass || "") + '">' + html + "</div>";
  }

  // Standart doz alanını "Düşük Doz / Yüksek Doz" kartlarına ayırır.
  function renderDoseBlocks(text) {
    var lines = multiline(text);
    if (!lines.length) return "";
    return lines.map(function (line) {
      var m = line.match(/^(Düşük\/?Standart Doz|Yüksek Doz|Düşük Doz)\s*:\s*(.+)$/i);
      if (m) {
        return '<div class="dose-card"><p class="dose-label">' + escapeHtml(m[1]) + '</p><p>' + escapeHtml(m[2]) + "</p></div>";
      }
      return '<div class="dose-card"><p>' + escapeHtml(line) + "</p></div>";
    }).join("");
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function catColorVar(colorKey) {
    return "var(--cat-" + colorKey + ")";
  }
  function catBgVar(colorKey) {
    return "var(--cat-" + colorKey + "-bg)";
  }

  /* ---------------- Kategori çipleri ---------------- */

  function renderChips() {
    var chips = ['<button class="chip' + (state.activeCategory === "all" ? " active" : "") + '" data-cat="all">Tümü</button>'];
    CATEGORY_ORDER.forEach(function (cat) {
      var sample = DRUG_DATA.find(function (d) { return d.kategori === cat; });
      if (!sample) return;
      var active = state.activeCategory === cat;
      chips.push(
        '<button class="chip' + (active ? " active" : "") + '" data-cat="' + escapeHtml(cat) + '" style="' +
        (active ? "" : "border-color:" + catColorVar(sample.kategoriRenk) + "33") + '">' +
        '<span class="dot" style="background:' + (active ? "currentColor" : catColorVar(sample.kategoriRenk)) + '"></span>' +
        escapeHtml(sample.kategoriKisa) +
        "</button>"
      );
    });
    els.chipRow.innerHTML = chips.join("");
  }

  /* ---------------- Liste görünümü ---------------- */

  function renderList() {
    var drugs = filteredDrugs();
    var grouped = byCategory(drugs);
    var totalShown = drugs.length;

    els.resultCount.textContent = state.query || state.activeCategory !== "all"
      ? totalShown + " sonuç"
      : totalShown + " antibiyotik, 5 grup";

    els.emptyState.style.display = totalShown === 0 ? "block" : "none";

    var html = CATEGORY_ORDER.map(function (cat) {
      var items = grouped[cat] || [];
      if (!items.length) return "";
      var sample = items[0];
      var isOpen = state.query || state.activeCategory !== "all" || state.openCategories[cat];

      var rows = items.map(function (d) {
        var riskClass = RISK_CLASS[d.nefroSeviye] || "mid";
        return (
          '<button class="drug-row" data-slug="' + escapeHtml(d.slug) + '">' +
          '<span class="bar" style="background:' + catColorVar(d.kategoriRenk) + '"></span>' +
          '<span class="info">' +
          '<p class="name">' + escapeHtml(d.etken) + "</p>" +
          '<p class="brand">' + escapeHtml(d.pazar) + "</p>" +
          "</span>" +
          '<span class="risk-dot" title="Nefrotoksisite: ' + escapeHtml(d.nefroSeviye) + '" style="background:var(--risk-' + riskClass + ');color:var(--risk-' + riskClass + ')"></span>' +
          '<svg class="chevron-r" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
          "</button>"
        );
      }).join("");

      return (
        '<div class="category-block' + (isOpen ? " open" : "") + '" data-cat="' + escapeHtml(cat) + '">' +
        '<button class="category-head" data-toggle-cat="' + escapeHtml(cat) + '">' +
        '<span class="dot" style="background:' + catColorVar(sample.kategoriRenk) + '"></span>' +
        '<span class="cat-name">' + escapeHtml(sample.kategoriKisa) + "</span>" +
        '<span class="cat-count">' + items.length + "</span>" +
        '<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>' +
        "</button>" +
        '<div class="drug-list">' + rows + "</div>" +
        "</div>"
      );
    }).join("");

    els.categoryList.innerHTML = html;
  }

  /* ---------------- Detay görünümü ---------------- */

  function findDrug(slug) {
    return DRUG_DATA.find(function (d) { return d.slug === slug; });
  }

  function renderDetail(drug) {
    var riskClass = RISK_CLASS[drug.nefroSeviye] || "mid";

    els.hCat.textContent = drug.kategoriKisa;
    els.hCat.style.color = catColorVar(drug.kategoriRenk);
    els.hName.textContent = drug.etken;

    var brandPills = drug.pazar.split(",").map(function (b) {
      return '<span class="brand-pill">' + escapeHtml(b.trim()) + "</span>";
    }).join("");

    var html =
      '<div class="detail-hero">' +
      '<p class="group-label" style="color:' + catColorVar(drug.kategoriRenk) + '">' + escapeHtml(drug.kategoriKisa) + " · " + escapeHtml(drug.grup) + "</p>" +
      "<h2>" + escapeHtml(drug.etken) + "</h2>" +
      '<div class="brand-pills">' + brandPills + "</div>" +
      '<div class="badge-row">' +
      '<span class="risk-badge" style="background:var(--risk-' + riskClass + '-bg);color:var(--risk-' + riskClass + ')"><span class="dot"></span>Nefrotoksisite: ' + escapeHtml(drug.nefroSeviye) + "</span>" +
      "</div>" +
      "</div>" +

      '<div class="section">' +
      "<h3>Spektrum ve temel özellikler</h3>" +
      "<p>" + escapeHtml(drug.ozellikler) + "</p>" +
      "</div>" +

      '<div class="section">' +
      "<h3>Başlıca YBÜ endikasyonları</h3>" +
      "<p>" + escapeHtml(drug.endikasyon) + "</p>" +
      "</div>" +

      '<div class="section">' +
      "<h3>Standart doz (normal renal)</h3>" +
      renderDoseBlocks(drug.standartDoz) +
      "</div>" +

      '<div class="section">' +
      "<h3>Böbrek yetmezliğinde doz ayarı</h3>" +
      renderLabeledLines(drug.renalDoz) +
      "</div>" +

      '<div class="section">' +
      "<h3>Etkisiz olduğu durumlar / sınırlamalar</h3>" +
      '<div class="limitation-box">' + escapeHtml(drug.sinirlamalar) + "</div>" +
      "</div>" +

      '<div class="section">' +
      "<h3>En önemli yan etkiler</h3>" +
      "<p>" + escapeHtml(drug.yanEtki) + "</p>" +
      (drug.nefroNot ? '<p style="color:var(--risk-' + riskClass + ')">' + escapeHtml(drug.nefroNot) + "</p>" : "") +
      "</div>" +

      '<div class="section">' +
      "<h3>Eliminasyon ve atılım</h3>" +
      '<p class="eliminasyon-line">' + escapeHtml(drug.eliminasyon) + "</p>" +
      "</div>";

    els.detailBody.innerHTML = html;
    document.title = drug.etken + " — YBÜ Antibiyotik Rehberi";
  }

  /* ---------------- Yönlendirme (hash) ---------------- */

  function showList() {
    els.detailView.classList.remove("visible");
    els.listView.classList.remove("hidden");
    document.title = "YBÜ Antibiyotik Rehberi";
    window.scrollTo(0, 0);
  }

  function showDetail(slug) {
    var drug = findDrug(slug);
    if (!drug) { showList(); return; }
    renderDetail(drug);
    els.listView.classList.add("hidden");
    els.detailView.classList.add("visible");
    window.scrollTo(0, 0);
  }

  function handleRoute() {
    var hash = window.location.hash;
    var m = hash.match(/^#\/ilac\/(.+)$/);
    if (m) {
      showDetail(decodeURIComponent(m[1]));
    } else {
      showList();
    }
  }

  window.addEventListener("hashchange", handleRoute);

  /* ---------------- Olaylar ---------------- */

  els.search.addEventListener("input", function () {
    state.query = els.search.value;
    els.clearSearch.classList.toggle("visible", !!state.query);
    renderList();
  });

  els.clearSearch.addEventListener("click", function () {
    state.query = "";
    els.search.value = "";
    els.clearSearch.classList.remove("visible");
    els.search.focus();
    renderList();
  });

  els.chipRow.addEventListener("click", function (e) {
    var btn = e.target.closest(".chip");
    if (!btn) return;
    state.activeCategory = btn.getAttribute("data-cat");
    renderChips();
    renderList();
  });

  els.categoryList.addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-toggle-cat]");
    if (toggle) {
      var cat = toggle.getAttribute("data-toggle-cat");
      state.openCategories[cat] = !state.openCategories[cat];
      renderList();
      return;
    }
    var row = e.target.closest(".drug-row");
    if (row) {
      var slug = row.getAttribute("data-slug");
      window.location.hash = "#/ilac/" + slug;
    }
  });

  els.backBtn.addEventListener("click", function () {
    if (window.location.hash) {
      window.history.back();
    } else {
      showList();
    }
  });

  els.shareBtn.addEventListener("click", function () {
    var url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        var original = els.shareBtn.innerHTML;
        els.shareBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
        setTimeout(function () { els.shareBtn.innerHTML = original; }, 1200);
      }).catch(function () {});
    }
  });

  /* ---------------- Tema ---------------- */

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    var isDark = theme === "dark" || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    els.themeIconMoon.style.display = isDark ? "none" : "block";
    els.themeIconSun.style.display = isDark ? "block" : "none";
  }

  var savedTheme = localStorage.getItem("ybu-theme");
  applyTheme(savedTheme);

  els.themeToggle.addEventListener("click", function () {
    var current = localStorage.getItem("ybu-theme");
    var isDarkNow = current === "dark" || (!current && window.matchMedia("(prefers-color-scheme: dark)").matches);
    var next = isDarkNow ? "light" : "dark";
    localStorage.setItem("ybu-theme", next);
    applyTheme(next);
  });

  /* ---------------- Başlangıç ---------------- */

  renderChips();
  renderList();
  handleRoute();
})();
