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

  // 과목 → 소과목 → 법령명
  const LAW_MAP = {
    '행정사실무법': {
      '행정사법':       '행정사법',
      '행정심판':       '행정심판법',
      '비송사건절차법': '비송사건절차법',
    },
  };

  // 캐시 키
  const K_MST = (lawName)       => `law:mst:${lawName}`;
  const K_ART = (lawName, jo)   => `law:art:${lawName}:${jo}`;

  // ─── 노트 컨텍스트 → 법령명 ───────────────────────────────
  function lawNameForCurrent() {
    if (typeof currentId === 'undefined' || !currentId) return null;
    const n = (typeof findNote === 'function') ? findNote(currentId) : null;
    if (!n) return null;
    const m = LAW_MAP[n.subject];
    if (!m) return null;
    return m[n.subTopic] || null;
  }

  // 뱃지 텍스트에서 직접 법령명 추출: "(행정사법 제5조)" / "행정심판법 제3조" 등
  function lawNameFromBadge(text) {
    const t = String(text || '').replace(/^[\(\[]|[\)\]]$/g, '').trim();
    const m = t.match(/([가-힣]{2,15}법)\s*제\s*\d+\s*조/);
    return m ? m[1] : null;
  }

  function escHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ─── "제N조[의M] [제K항] [제L호]" → { jo, hang, ho } ──────
  function toRefs(rawText) {
    const t = String(rawText || '').replace(/\s+/g, '');
    const mJo = t.match(/제(\d+)조(?:의(\d+))?/);
    if (!mJo) return null;
    const main   = String(parseInt(mJo[1], 10)).padStart(4, '0');
    const branch = mJo[2] ? String(parseInt(mJo[2], 10)).padStart(2, '0') : '00';
    const jo = main + branch;

    // 한자 숫자(①②…) 또는 아라비아 모두 처리. 항·호 둘 다 있으면 둘 다 추출
    const mHang = t.match(/제(\d+)항/);
    const mHo   = t.match(/제(\d+)호/);
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
    let s = `제${main}${branch ? `의${branch}` : ''}조`;
    if (hang) s += ` 제${hang}항`;
    if (ho)   s += ` 제${ho}호`;
    return s;
  }
  const joLabel = (jo) => buildLabel(jo, null, null);

  // ─── URL 빌더 ────────────────────────────────────────────
  function buildSearchUrl(query) {
    const p = new URLSearchParams({
      OC, target: 'law', type: 'JSON', search: '1', display: '20', query,
    });
    return `https://www.law.go.kr/DRF/lawSearch.do?${p}`;
  }
  function buildBodyUrl({ id, mst }, jo, fmt = 'XML') {
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

  // ─── 조문 fetch — raw 조 노드를 캐시 (필터는 표시 단계에서) ──
  async function fetchArticleRaw(lawName, jo) {
    const cacheKey = K_ART(lawName, jo);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { return JSON.parse(cached); } catch (_) {}
    }
    const meta = await ensureMst(lawName);
    const xmlText = await fetchText(buildBodyUrl(meta, jo, 'XML'));
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML 파싱 오류');
    const root = doc.documentElement;
    const tree = LawParser.compactValue(LawParser.xmlElementToJson(root));

    const article = findFirstArticle(tree);
    if (!article) throw new Error(`${joLabel(jo)} 본문을 찾을 수 없음`);

    const payload = { lawTitle: meta.title || lawName, raw: article };
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

  // hang/ho에 해당하는 부분만 남긴 새 article 객체 반환
  function pickSubArticle(article, hang, ho) {
    if (!hang && !ho) return article;
    const hangs = asArr(article['항']);

    // 항만 지정 (호 없음) → 해당 항 + 그 안의 모든 호 유지
    if (hang && !ho) {
      const found = hangs.find(h => parseHangNo(h['항번호']) === hang) || hangs[hang - 1];
      if (!found) return article;
      return { ...article, 조문내용: '', '항': [found] };
    }

    // ho만 지정 → 모든 항을 뒤져 호번호 매칭
    if (!hang && ho) {
      for (const h of hangs) {
        const hos = asArr(h['호']);
        const hoFound = hos.find(x => parseHangNo(x['호번호']) === ho);
        if (hoFound) {
          return {
            ...article,
            조문내용: '',
            '항': [{ '항내용': '', '호': [hoFound] }],
          };
        }
      }
      return article;
    }

    // hang + ho 둘 다
    const hangFound = hangs.find(h => parseHangNo(h['항번호']) === hang) || hangs[hang - 1];
    if (!hangFound) return article;
    const hos = asArr(hangFound['호']);
    const hoFound = hos.find(x => parseHangNo(x['호번호']) === ho);
    return {
      ...article,
      조문내용: '',
      '항': [{ '항내용': '', '호': hoFound ? [hoFound] : [] }],
    };
  }

  function findFirstArticle(node) {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const v of node) {
        const r = findFirstArticle(v);
        if (r) return r;
      }
      return null;
    }
    if (node['조문번호'] || node['조문제목']) return node;
    for (const v of Object.values(node)) {
      const r = findFirstArticle(v);
      if (r) return r;
    }
    return null;
  }

  function normalizeArticle(a, lawTitle) {
    const num    = a['조문번호']     || '';
    const branch = a['조문가지번호'] || '';
    const title  = a['조문제목']     || '';
    const label  = num ? `제${num}${branch ? `의${branch}` : ''}조` : '';

    // 항/호/목을 평탄화 — depth 포함
    const rows = [];
    if (Array.isArray(a['항']) && a['항'].length) {
      a['항'].forEach(항 => flattenHang(항, 0, rows));
    } else {
      const content = String(a['조문내용'] || '').trim();
      content.split('\n').map(s => s.trim()).filter(Boolean)
        .forEach(text => rows.push({ text, depth: 0 }));
    }
    return { lawTitle, label, title, rows };
  }

  function flattenHang(node, depth, out) {
    const text = String(node['항내용'] || node['호내용'] || node['목내용'] || '').trim();
    if (text) out.push({ text, depth });
    (node['호'] || []).forEach(h => flattenHang(h, depth + 1, out));
    (node['목'] || []).forEach(m => flattenHang(m, depth + 1, out));
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
      const hang = overlay.dataset.hang ? parseInt(overlay.dataset.hang, 10) : null;
      const ho   = overlay.dataset.ho   ? parseInt(overlay.dataset.ho,   10) : null;
      openLaw(overlay.dataset.lawName, overlay.dataset.jo, hang, ho);
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

  async function openLaw(lawName, jo, hang = null, ho = null) {
    const p = ensurePanel();
    p.hidden = false;
    p.dataset.lawName = lawName;
    p.dataset.jo      = jo;
    p.dataset.hang    = hang || '';
    p.dataset.ho      = ho   || '';
    document.body.classList.add('law-popup-open');
    document.getElementById('lawPanelLawName').textContent = lawName;
    document.getElementById('lawPanelLabel').textContent   = buildLabel(jo, hang, ho);
    document.getElementById('lawPanelTitle').textContent   = '';
    document.getElementById('lawPanelBody').innerHTML      = '<div class="lp-loading">불러오는 중…</div>';
    setStatus('');

    try {
      const { lawTitle, raw } = await fetchArticleRaw(lawName, jo);
      const sub = pickSubArticle(raw, hang, ho);
      const article = normalizeArticle(sub, lawTitle);
      // 항/호 지정이 있으면 라벨에 반영
      article.label = buildLabel(jo, hang, ho);
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
    const refs = toRefs(raw) || { jo: '000100', hang: null, ho: null };
    console.log('[LawApi] click', { raw, refs, currentId: typeof currentId !== 'undefined' ? currentId : null });
    const law = lawNameForCurrent() || lawNameFromBadge(raw) || '(미지정)';
    openLaw(law, refs.jo, refs.hang, refs.ho);
  }

  function bindLawApi() {
    const $preview = document.getElementById('preview');
    if ($preview && !$preview.dataset.lawBound) {
      $preview.addEventListener('click', onPreviewClick);
      $preview.dataset.lawBound = '1';
      console.log('[LawApi] preview click handler bound');
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
  window.LawApi = { bindLawApi, openLaw, lawNameForCurrent, toJO, LAW_MAP };
})();
