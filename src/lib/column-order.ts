/**
 * Builds the payload for saving column display order.
 * Each role gets a displayOrder equal to its index in the ordered array.
 */
export function buildColumnOrderPayload(
  orderedRoles: { id: number }[],
): { id: number; displayOrder: number }[] {
  return orderedRoles.map((r, i) => ({ id: r.id, displayOrder: i }));
}
