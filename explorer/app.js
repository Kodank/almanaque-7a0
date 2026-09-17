(function () {
  var POS = {
    GOL: "Goleiro",
    ZAG: "Zagueiro",
    LD: "Lateral-direito",
    LE: "Lateral-esquerdo",
    VOL: "Volante",
    MC: "Meio-campista",
    MD: "Meia-direita",
    ME: "Meia-esquerda",
    MEI: "Meia-atacante",
    PD: "Ponta-direita",
    PE: "Ponta-esquerda",
    CA: "Centroavante"
  };
  var LINES = [
    { id: "gol", title: "Goleiros", codes: ["GOL"] },
    { id: "def", title: "Defesa", codes: ["ZAG", "LD", "LE"] },
    { id: "mid", title: "Meio-campo", codes: ["VOL", "MC", "MD", "ME", "MEI"] },
    { id: "att", title: "Ataque", codes: ["PD", "PE", "CA"] }
  ];
  var FLAGS = {
    ALG: "🇩🇿", ARG: "🇦🇷", AUS: "🇦🇺", AUT: "🇦🇹", BEL: "🇧🇪", BRA: "🇧🇷",
    BUL: "🇧🇬", CAN: "🇨🇦", CHI: "🇨🇱", CIV: "🇨🇮", CMR: "🇨🇲", COL: "🇨🇴",
    CPV: "🇨🇻", CRC: "🇨🇷", CRO: "🇭🇷", CZE: "🇨🇿", DEN: "🇩🇰", ECU: "🇪🇨",
    EGY: "🇪🇬", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", ESP: "🇪🇸", FRA: "🇫🇷", GER: "🇩🇪", GHA: "🇬🇭",
    GRE: "🇬🇷", HUN: "🇭🇺", IRL: "🇮🇪", ITA: "🇮🇹", JPN: "🇯🇵", KOR: "🇰🇷",
    MAR: "🇲🇦", MEX: "🇲🇽", NED: "🇳🇱", NGA: "🇳🇬", NIR: "🇬🇧", NOR: "🇳🇴",
    PAR: "🇵🇾", PER: "🇵🇪", POL: "🇵🇱", POR: "🇵🇹", ROU: "🇷🇴", RSA: "🇿🇦",
    RUS: "🇷🇺", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", SEN: "🇸🇳", SRB: "🇷🇸", SUI: "🇨🇭", SWE: "🇸🇪",
    TCH: "🇨🇿", TUR: "🇹🇷", UKR: "🇺🇦", URS: "🇷🇺", URU: "🇺🇾", USA: "🇺🇸",
    WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", YUG: "🇷🇸"
  };

  var data = window.S70;
  if (!data) {
    document.body.innerHTML = "<p style='padding:40px'>Não achei explorer/data.js. Rode <code>python scripts/export_explorer.py</code>.</p>";
    return;
  }

  var teamsByCode = {};
  data.teams.forEach(function (t) { teamsByCode[t.c] = t; });
  var byPlayer = {};
  data.players.forEach(function (p) {
    if (!byPlayer[p.i]) byPlayer[p.i] = [];
    byPlayer[p.i].push(p);
  });

  var state = {
    view: "buscar",
    q: "",
    team: "",
    cup: "",
    pos: "",
    minOvr: 64,
    legends: false,
    foot: "",
    limit: 80,
    teamBrowse: "",
    cupBrowse: null
  };

  var $ = function (id) { return document.getElementById(id); };

  function norm(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
  function teamName(code) {
    return (teamsByCode[code] && teamsByCode[code].pt) || code;
  }
  function flag(code) { return FLAGS[code] || "🏳️"; }
  function posName(code) { return POS[code] || code || "—"; }
  function footLabel(f) {
    if (f === "destro") return "Destro";
    if (f === "canhoto") return "Canhoto";
    if (f === "ambos") return "Ambos";
    return "";
  }
  function footPill(f) {
    var lab = footLabel(f);
    if (!lab) return "";
    return "<span class='foot-pill foot-" + esc(f) + "'>" + lab + "</span>";
  }
  function ovrClass(n) {
    if (n >= 97) return "ovr ovr-99";
    if (n >= 93) return "ovr ovr-96";
    if (n >= 88) return "ovr ovr-92";
    if (n >= 80) return "ovr ovr-87";
    return "ovr ovr-low";
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fillFilters() {
    var cups = [];
    data.players.forEach(function (p) {
      if (cups.indexOf(p.y) === -1) cups.push(p.y);
    });
    cups.sort(function (a, b) { return a - b; });

    var teamSel = $("f-team");
    var cupSel = $("f-cup");
    var posSel = $("f-pos");
    data.teams.forEach(function (t) {
      teamSel.appendChild(new Option(t.pt, t.c));
    });
    cups.forEach(function (y) { cupSel.appendChild(new Option(String(y), String(y))); });
    Object.keys(POS).forEach(function (code) {
      posSel.appendChild(new Option(POS[code], code));
    });

    $("stat-players").textContent = data.players.length.toLocaleString("pt-BR");
    $("stat-unique").textContent = Object.keys(byPlayer).length.toLocaleString("pt-BR");
    $("stat-squads").textContent = data.squads.length.toLocaleString("pt-BR");
    $("stat-legends").textContent = data.players.filter(function (p) { return p.l; }).length.toLocaleString("pt-BR");
  }

  function matches(p) {
    if (state.team && p.t !== state.team) return false;
    if (state.cup && p.y !== Number(state.cup)) return false;
    if (state.pos && p.p.indexOf(state.pos) === -1) return false;
    if (p.o < state.minOvr) return false;
    if (state.legends && !p.l) return false;
    if (state.foot && p.f !== state.foot) return false;
    if (state.q) {
      var q = norm(state.q);
      var blob = norm(p.n + " " + p.i + " " + teamName(p.t) + " " + p.t + " " + p.y + " " + footLabel(p.f));
      if (blob.indexOf(q) === -1) return false;
    }
    return true;
  }

  function filtered() {
    return data.players.filter(matches);
  }

  function renderTabs() {
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === state.view);
    });
  }

  function renderBuscar() {
    var rows = filtered();
    var shown = rows.slice(0, state.limit);
    $("count").textContent = rows.length.toLocaleString("pt-BR") + " resultados";
    if (!shown.length) {
      $("main").innerHTML = "<div class='empty'>Nenhum jogador com esses filtros.</div>";
      return;
    }
    var html = "<div class='table-wrap'><table class='tbl tbl-search'><thead><tr>" +
      "<th>OVR</th><th>Jogador</th><th>Posição</th><th>Seleção</th><th class='hide-sm'>Copa</th><th></th>" +
      "</tr></thead><tbody>";
    shown.forEach(function (p) {
      html += "<tr data-id='" + esc(p.i) + "' data-y='" + p.y + "' data-t='" + esc(p.t) + "'>" +
        "<td><span class='" + ovrClass(p.o) + "'>" + p.o + "</span></td>" +
        "<td><div class='name'>" + esc(p.n) + "</div><div class='meta'>#" + (p.k || "—") + "</div></td>" +
        "<td><span class='pos-pill'>" + esc(posName(p.p[0])) + "</span>" + footPill(p.f) + "</td>" +
        "<td>" + flag(p.t) + " " + esc(teamName(p.t)) + "</td>" +
        "<td class='hide-sm num'>" + p.y + "</td>" +
        "<td>" + (p.l ? "<span class='star' title='Lenda'>★</span>" : "") + "</td>" +
        "</tr>";
    });
    html += "</tbody></table></div>";
    if (rows.length > shown.length) {
      html += "<button class='more' id='more'>Mostrar mais (" +
        (rows.length - shown.length).toLocaleString("pt-BR") + " restantes)</button>";
    }
    $("main").innerHTML = html;
  }

  function renderRanking() {
    var rows = filtered().slice();
    rows.sort(function (a, b) { return b.o - a.o || a.n.localeCompare(b.n); });
    state.view = "ranking";
    var shown = rows.slice(0, state.limit);
    $("count").textContent = "Top " + shown.length + " de " + rows.length.toLocaleString("pt-BR");
    var html = "<div class='table-wrap'><table class='tbl tbl-rank'><thead><tr>" +
      "<th>#</th><th>OVR</th><th>Jogador</th><th>Seleção / Copa</th><th></th></tr></thead><tbody>";
    shown.forEach(function (p, i) {
      html += "<tr data-id='" + esc(p.i) + "' data-y='" + p.y + "' data-t='" + esc(p.t) + "'>" +
        "<td class='num meta'>" + (i + 1) + "</td>" +
        "<td><span class='" + ovrClass(p.o) + "'>" + p.o + "</span></td>" +
        "<td><div class='name'>" + esc(p.n) + "</div><div class='meta'>" + esc(posName(p.p[0])) +
        (p.f ? " · " + footLabel(p.f) : "") + "</div></td>" +
        "<td>" + flag(p.t) + " " + esc(teamName(p.t)) + " · " + p.y + "</td>" +
        "<td>" + (p.l ? "<span class='star'>★</span>" : "") + "</td></tr>";
    });
    html += "</tbody></table></div>";
    if (rows.length > shown.length) {
      html += "<button class='more' id='more'>Mostrar mais</button>";
    }
    $("main").innerHTML = html;
  }

  function squadMeta(code, year) {
    for (var i = 0; i < data.squads.length; i++) {
      if (data.squads[i].t === code && data.squads[i].y === year) return data.squads[i];
    }
    return null;
  }

  function renderElencos() {
    $("count").textContent = "";
    if (!state.teamBrowse) {
      var q = norm(state.q);
      var html = "<div class='grid'>";
      data.teams.forEach(function (t) {
        var cups = data.squads.filter(function (s) { return s.t === t.c; });
        if (q && norm(t.pt + " " + t.c).indexOf(q) === -1) return;
        html += "<button class='card' data-open-team='" + esc(t.c) + "'>" +
          "<div class='flag'>" + flag(t.c) + "</div>" +
          "<h3>" + esc(t.pt) + "</h3>" +
          "<div class='sub'>" + cups.length + " Copa" + (cups.length === 1 ? "" : "s") + "</div></button>";
      });
      html += "</div>";
      $("main").innerHTML = html;
      return;
    }

    if (!state.cupBrowse) {
      var cups = data.squads.filter(function (s) { return s.t === state.teamBrowse; })
        .sort(function (a, b) { return b.y - a.y; });
      var html = "<button class='back' id='back-teams'>← Todas as seleções</button>" +
        "<div class='squad-head'><div><h2>" + flag(state.teamBrowse) + " " +
        esc(teamName(state.teamBrowse)) + "</h2><p class='meta'>Escolha a Copa para ver o elenco</p></div></div>" +
        "<div class='grid'>";
      cups.forEach(function (s) {
        html += "<button class='card' data-open-cup='" + s.y + "'>" +
          "<div class='cup-row'><h3>" + s.y + "</h3><span class='" + ovrClass(Math.round(s.avg)) + "'>" +
          s.avg.toFixed(0) + "</span></div>" +
          "<div class='sub'>" + s.n + " jogadores · " + s.lg + " lenda" + (s.lg === 1 ? "" : "s") +
          " · máximo " + s.mx + "</div></button>";
      });
      html += "</div>";
      $("main").innerHTML = html;
      return;
    }

    var year = state.cupBrowse;
    var squad = data.players.filter(function (p) {
      return p.t === state.teamBrowse && p.y === year;
    }).sort(function (a, b) { return b.o - a.o; });
    var meta = squadMeta(state.teamBrowse, year);
    var html = "<button class='back' id='back-cups'>← " + esc(teamName(state.teamBrowse)) + "</button>" +
      "<div class='squad-head'><div><h2>" + flag(state.teamBrowse) + " " +
      esc(teamName(state.teamBrowse)) + " " + year + "</h2>" +
      "<p class='meta'>" + squad.length + " jogadores" +
      (meta ? " · média " + meta.avg.toFixed(1) + " · " + meta.lg + " lendas" : "") +
      "</p></div></div>";

    LINES.forEach(function (line) {
      var group = squad.filter(function (p) { return line.codes.indexOf(p.p[0]) !== -1; });
      if (!group.length) return;
      html += "<section class='line'><h3>" + line.title + "</h3>";
      group.forEach(function (p) {
        html += "<div class='player-row' data-id='" + esc(p.i) + "' data-y='" + p.y + "' data-t='" + esc(p.t) + "'>" +
          "<span class='" + ovrClass(p.o) + "'>" + p.o + "</span>" +
          "<span class='meta'>#" + (p.k || "—") + "</span>" +
          "<div><div class='name'>" + esc(p.n) + (p.l ? " <span class='star'>★</span>" : "") +
          "</div><div class='meta'>" + p.p.map(posName).join(" · ") + "</div></div>" +
          "<span>" +
          "<span class='pos-pill'>" + esc(posName(p.p[0])) + "</span>" +
          footPill(p.f) +
          "</span></div>";
      });
      html += "</section>";
    });
    $("main").innerHTML = html;
  }

  function openPlayer(id) {
    var career = (byPlayer[id] || []).slice().sort(function (a, b) { return a.y - b.y; });
    if (!career.length) return;
    var best = career.reduce(function (a, b) { return a.o >= b.o ? a : b; });
    $("drawer").innerHTML =
      "<button class='close' id='close-drawer'>Fechar</button>" +
      "<div class='eyebrow'>" + flag(best.t) + " " + esc(teamName(best.t)) + "</div>" +
      "<h2>" + esc(best.n) + (career.some(function (p) { return p.l; }) ? " <span class='star'>★</span>" : "") + "</h2>" +
      "<p class='meta'>Melhor overall: <b>" + best.o + "</b> em " + best.y +
      " · " + career.length + " Copa" + (career.length === 1 ? "" : "s") +
      (best.f ? " · " + footLabel(best.f) : "") + "</p>" +
      "<div class='career'>" +
      career.map(function (p) {
        return "<div class='career-item'>" +
          "<div class='num'><b>" + p.y + "</b></div>" +
          "<div>" + flag(p.t) + " " + esc(teamName(p.t)) +
          "<div class='meta'>" + p.p.map(posName).join(" · ") +
          (p.k ? " · #" + p.k : "") +
          (p.f ? " · " + footLabel(p.f) : "") + "</div></div>" +
          "<div><span class='" + ovrClass(p.o) + "'>" + p.o + "</span>" +
          (p.l ? " <span class='star'>★</span>" : "") + "</div></div>";
      }).join("") + "</div>";
    $("drawer").classList.add("open");
    $("drawer-bg").classList.add("open");
  }

  function closePlayer() {
    $("drawer").classList.remove("open");
    $("drawer-bg").classList.remove("open");
  }

  function render() {
    renderTabs();
    var box = $("filters-box");
    var elencos = state.view === "elencos";
    if (box) {
      box.hidden = elencos;
      if (!elencos && window.matchMedia("(min-width: 721px)").matches) box.open = true;
    }
    $("filters").style.display = elencos ? "none" : "flex";
    if (state.view === "buscar") renderBuscar();
    else if (state.view === "ranking") renderRanking();
    else renderElencos();
  }

  function bind() {
    if (window.matchMedia("(min-width: 721px)").matches) {
      $("filters-box").open = true;
    }
    $("q").addEventListener("input", function (e) {
      state.q = e.target.value;
      state.limit = 80;
      render();
    });
    $("f-team").addEventListener("change", function (e) { state.team = e.target.value; state.limit = 80; render(); });
    $("f-cup").addEventListener("change", function (e) { state.cup = e.target.value; state.limit = 80; render(); });
    $("f-pos").addEventListener("change", function (e) { state.pos = e.target.value; state.limit = 80; render(); });
    $("f-foot").addEventListener("change", function (e) { state.foot = e.target.value; state.limit = 80; render(); });
    $("f-ovr").addEventListener("input", function (e) {
      state.minOvr = Number(e.target.value);
      $("f-ovr-label").textContent = state.minOvr + "+";
      state.limit = 80;
      render();
    });
    $("f-legends").addEventListener("change", function (e) {
      state.legends = e.target.checked;
      state.limit = 80;
      render();
    });
    document.querySelectorAll(".tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.view = btn.getAttribute("data-view");
        state.limit = 80;
        if (state.view !== "elencos") {
          state.teamBrowse = "";
          state.cupBrowse = null;
        }
        render();
      });
    });
    $("main").addEventListener("click", function (e) {
      var more = e.target.closest("#more");
      if (more) { state.limit += 80; render(); return; }
      var backT = e.target.closest("#back-teams");
      if (backT) { state.teamBrowse = ""; state.cupBrowse = null; render(); return; }
      var backC = e.target.closest("#back-cups");
      if (backC) { state.cupBrowse = null; render(); return; }
      var team = e.target.closest("[data-open-team]");
      if (team) { state.teamBrowse = team.getAttribute("data-open-team"); state.cupBrowse = null; render(); return; }
      var cup = e.target.closest("[data-open-cup]");
      if (cup) { state.cupBrowse = Number(cup.getAttribute("data-open-cup")); render(); return; }
      var row = e.target.closest("[data-id]");
      if (row) openPlayer(row.getAttribute("data-id"));
    });
    $("drawer-bg").addEventListener("click", closePlayer);
    $("drawer").addEventListener("click", function (e) {
      if (e.target.id === "close-drawer") closePlayer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePlayer();
      if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
        e.preventDefault();
        $("q").focus();
      }
    });
  }

  fillFilters();
  bind();
  render();
})();
