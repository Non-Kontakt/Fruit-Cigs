import { C as TC, FONT } from "../../data/tokens";

const C = { ...TC, bg: "#06060f", dim: "#334155" };
// Larger sizes — Press Start 2P needs room to breathe
const F = {
  hero: "clamp(20px,5vw,28px)",
  title: "clamp(14px,3.5vw,18px)",
  body: "clamp(11px,2.5vw,13px)",
  label: "clamp(9px,2vw,11px)",
};

function ordinal(n) {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        fontSize: F.label, color: C.slate, letterSpacing: 2,
        borderBottom: `1px solid ${C.dim}`, paddingBottom: 8, marginBottom: 16,
      }}>{title}</div>
      {children}
    </div>
  );
}

export function MuseumScreen({ career, onClose, closeLabel = "RETURN TO MENU" }) {
  const ch = career?.clubHistory || {};
  const seasons = ch.seasonArchive || [];
  const cups = ch.cupHistory || [];
  const archivedDate = career?.archivedAt
    ? new Date(career.archivedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  const scorers = Object.entries(ch.playerCareers || {})
    .map(([name, stats]) => ({ name, goals: stats.goals || 0, apps: stats.apps || 0 }))
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5);

  const totalW = ch.totalWins || 0;
  const totalD = ch.totalDraws || 0;
  const totalL = ch.totalLosses || 0;
  const totalGF = ch.totalGoalsFor || 0;
  const totalGA = ch.totalGoalsConceded || 0;
  const seasonCount = Math.max(0, (career?.seasonNumber || 1) - 1);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      fontFamily: FONT, overflowY: "auto", padding: "32px 20px",
    }}>

      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36, paddingBottom: 24, borderBottom: `1px solid ${C.dim}` }}>
          <div style={{ fontSize: "2.4em", marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: F.hero, color: C.red, letterSpacing: 2, marginBottom: 12, lineHeight: 1.4 }}>
            {career?.teamName || "Unknown Club"}
          </div>
          <div style={{ fontSize: F.label, color: C.slate, marginBottom: 8, letterSpacing: 2 }}>
            ⚔ IRONMAN · CAREER ARCHIVED
          </div>
          {archivedDate && (
            <div style={{ fontSize: F.label, color: "#334155" }}>{archivedDate}</div>
          )}
        </div>

        {/* Career totals — 2-column pairs, easier to read than 7-column grid */}
        <Section title="CAREER SUMMARY">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {[
              { label: "SEASONS", value: seasonCount || "<1", accent: null },
              { label: "MATCHES", value: career?.totalMatches || 0, accent: null },
              { label: "WINS", value: totalW, accent: C.green },
              { label: "LOSSES", value: totalL, accent: C.red },
              { label: "GOALS FOR", value: totalGF, accent: null },
              { label: "GOALS AGAINST", value: totalGA, accent: null },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{
                border: "1px solid rgba(248,113,113,0.12)",
                background: "rgba(248,113,113,0.03)",
                padding: "14px 16px", borderRadius: 3,
              }}>
                <div style={{ fontSize: F.label, color: C.slate, marginBottom: 8, letterSpacing: 1 }}>{label}</div>
                <div style={{ fontSize: F.title, color: accent || C.text }}>{value}</div>
              </div>
            ))}
          </div>
          {ch.biggestWin && (
            <div style={{ fontSize: F.label, color: C.textMuted, marginTop: 4, lineHeight: 2.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Best win: <span style={{ color: C.green }}>{ch.biggestWin.score}</span> vs {ch.biggestWin.opponent}
              {ch.biggestWin.season ? ` (S${ch.biggestWin.season})` : ""}
            </div>
          )}
          {ch.worstDefeat && (
            <div style={{ fontSize: F.label, color: C.textMuted, lineHeight: 2.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Worst result: <span style={{ color: C.red }}>{ch.worstDefeat.score}</span> vs {ch.worstDefeat.opponent}
              {ch.worstDefeat.season ? ` (S${ch.worstDefeat.season})` : ""}
            </div>
          )}
        </Section>

        {/* Season by season */}
        {seasons.length > 0 && (
          <Section title="SEASON RECORD">
            {seasons.map((s, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "40px 1fr 60px 70px",
                alignItems: "center", gap: 8,
                padding: "10px 0", borderBottom: `1px solid rgba(51,65,85,0.4)`,
                fontSize: F.body,
              }}>
                <span style={{ color: C.slate }}>S{s.season}</span>
                <span style={{ color: C.textMuted }}>{s.leagueName || `Tier ${s.tier}`}</span>
                <span style={{ color: C.text, textAlign: "right" }}>
                  {s.position ? ordinal(s.position) : "—"}
                </span>
                <span style={{ color: C.slate, textAlign: "right" }}>
                  {s.points != null ? `${s.points}pts` : ""}
                </span>
              </div>
            ))}
          </Section>
        )}

        {/* Cup history */}
        {cups.length > 0 && (
          <Section title="CUP HISTORY">
            {cups.map((c, i) => {
              const result = c.playerResult === "winner" ? "🏆 Winner"
                : c.playerResult === "runner-up" ? "🥈 Runner-up"
                : c.playerResult === "eliminated" ? "Eliminated"
                : c.playerResult || "—";
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: `1px solid rgba(51,65,85,0.4)`,
                  fontSize: F.body,
                }}>
                  <span style={{ color: C.slate }}>S{c.season}</span>
                  <span style={{ color: c.playerResult === "winner" ? C.amber : C.textMuted }}>
                    {result}
                  </span>
                </div>
              );
            })}
          </Section>
        )}

        {/* Top scorers */}
        {scorers.length > 0 && (
          <Section title="TOP SCORERS">
            {scorers.map((p, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: `1px solid rgba(51,65,85,0.4)`,
                fontSize: F.body,
              }}>
                <span style={{ color: C.textMuted, flex: 1, marginRight: 16 }}>{p.name}</span>
                <span style={{ color: C.amber, marginRight: 20 }}>{p.goals}g</span>
                <span style={{ color: C.slate }}>{p.apps} apps</span>
              </div>
            ))}
          </Section>
        )}

        {/* Return */}
        <div style={{ textAlign: "center", paddingTop: 8, paddingBottom: 40 }}>
          <button
            onClick={onClose}
            style={{
              padding: "16px 36px", background: "none",
              border: `1px solid ${C.dim}`, color: C.slate,
              fontFamily: FONT, fontSize: F.label, cursor: "pointer", letterSpacing: 2,
            }}
            onMouseEnter={e => e.currentTarget.style.color = C.textMuted}
            onMouseLeave={e => e.currentTarget.style.color = C.slate}
          >{closeLabel}</button>
        </div>

      </div>
    </div>
  );
}
