// Variation B: Modern Codex — dark, refined, legal-library feel
// gold accents on deep navy, serif for body, sans UI

const codexB = {
  bg: "#0f1419",
  panel: "#161d25",
  panelRaised: "#1c242e",
  border: "#2a3541",
  borderSoft: "#1f2832",
  ink: "#e8e3d4",
  inkSoft: "#a8a495",
  inkFaint: "#6b7280",
  accent: "#c9a961",        // aged gold
  accentSoft: "#8a7242",
  lawBg: "#1a2b3f",
  lawInk: "#7fb3e0",
  caseBg: "#2a1f1a",
  caseInk: "#d4a474",
  hit: "rgba(201, 169, 97, 0.35)",
};

function RenderTreeB({ nodes, search, depth = 0 }) {
  if (!nodes || !nodes.length) return null;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {nodes.map((n, i) => <NodeB key={i} node={n} idx={i} depth={depth} search={search} />)}
    </ol>
  );
}

function NodeB({ node, idx, depth, search }) {
  const marker = node.isBody ? "" : markerFor(depth, idx);
  const tokens = highlightText(node.text, { search });

  const depthStyles = [
    { font: '22px "Noto Serif KR", serif', weight: 700, color: codexB.ink, mt: 28, mb: 12, uc: true, ls: "0.05em", fs: 15 },
    { font: '17px "Noto Serif KR", serif', weight: 600, color: codexB.ink, mt: 16, mb: 7, fs: 17 },
    { font: '15px "Noto Serif KR", serif', weight: 500, color: codexB.inkSoft, mt: 9, mb: 4, fs: 15 },
    { font: '14.5px "Noto Serif KR", serif', weight: 400, color: codexB.inkSoft, mt: 4, mb: 2, fs: 14.5 },
  ];
  const s = depthStyles[Math.min(depth, 3)];

  const boxStyle = depth === 0 ? {
    display: "flex", alignItems: "baseline",
    marginTop: s.mt, marginBottom: s.mb,
    paddingBottom: 10, borderBottom: `1px solid ${codexB.border}`,
    fontSize: s.fs, fontWeight: s.weight, color: s.color,
    fontFamily: '"Noto Serif KR", serif',
    letterSpacing: s.ls || 0,
  } : {
    display: "flex", alignItems: "baseline",
    marginTop: s.mt, marginBottom: s.mb,
    fontSize: s.fs, fontWeight: s.weight, color: s.color,
    fontFamily: '"Noto Serif KR", serif',
    lineHeight: 1.7,
  };

  const bodyStyle = node.isBody ? {
    fontStyle: "italic", color: codexB.inkFaint,
    borderLeft: `2px solid ${codexB.accentSoft}`, paddingLeft: 12,
    margin: "6px 0", fontSize: 14,
  } : {};

  const markerStyle = {
    color: depth === 0 ? codexB.accent : codexB.accentSoft,
    fontWeight: 600,
    marginRight: 12, minWidth: depth === 0 ? 36 : 24,
    display: "inline-block", flexShrink: 0,
    fontFamily: depth === 0 ? '"Noto Serif KR", serif' : '"Noto Serif KR", serif',
    fontStyle: depth >= 2 ? "italic" : "normal",
  };

  return (
    <li style={{ paddingLeft: depth === 0 ? 0 : 20 }}>
      <div style={{ ...boxStyle, ...bodyStyle }}>
        {marker && <span style={markerStyle}>{marker}</span>}
        <span style={{ flex: 1 }}>
          {tokens.map((t, j) => {
            if (t.type === "law") return <LawBadgeB key={j}>{t.text}</LawBadgeB>;
            if (t.type === "case") return <CaseBadgeB key={j}>{t.text}</CaseBadgeB>;
            if (t.type === "hit") return <mark key={j} style={{ background: codexB.hit, color: codexB.accent, padding: "0 3px", borderRadius: 2 }}>{t.text}</mark>;
            return <span key={j}>{t.text}</span>;
          })}
        </span>
      </div>
      {node.children.length > 0 && <RenderTreeB nodes={node.children} depth={depth + 1} search={search} />}
    </li>
  );
}

function LawBadgeB({ children }) {
  return <span style={{
    display: "inline-block",
    fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78em",
    background: codexB.lawBg, color: codexB.lawInk,
    padding: "1px 8px", borderRadius: 2, margin: "0 3px",
    border: `1px solid ${codexB.lawInk}33`,
    letterSpacing: "0.02em", verticalAlign: "baseline",
  }}>{children}</span>;
}
function CaseBadgeB({ children }) {
  return <span style={{
    display: "inline-block",
    fontFamily: '"JetBrains Mono", monospace', fontSize: "0.78em",
    background: codexB.caseBg, color: codexB.caseInk,
    padding: "1px 8px", borderRadius: 2, margin: "0 3px",
    border: `1px solid ${codexB.caseInk}33`,
    fontStyle: "italic", letterSpacing: "0.02em",
  }}>{children}</span>;
}

