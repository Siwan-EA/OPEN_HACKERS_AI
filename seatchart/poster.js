// 고사장 안내게시물 (A4 가로) — 참고파일/0823_공무원 오프라인 모의고사 안내 게시물.pptx 의 A·B·C 유형을 옮긴 것.
// 좌표는 원본 PPT 그대로(1190.75×842pt, A3 가로 = A4 가로와 같은 비율). 도형 값은 참고파일/안내게시물_도형.json.
//   A 종합 안내 · B 고사장 문 앞 · C 예비 강의실
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PosterRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 1190.75, H = 842;
  const C = { ground: '#9d928e', title: '#ff0000', blue: '#0070c0', red: '#ff0000', green: '#00b050', desk: '#2c2c2c', mark: '#ffff00' };
  // 직렬 목록은 「/」 뒤에서만 줄이 바뀌게 (한 낱말 중간에서 끊기지 않도록 keep-all + <wbr>)
  const slash = s => esc(s).split("/").join("/<wbr>");
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 「※ 시험 시작 후 입실 불가합니다 ※」에서 「입실 불가」만 빨강 (원본과 같게)
  const redWords = (text, words) => words.reduce((h, w) => h.split(esc(w)).join(`<span style="color:${C.red}">${esc(w)}</span>`), esc(text));

  function frame(title, titleY, boxY, boxH, inner) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="297mm" height="210mm" class="poster">
      <rect width="${W}" height="${H}" fill="${C.ground}"/>
      <image href="logo.png" x="438" y="22" width="339" height="44" preserveAspectRatio="xMidYMid meet"/>
      <foreignObject x="0" y="${titleY}" width="${W}" height="116"><div xmlns="http://www.w3.org/1999/xhtml" class="pt-title">${esc(title)}</div></foreignObject>
      <rect x="23" y="${boxY}" width="1145" height="${boxH}" fill="#fff"/>
      ${inner}
    </svg>`;
  }

  // 급수별 묶음 → "<파랑>[9급] </파랑>일반행정/교육행정" (여러 급수면 " / "로 이음)
  function seriesHtml(groups) {
    return groups.map(g => (g.grade ? `<span style="color:${g.grade === '7급' ? C.red : C.blue}">[${esc(g.grade)}] </span>` : '') + slash(g.names.join('/'))).join(' / ');
  }

  /** A. 종합 안내 — rows: [{ place, groups:[{grade, names}], text? }] */
  function renderSummary(p, rows) {
    const list = rows.map(r => {
      const color = (r.groups[0] || {}).grade === '7급' ? C.red : C.blue;
      return `<div class="pt-row"><span style="color:${color}">${esc(r.place)} :</span><span>${r.text != null ? slash(r.text) : seriesHtml(r.groups)}</span></div>`;
    }).join('');
    const inner = `<foreignObject x="47" y="198" width="1097" height="607"><div xmlns="http://www.w3.org/1999/xhtml" class="pt-body pt-fit" style="--fs:70px"><div class="pt-inner">
      <p class="pt-l"> ■ 직렬별 고사장</p><div class="pt-gap"></div>
      <div class="pt-list">${list}</div><div class="pt-gap"></div>
      <p class="pt-c pt-small"><mark>${esc(p.desk)}</mark></p></div></div></foreignObject>`;
    return frame(p.title, 66, 182, 639, inner);
  }

  /** B. 고사장 문 앞 — { place, groups, text?, note? } */
  function renderRoom(p, r) {
    const inner = `<foreignObject x="50" y="244" width="1091" height="560"><div xmlns="http://www.w3.org/1999/xhtml" class="pt-body pt-fit" style="--fs:86px"><div class="pt-inner">
      <p class="pt-l"> ■ 장소 : <span style="color:${C.blue}">${esc(r.place)}</span></p><div class="pt-gap"></div>
      <p class="pt-l pt-hang"> ■ 직렬 : <span>${r.text != null ? slash(r.text) : seriesHtml(r.groups)}</span></p><div class="pt-gap"></div>
      ${r.note ? `<p class="pt-c pt-note">${slash(r.note)}</p><div class="pt-gap"></div>` : ''}
      <p class="pt-c pt-entry" style="color:${C.green}">${esc(p.entry)}</p>
      <p class="pt-c pt-small"><mark>${esc(p.desk)}</mark></p>
      <p class="pt-c pt-small">${redWords(p.closed, ['입실 불가'])}</p></div></div></foreignObject>`;
    return frame(p.title, 84, 228, 592, inner);
  }

  /** C. 예비 강의실 */
  function renderSpare(p) {
    const inner = `<foreignObject x="23" y="228" width="1145" height="592"><div xmlns="http://www.w3.org/1999/xhtml" class="pt-spare"><mark>예비 강의실</mark></div></foreignObject>`;
    return frame(p.title, 84, 228, 592, inner);
  }

  // 글이 칸을 넘치면 글자 크기를 줄여 맞춘다 (화면에 붙인 뒤 호출)
  function fit(rootEl) {
    for (const el of rootEl.querySelectorAll('.pt-fit')) {
      const base = parseFloat(el.style.getPropertyValue('--fs')) || 54;
      let fs = base;
      el.style.setProperty('--fs', fs + 'px');
      const fo = el.parentNode, boxH = fo.getAttribute('height') * 1, boxW = fo.getAttribute('width') * 1;
      const inner = el.querySelector('.pt-inner') || el;
      while ((inner.offsetHeight > boxH || inner.scrollWidth > boxW + 1) && fs > base * 0.4) { fs -= 1; el.style.setProperty('--fs', fs + 'px'); }
    }
  }

  // 게시물용 CSS (글꼴: 원본과 같은 나눔스퀘어 ExtraBold / Noto Sans KR Bold — 설치돼 있지 않으면 맑은 고딕)
  const CSS = `
    .poster .pt-title { height: 116px; line-height: 116px; text-align: center; color: ${C.title}; font-size: 92px; letter-spacing: -1px;
      font-family: 'Noto Sans KR','Noto Sans Korean','Noto Sans CJK KR','Malgun Gothic',sans-serif; font-weight: 700; white-space: nowrap; }
    .poster .pt-body { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; color: #000; font-size: var(--fs); line-height: 1.22; overflow: hidden;
      word-break: keep-all; overflow-wrap: anywhere;
      font-family: 'NanumSquare ExtraBold','나눔스퀘어 ExtraBold','NanumSquareExtraBold','NanumSquare','나눔스퀘어','Malgun Gothic',sans-serif; font-weight: 800; }
    .poster .pt-inner { width: 100%; }
    .poster p { margin: 0; }
    .poster .pt-l { text-align: left; }
    .poster .pt-hang { padding-left: 5.3em; text-indent: -5.3em; }
    .poster .pt-c { text-align: center; }
    .poster .pt-gap { height: 0.45em; }
    .poster .pt-note { font-size: 0.82em; }
    .poster .pt-entry { font-size: 1.11em; }
    /* ※ 안내 두 줄은 한 줄로 유지 (글자가 아주 커져도 40px까지만) */
    .poster .pt-small { font-size: min(0.52em, 40px); margin-top: 0.35em; color: ${C.desk}; white-space: nowrap; }
    .poster mark { background: ${C.mark}; color: inherit; padding: 0 0.15em; }
    .poster .pt-list { display: grid; grid-template-columns: max-content 1fr; column-gap: 0.4em; row-gap: 0.12em; padding-left: 1.2em; }
    .poster .pt-row { display: contents; }
    .poster .pt-row > span:first-child { white-space: nowrap; }
    .poster .pt-spare { height: 100%; display: flex; align-items: center; justify-content: center; font-size: 138px;
      font-family: 'Malgun Gothic','맑은 고딕',sans-serif; font-weight: 700; color: #000; }`;

  return { renderSummary, renderRoom, renderSpare, fit, CSS };
});
