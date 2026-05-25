// === LAW API ===
// 국가법령정보 OPEN API 연동.
// 행정사실무법 노트 안의 "제N조" 뱃지를 클릭하면, 해당 소과목에 매핑된 법의
// 그 조문 본문을 우측 floating 패널에 표시한다.
//
// 의존: lawapi-parser.js (LawParser)
//
// 캐시(Localstorage):
//   law:mst:<법령명> = { id, mst, date }                — 법령 메타
//   law:art:<법령명>:<JO>                              = { label, title, content }  — 조문
//
// CORS: law.go.kr OPEN API는 보통 GET 직접 호출 허용. 막히면 콘솔/토스트로 안내.

(() => {
  'use strict';

  const OC = '123';

  // 과목 → 소과목 → 법령명 매핑은 storage.js 의 전역 lawMap 객체에 보관됨.
  // (사용자가 노트 메타의 "기본 법령" 입력으로 자유롭게 편집 + GitHub 동기화)
  function currentLawMap() {
    return (typeof lawMap !== 'undefined' && lawMap && typeof lawMap === 'object') ? lawMap : {};
  }

  // 캐시 키 — 스키마 바뀔 때마다 prefix bump (옛 캐시 자동 무시)
  const K_MST = (lawName)       => `law:mst2:${lawName}`;
  const K_ART = (lawName, jo)   => `law:art2:${lawName}:${jo}`;

  // ─── 노트 컨텍스트 → 법령명 ───────────────────────────────
  // 소과목 매칭 우선, 없으면 과목-수준 기본값(__default)으로 폴백
  function lawNameForCurrent() {
    if (typeof currentId === 'undefined' || !currentId) return null;
    const n = (typeof findNote === 'function') ? findNote(currentId) : null;
    if (!n) return null;
    const map = currentLawMap();
    const m = map[n.subject];
    if (!m) return null;
    if (n.subTopic && m[n.subTopic]) return m[n.subTopic];
    return m['__default'] || null;
  }

  // 뱃지 텍스트에서 직접 법령명 추출 — 시행령/시행규칙 suffix 도 함께 잡음
  //   "(행정사법 제5조)" / "행정심판법 제3조" / "개인정보 보호법 시행령 1조"
  // 반환: { law, suffix } 또는 null
  function lawInfoFromBadge(text) {
    const t = String(text || '').replace(/^[\(\[]|[\)\]]$/g, '').trim();
    const m = t.match(/([가-힣]{1,14}법)(?:\s+(시행령|시행규칙))?\s*제?\s*\d+\s*조/);
    if (!m) return null;
    return { law: m[1], suffix: m[2] || null };
  }
  // 호환용 — 일부 호출처에서 lawName 만 필요할 때
  function lawNameFromBadge(text) {
    const info = lawInfoFromBadge(text);
    return info ? (info.suffix ? `${info.law} ${info.suffix}` : info.law) : null;
  }

  // ─── 다중 조항 파서 ──────────────────────────────────────
  // 토큰 단위(법명/조/항/호)로 walk 하면서 조 단위로 그룹핑.
  // 같은 조의 여러 항/호는 한 그룹에 모두 누적 → 한 화면에 표시.
  //
  //   "제17조 1항, 2항, 4항"                → 1그룹: {jo:17, hangs:[1,2,4]}
  //   "(제17조 1항, 제18조 2항)"           → 2그룹
  //   "(민사소송법 165조, 166조)"           → 2그룹 (둘 다 민사소송법)
  //   "(제7조 민사소송법 89조 준용)"        → 2그룹 (다른 법)
  //
  // 결과: [{ law, jo, hangs:[], hos:[] }, ...]
  // 토큰: 법명 / "시행령"|"시행규칙" / 조 / 항 / 호
  const TOKEN_RE = /[가-힣]{1,14}법|시행령|시행규칙|제?\s*\d+\s*조(?:\s*의\s*\d+)?|제?\s*\d+\s*항|제?\s*\d+\s*호/g;
  function parseRefs(raw) {
    const text = String(raw || '').replace(/^[\(\[]|[\)\]]$/g, '').trim();
    const out = [];
    let curLaw = null;
    let curSuffix = null;   // "시행령" | "시행규칙" | null  — 다음 조에 적용
    let pending = null;
    const flush = () => { if (pending) { out.push(pending); pending = null; } };
    let m;
    TOKEN_RE.lastIndex = 0;
    while ((m = TOKEN_RE.exec(text)) !== null) {
      const tok = m[0].replace(/\s+/g, '');
      if (tok === '시행령' || tok === '시행규칙') {
        // 다음 조에 적용될 접미사. 이전 pending 이 있으면 닫고 새 토큰부터.
        flush();
        curSuffix = tok;
      } else if (/법$/.test(tok)) {
        flush();
        curLaw = tok;
        curSuffix = null;     // 새 법명 만나면 접미사 초기화
      } else if (/조(?:의\d+)?$/.test(tok)) {
        flush();
        // "제7조의2" 같은 가지조항 — \d+ 다음에 "조" 가 끼어 있으므로 정규식 보강
        const mj = tok.match(/(\d+)\s*조(?:\s*의\s*(\d+))?/);
        const main   = String(parseInt(mj[1], 10)).padStart(4, '0');
        const branch = mj[2] ? String(parseInt(mj[2], 10)).padStart(2, '0') : '00';
        pending = {
          law:    curLaw,
          suffix: curSuffix,    // null/시행령/시행규칙
          jo:     main + branch,
          hangs:  [],
          hos:    [],
        };
      } else if (/항$/.test(tok)) {
        const n = parseInt(tok.match(/\d+/)[0], 10);
        if (!pending) continue;
        if (!pending.hangs.includes(n)) pending.hangs.push(n);
      } else if (/호$/.test(tok)) {
        const n = parseInt(tok.match(/\d+/)[0], 10);
        if (!pending) continue;
        if (!pending.hos.includes(n)) pending.hos.push(n);
      }
    }
    flush();
    return out;
  }

  // group → 실제 검색에 쓸 법령명. base + (시행령/시행규칙)
  function resolveLawName(group, ctxLaw) {
    const base = group.law || ctxLaw || '';
    if (!base) return group.suffix || '(미지정)';
    return group.suffix ? `${base} ${group.suffix}` : base;
  }

  function arrayEq(a, b) {
    a = a || []; b = b || [];
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── "[제]N조[의M] [[제]K항] [[제]L호]" → { jo, hang, ho } ──
  // "제5조 제2항", "5조2항", "행정사법5조", "제48조의2" 모두 처리
  function toRefs(rawText) {
    // 우선 한자 법명/괄호는 떼어놓고 숫자+조/항/호만 추출
    const t = String(rawText || '').replace(/\s+/g, '');
    const mJo = t.match(/제?(\d+)조(?:의(\d+))?/);
    if (!mJo) return null;
    const main   = String(parseInt(mJo[1], 10)).padStart(4, '0');
    const branch = mJo[2] ? String(parseInt(mJo[2], 10)).padStart(2, '0') : '00';
    const jo = main + branch;

    // 항/호: 조 뒤쪽 텍스트에서만 검색 (앞에 잘못된 숫자 잡지 않도록)
    const tail  = t.slice(t.indexOf(mJo[0]) + mJo[0].length);
    const mHang = tail.match(/제?(\d+)항/);
    const mHo   = tail.match(/제?(\d+)호/);
    return {
      jo,
      hang: mHang ? parseInt(mHang[1], 10) : null,
      ho:   mHo   ? parseInt(mHo[1],   10) : null,
    };
  }

  // 호환용 — 외부에서 toJO 부르는 곳이 있으면 그대로
  function toJO(rawText) {
    const r = toRefs(rawText);
    return r ? r.jo : null;
  }

  function buildLabel(jo, hang, ho) {
    if (!jo || jo.length !== 6) return '';
    const main   = parseInt(jo.slice(0, 4), 10);
    const branch = parseInt(jo.slice(4, 6), 10);
    // 한국 법령 표기: "제7조의2" (조 다음에 가지) — "제7의2조" 아님
    let s = `제${main}조${branch ? `의${branch}` : ''}`;
    const hangs = Array.isArray(hang) ? hang : (hang ? [hang] : []);
    const hos   = Array.isArray(ho)   ? ho   : (ho   ? [ho]   : []);
    if (hangs.length) s += ' ' + hangs.map(n => `제${n}항`).join(', ');
    if (hos.length)   s += ' ' + hos.map(n => `제${n}호`).join(', ');
    return s;
  }
  const joLabel = (jo) => buildLabel(jo, [], []);

  // ─── URL 빌더 ────────────────────────────────────────────
  function buildSearchUrl(query) {
    const p = new URLSearchParams({
      OC, target: 'law', type: 'JSON', search: '1', display: '20', query,
    });
    return `https://www.law.go.kr/DRF/lawSearch.do?${p}`;
  }
  function buildBodyUrl({ id, mst }, jo, fmt = 'JSON') {
    const p = new URLSearchParams({ OC, target: 'eflaw', type: fmt });
    if (id) p.set('ID', id);
    else if (mst) p.set('MST', mst);
    if (jo) p.set('JO', jo);
    return `https://www.law.go.kr/DRF/lawService.do?${p}`;
  }

  // ─── fetch helpers ───────────────────────────────────────
  async function fetchJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  }

  // ─── MST 확보 (캐시 → 검색) ───────────────────────────────
  async function ensureMst(lawName) {
    const cached = localStorage.getItem(K_MST(lawName));
    if (cached) {
      try { return JSON.parse(cached); } catch (_) {}
    }
    const data = await fetchJson(buildSearchUrl(lawName));
    const items = LawParser.extractLawItems(data);
    if (!items.length) throw new Error(`"${lawName}" 검색 결과 없음`);
    // 정확히 일치하는 법령명 우선, 없으면 첫 번째
    const exact = items.find(it => it.title.replace(/\s+/g, '') === lawName.replace(/\s+/g, ''));
    const pick  = exact || items[0];
    const meta  = { id: pick.id, mst: pick.mst, date: pick.date, title: pick.title };
    localStorage.setItem(K_MST(lawName), JSON.stringify(meta));
    return meta;
  }

  // ─── 조문 fetch — XML → LawParser → 조 노드 raw 캐시 ────────
  async function fetchArticleRaw(lawName, jo) {
    const cacheKey = K_ART(lawName, jo);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const v = JSON.parse(cached);
        if (v && v.raw && (v.raw['조문번호'] !== undefined)) return v;
      } catch (_) {}
    }

    const meta = await ensureMst(lawName);
    const xmlText = await fetchText(buildBodyUrl(meta, jo, 'XML'));
    if (!xmlText.trim().startsWith('<')) {
      throw new Error('잘못된 응답 형식 — OC 키를 확인하세요');
    }
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML 파싱 오류');

    const root = doc.documentElement;
    const wrapped = {
      [root.nodeName]: LawParser.compactValue(LawParser.xmlElementToJson(root)),
    };

    // 트리 어디에 있어도 조문단위를 찾아냄
    function findUnits(node) {
      if (!node || typeof node !== 'object') return null;
      if (node['조문단위'] !== undefined) return node['조문단위'];
      for (const v of Object.values(node)) {
        const r = findUnits(v);
        if (r) return r;
      }
      return null;
    }
    const units = findUnits(wrapped);
    const arr = Array.isArray(units) ? units : (units ? [units] : []);
    if (!arr.length) throw new Error('조문단위를 찾을 수 없음 (응답 구조 확인 필요)');

    const joMain   = String(parseInt(jo.slice(0, 4), 10));
    const joBranch = parseInt(jo.slice(4, 6), 10);
    const article =
      arr.find(u => u && (u['조문여부'] || '') === '조문' &&
         String(parseInt(u['조문번호'] || '0', 10)) === joMain &&
         parseInt(u['조문가지번호'] || '0', 10) === joBranch) ||
      arr.find(u => u && String(parseInt(u['조문번호'] || '0', 10)) === joMain) ||
      arr.find(u => u && (u['조문여부'] || '') === '조문') ||
      arr[0];

    if (!article || article['조문번호'] === undefined) {
      throw new Error(`${joLabel(jo)} 본문을 찾을 수 없음`);
    }

    // 법령 제목 (응답에 있으면 우선)
    function findTitle(node) {
      if (!node || typeof node !== 'object') return null;
      if (node['법령명_한글']) return String(node['법령명_한글']);
      if (node['법령명한글']) return String(node['법령명한글']);
      for (const v of Object.values(node)) {
        const r = findTitle(v);
        if (r) return r;
      }
      return null;
    }
    const lawTitle = findTitle(wrapped) || meta.title || lawName;

    const payload = { lawTitle, raw: article };
    localStorage.setItem(cacheKey, JSON.stringify(payload));
    return payload;
  }

  // 항/호 번호 매칭용 — "1." / "1" / "①" 모두 받아 정수로
  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  function parseHangNo(raw) {
    const s = String(raw || '');
    const c = CIRCLED.indexOf(s.trim()[0]);
    if (c >= 0) return c + 1;
    const m = s.match(/\d+/);
    return m ? parseInt(m[0], 10) : null;
  }

  function asArr(v) {
    return Array.isArray(v) ? v : (v ? [v] : []);
  }

  // hang을 hangs 배열에서 찾기.
  //  - 항번호("①" 등)가 있으면 매칭
  //  - 항이 1개고 항번호가 없으면(제2조처럼 "항":{호:[...]} 형태) hang=1을 그것으로
  //  - 그 외에는 인덱스 fallback
  function findHang(hangs, hang) {
    if (!hangs.length) return null;
    const byNo = hangs.find(h => parseHangNo(h['항번호']) === hang);
    if (byNo) return byNo;
    if (hangs.length === 1 && !hangs[0]['항번호'] && hang === 1) return hangs[0];
    return hangs[hang - 1] || null;
  }

  // hang/ho에 해당하는 부분만 남긴 새 article 객체 반환.
  // hangIn/hoIn 은 number 또는 number[]. 배열이면 여러 항/호를 한 화면에 모두 포함.
  function pickSubArticle(article, hangIn, hoIn) {
    const hangs = Array.isArray(hangIn) ? hangIn : (hangIn ? [hangIn] : []);
    const hos   = Array.isArray(hoIn)   ? hoIn   : (hoIn   ? [hoIn]   : []);
    if (!hangs.length && !hos.length) return article;

    const hangArr = asArr(article['항']);

    // 항 지정 (있을 수도, 호 동시일 수도)
    if (hangs.length) {
      const picked = hangs.map(n => findHang(hangArr, n)).filter(Boolean);
      if (!picked.length) return article;

      // 호도 함께 지정 → 각 항 안에서 해당 호만 필터
      if (hos.length) {
        const filtered = picked.map(h => {
          const hosArr = asArr(h['호']);
          const matched = hos
            .map(n => hosArr.find(x => parseHangNo(x['호번호']) === n))
            .filter(Boolean);
          return { ...h, '호': matched };
        });
        return { ...article, 조문내용: '', '항': filtered };
      }
      return { ...article, 조문내용: '', '항': picked };
    }

    // 호만 지정 — 전 항 통틀어 매칭
    const matchedHos = [];
    for (const h of hangArr) {
      const hosArr = asArr(h['호']);
      for (const n of hos) {
        const x = hosArr.find(y => parseHangNo(y['호번호']) === n);
        if (x && !matchedHos.includes(x)) matchedHos.push(x);
      }
    }
    return { ...article, 조문내용: '', '항': [{ '호': matchedHos }] };
  }

  // 조문내용에서 머리 부분 "제N조(제목)" / "제N조의M(제목)" 제거 → 본문만
  function stripArticleHead(text) {
    return String(text || '').trim()
      .replace(/^제\s*\d+\s*조(?:의\s*\d+)?\s*(?:\([^)]*\))?\s*/, '')
      .trim();
  }

  function normalizeArticle(a, lawTitle) {
    const num    = a['조문번호']     || '';
    const branch = a['조문가지번호'] || '';
    const title  = a['조문제목']     || '';
    const label  = num ? `제${num}${branch ? `의${branch}` : ''}조` : '';

    const rows = [];

    // 1) 조문내용에서 머리 제거한 본문 (있으면)
    const head = stripArticleHead(a['조문내용']);
    if (head) rows.push({ text: head, depth: 0 });

    // 2) 항 → 호 → 목
    const hangs = asArr(a['항']);
    for (const h of hangs) {
      const ht = String(h['항내용'] || '').trim();
      if (ht) rows.push({ text: ht, depth: 0 });
      const hos = asArr(h['호']);
      for (const ho of hos) {
        const hot = String(ho['호내용'] || '').trim();
        if (hot) rows.push({ text: hot, depth: 1 });
        const moks = asArr(ho['목']);
        for (const m of moks) {
          const mt = String(m['목내용'] || '').trim();
          if (mt) rows.push({ text: mt, depth: 2 });
        }
      }
    }

    return { lawTitle, label, title, rows };
  }

  // ─── 패널 렌더 ────────────────────────────────────────────
  function ensurePanel() {
    let overlay = document.getElementById('lawPopupOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'lawPopupOverlay';
    overlay.className = 'law-popup-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="law-popup" role="dialog" aria-modal="true">
        <header class="law-popup-head">
          <div class="law-popup-meta">
            <span class="law-popup-lawname" id="lawPanelLawName">—</span>
            <span class="law-popup-label" id="lawPanelLabel">—</span>
            <div class="law-popup-siblings" id="lawPanelSiblings"></div>
          </div>
          <button class="rail-btn" id="lawPanelClose" title="닫기 (ESC)">✕</button>
        </header>
        <div class="law-popup-title" id="lawPanelTitle"></div>
        <div class="law-popup-body" id="lawPanelBody"></div>
        <footer class="law-popup-foot">
          <span class="law-popup-status" id="lawPanelStatus"></span>
          <button class="rail-btn" id="lawPanelRefresh" title="원격에서 다시 가져오기">↻ 새로고침</button>
        </footer>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#lawPanelClose').addEventListener('click', closePanel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closePanel();   // 배경 클릭으로 닫기
    });
    overlay.querySelector('#lawPanelRefresh').addEventListener('click', () => {
      if (!overlay.dataset.lawName || !overlay.dataset.jo) return;
      localStorage.removeItem(K_ART(overlay.dataset.lawName, overlay.dataset.jo));
      localStorage.removeItem(K_MST(overlay.dataset.lawName));
      let hangs = [], hos = [], sibs = [];
      try { hangs = JSON.parse(overlay.dataset.hangs    || '[]'); } catch (_) {}
      try { hos   = JSON.parse(overlay.dataset.hos      || '[]'); } catch (_) {}
      try { sibs  = JSON.parse(overlay.dataset.siblings || '[]'); } catch (_) {}
      const orig = overlay.dataset.originalLaw || overlay.dataset.lawName;
      openLaw(overlay.dataset.lawName, overlay.dataset.jo, hangs, hos, { siblings: sibs, originalLaw: orig });
    });
    return overlay;
  }

  function closePanel() {
    const p = document.getElementById('lawPopupOverlay');
    if (p) p.hidden = true;
    document.body.classList.remove('law-popup-open');
  }

  function setStatus(msg, kind = '') {
    const el = document.getElementById('lawPanelStatus');
    if (!el) return;
    el.textContent = msg || '';
    el.className = `law-panel-status ${kind}`;
  }

  function renderArticle(article) {
    const $title = document.getElementById('lawPanelTitle');
    const $body  = document.getElementById('lawPanelBody');
    const $label = document.getElementById('lawPanelLabel');
    const $law   = document.getElementById('lawPanelLawName');
    if (!$title) return;
    $law.textContent   = article.lawTitle;
    $label.textContent = article.label;
    $title.textContent = article.title || '(제목 없음)';
    $body.innerHTML = article.rows.length
      ? article.rows.map(r => `<div class="lp-row" data-depth="${r.depth}">${escHtml(r.text)}</div>`).join('')
      : '<div class="lp-empty">본문 없음</div>';
  }

  async function openLaw(lawName, jo, hangIn, hoIn, options = {}) {
    const hangs = Array.isArray(hangIn) ? hangIn : (hangIn ? [hangIn] : []);
    const hos   = Array.isArray(hoIn)   ? hoIn   : (hoIn   ? [hoIn]   : []);
    const siblings    = Array.isArray(options.siblings) ? options.siblings : [];
    const originalLaw = options.originalLaw || lawName;
    const p = ensurePanel();
    p.hidden = false;
    p.dataset.lawName    = lawName;
    p.dataset.jo         = jo;
    p.dataset.hangs      = JSON.stringify(hangs);
    p.dataset.hos        = JSON.stringify(hos);
    p.dataset.siblings   = JSON.stringify(siblings);
    p.dataset.originalLaw = originalLaw;
    document.body.classList.add('law-popup-open');
    document.getElementById('lawPanelLawName').textContent = lawName;
    document.getElementById('lawPanelLabel').textContent   = buildLabel(jo, hangs, hos);
    document.getElementById('lawPanelTitle').textContent   = '';
    document.getElementById('lawPanelBody').innerHTML      = '<div class="lp-loading">불러오는 중…</div>';
    renderSiblings(siblings, { lawName, jo, hangs, hos, originalLaw });
    setStatus('');

    try {
      const { lawTitle, raw } = await fetchArticleRaw(lawName, jo);
      const sub = pickSubArticle(raw, hangs, hos);
      const article = normalizeArticle(sub, lawTitle);
      article.label = buildLabel(jo, hangs, hos);
      renderArticle(article);
      setStatus('완료', 'ok');
    } catch (err) {
      document.getElementById('lawPanelBody').innerHTML =
        `<div class="lp-error">조회 실패: ${escHtml(String(err.message || err))}<br>
         <small>OC 키 또는 CORS 설정을 확인하세요.</small></div>`;
      setStatus('실패', 'error');
    }
  }

  // ─── 뱃지 클릭 핸들러 ─────────────────────────────────────
  function onPreviewClick(e) {
    const tag = e.target.closest('.tag-law');
    if (!tag) return;
    e.preventDefault();
    e.stopPropagation();

    const raw = tag.dataset.raw || tag.textContent || '';
    const ctxLaw = lawNameForCurrent() || '(미지정)';
    const groups = parseRefs(raw);

    // 파싱 실패 → toRefs 단일 fallback
    if (!groups.length) {
      const refs = toRefs(raw) || { jo: '000100' };
      const law  = lawNameFromBadge(raw) || ctxLaw;
      console.log('[LawApi] click (fallback)', { raw, refs, law });
      return openLaw(law, refs.jo, [], [], { siblings: [], originalLaw: ctxLaw });
    }

    const primary = groups[0];
    const law = resolveLawName(primary, ctxLaw);
    const siblings = groups.length > 1 ? groups : [];
    console.log('[LawApi] click', { raw, primary, siblings, ctxLaw, law });
    openLaw(law, primary.jo, primary.hangs, primary.hos, { siblings, originalLaw: ctxLaw });
  }

  // ─── 형제 조항 버튼 렌더 (팝업 헤더) ──────────────────────
  // siblings: parseRefs 결과 group 배열 [{ law, suffix, jo, hangs, hos }, ...]
  function renderSiblings(siblings, current) {
    const $area = document.getElementById('lawPanelSiblings');
    if (!$area) return;
    if (!siblings || siblings.length < 2) { $area.innerHTML = ''; return; }
    const ctxLaw = current.originalLaw;
    $area.innerHTML = siblings.map((g, idx) => {
      const fullLaw = resolveLawName(g, ctxLaw);
      const isActive =
        fullLaw === current.lawName &&
        g.jo === current.jo &&
        arrayEq(g.hangs, current.hangs) &&
        arrayEq(g.hos,   current.hos);
      // 라벨 prefix:
      //   같은 본법 + 시행령/시행규칙 → "시행령 제N조" (간결)
      //   다른 법 → 법명 전체 prefix
      let prefix = '';
      const baseSame = !g.law || g.law === ctxLaw;
      if (baseSame && g.suffix) prefix = `${g.suffix} `;
      else if (!baseSame)       prefix = `${fullLaw} `;
      const lbl = prefix + buildLabel(g.jo, g.hangs, g.hos);
      return `<button class="lp-sib-btn ${isActive ? 'active' : ''}" data-idx="${idx}">${escHtml(lbl)}</button>`;
    }).join('');
    $area.querySelectorAll('.lp-sib-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        const g = siblings[idx];
        if (!g) return;
        const sibLaw = resolveLawName(g, ctxLaw);
        openLaw(sibLaw, g.jo, g.hangs, g.hos, { siblings, originalLaw: ctxLaw });
      });
    });
  }

  // ─── 우클릭 → 법령 링크 해제 ──────────────────────────────
  function onPreviewContext(e) {
    const tag = e.target.closest('.tag-law');
    if (!tag) return;
    e.preventDefault();
    const raw = (tag.dataset.raw || tag.textContent || '').trim();
    if (!raw) return;
    if (!confirm(`"${raw}" 의 법령 링크를 해제할까요?\n(이 노트에서만 적용 — 같은 문구가 다시 나와도 일반 텍스트로 표시)`)) return;
    if (typeof currentId === 'undefined' || !currentId) return;
    const n = (typeof findNote === 'function') ? findNote(currentId) : null;
    if (!n) return;
    const set = new Set(n.lawUnlinks || []);
    set.add(raw);
    n.lawUnlinks = [...set];
    if (typeof saveNotes === 'function') saveNotes();
    if (typeof renderPreview === 'function') renderPreview();
    if (typeof autoPush === 'function' && typeof settings !== 'undefined' && settings.ghAutoSync && settings.ghToken) autoPush();
    if (typeof toast === 'function') toast(`"${raw}" 링크 해제됨`, 'info');
  }

  function bindLawApi() {
    const $preview = document.getElementById('preview');
    if ($preview && !$preview.dataset.lawBound) {
      $preview.addEventListener('click', onPreviewClick);
      $preview.addEventListener('contextmenu', onPreviewContext);
      $preview.dataset.lawBound = '1';
      console.log('[LawApi] preview click + contextmenu handlers bound');
    } else if (!$preview) {
      console.warn('[LawApi] #preview not found — click handler NOT bound');
    }
    // ESC로 닫기
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const p = document.getElementById('lawPopupOverlay');
        if (p && !p.hidden) {
          closePanel();
          document.body.classList.remove('law-popup-open');
          e.stopPropagation();
        }
      }
    }, true);
  }

  // ─── export ──────────────────────────────────────────────
  window.LawApi = { bindLawApi, openLaw, lawNameForCurrent, toJO, get LAW_MAP(){ return currentLawMap(); } };
})();
