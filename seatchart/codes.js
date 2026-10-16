// OMR 과목코드 안내게시물 (B4 가로, 강의실별 1장) — 기획안 §15 D안 「OMR 마킹 예시형」
// OMR 8자리 = 앞 4자리 직렬(과목)코드 + 뒤 4자리 휴대폰 번호 뒷자리.  예) 010-1234-5678 · 9급 일반행정 → 9010 5678
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CodeRender = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const W = 1456, H = 1028;                 // B4 가로 364×257mm × 4
  const C = { g9: '#0070c0', g7: '#e00000', omr: '#c62828', omrBg: '#fff6f6', bar: '#111111', sub: '#fff200' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const gc = g => (g === '7급' ? C.g7 : C.g9);

  // 받은 코드표 그대로 (화면에서 고칠 수 있음)
  const DEFAULT_TABLE = `9급
9010 일반행정
9020 교육행정
9030 세무
9040 중대범죄수사청
9050 공소청
9060 출입국관리
9070 관세
9080 교정
9090 고용노동
9100 선거행정
9110 사회복지
9120 전산
9130 간호
9140 보건
9150 보건진료
9160 보호
9170 공통과목

7급
7010 일반행정
7020 세무
7030 감사
7040 회계
7050 재경
7060 교육행정
7070 교정
7080 중대범죄수사청
7090 공소청
7100 고용노동
7110 선거행정
7120 출입국관리
7130 외무영사
7140 보호
7150 인사조직
7160 일반행정(지방직)
7170 감사(서울시)
7180 세무(서울시)
7190 고용노동(경기도)`;

  // "9급" 줄 아래 "9010 일반행정" 줄들 → { '9급': [{code, name}], '7급': [...] }
  function parseTable(text) {
    const t = {};
    let grade = '';
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const g = /^(\d)\s*급$/.exec(line);
      if (g) { grade = g[1] + '급'; t[grade] = t[grade] || []; continue; }
      const m = /^(\d{3,6})\s+(.+)$/.exec(line);
      if (m) {
        const gg = grade || (m[1][0] + '급');
        (t[gg] = t[gg] || []).push({ code: m[1], name: m[2].trim() });
      }
    }
    return t;
  }

  // 직렬 이름 → 코드. 정확히 같은 이름 → 띄어쓰기·「직」·「과목」 차이 무시 순서로 찾는다
  const norm = s => String(s).replace(/\s+/g, '').replace(/과목$/, '').replace(/직$/, '');
  function lookup(table, grade, name) {
    const list = table[grade] || [];
    return list.find(r => r.name === name) || list.find(r => norm(r.name) === norm(name)) || null;
  }

  function omrHtml(digits) {
    const cols = digits.split('').map((d, i) => {
      const bubbles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => `<div class="k-b${k === +d ? ' on' : ''}">${k}</div>`).join('');
      return `<div class="k-col${i === 3 ? ' k-split' : ''}"><div class="k-box">${esc(d)}</div>${bubbles}</div>`;
    }).join('');
    return `<div class="k-omr"><div class="k-groups"><span>직렬 코드</span><span>휴대폰 번호 뒤 4자리</span></div><div class="k-cols">${cols}</div></div>`;
  }

  /**
   * @param p  { title, sub, foot }
   * @param r  { place, entries: [{grade, name, code|null}], example: {grade, name, code, phone} | null }
   */
  function renderRoom(p, r) {
    const ex = r.example;
    const digits = ex ? (ex.code + ex.phone) : '00005678';
    const list = r.entries.map(e => `<div class="k-row"><span class="k-g" style="color:${gc(e.grade)}">[${esc(e.grade)}]</span><span class="k-code" style="color:${e.code ? gc(e.grade) : '#999'}">${e.code ? esc(e.code) : '코드 없음'}</span><span class="k-nm">${esc(e.name)}</span></div>`).join('');
    const exLine = ex
      ? `예) 휴대폰 010-1234-<b>${esc(ex.phone)}</b> · <span style="color:${gc(ex.grade)}">[${esc(ex.grade)}]</span> ${esc(ex.name)}<br>→ <b class="k-big"><span style="color:${gc(ex.grade)}">${esc(ex.code)}</span> ${esc(ex.phone)}</b>`
      : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="364mm" height="257mm" class="codesheet">
      <rect width="${W}" height="${H}" fill="#fff"/>
      <foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" class="k-page">
        <div class="k-bar"><span class="k-place">${esc(r.place)}</span>${esc(p.title)}</div>
        <div class="k-sub">${esc(p.sub)}</div>
        <div class="k-body">
          <div class="k-left">
            <div class="k-cap">OMR 과목코드 칸 <b>8자리</b> 마킹 방법</div>
            ${omrHtml(digits)}
            <div class="k-ex">${exLine}</div>
          </div>
          <div class="k-right"><div class="k-head">이 강의실 직렬의 과목코드</div><div class="k-list k-fit" style="--fs:60px">${list}</div></div>
        </div>
        <div class="k-foot">${esc(p.foot)}</div>
      </div></foreignObject>
    </svg>`;
  }

  // 코드 목록이 칸을 넘치면 글자를 줄인다
  function fit(rootEl) {
    for (const el of rootEl.querySelectorAll('.k-fit')) {
      let fs = 60;
      el.style.setProperty('--fs', fs + 'px');
      while (el.scrollHeight > el.clientHeight + 1 && fs > 22) { fs -= 1; el.style.setProperty('--fs', fs + 'px'); }
    }
  }

  const CSS = `
    .codesheet .k-page { width: ${W}px; height: ${H}px; display: flex; flex-direction: column; color: #111;
      font-family: 'NanumSquare ExtraBold','나눔스퀘어 ExtraBold','NanumSquareExtraBold','NanumSquare','나눔스퀘어','Malgun Gothic',sans-serif; font-weight: 800; word-break: keep-all; }
    .codesheet .k-bar { margin: 36px 36px 0; background: ${C.bar}; color: #fff; text-align: center; font-size: 64px; line-height: 1; padding: 26px 0; letter-spacing: -1px; }
    .codesheet .k-place { color: #ffd400; margin-right: 24px; }
    .codesheet .k-sub { margin: 0 36px; background: ${C.sub}; text-align: center; font-size: 30px; padding: 12px 0; }
    .codesheet .k-body { flex: 1; display: grid; grid-template-columns: 620px 1fr; gap: 40px; padding: 30px 48px 10px; min-height: 0; }
    .codesheet .k-cap { font-size: 30px; text-align: center; margin-bottom: 10px; color: ${C.omr}; }
    .codesheet .k-omr { border: 4px solid ${C.omr}; border-radius: 14px; background: ${C.omrBg}; padding: 12px 14px 16px; }
    .codesheet .k-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 8px; text-align: center; font-size: 22px; }
    .codesheet .k-groups span { padding: 4px 0; border-radius: 6px; color: #fff; background: ${C.omr}; }
    .codesheet .k-groups span + span { background: #555; }
    .codesheet .k-cols { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
    .codesheet .k-col { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .codesheet .k-split { margin-right: 10px; }
    .codesheet .k-box { width: 100%; text-align: center; font-size: 38px; font-family: 'Arial Black','Arial',sans-serif; font-weight: 900; border: 3px solid ${C.omr}; background: #fff; margin-bottom: 4px; }
    .codesheet .k-b { width: 46px; height: 27px; border-radius: 50%; border: 2px solid ${C.omr}; color: ${C.omr}; font-size: 17px; line-height: 23px; text-align: center; font-family: Arial, sans-serif; font-weight: 700; }
    .codesheet .k-b.on { background: #111; border-color: #111; color: #111; }
    .codesheet .k-ex { margin-top: 18px; font-size: 30px; line-height: 1.45; text-align: center; }
    .codesheet .k-big { font-size: 52px; font-family: 'Arial Black','Arial',sans-serif; letter-spacing: 2px; }
    .codesheet .k-right { display: flex; flex-direction: column; min-height: 0; }
    .codesheet .k-head { font-size: 34px; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 4px solid #111; }
    .codesheet .k-list { flex: 1; min-height: 0; overflow: hidden; font-size: var(--fs); line-height: 1.3; }
    .codesheet .k-row { display: grid; grid-template-columns: auto auto 1fr; column-gap: 0.4em; align-items: baseline; border-bottom: 2px solid #e6e6e6; padding: 0.06em 0; }
    .codesheet .k-g { font-size: 0.6em; }
    .codesheet .k-code { font-family: 'Arial Black','Arial',sans-serif; font-weight: 900; letter-spacing: 0.02em; }
    .codesheet .k-foot { text-align: center; font-size: 30px; color: ${C.omr}; padding: 6px 0 30px; }`;

  return { DEFAULT_TABLE, parseTable, lookup, renderRoom, fit, CSS };
});
