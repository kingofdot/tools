// Variation A: Paper Library
// Cream paper, serif body, academic gōshi-note feel.
// 2-column: subject rail (left) + notes+editor (right)

const paperA = {
  bg: "#f5efe3",
  paper: "#faf5e9",
  paperDeep: "#efe6d2",
  ink: "#1d2a24",
  inkSoft: "#3d4a42",
  inkFaint: "#6b7169",
  rule: "#d9cfb8",
  ruleSoft: "#e8dfc8",
  accent: "#2b5240",      // fountain-pen green
  accentSoft: "#456e5a",
  lawBg: "#e8eef1",
  lawInk: "#2c4a6b",
  caseBg: "#f0e6dc",
  caseInk: "#7a4a2a",
  hit: "#f5e07a",
};

function RenderTreeA({ nodes, search, depth = 0 }) {
  if (!nodes || !nodes.length) return null;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {nodes.map((n, i) => (
        <NodeA key={i} node={n} idx={i} depth={depth} search={search} />
      ))}
    </ol>
  );
}

function NodeA({ node, idx, depth, search }) {
  const marker = node.isBody ? "" : markerFor(depth, idx);
  const tokens = highlightText(node.text, { search });

  // Typography by depth
  const headerLevel = !node.isBody && node.children.length > 0;
  const styleByDepth = [
    // depth 0 — big roman, section break
    { fontFamily: '"Gowun Batang", "Noto Serif KR", serif', fontSize: 22, fontWeight: 700, color: paperA.ink,
      marginTop: 26, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${paperA.rule}`, letterSpacing: "-0.01em" },
    // depth 1
    { fontFamily: '"Gowun Batang", "Noto Serif KR", serif', fontSize: 17, fontWeight: 600, color: paperA.ink,
      marginTop: 14, marginBottom: 6 },
    // depth 2
    { fontFamily: '"Gowun Batang", "Noto Serif KR", serif', fontSize: 15, fontWeight: 600, color: paperA.inkSoft,
      marginTop: 8, marginBottom: 4 },
    // depth 3+
    { fontFamily: '"Gowun Batang", "Noto Serif KR", serif', fontSize: 14.5, fontWeight: 400, color: paperA.inkSoft,
      marginTop: 4, marginBottom: 2, lineHeight: 1.7 },
  ];
  const s = styleByDepth[Math.min(depth, 3)];
  const bodyStyle = node.isBody ? {
    fontFamily: '"Gowun Batang", "Noto Serif KR", serif',
    fontSize: 14,
    fontStyle: "italic",
    color: paperA.inkFaint,
    borderLeft: `2px solid ${paperA.rule}`,
    paddingLeft: 10,
    margin: "6px 0",
    lineHeight: 1.7,
  } : {};

  const markerStyle = {
    fontFamily: depth === 0 ? '"Gowun Batang", serif' : '"Gowun Batang", serif',
    color: depth === 0 ? paperA.accent : paperA.inkFaint,
    fontWeight: depth === 0 ? 700 : 500,
    marginRight: 10,
    minWidth: depth === 0 ? 32 : 24,
    display: "inline-block",
    flexShrink: 0,
  };

  return (
    <li style={{ paddingLeft: depth === 0 ? 0 : 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", ...s, ...bodyStyle }}>
        {marker && <span style={markerStyle}>{marker}</span>}
        <span style={{ flex: 1 }}>
          {tokens.map((t, j) => {
            if (t.type === "law") return <LawBadgeA key={j}>{t.text}</LawBadgeA>;
            if (t.type === "case") return <CaseBadgeA key={j}>{t.text}</CaseBadgeA>;
            if (t.type === "hit") return <mark key={j} style={{ background: paperA.hit, color: paperA.ink, padding: "0 2px", borderRadius: 2 }}>{t.text}</mark>;
            return <span key={j}>{t.text}</span>;
          })}
        </span>
      </div>
      {node.children.length > 0 && <RenderTreeA nodes={node.children} depth={depth + 1} search={search} />}
    </li>
  );
}

function LawBadgeA({ children }) {
  return (
    <span style={{
      display: "inline-block",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: "0.82em",
      background: paperA.lawBg,
      color: paperA.lawInk,
      padding: "1px 7px",
      borderRadius: 3,
      margin: "0 2px",
      verticalAlign: "baseline",
      letterSpacing: "0.02em",
      border: `1px solid ${paperA.lawInk}22`,
    }}>{children}</span>
  );
}

function CaseBadgeA({ children }) {
  return (
    <span style={{
      display: "inline-block",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: "0.82em",
      background: paperA.caseBg,
      color: paperA.caseInk,
      padding: "1px 7px",
      borderRadius: 3,
      margin: "0 2px",
      fontStyle: "italic",
      letterSpacing: "0.02em",
      border: `1px solid ${paperA.caseInk}22`,
    }}>{children}</span>
  );
}

function VariationA() {
  const [activeSubject, setActiveSubject] = React.useState("행정사실무법");
  const [activeNoteId, setActiveNoteId] = React.useState("2026-04-23T15-31-19");
  const [search, setSearch] = React.useState("");
  const [mode, setMode] = React.useState("view"); // view | edit

  const subjectNotes = SAMPLE_NOTES.filter(n => n.subject === activeSubject);
  const activeNote = SAMPLE_NOTES.find(n => n.id === activeNoteId) || subjectNotes[0];
  const tree = React.useMemo(() => activeNote ? parseBody(activeNote.body) : [], [activeNote]);

  // Count notes per subject
  const countBySubject = Object.fromEntries(
    SUBJECTS.map(s => [s, SAMPLE_NOTES.filter(n => n.subject === s).length])
  );

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "grid",
      gridTemplateColumns: "220px 280px 1fr",
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      background: paperA.bg,
      color: paperA.ink,
      overflow: "hidden",
    }}>
      {/* ── Subject rail ── */}
      <div style={{
        background: paperA.paperDeep,
        borderRight: `1px solid ${paperA.rule}`,
        padding: "24px 0",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "0 22px 18px", borderBottom: `1px solid ${paperA.rule}` }}>
          <div style={{
            fontFamily: '"Gowun Batang", serif',
            fontSize: 20, fontWeight: 700, color: paperA.accent,
            letterSpacing: "-0.02em",
          }}>學習錄</div>
          <div style={{ fontSize: 11, color: paperA.inkFaint, marginTop: 2, letterSpacing: "0.1em" }}>
            STUDY&nbsp;·&nbsp;2026
          </div>
        </div>

        <div style={{ padding: "16px 14px 8px", fontSize: 10, color: paperA.inkFaint, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
          과목
        </div>
        <div style={{ padding: "0 10px" }}>
          {SUBJECTS.map((s, i) => {
            const active = s === activeSubject;
            return (
              <button key={s} onClick={() => setActiveSubject(s)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", background: active ? paperA.paper : "transparent",
                border: "none",
                borderLeft: `3px solid ${active ? paperA.accent : "transparent"}`,
                padding: "11px 12px",
                cursor: "pointer",
                fontFamily: '"Gowun Batang", serif',
                fontSize: 15,
                color: active ? paperA.ink : paperA.inkSoft,
                fontWeight: active ? 600 : 400,
                textAlign: "left",
                borderRadius: 0,
                transition: "all .12s",
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap", wordBreak: "keep-all" }}>
                  <span style={{
                    fontFamily: "serif", fontSize: 12, fontStyle: "italic",
                    color: active ? paperA.accent : paperA.inkFaint,
                    fontWeight: 400, width: 14,
                  }}>{ROMAN_LOWER(i)}</span>
                  {s}
                </span>
                <span style={{ fontSize: 11, color: paperA.inkFaint, fontFamily: "JetBrains Mono, monospace" }}>
                  {countBySubject[s]}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", padding: "16px 22px", borderTop: `1px solid ${paperA.rule}`, fontSize: 11, color: paperA.inkFaint, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6b8e4e", display: "inline-block" }} />
            동기화됨
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10 }}>
            04.24 12:46
          </span>
        </div>
      </div>

      {/* ── Note list ── */}
      <div style={{
        background: paperA.paper,
        borderRight: `1px solid ${paperA.rule}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${paperA.rule}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div style={{ fontFamily: '"Gowun Batang", serif', fontSize: 18, fontWeight: 700, whiteSpace: "nowrap", wordBreak: "keep-all" }}>{activeSubject}</div>
            <button style={{
              border: `1px solid ${paperA.accent}`, background: "transparent", color: paperA.accent,
              fontSize: 11, padding: "3px 9px", borderRadius: 3, cursor: "pointer",
              fontFamily: "Pretendard, sans-serif", letterSpacing: "0.05em",
            }}>＋ 새 노트</button>
          </div>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색… (주제·본문·두문자)" style={{
              width: "100%",
              border: `1px solid ${paperA.rule}`,
              background: paperA.paperDeep,
              padding: "7px 12px 7px 30px",
              borderRadius: 3,
              fontSize: 12,
              fontFamily: "Pretendard, sans-serif",
              color: paperA.ink,
              outline: "none",
              boxSizing: "border-box",
            }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: paperA.inkFaint }}>⌕</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {subjectNotes.map(n => {
            const active = n.id === activeNote?.id;
            return (
              <button key={n.id} onClick={() => setActiveNoteId(n.id)} style={{
                display: "block", width: "100%",
                background: active ? paperA.paperDeep : "transparent",
                border: "none",
                borderBottom: `1px solid ${paperA.ruleSoft}`,
                padding: "12px 20px",
                cursor: "pointer",
                textAlign: "left",
                position: "relative",
              }}>
                {active && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: paperA.accent }} />}
                <div style={{
                  fontFamily: '"Gowun Batang", serif',
                  fontSize: 14, fontWeight: 600, color: paperA.ink,
                  marginBottom: 4, lineHeight: 1.3,
                }}>{n.topic}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {n.mnemonic && (
                    <span style={{
                      fontFamily: '"Gowun Batang", serif',
                      fontSize: 11,
                      background: paperA.accent,
                      color: paperA.paper,
                      padding: "1px 7px",
                      borderRadius: 2,
                      letterSpacing: "0.05em",
                    }}>{n.mnemonic}</span>
                  )}
                  <span style={{ fontSize: 10, color: paperA.inkFaint, fontFamily: "JetBrains Mono, monospace" }}>
                    {formatDate(n.updatedAt)}
                  </span>
                </div>
              </button>
            );
          })}
          {!subjectNotes.length && (
            <div style={{ padding: "40px 20px", textAlign: "center", color: paperA.inkFaint, fontSize: 12 }}>
              노트가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* ── Editor / Viewer ── */}
      <div style={{
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        background: paperA.paper,
      }}>
        {/* Toolbar */}
        <div style={{
          padding: "14px 32px",
          borderBottom: `1px solid ${paperA.rule}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: paperA.paper,
        }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", fontSize: 11, color: paperA.inkFaint, letterSpacing: "0.08em" }}>
            <span style={{ textTransform: "uppercase" }}>{activeSubject}</span>
            <span>›</span>
            <span>{activeNote?.topic}</span>
          </div>
          <div style={{ display: "flex", gap: 4, background: paperA.paperDeep, padding: 3, borderRadius: 4, border: `1px solid ${paperA.rule}` }}>
            {["view", "edit"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                border: "none",
                background: mode === m ? paperA.paper : "transparent",
                color: mode === m ? paperA.accent : paperA.inkFaint,
                fontSize: 11, padding: "4px 12px", borderRadius: 3, cursor: "pointer",
                fontFamily: "Pretendard, sans-serif", fontWeight: mode === m ? 600 : 400,
                letterSpacing: "0.05em",
                boxShadow: mode === m ? `0 1px 2px rgba(0,0,0,.06)` : "none",
              }}>{m === "view" ? "📖 보기" : "✏ 편집"}</button>
            ))}
          </div>
        </div>

        {/* Paper */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "40px 64px 80px",
          background: `
            repeating-linear-gradient(180deg, transparent 0 31px, ${paperA.ruleSoft} 31px 32px),
            ${paperA.paper}
          `,
          backgroundAttachment: "local",
        }}>
          {activeNote && (
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
              {/* Title block */}
              <div style={{ marginBottom: 32, paddingBottom: 18, borderBottom: `2px solid ${paperA.accent}` }}>
                <div style={{ fontSize: 10, color: paperA.accent, letterSpacing: "0.2em", fontWeight: 700, marginBottom: 6 }}>
                  {activeNote.subject.toUpperCase()}
                </div>
                <h1 style={{
                  fontFamily: '"Gowun Batang", serif',
                  fontSize: 32, fontWeight: 700, color: paperA.ink,
                  margin: 0, letterSpacing: "-0.02em", lineHeight: 1.2,
                }}>{activeNote.topic}</h1>
                {activeNote.mnemonic && (
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: paperA.inkFaint, letterSpacing: "0.15em", fontWeight: 600 }}>두문자</span>
                    <span style={{
                      fontFamily: '"Gowun Batang", serif',
                      fontSize: 18, fontWeight: 700, color: paperA.accent,
                      background: paperA.paperDeep,
                      padding: "3px 14px",
                      borderRadius: 2,
                      letterSpacing: "0.3em",
                      border: `1px solid ${paperA.accent}44`,
                    }}>{activeNote.mnemonic}</span>
                  </div>
                )}
              </div>

              {mode === "view" ? (
                <RenderTreeA nodes={tree} search={search} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <textarea defaultValue={activeNote.body} style={{
                    width: "100%", minHeight: 500,
                    border: `1px solid ${paperA.rule}`, borderRadius: 3,
                    padding: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace",
                    color: paperA.ink, background: paperA.paperDeep,
                    outline: "none", resize: "none",
                    lineHeight: 1.6,
                  }} />
                  <div style={{ border: `1px solid ${paperA.rule}`, borderRadius: 3, padding: 14, background: paperA.paper, overflowY: "auto", maxHeight: 500 }}>
                    <RenderTreeA nodes={tree} search={search} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 48, paddingTop: 18, borderTop: `1px solid ${paperA.rule}`, fontSize: 11, color: paperA.inkFaint, display: "flex", justifyContent: "space-between" }}>
                <span>수정일 · {formatDate(activeNote.updatedAt)}</span>
                <span style={{ fontFamily: '"Gowun Batang", serif', fontStyle: "italic" }}>— fin —</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ROMAN_LOWER(i) {
  return ["i","ii","iii","iv","v","vi","vii","viii"][i] || String(i+1);
}

window.VariationA = VariationA;
