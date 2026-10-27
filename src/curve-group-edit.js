// UI-only normalized group transaction. No DSP, mapping, transport or sorting.
export function beginVerticalGroup(curve, index, pointerY) {
  if (!Number.isInteger(index) || index < 0 || index >= curve.length) return null;
  const points = curve.slice(index).map(point => ({ point, y: point.y }));
  return {
    points, startY: pointerY, delta: 0, changed: false,
    minDelta: points.reduce((limit, entry) => Math.max(limit, -entry.y), -1),
    maxDelta: points.reduce((limit, entry) => Math.min(limit, 1 - entry.y), 1)
  };
}

export function moveVerticalGroup(group, pointerY) {
  const delta = Math.max(group.minDelta, Math.min(group.maxDelta, pointerY - group.startY));
  if (delta === group.delta) return false;
  for (const entry of group.points) entry.point.y = entry.y + delta;
  group.delta = delta;
  group.changed = true;
  return true;
}

export function restoreVerticalGroup(group) {
  if (!group?.changed) return false;
  for (const entry of group.points) entry.point.y = entry.y;
  return true;
}

export function verticalGroupSuffix(count) {
  return count ? ` · ${count} ${count === 1 ? "point" : "points"} ↕` : "";
}

export function drawVerticalGroupRing(context, x, y, color, rightRoom) {
  context.save();
  context.beginPath();
  context.arc(x, y, Math.max(6, Math.min(9, rightRoom - 0.75)), 0, Math.PI * 2);
  context.strokeStyle = color;
  context.lineWidth = 1.25;
  context.stroke();
  context.restore();
}
