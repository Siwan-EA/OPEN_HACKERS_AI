// 강의실 JSON(도구/xlsx-to-room.mjs 결과) + 배정 결과 → B4 가로(364×257mm) 좌석배치표 SVG.
// 디자인은 참고파일/고사장_현황_표_작성_0628.pptx 의 도형 값을 그대로 옮긴 것 (참고파일/고사장현황표_도형.json).
// 브라우저(window.SeatRender)·Node(require) 공용, 외부 의존성 없음.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SeatRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PAGE = { w: 364, h: 257 };
  // PPT 1008pt 폭 → 364mm 폭.  가로 치수는 PPT 그대로, 세로는 B4 비율에 맞춰 줄였다.
  const K = 364 / 1008;
  const M = 40 * K;                                         // 좌우 여백 (PPT left 40pt)
  const C = {
    title: '#0d0d0d', banner: '#023015', bannerLine: '#2f528f',
    blocked: '#afabab', seatLine: '#000000', legendLine: '#2f528f',
    pillar: '#000000', pillarLine: '#ff0000', door: '#ff0000', tv: '#00b0f0', camera: '#4f81bd',
    notice: '#ffff00', warning: '#ff0000', deadline: '#ff0000', deadlineHi: '#ffff00',
  };
  const FONT_B = "'G마켓 산스 Bold','GmarketSansBold','Gmarket Sans','GmarketSans','Malgun Gothic','맑은 고딕',sans-serif";
  const FONT_M = "'G마켓 산스 Medium','GmarketSansMedium','Gmarket Sans','GmarketSans','Malgun Gothic','맑은 고딕',sans-serif";
  // PPT 좌석: 45.9×30pt, 줄 간격 39.6pt  →  좌석 높이/폭 0.654, 줄 간격/폭 0.863
  const SEAT_H = 30 / 45.9, PITCH = 39.6 / 45.9;
  const PITCH_MIN = 0.72, PITCH_MAX = 1.15;                // 세로 공간에 따라 줄 간격을 늘이고 줄이는 범위 (좌석 폭 대비)
  const HIDE_OVERLAP = 0.25;                                 // 기둥이 좌석 면적의 이만큼 이상 덮으면 그 좌석은 없는 것으로 본다
  const SEAT_TEXT_MIN = 12 * 25.4 / 96;                      // 좌석 글씨 최소 12px (= 3.175mm, 인쇄 기준)

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = n => Math.round(n * 100) / 100;

  function text(str, x, y, size, fill, { font = FONT_B, extra = '' } = {}) {
    return `<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" fill="${fill}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-weight="700" ${extra}>${esc(str)}</text>`;
  }

  // 기둥이 덮은 좌석 id (좌석 데이터는 지우지 않고 계산으로만 숨긴다 → 기둥을 옮기면 자동 복구)
  function hiddenSeats(room) {
    const hidden = new Set();
    const pillars = room.structures.filter(s => s.type === 'pillar');
    for (const s of room.seats) {
      const a = { x0: s.x, x1: s.x + 1, y0: s.y, y1: s.y + SEAT_H * PITCH };
      const area = (a.x1 - a.x0) * (a.y1 - a.y0);
      for (const p of pillars) {
        const ox = Math.min(a.x1, p.x + p.w) - Math.max(a.x0, p.x), oy = Math.min(a.y1, p.y + p.h) - Math.max(a.y0, p.y);
        if (ox > 0 && oy > 0 && (ox * oy) / area >= HIDE_OVERLAP) { hidden.add(s.id); break; }
      }
    }
    return hidden;
  }

  // 착석 가능 좌석을 배치 순서대로: 분단 왼쪽→오른쪽, 분단 안에서 위→아래, 줄 안에서 왼쪽→오른쪽
  function openSeats(room, overrides = {}) {
    const hidden = hiddenSeats(room);
    return room.seats
      .filter(s => !hidden.has(s.id) && (overrides[s.id] || s.state) === 'open')
      .sort((a, b) => a.bay - b.bay || a.y - b.y || a.x - b.x);
  }

  // 구조물 그리기용 사각형 (출입문은 PPT처럼 가로로 눕힌 넉넉한 상자로)
  function structBox(t) {
    if (t.type !== 'door') return t;
    const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
    const w = Math.max(t.w, 2.2), h = Math.min(Math.max(t.h, 0.85), 1.1);
    return { ...t, x: cx - w / 2, y: cy - h / 2, w, h };
  }

  function banner(cfg, y, h) {
    const x = M, w = PAGE.w - 2 * M, cx = PAGE.w / 2 - 4;
    const out = [`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${C.banner}" stroke="${C.bannerLine}" stroke-width="0.35"/>`];
    const lines = [cfg.notice, cfg.warning].filter(Boolean);
    const examY = lines.length ? y + h * 0.36 : y + h / 2;
    out.push(text(cfg.exam || '', cx, examY, 28 * K * 0.95, '#fff'));
    if (cfg.notice) out.push(text(cfg.notice, cx, y + h * 0.66, 12 * K, C.notice));
    if (cfg.warning) out.push(text(cfg.warning, cx, y + h * (cfg.notice ? 0.84 : 0.7), 12 * K, C.warning));
    const dl = (cfg.deadline || '').split('\n').filter(Boolean);
    const dx = 879 * K, sz = 20 * K;
    dl.forEach((line, i) => {
      const ty = y + h / 2 + (i - (dl.length - 1) / 2) * sz * 1.25;
      out.push(text(line, dx, ty, sz, C.deadline, { extra: `stroke="${C.deadlineHi}" stroke-width="${f(sz * 0.32)}" stroke-linejoin="round" paint-order="stroke"` }));
    });
    return out.join('');
  }

  /**
   * @param room   강의실 JSON
   * @param fills  { seatId: 직렬이름 }
   * @param cfg    { exam, notice, warning, deadline, series: {이름: 색}, showBanner, showPodium, showTv, showCamera, title }
   * @param overrides { seatId: 'open'|'blocked' }  화면에서 바꾼 착석 가능/금지
   */
  function renderSheet(room, fills, cfg, overrides = {}) {
    const showBanner = cfg.showBanner !== false;
    const showPodium = cfg.showPodium !== false && (room.page || {}).showPodium !== false;
    const hidden = hiddenSeats(room);
    const seats = room.seats.filter(s => !hidden.has(s.id));
    const structs = room.structures
      .map((t, i) => ({ ...(t.custom ? t : structBox(t)), idx: i }))
      .filter(s => !(s.type === 'tv' && !cfg.showTv) && !(s.type === 'camera' && !cfg.showCamera) && !(s.type === 'podium' && !showPodium));

    // ---- 세로 배치 (mm) ----
    const W = PAGE.w - 2 * M;
    const titleY = 15.9 * K, titleH = 25;
    const bannerY = titleY + titleH + 3.6, bannerH = 27;
    const legendH = 26 * K, legendY = PAGE.h - 8 - legendH;
    const areaTop = (showBanner ? bannerY + bannerH : titleY + titleH) + 6;
    const areaH = legendY - 7 - areaTop;

    // ---- 좌석·구조물 범위 → 배율 ----
    const bb = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    const grow = (x0, y0, x1, y1) => { bb.x0 = Math.min(bb.x0, x0); bb.y0 = Math.min(bb.y0, y0); bb.x1 = Math.max(bb.x1, x1); bb.y1 = Math.max(bb.y1, y1); };
    seats.forEach(s => grow(s.x, s.y, s.x + 1, s.y + SEAT_H));
    structs.forEach(s => grow(s.x, s.y, s.x + s.w, s.y + s.h));
    const colSpan = bb.x1 - bb.x0, rowSpan = bb.y1 - bb.y0;
    let s = Math.min(W / colSpan, 45.9 * K * 1.25);            // 좌석 폭(mm), PPT 크기의 1.25배까지만 키운다
    let pitch = areaH / rowSpan;                                // 1줄(엑셀 2행) 간격(mm)
    if (pitch / s < PITCH_MIN) s = pitch / PITCH_MIN;           // 세로가 모자라면 좌석 폭까지 줄인다
    pitch = Math.min(pitch, s * PITCH_MAX);
    const ox = M + (W - colSpan * s) / 2 - bb.x0 * s;
    const oy = areaTop - bb.y0 * pitch;                        // PPT처럼 안내 바 바로 아래부터 (남는 공간은 아래로)
    const X = c => ox + c * s, Y = r => oy + r * pitch;
    const seatH = Math.min(SEAT_H * s, pitch * 0.82);

    const g = [];
    g.push(`<rect width="${PAGE.w}" height="${PAGE.h}" fill="#fff"/>`);
    g.push(`<rect x="${f(M)}" y="${f(titleY)}" width="${f(W)}" height="${f(titleH)}" fill="${C.title}"/>`);
    g.push(text(cfg.title || room.room.name, PAGE.w / 2, titleY + titleH / 2 + 0.4, 40 * K * 0.9, '#fff'));
    if (showBanner) g.push(banner(cfg, bannerY, bannerH));

    // 좌석
    const seatText = Math.max(SEAT_TEXT_MIN, Math.min(9 * K * (s / (45.9 * K)), seatH * 0.5));
    const labels = cfg.labels || {};
    for (const st of seats) {
      const series = fills[st.id];
      const state = overrides[st.id] || st.state;
      const fill = series ? (cfg.series[series] || '#dddddd') : C.blocked;
      const cls = series ? 'seat' : (state === 'open' ? 'seat vacant' : 'seat blocked');
      g.push(`<rect class="${cls}" data-seat="${st.id}" x="${f(X(st.x))}" y="${f(Y(st.y))}" width="${f(s)}" height="${f(seatH)}" fill="${fill}" stroke="${C.seatLine}" stroke-width="0.12"/>`);
      if (series) {
        const label = labels[series] || series;
        // 글씨는 최소 12px 유지. 칸보다 길면 글씨 크기는 그대로 두고 가로로만 좁혀 칸 안에 맞춘다
        const size = Math.max(SEAT_TEXT_MIN, Math.min(seatText, (s * 0.84) / Math.max(2, [...label].length)));
        const room = s * 0.88, need = [...label].length * size * 0.98;
        const squeeze = need > room ? ` textLength="${f(room)}" lengthAdjust="spacingAndGlyphs"` : '';
        g.push(text(label, X(st.x) + s / 2, Y(st.y) + seatH / 2, size, '#000', { font: FONT_M, extra: 'pointer-events="none"' + squeeze }));
      }
    }
    // 구조물 (좌석 위).  화면에서 드래그로 옮기거나(본체) 크기를 바꿀 수 있게(오른쪽 아래 손잡이) 단위 좌표를 data-*에 남긴다
    for (const t of structs) {
      const x = X(t.x), y = Y(t.y), w = t.w * s, h = t.type === 'podium' && !t.custom ? Math.max(t.h * pitch, 25 * K) : t.h * pitch;
      const st = {
        podium: { fill: C.title, stroke: C.title, size: 14 },
        pillar: { fill: C.pillar, stroke: C.pillarLine, size: 18 },
        door: { fill: C.door, stroke: C.door, size: 18 },
        tv: { fill: C.tv, stroke: C.tv, size: 12 },
        camera: { fill: C.camera, stroke: C.camera, size: 12 },
      }[t.type] || { fill: '#666', stroke: 'none', size: 12 };
      const box = `data-struct="${t.idx}" data-ux="${f(t.x)}" data-uy="${f(t.y)}" data-uw="${f(t.w)}" data-uh="${f(h / pitch)}"`;
      g.push(`<rect class="struct" ${box} data-mode="move" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${st.fill}" stroke="${st.stroke}" stroke-width="0.35"/>`);
      const label = t.label || '';
      const size = Math.min(st.size * K, h * 0.62, (w * 0.86) / Math.max(1.6, [...label].length));
      g.push(text(label, x + w / 2, y + h / 2, size, '#fff', { extra: `pointer-events="none" data-label="${t.idx}"` }));
      const hs = 3.2;
      g.push(`<rect class="handle" ${box} data-mode="resize" x="${f(x + w - hs / 2)}" y="${f(y + h - hs / 2)}" width="${hs}" height="${hs}" fill="#fff" stroke="#2f528f" stroke-width="0.4"/>`);
    }

    // 범례 — 실제 좌석에 쓰인 직렬만, 직렬 이름으로(표시용 이름은 좌석에만), 가운데 정렬, 마지막에 착석금지 (PPT 99×26pt 칩)
    const used = Object.keys(cfg.series).filter(n => Object.values(fills).includes(n));
    const chips = used.map(n => ({ name: n, fill: cfg.series[n], color: '#000', line: C.legendLine }))
      .concat([{ name: '착석금지', fill: C.blocked, color: '#ff0000', line: C.blocked }]);
    const cw = 99 * K, gap = 38 * K, total = chips.length * cw + (chips.length - 1) * gap;
    let lx = (PAGE.w - total) / 2;
    for (const c of chips) {
      g.push(`<rect x="${f(lx)}" y="${f(legendY)}" width="${f(cw)}" height="${f(legendH)}" fill="${c.fill}" stroke="${c.line}" stroke-width="0.12"/>`);
      g.push(text(c.name, lx + cw / 2, legendY + legendH / 2, 12 * K, c.color));
      lx += cw + gap;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAGE.w} ${PAGE.h}" width="${PAGE.w}mm" height="${PAGE.h}mm" data-s="${s}" data-p="${pitch}" data-ox="${ox}" data-oy="${oy}">${g.join('')}</svg>`;
  }

  /**
   * 직렬별 인원을 좌석에 배치한다.  "열" = 분단(세로로 이어진 책상 줄), "세로 줄" = 분단 안의 좌석 한 칸 폭 줄.
   * 규칙 (기획안 §12.9 · §12.12 · §12.13)
   *  A. 한 직렬은 한 강의실 안에서만. 「강의실」에서 2곳 이상 직접 고른 직렬만 그 강의실들에 나눠 앉힌다.
   *     들어갈 자리가 없으면 그 직렬은 통째로 배정하지 않는다 → unplaced.
   *  B. 큰 직렬(SMALL명 초과)을 먼저, 입력 순서대로. 한쪽에 몰아서 — 왼쪽부터 붙어 있는 분단 묶음에 이어서 채운다.
   *     한 분단에는 한 직렬만(분단을 다 못 채운 나머지 자리는 비워 둠).
   *  C. 소수 직렬(SMALL명 이하)은 그다음, 남은 분단에. 한 분단 안에서 세로 한 줄로 앉히고, 한 줄을 넘치면 같은 분단의 옆 줄로.
   *     소수 직렬끼리는 한 분단의 서로 다른 세로 줄을 나눠 써도 된다.
   *     빈 분단이 없으면 섞기 전에, 다른 분단에서 통째로 빈 세로 줄을 쓴다 (큰 직렬의 마지막 분단은 세로 줄 단위로 채워 빈 줄을 남긴다).
   *  D. 그래도 남은 인원이 있을 때만(여유 좌석이 없을 때) 같은 범위 안에서 다른 직렬 분단의 빈자리에 섞어 앉힌다.
   * @param rooms   [{ room, overrides, manual: {seatId: 직렬} }]  (출력할 강의실, 순서대로)
   * @param series  [{ name, count, rooms? }]
   * @returns { fills, perRoom: {roomId: {직렬: n}}, short: {직렬: 못 앉힌 인원}, free: {roomId: 남은 좌석}, unplaced: {직렬: 인원} }
   */
  const SMALL = 10;
  function autoAssign(rooms, series) {
    const fills = {}, perRoom = {}, free = {};
    const manualCount = {};
    for (const r of rooms) for (const n of Object.values(r.manual || {})) manualCount[n] = (manualCount[n] || 0) + 1;
    const tracks = series.filter(x => x.name).map((x, order) => ({
      name: x.name, order, rooms: (x.rooms || []).length ? x.rooms : null,
      left: Math.max(0, (+x.count || 0) - (manualCount[x.name] || 0)),
    }));

    // 분단 목록 (강의실 순서 → 분단 순서).  cols = 세로 줄(같은 x) 별 좌석, 위→아래
    const bays = [];
    rooms.forEach((r, ri) => {
      const id = r.room.room.id, manual = r.manual || {};
      fills[id] = Object.assign({}, manual);
      const byBay = new Map();
      const get = bay => byBay.get(bay) || byBay.set(bay, { owners: new Set(), seats: [] }).get(bay);
      for (const s of r.room.seats) if (manual[s.id]) get(s.bay).owners.add(manual[s.id]);
      for (const s of openSeats(r.room, r.overrides)) if (!manual[s.id]) get(s.bay).seats.push(s);
      for (const [bay, v] of [...byBay].sort((a, b) => a[0] - b[0])) {
        const colMap = new Map();
        for (const s of v.seats) (colMap.get(s.x) || colMap.set(s.x, []).get(s.x)).push(s);
        const cols = [...colMap].sort((a, b) => a[0] - b[0]).map(([, list]) => list.sort((a, b) => a.y - b.y));
        bays.push({ roomId: id, ri, bay, seats: v.seats, cols, owners: v.owners, big: false });
      }
    });
    const activeIds = rooms.map(r => r.room.room.id);
    const room = b => fills[b.roomId];
    const cap = b => b.seats.filter(s => !fills[b.roomId][s.id]).length;
    const colFree = (b, col) => col.filter(s => !fills[b.roomId][s.id]);
    const mine = (t, b) => (b.owners.has(t.name) ? 1 : 0);
    const seat = (t, b, s) => { fills[b.roomId][s.id] = t.name; t.left--; b.owners.add(t.name); };
    const fillRows = (t, b) => { for (const s of b.seats) { if (t.left <= 0) break; if (!fills[b.roomId][s.id]) seat(t, b, s); } };
    // 분단을 다 못 채우는 마지막 분단은 세로 줄 단위로(왼쪽 줄 위→아래 먼저) — 남는 자리가 통째로 빈 세로 줄이 되게
    const fillCols = (t, b) => { for (const col of b.cols) for (const s of col) { if (t.left <= 0) return; if (!fills[b.roomId][s.id]) seat(t, b, s); } };
    const fillBay = (t, b) => (cap(b) > t.left ? fillCols(t, b) : fillRows(t, b));
    // 큰 직렬이 혼자 쓸 수 있는 분단: 아무도 없는 분단, 또는 이 직렬만 있는 분단
    const ownable = (t, b) => cap(b) > 0 && (b.owners.size === 0 || (b.owners.size === 1 && mine(t, b)));

    // 직렬이 쓸 수 있는 범위(분단 목록) 고르기 — 한 강의실(또는 직접 고른 여러 강의실)
    const scopes = t => {
      const ids = (t.rooms || activeIds).filter(id => activeIds.includes(id));
      if (t.rooms && ids.length >= 2) return [bays.filter(b => ids.includes(b.roomId))];
      return ids.map(id => bays.filter(b => b.roomId === id));
    };
    const total = list => list.reduce((n, b) => n + cap(b), 0);
    // 앞(왼쪽)에서부터 붙어 있는 빈 분단 묶음 중 처음으로 인원이 다 들어가는 묶음
    const firstRun = (t, list) => {
      for (let i = 0; i < list.length; i++) {
        let n = 0, run = [];
        for (let j = i; j < list.length && ownable(t, list[j]); j++) { run.push(list[j]); n += cap(list[j]); if (n >= t.left) return run; }
      }
      return null;
    };
    const unplaced = {};
    const mixIn = (t, list) => {   // D. 여유가 없을 때만 섞기 (자기 직렬이 있는 분단 먼저)
      for (const b of list.filter(b => cap(b) > 0).sort((x, y) => mine(t, y) - mine(t, x))) { if (t.left <= 0) break; fillRows(t, b); }
    };

    // B. 큰 직렬: 입력 순서대로, 한 강의실 안에서 왼쪽부터 붙은 분단 묶음에
    for (const t of tracks.filter(t => t.left > SMALL)) {
      const cands = scopes(t);
      let list = null, run = null;
      for (const c of cands) { const r = firstRun(t, c); if (r) { list = c; run = r; break; } }
      if (!list) list = cands.find(c => c.filter(b => ownable(t, b)).reduce((n, b) => n + cap(b), 0) >= t.left)
        || cands.find(c => total(c) >= t.left);
      if (!list) { unplaced[t.name] = t.left; continue; }
      for (const b of run || list.filter(b => ownable(t, b))) { if (t.left <= 0) break; fillBay(t, b); b.big = true; }
      mixIn(t, list);
    }

    // C. 소수 직렬: 인원 많은 직렬부터, 남은 분단 중 다 들어가는 가장 작은 분단에 — 그 안에서 세로 한 줄(넘치면 옆 줄)
    //    소수 직렬끼리는 같은 분단의 다른 세로 줄을 함께 쓸 수 있다 (큰 직렬 분단에는 들어가지 않음)
    const smallCap = (t, b) => (b.big && !mine(t, b) ? 0 : b.cols.filter(col => colFree(b, col).length === col.length || col.every(s => !fills[b.roomId][s.id] || fills[b.roomId][s.id] === t.name)).reduce((n, col) => n + colFree(b, col).length, 0));
    for (const t of tracks.filter(t => t.left > 0 && t.left <= SMALL).sort((a, b) => b.left - a.left || a.order - b.order)) {
      const cands = scopes(t);
      let pick = null;
      for (const c of cands) {
        const fit = c.filter(b => smallCap(t, b) >= t.left)
          .sort((x, y) => mine(t, y) - mine(t, x) || smallCap(t, x) - smallCap(t, y) || x.ri - y.ri || x.bay - y.bay)[0];
        if (fit) { pick = { list: c, bay: fit }; break; }
      }
      if (pick) {
        const b = pick.bay;
        const usable = b.cols.filter(col => col.every(s => !fills[b.roomId][s.id] || fills[b.roomId][s.id] === t.name) && colFree(b, col).length);
        // 한 줄에 다 들어가는 줄이 있으면 그중 가장 짧은 줄 하나에, 없으면 왼쪽 줄부터 위→아래로 채우고 옆 줄로
        const one = usable.filter(col => colFree(b, col).length >= t.left).sort((x, y) => colFree(b, x).length - colFree(b, y).length)[0];
        for (const col of one ? [one] : usable) for (const s of colFree(b, col)) { if (t.left <= 0) break; seat(t, b, s); }
        continue;
      }
      // 빈 분단이 없으면 — 섞기 전에 다른 분단의 "통째로 빈 세로 줄"을 쓴다 (줄 단위로는 직렬이 섞이지 않음)
      let spare = null;
      for (const c of cands) {
        spare = c.map(b => ({ b, cols: b.cols.filter(col => col.length && colFree(b, col).length === col.length) }))
          .filter(x => x.cols.reduce((n, col) => n + col.length, 0) >= t.left)
          .sort((x, y) => x.cols.reduce((n, c2) => n + c2.length, 0) - y.cols.reduce((n, c2) => n + c2.length, 0) || x.b.ri - y.b.ri || x.b.bay - y.b.bay)[0];
        if (spare) break;
      }
      if (spare) {
        const one = spare.cols.filter(col => col.length >= t.left).sort((x, y) => x.length - y.length)[0];
        for (const col of one ? [one] : spare.cols) for (const s of col) { if (t.left <= 0) break; seat(t, spare.b, s); }
        continue;
      }
      // 그래도 안 되면 (여유 좌석이 없을 때) — 흩어지지 않게 빈자리가 다 들어가는 분단 하나에 섞어 앉히고,
      // 그런 분단도 없으면 빈자리가 많은 분단부터 나눠 앉힌다. 범위 전체에도 자리가 없으면 배정 불가
      const list = cands.find(c => total(c) >= t.left);
      if (!list) { unplaced[t.name] = t.left; continue; }
      const oneBay = list.filter(b => cap(b) >= t.left).sort((x, y) => mine(t, y) - mine(t, x) || cap(x) - cap(y) || x.ri - y.ri || x.bay - y.bay)[0];
      for (const b of oneBay ? [oneBay] : [...list].sort((x, y) => cap(y) - cap(x))) {
        if (t.left <= 0) break;
        const cols = [...b.cols].sort((x, y) => (colFree(b, y).length === y.length) - (colFree(b, x).length === x.length));
        for (const col of cols) for (const s2 of colFree(b, col)) { if (t.left <= 0) break; seat(t, b, s2); }
      }
    }

    rooms.forEach(r => {
      const id = r.room.room.id, pr = perRoom[id] = {};
      for (const n of Object.values(fills[id])) pr[n] = (pr[n] || 0) + 1;
      free[id] = openSeats(r.room, r.overrides).filter(s => !fills[id][s.id]).length;
    });
    const short = {};
    tracks.forEach(t => { if (t.left > 0) short[t.name] = t.left; });
    return { fills, perRoom, short, free, unplaced };
  }

  function capacity(room, overrides) { return openSeats(room, overrides).length; }

  // 화면에서 옮기거나 크기를 바꾼 구조물을 반영한 강의실 사본.  edits = { 구조물 index: {x,y,w,h} } (단위 좌표, 그려진 그대로)
  function applyEdits(room, edits) {
    if (!edits || !Object.keys(edits).length) return room;
    return { ...room, structures: room.structures.map((t, i) => (edits[i] ? { ...t, ...edits[i], custom: true } : t)) };
  }

  return { PAGE, renderSheet, autoAssign, openSeats, hiddenSeats, capacity, applyEdits };
});
