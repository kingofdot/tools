'use strict';
/* global Node */

/**
 * LawParser — 법령 본문 파싱 모듈
 * 국가법령정보 OPEN API 응답(JSON/XML)을 정규화·구조화한다.
 */
const LawParser = (() => {

  /* ── 법령 목록 추출 ───────────────────────────────────────────── */

  function extractLawItems(payload) {
    const results = [];
    function visit(node) {
      if (!node || results.length >= 20) return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (typeof node !== 'object') return;
      const title  = node['법령명한글'] || node['법령명'] || node['법령명_한글'];
      const id     = node['법령ID']     || node['ID'];
      const mst    = node['법령일련번호'] || node['MST'];
      const date   = node['시행일자']   || node['공포일자'] || '';
      const number = node['공포번호']   || '';
      if (title && (id || mst)) {
        results.push({
          title:  String(title),
          id:     id     ? String(id)     : '',
          mst:    mst    ? String(mst)    : '',
          date:   date   ? String(date)   : '',
          number: number ? String(number) : ''
        });
      }
      Object.values(node).forEach(visit);
    }
    visit(payload);
    const seen = new Set();
    return results.filter(item => {
      const key = `${item.title}|${item.id}|${item.mst}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractLawTitle(payload, selectedItem) {
    const law = payload && payload.법령 ? payload.법령 : null;
    return (
      (payload && (payload['법령명_한글'] || payload['법령명한글'] || payload['법령명'])) ||
      (law && law['법령명_한글']) ||
      (selectedItem && selectedItem.title) ||
      '법령 본문'
    );
  }

  /* ── 텍스트 정규화 ───────────────────────────────────────────── */

  function normalizeLooseText(value) {
    return String(value || '')
      .replace(/\r/g, '\n')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function restoreBrokenWordSpacing(text) {
    return String(text || '')
      .replace(/할수/g,    '할 수').replace(/될수/g,    '될 수').replace(/할때/g,    '할 때')
      .replace(/한후/g,    '한 후').replace(/한경우/g,  '한 경우').replace(/하는경우/g,'하는 경우')
      .replace(/될경우/g,  '될 경우').replace(/수있는/g, '수 있는').replace(/수있도록/g,'수 있도록')
      .replace(/수있다/g,  '수 있다').replace(/재 활용/g,'재활용').replace(/시 행령/g, '시행령')
      .replace(/시 행규칙/g,'시행규칙').replace(/물 질/g,  '물질').replace(/유해성물 질/g,'유해성물질')
      .replace(/폐기 물/g, '폐기물').replace(/재 사용/g, '재사용').replace(/재 활/g,  '재활')
      .replace(/기 준/g,   '기준').replace(/규 격/g,   '규격').replace(/공 정/g,   '공정')
      .replace(/처 리/g,   '처리').replace(/제 조/g,   '제조').replace(/함 유/g,   '함유')
      .replace(/오 염/g,   '오염').replace(/설 치/g,   '설치').replace(/운 영/g,   '운영');
  }

  /* ── 별표내용 구조 분석 ──────────────────────────────────────── */

  // 가-하.  패턴은 뒤에 실제 내용이 있어야 마커로 인정
  // (예: "다." 는 문장 종결어미이므로 마커가 아님)
  const APPENDIX_MARKER_REGEXES = [
    /^■\s*/, /^비고\b/, /^[0-9]+\.\s*/, /^[가-하]\.\s+\S/,
    /^[0-9]+\)\s*/, /^\([0-9]+\)\s*/, /^[가-하]\)\s*/, /^[ㄱ-ㅎ]\.\s+\S/,
    /^\([가-하]\)\s*/,
    /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/,
    /^[㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻]\s*/,
    /^(항목|단위|기준|비고)\b/, /^\d{2}(?:-\d{2}){1,3}\s*/
  ];

  function isAppendixMarker(line) {
    return APPENDIX_MARKER_REGEXES.some(r => r.test(line));
  }

  function getAppendixIndent(line) {
    if (/^■\s*/.test(line) || /^비고\b/.test(line))                return '';
    if (/^[0-9]+\.\s*/.test(line))                                 return '';
    if (/^[가-하]\.\s+\S/.test(line))                             return '  ';
    if (/^[0-9]+\)\s*/.test(line))                                 return '    ';
    if (/^[가-하]\)\s*/.test(line))                               return '      ';
    if (/^\([0-9]+\)\s*/.test(line))                               return '        ';
    if (/^\([가-하]\)\s*/.test(line))                              return '          ';
    if (/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/.test(line)) return '          ';
    if (/^[㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻]\s*/.test(line))       return '            ';
    if (/^\d{2}(?:-\d{2}){1,3}\s*/.test(line))                    return '      ';
    return '';
  }

  function splitInlineMarkers(text) {
    return String(text || '')
      .replace(/\s+([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s+/g, '\n$1 ')
      .replace(/\s+([㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻])\s+/g,     '\n$1 ')
      .replace(/\s+(\([0-9]+\))\s+/g,  '\n$1 ')
      .replace(/\s+(\([가-하]\))\s+/g, '\n$1 ')
      .replace(/\s+([0-9]+\))\s+/g,    '\n$1 ')
      .replace(/\s+([가-하]\))\s+/g,   '\n$1 ');
  }

  /* ── 표 감지 및 파싱 ────────────────────────────────────────── */

  /**
   * 박스 드로잉 문자(┌│├└ 등)로 구성된 표를 파싱한다.
   * 헤더를 키로 사용한 객체 배열을 반환한다.
   * @returns {null | { prefix, data: Array<Object>, note? }}
   */
  function extractEmbeddedTable(text) {
    if (!text || !text.includes('┌') || !text.includes('│')) return null;

    const tableStart = text.indexOf('┌');
    const tableEnd   = text.lastIndexOf('┘');
    if (tableEnd === -1 || tableEnd < tableStart) return null;

    const prefix    = text.slice(0, tableStart).trim();
    const tableText = text.slice(tableStart, tableEnd + 1);
    const rawNote   = text.slice(tableEnd + 1).trim();

    // 경계 행(─ 포함, │ 미포함)을 줄바꿈으로 치환 후 데이터 행만 추출
    const cleaned   = tableText.replace(/[┌├└][^│\n]+[┐┤┘]/g, '\n');
    const dataLines = cleaned.split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('│'));

    if (dataLines.length < 2) return null; // 헤더만 있으면 표로 보지 않음

    const rows    = dataLines.map(l => l.split('│').map(c => c.trim()).filter(Boolean));
    const headers = rows[0];

    // 헤더를 키로 사용한 객체 배열
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    });

    const result = { prefix, data };
    if (rawNote) result.note = rawNote;
    return result;
  }

  function buildAppendixItems(lines) {
    const ITEM_MATCHERS = [
      { depth: 0, type: 'title',          regex: /^(■)\s*(.+)$/ },
      { depth: 0, type: 'note',           regex: /^(비고)\s*(.*)$/ },
      { depth: 0, type: 'number',         regex: /^([0-9]+\.)\s*(.+)$/ },
      { depth: 1, type: 'korean-dot',     regex: /^([가-힣]\.)\s+(.+)$/ },
      { depth: 2, type: 'number-paren',   regex: /^([0-9]+\))\s*(.+)$/ },
      { depth: 3, type: 'korean-paren',   regex: /^([가-힣]\))\s*(.+)$/ },
      { depth: 4, type: 'wrapped-number', regex: /^(\([0-9]+\))\s*(.+)$/ },
      { depth: 5, type: 'wrapped-korean', regex: /^(\([가-힣]\))\s*(.+)$/ },
      { depth: 5, type: 'circled-number', regex: /^([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\s*(.+)$/ },
      { depth: 6, type: 'circled-korean', regex: /^([㉮㉯㉰㉱㉲㉳㉴㉵㉶㉷㉸㉹㉺㉻])\s*(.+)$/ },
      { depth: 3, type: 'code',           regex: /^(\d{2}(?:-\d{2}){1,3})\s*(.+)$/ }
    ];

    return lines.map(line => {
      const trimmed = String(line || '').trim();
      let item;

      for (const m of ITEM_MATCHERS) {
        const matched = trimmed.match(m.regex);
        if (matched) {
          // line 필드 제외 — text가 동일 정보를 담음
          item = { depth: m.depth, type: m.type, marker: matched[1], text: (matched[2] || '').trim() };
          break;
        }
      }
      if (!item) item = { depth: null, type: 'text', marker: '', text: trimmed };

      // 박스 드로잉 표 감지 → 데이터 구조로 교체
      const table = extractEmbeddedTable(item.text);
      if (table) {
        item.text  = table.prefix;   // 표 앞 레이블만 남김
        item.table = table.data;     // [{항목: ..., 용출농도: ...}, ...]
        if (table.note) item.note = table.note;
      }

      return item;
    });
  }

  /* ── 블록형 표 파싱 (┏┃┠┗ / ┌│├└ 멀티라인 스타일) ─────────── */

  function parseBlockTable(tableLines) {
    // 데이터 행: ┃ 또는 │ 로 시작하는 행
    const dataLines = tableLines.filter(l => /^[┃│]/.test(l));
    if (!dataLines.length) return null;

    const rawRows = dataLines.map(line => {
      // 앞 ┃/│ 제거, 뒤 ┃ 제거
      const inner = line.replace(/^[┃│]/, '').replace(/[┃]$/, '');
      return inner.split('│').map(c => c.trim());
    });

    // 이어지는 행 병합: 첫 열이 비어있으면 이전 행에 텍스트 추가
    const merged = [];
    for (const row of rawRows) {
      if (row[0] === '' && merged.length > 0) {
        const prev = merged[merged.length - 1];
        for (let i = 0; i < row.length; i++) {
          if (row[i]) {
            prev[i] = prev[i]
              ? `${prev[i]} ${row[i]}`.replace(/\s+/g, ' ').trim()
              : row[i];
          }
        }
      } else if (row.some(c => c !== '')) {
        merged.push([...row]);
      }
    }

    if (!merged.length) return null;

    const headers  = merged[0];
    const maxCols  = Math.max(...merged.map(r => r.length));
    while (headers.length < maxCols) headers.push(`col${headers.length}`);

    // ○ 불릿 항목을 배열로 분리
    const splitBullets = val => {
      if (!val || !val.includes('○')) return val;
      const parts = val.split('○').map(s => s.trim()).filter(Boolean);
      return parts.length > 1 ? parts : val;
    };

    const data = merged.slice(1)
      .map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          const v = row[i] ?? '';
          if (v) obj[h] = splitBullets(v);
        });
        return obj;
      })
      .filter(obj => Object.keys(obj).length > 0);

    return data.length ? data : null;
  }

  /* ── 텍스트 세그먼트 처리 (기존 로직) ──────────────────────── */

  function processTextSegment(rawLines) {
    const lines = [];
    rawLines.forEach(line => {
      if (!line) return;
      if (!lines.length) { lines.push(getAppendixIndent(line) + line); return; }
      if (isAppendixMarker(line)) { lines.push(getAppendixIndent(line) + line); return; }
      lines[lines.length - 1] = `${lines[lines.length - 1]}${line}`.replace(/\s+/g, ' ').trim();
    });
    const formatted  = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!formatted) return [];
    const normalized = restoreBrokenWordSpacing(splitInlineMarkers(formatted));
    return normalized.split('\n').map(l => l.replace(/\s+$/g, '')).filter(Boolean);
  }

  function formatAppendixText(value) {
    const rawLines = String(value || '').replace(/\r/g, '\n').split('\n');

    // Step 1: ┏...┗ 블록형 표와 일반 텍스트를 분리
    // (┌...┘ 인라인 표는 텍스트 안에 포함되어 buildAppendixItems→extractEmbeddedTable 에서 처리)
    const segments = [];
    let mode       = 'text';
    let tableLines = [];
    let textLines  = [];

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (mode === 'text' && /^┏/.test(line)) {
        if (textLines.length) { segments.push({ type: 'text',  lines: textLines }); textLines = []; }
        mode       = 'table';
        tableLines = [line];
      } else if (mode === 'table') {
        tableLines.push(line);
        if (/^┗/.test(line)) {
          segments.push({ type: 'table', lines: tableLines });
          tableLines = [];
          mode = 'text';
        }
      } else {
        textLines.push(line);
      }
    }
    // 닫히지 않은 표도 처리
    if (tableLines.length) segments.push({ type: 'table', lines: tableLines });
    if (textLines.length)  segments.push({ type: 'text',  lines: textLines  });

    // Step 2: 세그먼트별 파싱
    const allItems = [];

    for (const segment of segments) {
      if (segment.type === 'table') {
        const data = parseBlockTable(segment.lines);
        if (data) {
          allItems.push({ depth: null, type: 'table-block', marker: '', text: '', table: data });
        }
      } else {
        const normLines = processTextSegment(segment.lines);
        allItems.push(...buildAppendixItems(normLines));
      }
    }

    return allItems;
  }

  /* ── XML → JSON 변환 ────────────────────────────────────────── */

  function compactValue(value, keyName = '') {
    if (Array.isArray(value)) {
      return value
        .map(item => compactValue(item, keyName))
        .filter(item => {
          if (item !== '' && item !== null && item !== undefined) {
            // 서식 별표 제거 (이미지/HWP 첨부 양식, 법령 내용 아님)
            if (item && typeof item === 'object' && item['별표구분'] === '서식') return false;
            return true;
          }
          return false;
        });
    }
    if (value && typeof value === 'object') {
      const result = {};
      Object.entries(value).forEach(([key, val]) => {
        const compacted = compactValue(val, key);
        const emptyObj  = compacted && typeof compacted === 'object' && !Array.isArray(compacted) && Object.keys(compacted).length === 0;
        const emptyArr  = Array.isArray(compacted) && compacted.length === 0;
        if (compacted !== '' && compacted !== null && compacted !== undefined && !emptyObj && !emptyArr) {
          result[key] = compacted;
        }
      });
      return result;
    }
    if (typeof value === 'string') {
      return keyName === '별표내용' ? formatAppendixText(value) : normalizeLooseText(value);
    }
    return value;
  }

  function xmlElementToJson(element) {
    const children  = Array.from(element.children || []);
    const textParts = Array.from(element.childNodes || [])
      .filter(n => n.nodeType === Node.TEXT_NODE || n.nodeType === Node.CDATA_SECTION_NODE)
      .map(n => n.nodeValue || '')
      .filter(t => t && t.trim());

    if (!children.length) return textParts.join('\n');

    const result = {};
    if (textParts.length) {
      const tv = textParts.join('\n');
      if (tv) result._text = tv;
    }
    children.forEach(child => {
      const key = child.nodeName;
      const val = xmlElementToJson(child);
      if (Object.prototype.hasOwnProperty.call(result, key)) {
        if (!Array.isArray(result[key])) result[key] = [result[key]];
        result[key].push(val);
      } else {
        result[key] = val;
      }
    });
    return compactValue(result);
  }

  /* ── public API ─────────────────────────────────────────────── */

  return {
    extractLawItems,
    extractLawTitle,
    normalizeLooseText,
    formatAppendixText,
    compactValue,
    xmlElementToJson
  };
})();
