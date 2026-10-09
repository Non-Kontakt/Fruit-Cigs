// IDs come from deterministic source order, before presentation shuffles cards.
export function buildTrainingItems(gains) {
  const improvements = gains.improvements || [];
  const injuries = gains.injuries || [];
  const duos = gains.duos || [];
  const progressEvents = gains.progress || [];
  const arcBoosts = gains.arcBoosts || [];
  const ticketBoosts = gains.ticketBoosts || [];
  const allItems = [];
  injuries.forEach(inj => allItems.push({ type: "injury", data: inj, priority: 100 }));
  duos.forEach(d => allItems.push({ type: "duo", data: d, priority: 90 }));
  improvements.forEach(g => {
    if (g.isProdigalBoost) {
      allItems.push({ type: "prodigal_boost", data: g, priority: 120 });
    } else {
      // Higher stat gains are more interesting
      allItems.push({ type: "gain", data: g, priority: 30 + (g.newVal || 0) });
    }
  });
  // Group arc boosts into cards — one card per (source × stat) combination
  // This ensures a squad-wide PHY boost and a separate individual PHY boost show as distinct cards
  if (arcBoosts.length > 0) {
    const bySourceAttr = {};
    arcBoosts.forEach(ab => {
      const k = `${ab.sourceKey || "arc"}:${ab.attr}`;
      if (!bySourceAttr[k]) bySourceAttr[k] = { attr: ab.attr, amount: ab.newVal - ab.oldVal, players: [], sourceKey: ab.sourceKey, filterLabel: ab.filterLabel || null };
      bySourceAttr[k].players.push({ name: ab.playerName, position: ab.playerPosition, oldVal: ab.oldVal, newVal: ab.newVal });
    });
    Object.values(bySourceAttr).forEach(group => {
      allItems.push({ type: "arc_boost_group", data: group, priority: 110 });
    });
  }
  ticketBoosts.forEach(tb => allItems.push({ type: tb.source === "televised" ? "televised_boost" : "ticket_boost", data: tb, priority: 115 }));
  (gains.cappedArcTickets || []).forEach(ct => allItems.push({ type: "capped_arc_ticket", data: ct, priority: 105 }));
  progressEvents.forEach(p => {
    if (p.type === "positionLearned") {
      allItems.push({ type: "positionLearned", data: p, priority: 80 });
    } else {
      allItems.push({ type: "progress", data: p, priority: p.newProgress >= 0.8 ? 25 : 10 });
    }
  });

  return allItems.map((item, index) => ({ ...item, id: `${item.type}:${index}` }));
}

export function recordTrainingReveal(gains, itemId) {
  if (!gains || gains.revealedItems?.includes(itemId)) return gains;
  if (!buildTrainingItems(gains).some(item => item.id === itemId)) return gains;
  return { ...gains, revealedItems: [...(gains.revealedItems || []), itemId] };
}

export function recordTrainingTicket(gains, itemId, ticketType) {
  if (!gains || gains.pickedTickets?.[itemId]) return gains;
  const item = buildTrainingItems(gains).find(item => item.id === itemId && item.type === "capped_arc_ticket");
  if (!item?.data.choices?.includes(ticketType)) return gains;
  return { ...gains, pickedTickets: { ...gains.pickedTickets, [itemId]: ticketType } };
}
