// Variation C: Study Desk — cream paper but warmer, with an index-card
// "sticky tab" feel for subjects and a subtle handwritten accent.
// Departs from A/B with horizontal subject tabs + card-deck notes list.

const deskC = {
  bg: "#ecdfc8",              // envelope tan (outer)
  paper: "#fbf6ea",           // page
  paperAlt: "#f4ecd8",
  ink: "#2a241d",
  inkSoft: "#4a4036",
  inkFaint: "#8a7f6e",
  rule: "#d4c4a5",
  ruleSoft: "#e6dcc4",
  accent: "#b4472e",           // vermillion seal red
  accentDark: "#8a3420",
  green: "#52734d",
  lawBg: "#e4ecef",
  lawInk: "#2c4a6b",
  caseBg: "#f0e0d0",
  caseInk: "#7a3e1e",
  hit: "#f5d97a",
  tabColors: ["#c6877a", "#a8b576", "#d9b06c", "#7ba2b2"],
};

function RenderTreeC({ nodes, search, depth = 0 }) {
  if (!nodes || !nodes.length) return null;
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {nodes.map((n, i) => <NodeC key={i} node={n} idx={i} depth={depth} search={search} />)}
    </ol>
  );
}

function NodeC({ node, idx, depth, search }) {
  const marker = node.isBody ? "" : markerFor(depth, idx);
  const tokens = highlightText(node.text, { search });

  const specs = [
    { fz: 24, fw: 700, mt: 30, mb: 12, color: deskC.ink, family: '"Gowun Batang", serif' },
    { fz: 17, fw: 600, mt: 14, mb: 6, color: deskC.ink, family: '"Gowun Batang", serif' },
    { fz: 15, fw: 500, mt: 8, mb: 4, color: deskC.inkSoft, family: '"Gowun Batang", serif' },
    { fz: 14.5, fw: 400, mt: 4, mb: 2, color: deskC.inkSoft, family: '"Gowun Batang", serif' },
  ];
  const s = specs[Math.min(depth, 3)];

  const headingBox = depth === 0 ? {
    display: "flex", alignItems: "center", gap: 12,
    marginTop: s.mt, marginBottom: s.mb,
    paddingBottom: 10,
    position: "relative",
  } : { display: "flex", alignItems: "baseline", marginTop: s.mt, marginBottom: s.mb, lineHeight: 1.7 };

  const bodyStyle = node.isBody ? {
    fontStyle: "italic", color: deskC.inkFaint,
    borderLeft: `3px double ${deskC.rule}`, paddingLeft: 12,
    margin: "6px 0",
  } : {};

  const markerStyle = depth === 0 ? {
    fontFamily: '"Gowun Batang", serif', fontSize: 22, fontWeight: 700,
    color: deskC.paper,
    background: deskC.accent,
    width: 40, height: 40, borderRadius: 4,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
    letterSpacing: 0,
    boxShadow: "0 2px 0 rgba(0,0,0,0.1)",
  } : {
    color: depth === 1 ? deskC.accent : deskC.inkFaint,
    fontWeight: depth === 1 ? 700 : 500,
    marginRight: 10, minWidth: 24,
    display: "inline-block", flexShrink: 0,
    fontFamily: '"Gowun Batang", serif',
  };

  return (
    <li style={{ paddingLeft: depth === 0 ? 0 : 18 }}>
      <div style={{
        ...headingBox, ...bodyStyle,
        fontSize: s.fz, fontWeight: s.fw, color: s.color, fontFamily: s.family,
      }}>
        {marker && <span style={markerStyle}>{marker}</span>}
        <span style={{ flex: 1 }}>
          {tokens.map((t, j) => {
            if (t.type === "law") return <LawBadgeC key={j}>{t.text}</LawBadgeC>;
            if (t.type === "case") return <CaseBadgeC key={j}>{t.text}</CaseBadgeC>;
            if (t.type === "hit") return <mark key={j} style={{ background: deskC.hit, color: deskC.ink, padding: "0 2px" }}>{t.text}</mark>;
            return <span key={j}>{t.text}</span>;
          })}
        </span>
      </div>
      {depth === 0 && <div style={{ height: 2, background: deskC.accent, opacity: 0.2, marginBottom: 8, marginLeft: 52 }} />}
      {node.children.length > 0 && <RenderTreeC nodes={node.children} depth={depth + 1} search={search} />}
    </li>
  );
}

