/* SPORTS PRESENSE 웹 화면
   - data/*.json 만 읽어서 그림 (종목과 무관한 공통 틀)
   - 종목 전용 내용은 PANELS 에 type 별 그리기 함수를 등록 */
(() => {
  "use strict";
  const app = document.getElementById("app");
  const BASE = (document.querySelector('meta[name="data-base"]') || {}).content || "data/";
  const S = { index: null, cache: {}, league: "kbo", lineupSide: null };

  /* ───────── 공통 도구 ───────── */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pct = (p, d = 1) => (p == null || isNaN(p) ? "–" : (p * 100).toFixed(d) + "%");
  const f2 = (x, d = 2) => (x == null || isNaN(x) ? "–" : Number(x).toFixed(d));
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  const dt = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const fdate = (s, long) => { const d = dt(s); const t = `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`; return long ? `${d.getFullYear()}.${t} ${DOW[d.getDay()]}요일` : `${t} (${DOW[d.getDay()]})`; };
  const today = () => { try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }); } catch (e) { return new Date().toISOString().slice(0, 10); } };
  const stamp = (iso) => iso ? iso.slice(0, 16).replace("T", " ").replace(/-/g, ".") : "";
  const zero = (v) => (v ? `${v}` : '<span class="muted">–</span>');

  async function load(path) {
    if (S.cache[path]) return S.cache[path];
    const r = await fetch(BASE + path, { cache: "no-cache" });
    if (!r.ok) throw new Error(path);
    const d = await r.json();
    S.cache[path] = d;
    return d;
  }
  const tryLoad = (p) => load(p).catch(() => null);

  /* 팀 색: 너무 어두우면 테마별 대체색, 두 팀이 비슷하면 원정팀을 중립색으로 */
  const rgb = (h) => { const n = parseInt(h.replace("#", ""), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lum = (h) => { const [r, g, b] = rgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const near = (a, b) => { const x = rgb(a), y = rgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) < 90; };
  function pair(home, away) {
    const fix = (c) => (lum(c) < 0.08 ? "var(--dark-team)" : c);
    const h = fix(home.color), a = fix(away.color);
    const clash = (h === a) || (h[0] === "#" && a[0] === "#" && near(home.color, away.color));
    return { home: h, away: clash ? "var(--neutral-team)" : a };
  }
  const tchip = (t, big) => `<span class="tchip${big ? " lg" : ""}" style="--tc:${esc(t.color)}" aria-label="${esc(t.name)}">${esc(t.id)}</span>`;
  const sampleChip = (on) => (on ? '<span class="chip sample" title="미리보기용 예시 수치">예시 데이터</span>' : "");

  /* ───────── 라우팅 ───────── */
  // #  /  #kbo  /  #g.kbo.20261018LGHT0  /  #record.kbo  /  #teams.kbo  /  #method
  function route() {
    const h = (location.hash || "").replace(/^#/, "");
    const p = h.split(".");
    if (p[0] === "g" && p[2]) return { view: "game", league: p[1], id: p[2] };
    if (p[0] === "record") return { view: "record", league: p[1] || S.league };
    if (p[0] === "teams") return { view: "teams", league: p[1] || S.league };
    if (p[0] === "method") return { view: "method" };
    if (p[0] && S.index && S.index.leagues.some((l) => l.id === p[0])) return { view: "home", league: p[0] };
    return { view: "home", league: S.league };
  }
  const go = (hash) => { if (location.hash === hash) render(); else location.hash = hash; };

  /* ───────── 뼈대 ───────── */
  function shell() {
    const idx = S.index;
    const r = route();
    const cur = r.league || S.league;
    const nav = [["home", `#${cur}`, "경기 예측"], ["record", `#record.${cur}`, "적중 기록"], ["teams", `#teams.${cur}`, "팀 전력"], ["method", "#method", "예측 방식"]];
    document.getElementById("top").innerHTML = `
      <header class="topbar gutter"><div class="wrap">
        <a class="brand" href="#${cur}"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">${esc(idx.brand.name)}</span></a>
        <nav class="nav" aria-label="주요 메뉴">${nav.map(([v, href, label]) => `<a href="${href}"${r.view === v ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      </div></header>
      ${r.view === "method" ? "" : `<div class="leaguebar gutter"><div class="wrap" role="group" aria-label="리그 선택">
        ${idx.leagues.map((l) => `<button class="lg-tab" data-lg="${l.id}" aria-pressed="${l.id === cur}"><span class="dot${l.status === "live" ? " live" : ""}"></span>${esc(l.name)} <small>${l.status === "live" ? esc(l.label) : "준비 중"}</small></button>`).join("")}
      </div></div>`}`;
    document.querySelectorAll(".lg-tab").forEach((b) => b.addEventListener("click", () => {
      S.league = b.dataset.lg;
      const v = route().view;
      go(v === "record" ? `#record.${S.league}` : v === "teams" ? `#teams.${S.league}` : `#${S.league}`);
    }));
  }

  async function render() {
    const r = route();
    if (r.league) S.league = r.league;
    shell();
    app.innerHTML = '<div class="loading">불러오는 중…</div>';
    const lg = S.index.leagues.find((l) => l.id === S.league);
    try {
      if (r.view === "method") app.innerHTML = viewMethod();
      else if (lg && lg.status !== "live") app.innerHTML = viewSoon(lg, r.view);
      else if (r.view === "game") app.innerHTML = await viewGame(r.league, r.id);
      else if (r.view === "record") app.innerHTML = await viewRecord(r.league);
      else if (r.view === "teams") app.innerHTML = await viewTeams(r.league);
      else app.innerHTML = await viewHome(S.league);
    } catch (e) {
      app.innerHTML = `<div class="empty"><strong>데이터를 불러오지 못했어요</strong>잠시 후 새로고침해 주세요. (${esc(e.message)})</div>`;
    }
    bind();
    window.scrollTo(0, 0);
  }

  function bind() {
    app.querySelectorAll("[data-side]").forEach((b) => b.addEventListener("click", () => {
      S.lineupSide = b.dataset.side;
      app.querySelectorAll("[data-side]").forEach((x) => x.setAttribute("aria-pressed", x === b));
      app.querySelectorAll("[data-lineup]").forEach((t) => (t.hidden = t.dataset.lineup !== b.dataset.side));
    }));
  }

  /* ───────── 확률 막대 ───────── */
  function pbar(g, win) {
    const c = pair(g.home, g.away);
    const fa = win.away > win.home;
    return `<div class="pbar">
      <div class="pbar-labels">
        <span class="${fa ? "fav" : ""}">${esc(g.away.id)} <span class="num">${pct(win.away)}</span></span>
        <span class="${fa ? "" : "fav"}"><span class="num">${pct(win.home)}</span> ${esc(g.home.id)}</span>
      </div>
      <div class="pbar-track" role="img" aria-label="${esc(g.away.id)} ${pct(win.away)}, ${esc(g.home.id)} ${pct(win.home)}">
        <span style="width:${win.away * 100}%;background:${c.away}"></span><span style="width:${win.home * 100}%;background:${c.home}"></span>
      </div></div>`;
  }

  /* ───────── 홈 ───────── */
  async function viewHome(lgId) {
    const idx = S.index;
    const rec = idx.records[lgId] || {};
    const bt = rec.backtest || {};
    const games = idx.games.filter((g) => g.league === lgId);
    const t = today();
    let focus = games.filter((g) => g.date === t);
    let focusLabel = "오늘의 예측";
    if (!focus.length && games.length) { const d = games[0].date; focus = games.filter((g) => g.date === d); focusLabel = `최근 예측 · ${fdate(d)}`; }
    const past = games.filter((g) => !focus.includes(g));
    const up = (idx.upcoming || []).filter((g) => g.league === lgId || !g.league);
    const offN = rec.games || 0;
    return `
      <section class="hero">
        <div class="hero-top"><div>
          <div class="eyebrow">${fdate(t, true)} · KBO 리그</div>
          <h1 style="margin-top:8px">경기 전에 공개하고,<br>끝나면 그대로 채점합니다</h1>
          <p class="lead">승리 확률, 예상 스코어, 선발투수와 타자별 예상 기록까지. 모든 예측은 경기 시작 전에 시각이 기록된 채로 공개되고, 맞든 틀리든 지우지 않습니다.</p>
        </div></div>
        <div class="ledger">
          <div class="official"><span class="k">공식 기록 · 경기 전 발행분</span><span class="v">${offN ? `${rec.wins}<small>/ ${offN}경기</small>` : "집계 시작"}</span><span class="s">${offN ? `승리 예측 적중률 ${pct(rec.acc)}` : "2026 준플레이오프 2차전부터"}</span></div>
          <div><span class="k">${bt.season || ""} 시즌 백테스트 적중률</span><span class="v">${pct(bt.acc)}</span><span class="s">${bt.games ? `${bt.games}경기 · 경기 전 정보만 사용` : ""}</span></div>
          <div><span class="k">확률 정확도 (로그손실)</span><span class="v">${f2(bt.logloss, 3)}</span><span class="s">낮을수록 정확 · 동전 던지기 0.693</span></div>
          <div><span class="k">안타 확률 1위 선수 적중</span><span class="v">${pct(bt.top1_rate)}</span><span class="s">${bt.streak ? `최장 ${bt.streak}일 연속` : ""}</span></div>
        </div>
      </section>
      <section class="section">
        <div class="section-head"><h2>${focusLabel}</h2><p>카드를 누르면 스코어 분포·선수별 예상 기록·시리즈 전망을 볼 수 있어요</p></div>
        ${focus.length ? `<div class="gcards">${focus.map(gameCard).join("")}</div>` : `<div class="empty"><strong>오늘은 예측할 경기가 없어요</strong>선발투수가 발표되면 경기 3시간 전쯤 자동으로 올라옵니다.</div>`}
      </section>
      ${up.length ? `<section class="section"><div class="section-head"><h2>다가오는 경기</h2><p>선발 발표 후 예측이 열립니다</p></div>
        <div class="panel flush upcoming">${up.map(upRow).join("")}</div></section>` : ""}
      ${past.length ? `<section class="section"><div class="section-head"><h2>지난 예측</h2><a class="muted" href="#record.${lgId}" style="font-size:13px">전체 적중 기록 →</a></div>
        <div class="gcards">${past.slice(0, 9).map(gameCard).join("")}</div></section>` : ""}`;
  }

  function gameCard(g) {
    const fin = g.status === "final" && g.result;
    const win = g.win || { home: 0.5, away: 0.5 };
    const st = g.stage && g.stage.kind === "postseason" ? `${esc(g.stage.name)}${g.stage.game_no ? ` ${g.stage.game_no}차전` : ""}` : "정규시즌";
    let chip = g.official ? '<span class="chip official">경기 전 공개</span>' : '<span class="chip">참고용 · 경기 중 공개</span>';
    if (fin && g.result.graded && g.result.graded.win_ok != null) chip = g.result.graded.win_ok ? '<span class="chip ok">적중</span>' : '<span class="chip miss">빗나감</span>';
    const sp = g.starters || {};
    return `<a class="gcard" href="#g.${g.league}.${g.id}">
      <div class="gcard-top"><span class="eyebrow">${st} · ${fdate(g.date)} ${esc(g.start || "")}</span>${chip}</div>
      <div class="gcard-teams">
        <div class="gteam">${tchip(g.away)}<span class="nm">${esc(g.away.name)}</span><span class="sp">${sp.away ? `선발 ${esc(sp.away)}` : "원정"}</span></div>
        <div class="gscore">${fin ? `<span>${g.result.away}</span><i>:</i><span>${g.result.home}</span>` : `<div><div style="display:flex;gap:10px;align-items:center"><span>${f2(g.score?.away, 1)}</span><i>:</i><span>${f2(g.score?.home, 1)}</span></div><span class="exp">예상 득점</span></div>`}</div>
        <div class="gteam home">${tchip(g.home)}<span class="nm">${esc(g.home.name)}</span><span class="sp">${sp.home ? `선발 ${esc(sp.home)}` : "홈"}</span></div>
      </div>
      ${pbar(g, win)}
      ${g.headline ? `<div class="gcard-head">${esc(g.headline)}</div>` : ""}
      <div class="gcard-foot"><span>${esc(g.venue || "")}${g.series ? ` · 시리즈 ${esc(g.series.top)} ${g.series.state[0]}-${g.series.state[1]} ${esc(g.series.bottom)}` : ""}</span><span>${g.published_at ? `공개 ${stamp(g.published_at).slice(5)}` : ""}</span></div>
    </a>`;
  }

  function upRow(g) {
    return `<div class="up-row"><div class="when">${fdate(g.date)}<small>${esc(g.start || "")} · ${esc(g.venue || "")}</small></div>
      <div class="vs">${tchip(g.away)} <span class="muted" style="font-weight:400">vs</span> ${tchip(g.home)} <span style="font-weight:500">${esc(g.title || "")}</span></div>
      <span class="chip">예측 대기</span></div>`;
  }

  /* ───────── 경기 상세 ───────── */
  async function viewGame(lgId, id) {
    const g = await load(`${lgId}/games/${id}.json`);
    const P = g.prediction, c = pair(g.home, g.away);
    const fin = g.status === "final" && g.result;
    const st = g.stage && g.stage.kind === "postseason" ? `${g.stage.name}${g.stage.game_no ? ` ${g.stage.game_no}차전` : ""}` : "정규시즌";
    const repo = S.index.brand.repo;
    const proof = repo ? `<a href="https://github.com/${esc(repo)}/commits/main/docs/data/${esc(lgId)}/games/${esc(id)}.json" target="_blank" rel="noopener">변경 이력 보기</a>` : "";
    const sp = g.starters || {};
    const panels = (g.panels || []).map((p) => (PANELS[p.type] ? PANELS[p.type](p, g, c) : "")).join("");
    return `
      <div class="crumbs"><a href="#${lgId}">경기 예측</a><span>/</span><span>${esc(g.title)}</span></div>
      <article class="match">
        <div class="match-band"><span style="background:${c.away}"></span><span style="background:${c.home}"></span></div>
        <div class="match-body">
          <div class="match-meta">
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="eyebrow">${esc(st)} · ${fdate(g.date, true)} ${esc(g.start || "")} · ${esc(g.venue || "")}</span></div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${g.official ? '<span class="chip official">경기 전 공개 · 공식 기록</span>' : '<span class="chip">경기 시작 후 공개 · 공식 기록 제외</span>'}${fin ? '<span class="chip">경기 종료</span>' : ""}</div>
          </div>
          <div class="match-teams">
            <div class="mteam">${tchip(g.away, true)}<div><div class="nm">${esc(g.away.name)}</div><div class="sub">원정 · 선발 ${esc(sp.away || "미발표")}</div></div></div>
            <div class="mcenter">${fin ? `<div class="big">${g.result.away}<i>:</i>${g.result.home}</div><div class="cap">최종 스코어 · 예상 ${f2(P.score.away, 1)} : ${f2(P.score.home, 1)}</div>` : `<div class="big">${f2(P.score.away, 1)}<i>:</i>${f2(P.score.home, 1)}</div><div class="cap">예상 득점</div>`}</div>
            <div class="mteam home">${tchip(g.home, true)}<div><div class="nm">${esc(g.home.name)}</div><div class="sub">홈 · 선발 ${esc(sp.home || "미발표")}</div></div></div>
          </div>
          ${pbar(g, P.win)}
          ${P.headline ? `<div class="headline">${esc(P.headline)}</div>` : ""}
          <div class="proof"><span class="mono">예측 공개 ${stamp(g.published_at)} KST</span>${proof ? `<span>·</span>${proof}` : ""}<span>·</span><span>공개 이후 예측값은 수정하지 않습니다</span></div>
        </div>
      </article>
      ${fin ? resultSection(g, c) : ""}
      ${scoreSection(g, c)}
      ${factorSection(g, c)}
      ${panels}
      ${g.series ? seriesSection(g, c) : ""}`;
  }

  function resultSection(g, c) {
    const R = g.result, gr = R.graded || {};
    const fav = g.prediction.win.home >= 0.5 ? g.home : g.away;
    const top = R.hit_top5 || [];
    return `<section class="section">
      <div class="section-head"><h2>결과 채점</h2>${R.graded_at ? `<p>채점 ${stamp(R.graded_at)}</p>` : ""}</div>
      <div class="kv">
        <div><span class="k">승리 예측</span><span class="v">${esc(fav.id)} ${pct(Math.max(g.prediction.win.home, g.prediction.win.away))}</span><span class="${gr.win_ok ? "mark ok" : "mark miss"}">${gr.win_ok == null ? "무승부" : gr.win_ok ? "적중" : "빗나감"}</span></div>
        <div><span class="k">예상 → 실제 (${esc(g.away.id)}:${esc(g.home.id)})</span><span class="v">${f2(g.prediction.score.away, 1)}:${f2(g.prediction.score.home, 1)} <small>→ ${R.away}:${R.home}</small></span></div>
        <div><span class="k">Brier 점수</span><span class="v">${f2(gr.brier, 3)}</span><span class="k">0에 가까울수록 정확</span></div>
        <div><span class="k">안타 확률 TOP 5</span><span class="v">${top.filter((x) => x.ok).length}<small>/ ${top.length}명 안타</small></span></div>
      </div>
      ${top.length ? `<div class="panel flush"><div class="tablewrap"><table class="box"><thead><tr><th class="l">순위</th><th class="l">선수</th><th>안타 확률</th><th>실제 기록</th><th>채점</th></tr></thead><tbody>
        ${top.map((x, i) => `<tr><td class="order l">${i + 1}</td><td class="l name">${esc(x.name)} <span class="muted" style="font-weight:400">${esc(x.team)}</span></td><td>${pct(x.p, 0)}</td><td class="act">${esc(x.actual)}</td><td><span class="mark ${x.ok ? "ok" : "miss"}">${x.ok ? "O" : "X"}</span></td></tr>`).join("")}
      </tbody></table></div></div>` : ""}
    </section>`;
  }

  function scoreSection(g, c) {
    const P = g.prediction;
    if (!P.grid) return "";
    const m = P.margin || {};
    const tot = P.totals || {};
    const best = (P.top_scores || [])[0];
    return `<section class="section">
      <div class="section-head"><h2>스코어 분포</h2><p>두 팀 득점이 각각 몇 점일지 확률로 계산한 결과</p></div>
      <div class="kv">
        <div><span class="k">예상 총득점</span><span class="v">${f2(tot.mean, 1)}<small>점</small></span></div>
        <div><span class="k">가장 유력한 스코어</span><span class="v">${best ? `${best.away}:${best.home}` : "–"}<small>${best ? pct(best.p) : ""}</small></span></div>
        <div><span class="k">1점 차 승부</span><span class="v">${pct(m.one_run, 0)}</span></div>
        <div><span class="k">${esc(g.home.id)} 3점 차 이상 승</span><span class="v">${pct(m.home_by_3plus, 0)}</span></div>
        <div><span class="k">${esc(g.away.id)} 3점 차 이상 승</span><span class="v">${pct(m.away_by_3plus, 0)}</span></div>
      </div>
      <div class="grid-2">
        <div class="panel" style="display:grid;gap:12px">
          <div class="section-head"><h3>스코어별 확률</h3><div class="legend"><span><i style="--c:${c.away}"></i>${esc(g.away.id)} 승</span><span><i style="--c:${c.home}"></i>${esc(g.home.id)} 승</span></div></div>
          ${heatmap(P.grid, g, c)}
          <p class="chart-note">가로는 ${esc(g.away.id)}(원정), 세로는 ${esc(g.home.id)}(홈) 득점. 색이 진할수록 나올 가능성이 높은 스코어예요.</p>
        </div>
        <div style="display:grid;gap:16px;align-content:start;min-width:0">
          <div class="panel" style="display:grid;gap:12px"><h3>유력 스코어 TOP 6</h3>
            <div class="topscores">${(P.top_scores || []).map((s) => { const hw = s.home > s.away; const mx = P.top_scores[0].p; return `<div class="ts-row"><span class="sc">${esc(g.away.id)} ${s.away}:${s.home} ${esc(g.home.id)}</span><span class="bar"><span style="width:${(s.p / mx) * 100}%;--c:${hw ? c.home : c.away}"></span></span><span class="p">${pct(s.p)}</span></div>`; }).join("")}</div>
          </div>
          <div class="panel" style="display:grid;gap:10px"><h3>총득점 분포</h3>${totalsChart(tot)}<p class="chart-note">점선은 예상 총득점 ${f2(tot.mean, 1)}점</p></div>
        </div>
      </div>
    </section>`;
  }

  function heatmap(grid, g, c) {
    const n = grid.max + 1, cs = 30, L = 34, T = 8, W = L + n * cs + 8, H = T + n * cs + 36;
    let mx = 0;
    grid.p.forEach((r) => r.forEach((v) => (mx = Math.max(mx, v))));
    let cells = "";
    for (let h = 0; h < n; h++) for (let a = 0; a < n; a++) {
      const p = grid.p[h][a];
      const o = 0.06 + 0.94 * Math.pow(p / mx, 0.75);
      const col = h > a ? c.home : a > h ? c.away : "var(--line-strong)";
      const x = L + a * cs, y = T + (n - 1 - h) * cs;
      cells += `<rect x="${x + 1}" y="${y + 1}" width="${cs - 2}" height="${cs - 2}" rx="3" style="fill:${col};fill-opacity:${o.toFixed(3)}"><title>${g.away.id} ${a} : ${h} ${g.home.id} — ${pct(p)}</title></rect>`;
      if (p >= 0.015) cells += `<text x="${x + cs / 2}" y="${y + cs / 2 + 4}" text-anchor="middle" style="fill:${o > 0.55 ? "#fff" : "var(--ink-2)"};font-size:10px">${(p * 100).toFixed(1)}</text>`;
    }
    let ax = "";
    for (let i = 0; i < n; i++) {
      ax += `<text x="${L + i * cs + cs / 2}" y="${T + n * cs + 16}" text-anchor="middle">${i}${i === n - 1 ? "+" : ""}</text>`;
      ax += `<text x="${L - 8}" y="${T + (n - 1 - i) * cs + cs / 2 + 4}" text-anchor="end">${i}${i === n - 1 ? "+" : ""}</text>`;
    }
    ax += `<text x="${L + (n * cs) / 2}" y="${H - 2}" text-anchor="middle" class="strong">${esc(g.away.id)} 득점 →</text>`;
    ax += `<text transform="translate(10 ${T + (n * cs) / 2}) rotate(-90)" text-anchor="middle" class="strong">${esc(g.home.id)} 득점 →</text>`;
    return `<div class="tablewrap"><svg class="chart" viewBox="0 0 ${W} ${H}" style="max-width:${W + 40}px;min-width:300px" role="img" aria-label="스코어별 확률 격자">${cells}${ax}</svg></div>`;
  }

  function totalsChart(tot) {
    const d = tot.dist || [];
    if (!d.length) return "";
    const W = 420, H = 150, L = 8, B = 22, bw = (W - L * 2) / d.length;
    const mx = Math.max(...d);
    let s = "";
    d.forEach((p, i) => {
      const h = (p / mx) * (H - B - 18);
      s += `<rect x="${L + i * bw + 1.5}" y="${H - B - h}" width="${bw - 3}" height="${h}" rx="2" style="fill:var(--accent);fill-opacity:${0.35 + 0.65 * (p / mx)}"><title>총 ${i}점 ${pct(p)}</title></rect>`;
      if (i % 2 === 0) s += `<text x="${L + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${i}${i === d.length - 1 ? "+" : ""}</text>`;
    });
    const mxX = L + tot.mean * bw + bw / 2;
    s += `<line x1="${mxX}" x2="${mxX}" y1="6" y2="${H - B}" style="stroke:var(--signal);stroke-width:1.5;stroke-dasharray:4 3"/>`;
    s += `<line x1="${L}" x2="${W - L}" y1="${H - B}" y2="${H - B}" class="axis"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="총득점 분포">${s}</svg>`;
  }

  function factorSection(g, c) {
    const F = g.factors || [];
    if (!F.length) return "";
    const isNum = (v) => typeof v === "number";
    const row = (f) => {
      const hv = isNum(f.home) ? f2(f.home) : esc(f.home), av = isNum(f.away) ? f2(f.away) : esc(f.away);
      const txt = !isNum(f.home) && !/^[\d.+\-]+$/.test(String(f.home));
      const e = (side) => (f.better === side ? `<span class="edge" style="--edge:${c[side]}" title="우세"></span>` : "");
      return `<div class="frow">
        <div class="val${txt ? " text" : ""}${f.better && f.better !== "away" ? " dim" : ""}">${e("away")}${av}</div>
        <div class="lab">${esc(f.label)}${f.lg != null ? `<small>리그 평균 ${f2(f.lg)}</small>` : ""}</div>
        <div class="val home${txt ? " text" : ""}${f.better && f.better !== "home" ? " dim" : ""}">${hv}${e("home")}</div></div>`;
    };
    return `<section class="section">
      <div class="section-head"><h2>전력 비교</h2><div style="display:flex;gap:8px;align-items:center">${sampleChip(g.factors_sample)}<p>점은 우세한 쪽</p></div></div>
      <div class="panel factors">
        <div class="frow head"><div class="val">${tchip(g.away)}</div><div class="lab"></div><div class="val home">${tchip(g.home)}</div></div>
        ${F.map(row).join("")}
      </div></section>`;
  }

  function seriesSection(g, c) {
    const s = g.series;
    const T = s.top === g.home.id ? g.home : g.away, B = s.top === g.home.id ? g.away : g.home;
    const col = (id) => (id === g.home.id ? c.home : c.away);
    const smp = (k) => (s.sample || []).includes(k);
    const strip = s.outcomes.map((o, i) => {
      const op = o.l === 0 ? 1 : o.l === 1 ? 0.78 : 0.58;
      return `<div style="width:${o.p * 100}%;background:${col(o.winner)};opacity:${op}" title="${esc(o.winner)} ${o.w}-${o.l} ${pct(o.p)}">${o.p > 0.09 ? `${esc(o.winner)} ${o.w}-${o.l}` : ""}</div>`;
    }).join("");
    const played = (s.played || []).map((p) => `<div class="gp done"><span class="no">${p.no}차전 · 종료</span><span class="what">${esc(p.winner)} 승</span><span class="meta">${Object.entries(p.score).map(([k, v]) => `${esc(k)} ${v}`).join(" : ")}</span></div>`).join("");
    const next = s.games.map((x, i) => `<div class="gp${i === 0 ? " today" : ""}"><span class="no">${x.no}차전${i === 0 ? " · 이번 경기" : ""}</span><span class="what">${esc(T.id)} ${pct(x.p_top, 0)}</span><span class="meta">${esc(x.home)} 홈 · 열릴 확률 ${pct(x.p_played, 0)}</span></div>`).join("");
    return `<section class="section">
      <div class="section-head"><h2>시리즈 전망</h2><div style="display:flex;gap:8px;align-items:center">${sampleChip(smp("outcomes"))}<p>${esc(s.name)} · ${esc(s.format)} · 현재 ${esc(s.top)} ${s.state[0]}-${s.state[1]} ${esc(s.bottom)}</p></div></div>
      <div class="panel" style="display:grid;gap:18px">
        <div class="pbar"><div class="pbar-labels"><span class="fav">${tchip(T)} <span class="num">${pct(s.p_top)}</span></span><span><span class="num">${pct(1 - s.p_top)}</span> ${tchip(B)}</span></div></div>
        <div><div class="eyebrow" style="margin-bottom:8px">최종 전적별 확률</div><div class="series-strip">${strip}</div>
          <div class="legend" style="margin-top:8px">${s.outcomes.map((o) => `<span><i style="--c:${col(o.winner)}"></i>${esc(o.winner)} ${o.w}-${o.l} ${pct(o.p)}</span>`).join("")}</div></div>
        <div><div class="eyebrow" style="margin-bottom:8px">차전별 · ${esc(T.id)} 승리 확률</div><div class="games-path">${played}${next}</div></div>
        ${(s.swing || []).length ? `<div><div class="eyebrow" style="margin-bottom:8px">이번 경기 결과에 따라</div><div class="swing">${s.swing.map((w) => `<div><span class="muted" style="font-size:13px">${esc(w.if)} 승리 시 (${w.state[0]}-${w.state[1]})</span><span class="v num">${esc(T.id)} ${pct(w.p_top, 0)}</span><span class="muted" style="font-size:12px">시리즈 통과 확률</span></div>`).join("")}</div></div>` : ""}
      </div></section>`;
  }

  /* ───────── 종목별 패널 (야구) ───────── */
  const PANELS = {
    "baseball.starters": (p, g, c) => {
      const act = {};
      ((g.result || {}).starters || []).forEach((a) => (act[a.team] = a));
      const cols = [["ip", "이닝"], ["H", "피안타"], ["R", "실점"], ["ER", "자책"], ["HR", "피홈런"], ["BB", "사사구"], ["SO", "탈삼진"]];
      const card = (r) => {
        const t = r.side === "home" ? g.home : g.away;
        const a = act[r.team];
        return `<div class="pitch-card"><div class="pitch-who">${tchip(t)}<span class="nm">${esc(r.name)}</span><span class="muted" style="font-size:12px">${r.side === "home" ? "홈" : "원정"} 선발 · 반영된 선발 등판 ${r.starts}경기</span></div>
          <div class="pitch-line">${cols.map(([k, lab]) => `<div><span class="k">${lab}</span><span class="v">${r[k]}</span>${a ? `<span class="a">실제 ${a[k]}</span>` : ""}</div>`).join("")}</div></div>`;
      };
      return `<section class="section"><div class="section-head"><h2>선발투수 예상 기록</h2><p>이닝은 야구 표기 (5.1 = 5와 1/3이닝)</p></div>
        <div class="panel flush pitch">${p.rows.map(card).join("")}</div></section>`;
    },
    "baseball.lineups": (p, g, c) => {
      const box = (g.result || {}).batting || {};
      const side = S.lineupSide && p.teams.some((t) => t.side === S.lineupSide) ? S.lineupSide : p.teams[0].side;
      const tbl = (tm) => {
        const t = tm.side === "home" ? g.home : g.away;
        const col = tm.side === "home" ? c.home : c.away;
        const hasAct = Object.keys(box).length > 0;
        return `<div data-lineup="${tm.side}"${tm.side === side ? "" : " hidden"}>
          <div class="teamhead">${tchip(t)}<strong>${esc(t.name)}</strong><span class="vs">상대 선발 ${esc(tm.vs || "미발표")}</span></div>
          <div class="tablewrap"><table class="box"><thead><tr>
            <th class="l">타순</th><th class="l">선수</th><th>타석</th><th>타수</th><th>안타</th><th>홈런</th><th>볼넷</th><th>삼진</th><th>안타 1개 이상</th><th>멀티히트</th><th>홈런 확률</th>${hasAct ? "<th>실제</th>" : ""}
          </tr></thead><tbody>
          ${tm.rows.map((r) => { const a = box[`${tm.team}|${r.name}`]; return `<tr>
            <td class="order l">${r.order}</td><td class="l name">${esc(r.name)}</td>
            <td class="n">${r.PA}</td><td class="n">${r.AB}</td><td class="n">${r.H}</td><td class="n">${zero(r.HR)}</td><td class="n">${zero(r.BB)}</td><td class="n">${zero(r.SO)}</td>
            <td><span class="hbar" style="--c:${col}"><span class="t"><span style="width:${r.p_hit * 100}%"></span></span><span class="v">${pct(r.p_hit, 0)}</span></span></td>
            <td class="mono">${pct(r.p_multi, 0)}</td><td class="mono">${r.p_hr == null ? '<span class="muted">–</span>' : pct(r.p_hr, 0)}</td>
            ${hasAct ? `<td class="act mono">${a ? `${a.AB}타수 ${a.H}안타${a.HR ? ` ${a.HR}홈런` : ""} <span class="mark ${a.H > 0 ? "ok" : "miss"}">${a.H > 0 ? "O" : "X"}</span>` : "–"}</td>` : ""}
          </tr>`; }).join("")}
          </tbody></table></div></div>`;
      };
      return `<section class="section"><div class="section-head"><h2>타자별 예상 기록</h2>
          <div class="seg" role="group" aria-label="팀 선택">${p.teams.map((tm) => { const t = tm.side === "home" ? g.home : g.away; return `<button data-side="${tm.side}" aria-pressed="${tm.side === side}">${esc(t.id)} ${tm.side === "home" ? "홈" : "원정"}</button>`; }).join("")}</div></div>
        <div class="panel flush">${p.teams.map(tbl).join("")}</div>
        <p class="chart-note">타석·타수·안타 등은 가장 가능성 높은 개수, 확률 열은 해당 기록이 나올 확률입니다. 선발 라인업과 상대 선발 맞대결을 반영합니다.</p></section>`;
    },
  };

  /* ───────── 적중 기록 ───────── */
  async function viewRecord(lgId) {
    const [rec, bt] = await Promise.all([tryLoad(`${lgId}/record.json`), tryLoad(`${lgId}/backtest.json`)]);
    const sm = (rec && rec.summary) || { games: 0 };
    const off = sm.games ? `
      <div class="kv">
        <div><span class="k">승리 예측</span><span class="v">${sm.wins}<small>/ ${sm.games}경기</small></span></div>
        <div><span class="k">적중률</span><span class="v">${pct(sm.acc)}</span></div>
        <div><span class="k">Brier 점수</span><span class="v">${f2(sm.brier, 3)}</span></div>
        <div><span class="k">로그손실</span><span class="v">${f2(sm.logloss, 3)}</span></div>
        <div><span class="k">안타 TOP 5</span><span class="v">${sm.top5_hits}<small>/ ${sm.top5_n}명</small></span></div>
        <div><span class="k">안타 1위 선수</span><span class="v">${sm.top1_hits}<small>/ ${sm.top1_n}경기</small></span></div>
      </div>
      <div class="grid-2">
        <div class="panel" style="display:grid;gap:10px"><h3>누적 적중률</h3>${lineChart(rec.cumulative.map((x) => x.acc), rec.cumulative.map((x) => fdate(x.date)))}</div>
        <div class="panel" style="display:grid;gap:10px"><h3>확률 보정</h3>${sm.games >= 20 ? calibChart(rec.calibration, [0.5, 0.8]) : `<div class="empty" style="padding:20px"><strong>${sm.games}/20경기</strong>확률 보정은 20경기가 쌓이면 표시돼요. 표본이 적으면 우연이 크게 작용합니다.</div>`}<p class="chart-note">예: 60%라고 한 경기들은 실제로 60% 가까이 이겼는지. 대각선에 가까울수록 믿을 만한 확률이에요.</p></div>
      </div>
      <div class="panel flush"><div class="tablewrap"><table class="box"><thead><tr><th class="l">날짜</th><th class="l">경기</th><th>예측</th><th>예상 스코어</th><th>실제</th><th>채점</th><th>안타 TOP5</th><th>공개 시각</th></tr></thead><tbody>
        ${rec.games.map((r) => { const fav = r.p_home >= 0.5 ? r.home : r.away; return `<tr><td class="l mono">${fdate(r.date)}</td><td class="l name"><a href="#g.${lgId}.${r.id}">${esc(r.away)} @ ${esc(r.home)}</a></td><td>${esc(fav)} ${pct(Math.max(r.p_home, 1 - r.p_home))}</td><td class="mono">${f2(r.pred_score?.away, 1)}:${f2(r.pred_score?.home, 1)}</td><td class="n">${r.score.away}:${r.score.home}</td><td><span class="mark ${r.win_ok ? "ok" : "miss"}">${r.win_ok == null ? "무" : r.win_ok ? "적중" : "빗나감"}</span></td><td class="mono">${r.top5_hits}/${r.top5_n}</td><td class="mono muted">${stamp(r.published_at).slice(5)}</td></tr>`; }).join("")}
      </tbody></table></div></div>` : `
      <div class="empty"><strong>공식 기록은 2026 준플레이오프 2차전부터 쌓입니다</strong>경기 시작 전에 공개된 예측만 집계해요. 경기가 끝나면 자동으로 채점되어 이 표에 한 줄씩 추가됩니다.</div>`;
    return `
      <div class="eyebrow">적중 기록</div>
      <h1 style="margin-top:8px">맞힌 것도, 틀린 것도 전부</h1>
      <p class="muted" style="max-width:62ch;margin:8px 0 0">공식 기록은 경기 시작 전에 공개한 예측만 셉니다. 백테스트는 시즌 전체를 날짜순으로 다시 돌려, 그날 경기 전까지 알 수 있던 정보만으로 예측한 결과예요.</p>
      <section class="section"><div class="section-head"><h2>공식 기록</h2><span class="chip official">경기 전 공개분</span></div>${off}</section>
      ${bt ? backtestSection(bt) : ""}`;
  }

  function backtestSection(bt) {
    const G = bt.games, Hh = bt.hits;
    const smp = (k) => (bt.sample || []).includes(k);
    return `<section class="section">
      <div class="section-head"><h2>${bt.season} 시즌 백테스트</h2><p>미래 정보 없이 날짜순으로 재현 · 정규시즌 전 경기</p></div>
      <div class="kv">
        <div><span class="k">경기 수</span><span class="v">${G.n}</span></div>
        <div><span class="k">승리 예측 적중률</span><span class="v">${pct(G.acc)}</span></div>
        <div><span class="k">로그손실</span><span class="v">${f2(G.logloss, 4)}</span><span class="k">동전 던지기 0.6931</span></div>
        <div><span class="k">Brier 점수</span><span class="v">${f2(G.brier, 4)}</span>${smp("brier") ? sampleChip(true) : '<span class="k">동전 던지기 0.25</span>'}</div>
      </div>
      <div class="grid-2">
        <div class="panel" style="display:grid;gap:10px"><div class="section-head"><h3>확신도별 적중률</h3>${sampleChip(smp("by_confidence"))}</div>
          <div class="tablewrap"><table class="box"><thead><tr><th class="l">예측 확률 구간</th><th>경기</th><th>적중률</th><th class="l" style="width:40%"></th></tr></thead><tbody>
          ${G.by_confidence.map((b) => `<tr><td class="l">${esc(b.label)}</td><td class="n">${b.n}</td><td class="mono">${pct(b.acc)}</td><td class="l"><span class="hbar" style="grid-template-columns:1fr;width:100%"><span class="t"><span style="width:${b.acc * 100}%"></span></span></span></td></tr>`).join("")}
          </tbody></table></div></div>
        <div class="panel" style="display:grid;gap:10px"><div class="section-head"><h3>확률 보정</h3>${sampleChip(smp("calibration"))}</div>${calibChart(G.calibration, [0.5, 0.8])}</div>
      </div>
      <div class="panel" style="display:grid;gap:10px"><div class="section-head"><h3>월별 적중률</h3>${sampleChip(smp("monthly"))}</div>${barChart(G.monthly.map((m) => m.acc), G.monthly.map((m) => `${Number(m.month.slice(5))}월`), 0.5, G.monthly.map((m) => `${m.n}경기`))}</div>
      ${Hh ? `<div class="section-head" style="margin-top:12px"><h3>안타 확률 백테스트</h3><p>매일 안타 확률 1위 선수를 골랐다면</p></div>
      <div class="kv">
        <div><span class="k">1위 선수 적중</span><span class="v">${pct(Hh.top1_rate)}</span><span class="k">${Hh.top1_hits}/${Hh.days}일</span></div>
        <div><span class="k">최장 연속 적중</span><span class="v">${Hh.streak}<small>일</small></span></div>
        <div><span class="k">TOP 5 적중률</span><span class="v">${pct(Hh.top5_rate)}</span></div>
        <div><span class="k">선발 타자 평균</span><span class="v">${pct(Hh.base_rate)}</span><span class="k">아무나 고르면</span></div>
      </div>` : ""}
    </section>`;
  }

  function lineChart(vals, labels) {
    if (!vals.length) return "";
    const W = 460, H = 180, L = 36, R = 10, T = 10, B = 24;
    const x = (i) => L + (vals.length === 1 ? (W - L - R) / 2 : (i / (vals.length - 1)) * (W - L - R));
    const y = (v) => T + (1 - v) * (H - T - B);
    let s = "";
    [0, 0.5, 1].forEach((v) => (s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`));
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    s += `<polygon points="${x(0)},${y(0)} ${pts} ${x(vals.length - 1)},${y(0)}" style="fill:var(--accent);fill-opacity:.12"/>`;
    s += `<polyline points="${pts}" style="fill:none;stroke:var(--accent);stroke-width:2"/>`;
    const li = vals.length - 1;
    s += `<circle cx="${x(li)}" cy="${y(vals[li])}" r="4" style="fill:var(--accent)"/><text x="${x(li)}" y="${y(vals[li]) - 9}" text-anchor="end" class="strong">${pct(vals[li])}</text>`;
    s += `<text x="${L}" y="${H - 6}">${esc(labels[0])}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(labels[li])}</text>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="누적 적중률">${s}</svg>`;
  }

  function calibChart(bins, [lo, hi]) {
    if (!bins || !bins.length) return '<p class="chart-note">경기가 더 쌓이면 표시됩니다.</p>';
    const W = 340, H = 260, L = 40, R = 12, T = 10, B = 34;
    const cl = (v, a, b) => Math.min(Math.max(v, a), b);
    const sx = (v) => L + ((cl(v, lo, hi) - lo) / (hi - lo)) * (W - L - R);
    const sy = (v) => T + (1 - (cl(v, 0.3, 0.9) - 0.3) / 0.6) * (H - T - B);
    let s = "";
    for (let v = lo; v <= hi + 1e-9; v += 0.1) s += `<line x1="${sx(v)}" x2="${sx(v)}" y1="${T}" y2="${H - B}" class="grid"/><text x="${sx(v)}" y="${H - B + 16}" text-anchor="middle">${Math.round(v * 100)}%</text>`;
    for (let v = 0.3; v <= 0.9 + 1e-9; v += 0.1) s += `<line x1="${L}" x2="${W - R}" y1="${sy(v)}" y2="${sy(v)}" class="grid"/><text x="${L - 6}" y="${sy(v) + 4}" text-anchor="end">${Math.round(v * 100)}%</text>`;
    s += `<line x1="${sx(lo)}" y1="${sy(lo)}" x2="${sx(hi)}" y2="${sy(hi)}" style="stroke:var(--line-strong);stroke-width:1.5;stroke-dasharray:5 4"/>`;
    const mxn = Math.max(...bins.map((b) => b.n));
    s += `<polyline points="${bins.map((b) => `${sx(b.pred)},${sy(b.actual)}`).join(" ")}" style="fill:none;stroke:var(--accent);stroke-width:1.5;stroke-opacity:.5"/>`;
    bins.forEach((b) => (s += `<circle cx="${sx(b.pred)}" cy="${sy(b.actual)}" r="${4 + 6 * Math.sqrt(b.n / mxn)}" style="fill:var(--accent);fill-opacity:.75;stroke:var(--surface);stroke-width:1.5"><title>예측 ${pct(b.pred)} → 실제 ${pct(b.actual)} (${b.n}경기)</title></circle>`));
    s += `<text x="${L + (W - L - R) / 2}" y="${H - 2}" text-anchor="middle" class="strong">예측한 확률</text>`;
    s += `<text transform="translate(10 ${T + (H - T - B) / 2}) rotate(-90)" text-anchor="middle" class="strong">실제 적중률</text>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="max-width:420px" role="img" aria-label="확률 보정 그래프">${s}</svg>`;
  }

  function barChart(vals, labels, base, notes) {
    if (!vals.length) return "";
    const W = 1000, H = 200, L = 40, R = 8, T = 22, B = 38, bw = (W - L - R) / vals.length;
    const lo = 0.4, hi = 0.75;
    const y = (v) => T + (1 - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (H - T - B);
    let s = "";
    [0.4, 0.5, 0.6, 0.7].forEach((v) => (s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v * 100}%</text>`));
    vals.forEach((v, i) => {
      const x = L + i * bw + bw * 0.18, w = bw * 0.64;
      s += `<rect x="${x}" y="${y(v)}" width="${w}" height="${y(lo) - y(v)}" rx="3" style="fill:${v >= base ? "var(--accent)" : "var(--neutral-team)"}"><title>${labels[i]} ${pct(v)} · ${notes[i]}</title></rect>`;
      s += `<text x="${x + w / 2}" y="${y(v) - 5}" text-anchor="middle" class="strong">${(v * 100).toFixed(0)}</text>`;
      s += `<text x="${x + w / 2}" y="${H - 18}" text-anchor="middle">${labels[i]}</text><text x="${x + w / 2}" y="${H - 5}" text-anchor="middle" style="font-size:10px">${notes[i]}</text>`;
    });
    s += `<line x1="${L}" x2="${W - R}" y1="${y(base)}" y2="${y(base)}" style="stroke:var(--signal);stroke-dasharray:4 3"/>`;
    return `<div class="tablewrap"><svg class="chart" viewBox="0 0 ${W} ${H}" style="min-width:560px" role="img" aria-label="월별 적중률">${s}</svg></div>`;
  }

  /* ───────── 팀 전력 ───────── */
  async function viewTeams(lgId) {
    const t = await tryLoad(`${lgId}/teams.json`);
    if (!t) return '<div class="empty"><strong>팀 전력 데이터 준비 중</strong></div>';
    const mx = Math.max(...t.teams.map((r) => Math.abs(r.rating)), 1);
    return `
      <div class="eyebrow">팀 전력 · ${t.season} 시즌</div>
      <h1 style="margin-top:8px">지금 누가 가장 강한가</h1>
      <p class="muted" style="max-width:62ch;margin:8px 0 0">매 경기 결과로 갱신되는 전력 점수와, 득점력·불펜 실점으로 본 팀 컨디션입니다. 리그 평균 득점 ${f2(t.league_rpg)}점 · 선발 9이닝당 ${f2(t.league_sp_ra9)}실점 · 불펜 ${f2(t.league_pen_ra9)}실점.</p>
      <section class="section"><div class="section-head"><h2>전력 순위</h2>${sampleChip(t.sample)}</div>
      <div class="panel flush"><div class="tablewrap"><table class="box"><thead><tr>
        <th class="l">순위</th><th class="l">팀</th><th>전력 점수</th><th>30일 변화</th><th>평균 팀 상대 승률</th><th>득점력</th><th>불펜 9이닝당 실점</th><th>시즌</th><th>최근 10경기</th><th>경기당 득실</th><th class="l">주요 선발</th>
      </tr></thead><tbody>
      ${t.teams.map((r, i) => { const w = (Math.abs(r.rating) / mx) * 50; const c = lum(r.color) < 0.08 ? "var(--dark-team)" : r.color; return `<tr>
        <td class="order l">${i + 1}</td>
        <td class="l name"><span style="display:inline-flex;gap:8px;align-items:center"><span class="tchip" style="--tc:${esc(r.color)}">${esc(r.id)}</span>${esc(r.name)}</span></td>
        <td><span class="rank-rating"><span class="t"><span style="--c:${c};${r.rating >= 0 ? `left:50%;width:${w}%` : `right:50%;width:${w}%`}"></span></span><span class="mono">${r.rating > 0 ? "+" : ""}${f2(r.rating, 0)}</span></span></td>
        <td class="mono delta ${r.change30 > 0 ? "up" : r.change30 < 0 ? "down" : ""}">${r.change30 > 0 ? "▲" : r.change30 < 0 ? "▼" : ""}${f2(Math.abs(r.change30), 0)}</td>
        <td class="mono">${pct(r.p_vs_avg)}</td><td class="n">${f2(r.off)}</td><td class="n">${f2(r.pen_ra9)}</td>
        <td class="mono">${esc(r.record)}</td><td class="mono">${esc(r.last10)}</td><td class="mono">${esc(r.rd)}</td>
        <td class="l">${r.rotation && r.rotation.length ? `<details class="rot"><summary>${r.rotation.length}명</summary>${r.rotation.map((p) => `<div class="mono" style="font-size:12px">${esc(p.name)} · 9이닝당 ${f2(p.ra9)} · 평균 ${f2(p.ip, 1)}이닝</div>`).join("")}</details>` : '<span class="muted">–</span>'}</td>
      </tr>`; }).join("")}
      </tbody></table></div></div></section>`;
  }

  /* ───────── 준비 중 리그 ───────── */
  function viewSoon(lg) {
    const items = {
      baseball: ["선발투수 반영 승리 확률·예상 스코어", "스코어별 확률 격자", "선발투수·타자별 예상 기록", "포스트시즌 시리즈 전망"],
      soccer: ["승·무·패 확률", "스코어별 확률 격자", "예상 득점자·슈팅 기록", "리그 최종 순위 시뮬레이션"],
      basketball: ["승리 확률·예상 점수", "점수 차 분포", "선수별 예상 득점·리바운드·어시스트", "플레이오프 시리즈 전망"],
    }[lg.sport] || [];
    return `<section class="soon">
      <div class="eyebrow">${esc(lg.label)} · 준비 중</div>
      <h1>${esc(lg.name)} 예측을 준비하고 있어요</h1>
      <p class="muted" style="max-width:60ch;margin:0">KBO와 같은 방식으로 경기 전에 공개하고 경기 후 채점합니다. 데이터 수집과 시즌 전체 백테스트를 마친 뒤 공식 기록을 시작해요.</p>
      <div class="soon-list">${items.map((x, i) => `<div class="step"><span class="n">제공 예정 ${i + 1}</span><p>${esc(x)}</p></div>`).join("")}</div>
      <p><a href="#kbo">KBO 예측 보기 →</a></p></section>`;
  }

  /* ───────── 예측 방식 ───────── */
  function viewMethod() {
    return `
      <div class="eyebrow">예측 방식</div>
      <h1 style="margin-top:8px">어떻게 예측하고, 어떻게 검증하나</h1>
      <section class="section"><h2>예측에 쓰는 정보</h2>
        <div class="steps">
          <div class="step"><span class="n">팀 공격력</span><p>최근 경기에 더 큰 비중을 두고 계산한 경기당 득점력. 표본이 적으면 리그 평균 쪽으로 보정합니다.</p></div>
          <div class="step"><span class="n">선발투수</span><p>그날 선발의 아웃카운트당 실점과 평소 소화 이닝. 등판 기록이 적은 투수는 리그 평균 선발로 보정합니다.</p></div>
          <div class="step"><span class="n">불펜</span><p>선발이 내려간 뒤 남은 이닝을 막을 팀 불펜의 실점률.</p></div>
          <div class="step"><span class="n">라인업 매치업</span><p>발표된 선발 라인업의 타자별 기록과 상대 선발의 피안타 성향, 타순별 타석 수 분포.</p></div>
        </div></section>
      <section class="section"><h2>검증 원칙</h2><div class="prose">
        <ol>
          <li><strong>미래 정보 금지.</strong> 백테스트는 날짜순으로 하루씩 진행하며, 그날 경기 전까지 알 수 있던 기록만 씁니다.</li>
          <li><strong>설정은 과거 시즌에서만.</strong> 모델 설정은 이전 시즌으로 정하고, 다음 시즌으로 성능을 확인합니다.</li>
          <li><strong>맞힌 횟수보다 확률의 정확도.</strong> 적중률과 함께 로그손실·Brier 점수와 확률 보정을 공개합니다. 60%라고 한 경기들은 실제로 60% 가까이 이겨야 합니다.</li>
        </ol></div></section>
      <section class="section"><h2>기록 공개 원칙</h2><div class="prose">
        <ul>
          <li>모든 예측은 경기 시작 전에 공개되고, 공개 시각이 저장소 변경 이력에 남습니다.</li>
          <li>공개 후에는 예측값을 고치지 않습니다. 경기 시작 후 공개된 예측은 공식 기록에서 뺍니다.</li>
          <li>경기가 끝나면 자동으로 채점하고, 빗나간 예측도 그대로 둡니다.</li>
        </ul></div></section>
      <section class="section"><h2>이용 안내</h2><div class="prose">
        <p>이 사이트의 확률은 경기 분석을 위한 정보이며 결과를 보장하지 않습니다. 특정 베팅을 권하지 않으며, 불법 도박 사이트와 관련이 없습니다.</p>
      </div></section>`;
  }

  /* ───────── 테마 ───────── */
  function themeInit() {
    const root = document.documentElement;
    let t = null;
    try { t = localStorage.getItem("sp-theme"); } catch (e) {}
    if (t) root.dataset.theme = t;
    const btn = document.getElementById("theme");
    const label = () => (btn.textContent = `화면: ${root.dataset.theme === "dark" ? "어둡게" : root.dataset.theme === "light" ? "밝게" : "시스템"}`);
    label();
    btn.addEventListener("click", () => {
      const n = root.dataset.theme === "light" ? "dark" : root.dataset.theme === "dark" ? "" : "light";
      if (n) root.dataset.theme = n; else delete root.dataset.theme;
      try { n ? localStorage.setItem("sp-theme", n) : localStorage.removeItem("sp-theme"); } catch (e) {}
      label();
    });
  }

  async function boot() {
    themeInit();
    try {
      S.index = await load("index.json");
    } catch (e) {
      app.innerHTML = '<div class="empty"><strong>데이터를 불러오지 못했어요</strong>잠시 후 새로고침해 주세요.</div>';
      return;
    }
    const live = S.index.leagues.find((l) => l.status === "live");
    S.league = live ? live.id : S.index.leagues[0].id;
    document.getElementById("updated").textContent = `데이터 갱신 ${stamp(S.index.generated_at)} KST`;
    window.addEventListener("hashchange", render);
    render();
  }
  boot();
})();
