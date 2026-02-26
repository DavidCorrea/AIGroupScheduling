import { buildColumnOrderPayload } from "@/lib/column-order";

describe("Column order save payload", () => {
  it("assigns display order by position when roles are in the desired order", () => {
    const orderedRoles = [{ id: 1 }, { id: 2 }, { id: 3 }];

    const payload = buildColumnOrderPayload(orderedRoles);

    expect(payload).toEqual([
      { id: 1, displayOrder: 0 },
      { id: 2, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
    ]);
  });

  it("reflects the new order after the user has reordered roles", () => {
    const reorderedRoles = [{ id: 3 }, { id: 1 }, { id: 2 }];

    const payload = buildColumnOrderPayload(reorderedRoles);

    expect(payload).toEqual([
      { id: 3, displayOrder: 0 },
      { id: 1, displayOrder: 1 },
      { id: 2, displayOrder: 2 },
    ]);
  });

  it("returns one entry per role with sequential display orders", () => {
    const orderedRoles = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }];

    const payload = buildColumnOrderPayload(orderedRoles);

    expect(payload).toHaveLength(4);
    payload.forEach((entry, index) => {
      expect(entry.displayOrder).toBe(index);
    });
  });
});