function LawBadgeC({ children }) {
  return <span style={{
    display: "inline-block", fontFamily: '"JetBrains Mono", monospace',
    fontSize: "0.8em", background: deskC.lawBg, color: deskC.lawInk,
    padding: "1px 8px", margin: "0 2px", border: `1px solid ${deskC.lawInk}33`,
    borderRadius: 2, letterSpacing: "0.02em",
  }}>{children}</span>;
}
function CaseBadgeC({ children }) {
  return <span style={{
    display: "inline-block", fontFamily: '"JetBrains Mono", monospace',
    fontSize: "0.8em", background: deskC.caseBg, color: deskC.caseInk,
    padding: "1px 8px", margin: "0 2px", border: `1px solid ${deskC.caseInk}33`,
    borderRadius: 2, fontStyle: "italic", letterSpacing: "0.02em",
  }}>{children}</span>;
}

function VariationC() {
  const [activeSubject, setActiveSubject] = React.useState("사무관리론");
  const [activeNoteId, setActiveNoteId] = React.useState("2026-04-23T15-39-43");
  const [search, setSearch] = React.useState("");
  const [mode, setMode] = React.useState("view");

  const subjectNotes = SAMPLE_NOTES.filter(n => n.subject === activeSubject);
  const activeNote = SAMPLE_NOTES.find(n => n.id === activeNoteId) || subjectNotes[0];
  const tree = React.useMemo(() => activeNote ? parseBody(activeNote.body) : [], [activeNote]);
  const countBySubject = Object.fromEntries(SUBJECTS.map(s => [s, SAMPLE_NOTES.filter(n => n.subject === s).length]));
  const activeIdx = SUBJECTS.indexOf(activeSubject);

  return (
    <div style={{
      width: "100%", height: "100%",
      fontFamily: 'Pretendard, -apple-system, sans-serif',
      background: deskC.bg, color: deskC.ink,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        padding: "12px 20px 0",
        background: deskC.bg,
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, paddingBottom: 10 }}>
          <div style={{
            width: 34, height: 34, background: deskC.accent, color: deskC.paper,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: '"Gowun Batang", serif', fontSize: 18, fontWeight: 700,
            borderRadius: 3, boxShadow: "0 2px 0 rgba(0,0,0,0.12)",
          }}>學</div>
          <div>
            <div style={{ fontFamily: '"Gowun Batang", serif', fontSize: 16, fontWeight: 700 }}>공부록</div>
            <div style={{ fontSize: 10, color: deskC.inkFaint, letterSpacing: "0.15em" }}>행정사 2026</div>
          </div>
        </div>

        {/* Subject tabs (file folder tabs) */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, flex: 1, justifyContent: "center", paddingBottom: 0 }}>
          {SUBJECTS.map((s, i) => {
            const active = s === activeSubject;
            const color = deskC.tabColors[i];
            return (
              <button key={s} onClick={() => setActiveSubject(s)} style={{
                border: "none",
                whiteSpace: "nowrap",
                wordBreak: "keep-all",
                background: active ? deskC.paper : color,
                color: active ? deskC.ink : "#fff",
                padding: active ? "12px 22px 14px" : "9px 20px 11px",
                fontFamily: '"Gowun Batang", serif',
                fontSize: active ? 15 : 13.5,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                borderRadius: "6px 6px 0 0",
                marginBottom: active ? -1 : 0,
                position: "relative",
                zIndex: active ? 2 : 1,
                boxShadow: active ? "0 -2px 4px rgba(0,0,0,0.06)" : "inset 0 -3px 0 rgba(0,0,0,0.12)",
                borderTop: active ? `3px solid ${color}` : "none",
                paddingTop: active ? 9 : 9,
                transition: "all .1s",
              }}>
                <span style={{ fontSize: 10, color: active ? color : "rgba(255,255,255,0.75)", marginRight: 8, letterSpacing: "0.1em", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
                  {String(i+1).padStart(2,"0")}
                </span>
                {s}
                <span style={{
                  fontSize: 9, marginLeft: 8,
                  background: active ? color : "rgba(255,255,255,0.25)",
                  color: active ? "#fff" : "#fff",
                  padding: "1px 6px", borderRadius: 10,
                  fontFamily: "JetBrains Mono, monospace",
                }}>{countBySubject[s]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10 }}>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="검색…" style={{
              border: `1px solid ${deskC.rule}`, background: deskC.paper,
              padding: "6px 12px 6px 28px", fontSize: 12, borderRadius: 3,
              width: 180, fontFamily: "Pretendard, sans-serif", outline: "none",
              color: deskC.ink,
            }} />
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: deskC.inkFaint }}>⌕</span>
          </div>
          <button style={{ border: "none", background: "transparent", color: deskC.inkSoft, fontSize: 16, cursor: "pointer", padding: 4 }}>⌨</button>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: deskC.inkFaint }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: deskC.green }} />
          </div>
        </div>
      </div>

      {/* Main: card deck + page */}
      <div style={{
        flex: 1, display: "grid", gridTemplateColumns: "300px 1fr",
        background: deskC.paper,
        borderTop: `3px solid ${deskC.tabColors[activeIdx]}`,
        overflow: "hidden",
      }}>
        {/* Card deck */}
        <div style={{
          background: deskC.paperAlt,
          borderRight: `1px solid ${deskC.rule}`,
          padding: "20px 16px",
          overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px" }}>
            <div style={{ fontSize: 10, color: deskC.inkFaint, letterSpacing: "0.2em", fontWeight: 600 }}>
              NOTES · {subjectNotes.length}
            </div>
            <button style={{
              border: `1px dashed ${deskC.accent}`, background: "transparent",
              color: deskC.accent, fontSize: 11, padding: "3px 10px",
              fontFamily: '"Gowun Batang", serif', cursor: "pointer", borderRadius: 3,
            }}>＋ 추가</button>
          </div>

          {subjectNotes.map((n, i) => {
            const active = n.id === activeNote?.id;
            return (
              <button key={n.id} onClick={() => setActiveNoteId(n.id)} style={{
                textAlign: "left", border: "none",
                background: active ? deskC.paper : "#fff",
                padding: "14px 16px", cursor: "pointer",
                borderRadius: 4,
                boxShadow: active
                  ? `0 0 0 2px ${deskC.accent}, 0 4px 10px rgba(0,0,0,0.08)`
                  : "0 1px 2px rgba(0,0,0,0.06)",
                borderLeft: `4px solid ${deskC.tabColors[activeIdx]}`,
                position: "relative",
                transition: "all .12s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: deskC.inkFaint, letterSpacing: "0.08em" }}>
                    No. {String(i+1).padStart(3, "0")}
                  </span>
                  <span style={{ fontSize: 10, color: deskC.inkFaint, fontFamily: "JetBrains Mono, monospace" }}>
                    {formatDate(n.updatedAt)}
                  </span>
                </div>
                <div style={{ fontFamily: '"Gowun Batang", serif', fontSize: 15, fontWeight: 600, color: deskC.ink, lineHeight: 1.3, marginBottom: 8 }}>
                  {n.topic}
                </div>
                {n.mnemonic && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: deskC.inkFaint, letterSpacing: "0.2em", fontWeight: 600 }}>MNEM</span>
                    <span style={{
                      fontFamily: '"Gowun Batang", serif', fontSize: 12, fontWeight: 700,
                      color: deskC.accent, letterSpacing: "0.2em",
                    }}>{n.mnemonic}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Page */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: deskC.paper }}>
          <div style={{ padding: "12px 30px", borderBottom: `1px solid ${deskC.rule}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: deskC.paperAlt }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: deskC.inkFaint }}>
              <span style={{ width: 6, height: 6, background: deskC.tabColors[activeIdx], borderRadius: "50%" }} />
              <span style={{ letterSpacing: "0.1em" }}>{activeSubject}</span>
              <span>/</span>
              <span style={{ color: deskC.inkSoft, fontFamily: '"Gowun Batang", serif' }}>{activeNote?.topic}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", border: `1px solid ${deskC.rule}`, borderRadius: 3, overflow: "hidden", background: deskC.paper }}>
                {["view", "edit"].map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    border: "none",
                    background: mode === m ? deskC.accent : "transparent",
                    color: mode === m ? deskC.paper : deskC.inkSoft,
                    fontSize: 11, padding: "5px 14px", cursor: "pointer",
                    fontFamily: '"Gowun Batang", serif', fontWeight: 600,
                  }}>{m === "view" ? "펼침" : "고침"}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "44px 56px 80px", position: "relative" }}>
            {/* Seal stamp */}
            <div style={{ position: "absolute", top: 30, right: 50, width: 58, height: 58, border: `2px solid ${deskC.accent}`, borderRadius: 4, transform: "rotate(-6deg)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.85 }}>
              <div style={{ fontFamily: '"Gowun Batang", serif', fontSize: 11, color: deskC.accent, fontWeight: 700, textAlign: "center", letterSpacing: "0.1em", lineHeight: 1.15 }}>
                行政士<br/>筆記
              </div>
            </div>

            {activeNote && (
              <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{
                      background: deskC.tabColors[activeIdx], color: "#fff",
                      fontSize: 10, padding: "2px 10px", borderRadius: 2, letterSpacing: "0.15em", fontWeight: 700,
                    }}>{activeNote.subject}</span>
                    <span style={{ fontSize: 11, color: deskC.inkFaint, fontFamily: "JetBrains Mono, monospace" }}>
                      {formatDate(activeNote.updatedAt)}
                    </span>
                  </div>
                  <h1 style={{ fontFamily: '"Gowun Batang", serif', fontSize: 34, fontWeight: 700, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.15, color: deskC.ink }}>
                    {activeNote.topic}
                  </h1>
                  {activeNote.mnemonic && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: 12,
                      marginTop: 14,
                      padding: "6px 16px 8px",
                      background: `repeating-linear-gradient(90deg, ${deskC.accent} 0 3px, transparent 3px 6px)`,
                      position: "relative",
                    }}>
                      <div style={{ position: "absolute", inset: "2px 0", background: deskC.paper }} />
                      <span style={{ position: "relative", fontSize: 10, color: deskC.inkFaint, letterSpacing: "0.2em", fontWeight: 700 }}>두문자</span>
                      <span style={{ position: "relative", fontFamily: '"Gowun Batang", serif', fontSize: 20, fontWeight: 700, color: deskC.accent, letterSpacing: "0.3em" }}>
                        {activeNote.mnemonic}
                      </span>
                    </div>
                  )}
                </div>

                {mode === "view" ? (
                  <RenderTreeC nodes={tree} search={search} />
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <textarea defaultValue={activeNote.body} style={{
                      width: "100%", minHeight: 500,
                      border: `1px solid ${deskC.rule}`, borderRadius: 3,
                      padding: 14, fontSize: 13, fontFamily: "JetBrains Mono, monospace",
                      color: deskC.ink, background: deskC.paperAlt,
                      outline: "none", resize: "none", lineHeight: 1.6,
                    }} />
                    <div style={{ border: `1px solid ${deskC.rule}`, borderRadius: 3, padding: 14, background: deskC.paper, overflowY: "auto", maxHeight: 500 }}>
                      <RenderTreeC nodes={tree} search={search} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.VariationC = VariationC;
