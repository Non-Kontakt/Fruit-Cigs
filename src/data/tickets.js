export const TICKET_DEFS = {
  delay_retirement: {
    id: "delay_retirement", name: "Delay Retirement", icon: "🎫",
    desc: "Convince a retiring player to reconsider. Removes their RET tag for this season.",
    color: "#ef4444", target: "retiring_player",
  },
  random_attr: {
    id: "random_attr", name: "Random ATTR +1", icon: "🎲",
    desc: "Boost one random attribute by +1 on a chosen player.",
    color: "#4ade80", target: "any_player",
  },
  relation_boost: {
    id: "relation_boost", name: "+20% Relations", icon: "🤝",
    desc: "Add 20% to a random focused club's relationship score.",
    color: "#60a5fa", target: "none",
  },
  double_session: {
    id: "double_session", name: "Double Sessions", icon: "⚡",
    desc: "Next training week runs at 2× intensity. All progress gains doubled.",
    color: "#facc15", target: "none",
  },
  miracle_cream: {
    id: "miracle_cream", name: "Miracle Cream", icon: "🧴",
    desc: "Instantly heal an injured player. Even the physio is amazed.",
    color: "#22d3ee", target: "injured_player",
  },
  twelfth_man: {
    id: "twelfth_man", name: "12th Man", icon: "📣",
    desc: "A club legend rallies the fans for a massive home crowd boost in the next home game.",
    color: "#f97316", target: "none",
  },
  youth_coup: {
    id: "youth_coup", name: "Youth Coup", icon: "🌟",
    desc: "Your academy director has found a gem. Next youth intake features a standout prodigy.",
    color: "#a78bfa", target: "none",
  },
  rename_player: {
    id: "rename_player", name: "Rename Player", icon: "🏷️",
    desc: "Give a player a new shirt name. The kit man is standing by.",
    color: "#fb923c", target: "any_player",
  },
  transfer_insider: {
    id: "transfer_insider", name: "Transfer Insider", icon: "🕵️",
    desc: "A contact tips you off about an unattached player looking for a club.",
    color: "#34d399", target: "none",
  },
  scout_dossier: {
    id: "scout_dossier", name: "Scout Dossier", icon: "🔍",
    desc: "Reveal the potential ceiling of a shortlisted player.",
    color: "#818cf8", target: "shortlisted_player",
  },
  testimonial_match: {
    id: "testimonial_match", name: "Testimonial Match", icon: "🎩",
    desc: "Bring back a retired club legend for one final match.",
    color: "#f472b6", target: "retired_player",
  },
  saudi_agent: {
    id: "saudi_agent", name: "Saudi Agent", icon: "🕌",
    desc: "Your Saudi connections have found a free agent. Sign them instantly.",
    color: "#d4a017", target: "none",
  },
  rewind: {
    id: "rewind", name: "Rewind", icon: "⏪",
    desc: "Replay a lost or drawn league match. Time bends to your will.",
    color: "#a78bfa", target: "lost_match",
  },
};