function VariationB() {
  const [activeSubject, setActiveSubject] = React.useState("민법");
  const [activeNoteId, setActiveNoteId] = React.useState("2026-04-23T15-17-48");
  const [search, setSearch] = React.useState("");
  const [mode, setMode] = React.useState("view");

  const subjectNotes = SAMPLE_NOTES.filter(n => n.subject === activeSubject);
  const activeNote = SAMPLE_NOTES.find(n => n.id === activeNoteId) || subjectNotes[0];
  const tree = React.useMemo(() => activeNote ? parseBody(activeNote.body) : [], [activeNote]);
  const countBySubject = Object.fromEntries(SUBJECTS.map(s => [s, SAMPLE_NOTES.filter(n => n.subject === s).length]));

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "grid", gridTemplateColumns: "240px 300px 1fr",
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      background: codexB.bg, color: codexB.ink, overflow: "hidden",
    }}>
      {/* Subject rail */}
      <div style={{ background: codexB.panel, borderRight: `1px solid ${codexB.border}`, padding: "24px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, border: `1.5px solid ${codexB.accent}`, display: "flex", alignItems: "center", justifyContent: "center", transform: "rotate(45deg)" }}>
              <span style={{ transform: "rotate(-45deg)", color: codexB.accent, fontFamily: '"Noto Serif KR", serif', fontSize: 14, fontWeight: 700 }}>律</span>
            </div>
            <div>
              <div style={{ fontFamily: '"Noto Serif KR", serif', fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>Codex</div>
              <div style={{ fontSize: 10, color: codexB.inkFaint, letterSpacing: "0.2em", marginTop: -2 }}>行政士 MMXXVI</div>
            </div>
          </div>
        </div>

        <div style={{ padding: "12px 18px 8px", fontSize: 10, color: codexB.inkFaint, letterSpacing: "0.2em", fontWeight: 600, borderTop: `1px solid ${codexB.border}` }}>
          SUBJECTS
        </div>
        <div style={{ padding: "6px 10px" }}>
          {SUBJECTS.map((s, i) => {
            const active = s === activeSubject;
            return (
              <button key={s} onClick={() => setActiveSubject(s)} style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                background: active ? codexB.panelRaised : "transparent",
                border: "none",
                padding: "10px 12px", cursor: "pointer", textAlign: "left",
                borderRadius: 4,
                color: active ? codexB.ink : codexB.inkSoft,
                marginBottom: 2,
                position: "relative",
              }}>
                {active && <span style={{ position: "absolute", left: -10, top: 8, bottom: 8, width: 2, background: codexB.accent }} />}
                <span style={{
                  fontFamily: '"Noto Serif KR", serif', fontSize: 11, fontStyle: "italic",
                  color: active ? codexB.accent : codexB.inkFaint,
                  width: 18,
                }}>{String(i+1).padStart(2, "0")}</span>
                <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 500 : 400, whiteSpace: "nowrap", wordBreak: "keep-all" }}>{s}</span>
                <span style={{ fontSize: 10, color: codexB.inkFaint, fontFamily: "JetBrains Mono, monospace" }}>{countBySubject[s]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: "auto", padding: "14px 24px", borderTop: `1px solid ${codexB.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10, color: codexB.inkFaint, letterSpacing: "0.08em" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7ec896" }} />
            SYNCED
          </span>
          <span style={{ fontFamily: "JetBrains Mono, monospace" }}>12:46</span>
        </div>
      </div>

      {/* Notes list */}
      <div style={{ background: codexB.panel, borderRight: `1px solid ${codexB.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 22px 14px", borderBottom: `1px solid ${codexB.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: codexB.accent, letterSpacing: "0.2em", fontWeight: 600 }}>VOL. {SUBJECTS.indexOf(activeSubject)+1}</div>
              <div style={{ fontFamily: '"Noto Serif KR", serif', fontSize: 18, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", wordBreak: "keep-all" }}>{activeSubject}</div>
            </div>
            <button style={{
              border: `1px solid ${codexB.accent}`, background: "transparent", color: codexB.accent,
              fontSize: 10, padding: "4px 10px", cursor: "pointer",
              letterSpacing: "0.15em", fontWeight: 600, fontFamily: "Pretendard, sans-serif",
            }}>+ NEW</button>
          </div>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes…" style={{
              width: "100%", border: `1px solid ${codexB.border}`, background: codexB.bg,
              padding: "7px 12px 7px 30px", fontSize: 12, borderRadius: 3, color: codexB.ink,
              fontFamily: "Pretendard, sans-serif", outline: "none", boxSizing: "border-box",
            }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: codexB.inkFaint, fontSize: 12 }}>⌕</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {subjectNotes.map((n, i) => {
            const active = n.id === activeNote?.id;
            return (
              <button key={n.id} onClick={() => setActiveNoteId(n.id)} style={{
                display: "block", width: "100%",
                background: active ? codexB.panelRaised : "transparent",
                border: "none",
                borderBottom: `1px solid ${codexB.borderSoft}`,
                padding: "14px 22px", cursor: "pointer", textAlign: "left", position: "relative",
              }}>
                {active && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: codexB.accent }} />}
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: '"Noto Serif KR", serif', fontStyle: "italic", fontSize: 11, color: codexB.accent }}>§{i+1}</span>
                  <span style={{ fontFamily: '"Noto Serif KR", serif', fontSize: 14, fontWeight: 500, color: codexB.ink, flex: 1, lineHeight: 1.3 }}>{n.topic}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 22 }}>
                  {n.mnemonic && (
                    <span style={{
                      fontFamily: '"Noto Serif KR", serif', fontSize: 10,
                      color: codexB.accent, letterSpacing: "0.25em",
                      border: `1px solid ${codexB.accent}66`, padding: "1px 8px",
                    }}>{n.mnemonic}</span>
                  )}
                  <span style={{ fontSize: 10, color: codexB.inkFaint, fontFamily: "JetBrains Mono, monospace" }}>{formatDate(n.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reader */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: codexB.bg }}>
        <div style={{ padding: "14px 36px", borderBottom: `1px solid ${codexB.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 10, color: codexB.inkFaint, letterSpacing: "0.12em" }}>
            <span>{activeSubject.toUpperCase()}</span>
            <span>/</span>
            <span style={{ color: codexB.inkSoft }}>{activeNote?.topic}</span>
          </div>
          <div style={{ display: "flex", gap: 0, border: `1px solid ${codexB.border}`, borderRadius: 3, overflow: "hidden" }}>
            {["view", "edit"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                border: "none", background: mode === m ? codexB.accent : "transparent",
                color: mode === m ? codexB.bg : codexB.inkSoft,
                fontSize: 10, padding: "5px 14px", cursor: "pointer",
                letterSpacing: "0.15em", fontWeight: 600, fontFamily: "Pretendard, sans-serif",
              }}>{m === "view" ? "READ" : "EDIT"}</button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "48px 48px 80px" }}>
          {activeNote && (
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontSize: 10, color: codexB.accent, letterSpacing: "0.3em", fontWeight: 700, marginBottom: 10, fontFamily: '"Noto Serif KR", serif' }}>
                  ─ {activeNote.subject} ─
                </div>
                <h1 style={{ fontFamily: '"Noto Serif KR", serif', fontSize: 36, fontWeight: 700, margin: 0, lineHeight: 1.15, letterSpacing: "-0.01em" }}>
                  {activeNote.topic}
                </h1>
                {activeNote.mnemonic && (
                  <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: "0 0 40px", height: 1, background: codexB.accent }} />
                    <span style={{ fontSize: 10, color: codexB.inkFaint, letterSpacing: "0.25em" }}>MNEMONIC</span>
                    <span style={{ fontFamily: '"Noto Serif KR", serif', fontSize: 20, fontWeight: 700, color: codexB.accent, letterSpacing: "0.3em" }}>
                      {activeNote.mnemonic}
                    </span>
                  </div>
                )}
                <div style={{ marginTop: 18, height: 1, background: `linear-gradient(90deg, ${codexB.accent}, transparent)` }} />
              </div>

              {mode === "view" ? (
                <RenderTreeB nodes={tree} search={search} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                  <textarea defaultValue={activeNote.body} style={{
                    width: "100%", minHeight: 500,
                    border: `1px solid ${codexB.border}`, borderRadius: 3,
                    padding: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace",
                    color: codexB.ink, background: codexB.panel,
                    outline: "none", resize: "none", lineHeight: 1.6,
                  }} />
                  <div style={{ border: `1px solid ${codexB.border}`, borderRadius: 3, padding: 14, background: codexB.panel, overflowY: "auto", maxHeight: 500 }}>
                    <RenderTreeB nodes={tree} search={search} />
                  </div>
                </div>
              )}

              <div style={{ marginTop: 56, paddingTop: 18, borderTop: `1px solid ${codexB.border}`, fontSize: 10, color: codexB.inkFaint, display: "flex", justifyContent: "space-between", letterSpacing: "0.1em" }}>
                <span>UPDATED · {formatDate(activeNote.updatedAt)}</span>
                <span style={{ fontFamily: '"Noto Serif KR", serif', fontStyle: "italic", color: codexB.accentSoft }}>❦</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.VariationB = VariationB;
