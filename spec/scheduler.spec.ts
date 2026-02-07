import { generateSchedule } from "@/lib/scheduler";
import {
  MemberInfo,
  RoleDefinition,
  ScheduleAssignment,
  SchedulerInput,
} from "@/lib/scheduler.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRole(
  id: number,
  name: string,
  requiredCount = 1
): RoleDefinition {
  return { id, name, requiredCount };
}

function makeMember(
  id: number,
  name: string,
  roleIds: number[],
  availableDays: string[] = ["Wednesday", "Friday", "Sunday"],
  holidays: MemberInfo["holidays"] = []
): MemberInfo {
  return { id, name, roleIds, availableDays, holidays };
}

// Common roles
const LEADER = makeRole(1, "Leader");
const KEYBOARD = makeRole(2, "Keyboard", 2);
const ELECTRIC_GUITAR = makeRole(3, "Electric Guitar");
const ACOUSTIC_GUITAR = makeRole(4, "Acoustic Guitar");
const BASS = makeRole(5, "Bass");
const DRUMS = makeRole(6, "Drums");
const VOICE = makeRole(7, "Voice", 4);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Schedule generation", () => {
  describe("when assigning members to roles", () => {
    it("assigns one member per slot for a single-date, single-role schedule", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [makeMember(1, "Alice", [1])];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
      });

      expect(result.assignments).toEqual([
        { date: "2026-03-04", roleId: 1, memberId: 1 },
      ]);
      expect(result.unfilledSlots).toEqual([]);
    });

    it("fills multiple slots when a role requires more than one person", () => {
      const roles = [makeRole(2, "Keyboard", 2)];
      const members = [
        makeMember(1, "Alice", [2]),
        makeMember(2, "Bob", [2]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"],
        roles,
        members,
      });

      expect(result.assignments).toHaveLength(2);
      const assignedIds = result.assignments.map((a) => a.memberId).sort();
      expect(assignedIds).toEqual([1, 2]);
    });

    it("does not assign the same person to two roles in the same exclusive group on the same date", () => {
      const roles: RoleDefinition[] = [
        { id: 1, name: "Keyboard", requiredCount: 1, exclusiveGroup: "Instrumento" },
        { id: 2, name: "Guitar", requiredCount: 1, exclusiveGroup: "Instrumento" },
      ];
      const members = [
        makeMember(1, "Alice", [1, 2]),
        makeMember(2, "Bob", [1, 2]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"],
        roles,
        members,
      });

      const idsOnDate = result.assignments.map((a) => a.memberId);
      const uniqueIds = new Set(idsOnDate);
      expect(uniqueIds.size).toBe(idsOnDate.length);
    });
  });

  describe("when rotating members fairly", () => {
    it("distributes assignments evenly across multiple dates", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1]),
        makeMember(2, "Bob", [1]),
        makeMember(3, "Charlie", [1]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-04", "2026-03-11", "2026-03-18"], // all Wednesdays
        roles,
        members,
      });

      // Each of the 3 members should be assigned exactly once
      const counts = new Map<number, number>();
      for (const a of result.assignments) {
        counts.set(a.memberId, (counts.get(a.memberId) ?? 0) + 1);
      }
      expect(counts.get(1)).toBe(1);
      expect(counts.get(2)).toBe(1);
      expect(counts.get(3)).toBe(1);
    });

    it("wraps around the rotation when there are more dates than members", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1]),
        makeMember(2, "Bob", [1]),
      ];

      const result = generateSchedule({
        dates: [
          "2026-03-04",
          "2026-03-11",
          "2026-03-18",
          "2026-03-25",
        ], // all Wednesdays
        roles,
        members,
      });

      const counts = new Map<number, number>();
      for (const a of result.assignments) {
        counts.set(a.memberId, (counts.get(a.memberId) ?? 0) + 1);
      }
      // 4 dates, 2 members → each gets 2
      expect(counts.get(1)).toBe(2);
      expect(counts.get(2)).toBe(2);
    });

    it("considers previous assignments to continue a fair rotation", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1]),
        makeMember(2, "Bob", [1]),
        makeMember(3, "Charlie", [1]),
      ];

      // Alice and Bob already played on previous Wednesdays
      const previousAssignments: ScheduleAssignment[] = [
        { date: "2026-02-04", roleId: 1, memberId: 1 }, // Alice on Wed
        { date: "2026-02-11", roleId: 1, memberId: 2 }, // Bob on Wed
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
        previousAssignments,
      });

      // Charlie should be picked — the Wednesday pointer is after Bob → Charlie
      expect(result.assignments[0].memberId).toBe(3);
    });
  });

  describe("when members have limited availability", () => {
    it("only assigns members to days they are available", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1], ["Wednesday"]),
        makeMember(2, "Bob", [1], ["Friday"]),
        makeMember(3, "Charlie", [1], ["Sunday"]),
      ];

      const result = generateSchedule({
        dates: [
          "2026-03-04", // Wednesday
          "2026-03-06", // Friday
          "2026-03-08", // Sunday
        ],
        roles,
        members,
      });

      expect(result.assignments).toEqual(
        expect.arrayContaining([
          { date: "2026-03-04", roleId: 1, memberId: 1 }, // Alice on Wed
          { date: "2026-03-06", roleId: 1, memberId: 2 }, // Bob on Fri
          { date: "2026-03-08", roleId: 1, memberId: 3 }, // Charlie on Sun
        ])
      );
    });

    it("skips members who are not available on a given day of the week", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1], ["Wednesday"]),
        makeMember(2, "Bob", [1], ["Wednesday", "Friday"]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-06"], // Friday
        roles,
        members,
      });

      // Only Bob is available on Fridays
      expect(result.assignments).toEqual([
        { date: "2026-03-06", roleId: 1, memberId: 2 },
      ]);
    });
  });

  describe("when members are on holiday", () => {
    it("does not assign a member during their holiday period", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1], ["Wednesday", "Friday", "Sunday"], [
          { startDate: "2026-03-01", endDate: "2026-03-07" },
        ]),
        makeMember(2, "Bob", [1]),
      ];

      const result = generateSchedule({
        dates: [
          "2026-03-04", // Wednesday - Alice on holiday
          "2026-03-08", // Sunday - Alice available again
        ],
        roles,
        members,
      });

      const wednesdayAssignment = result.assignments.find(
        (a) => a.date === "2026-03-04"
      );
      const sundayAssignment = result.assignments.find(
        (a) => a.date === "2026-03-08"
      );

      expect(wednesdayAssignment?.memberId).toBe(2); // Bob fills in
      expect(sundayAssignment?.memberId).toBe(1); // Alice is back
    });

    it("handles a holiday that spans exactly one day", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1], ["Wednesday"], [
          { startDate: "2026-03-04", endDate: "2026-03-04" },
        ]),
        makeMember(2, "Bob", [1]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"],
        roles,
        members,
      });

      expect(result.assignments[0].memberId).toBe(2);
    });
  });

  describe("when there are not enough eligible members", () => {
    it("reports unfilled slots when no one can play a role on a date", () => {
      const roles = [makeRole(1, "Leader")];
      const members = [
        makeMember(1, "Alice", [1], ["Friday"]), // Not available on Wednesday
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
      });

      expect(result.assignments).toEqual([]);
      expect(result.unfilledSlots).toEqual([
        { date: "2026-03-04", roleId: 1 },
      ]);
    });

    it("partially fills slots when some but not enough members are available", () => {
      const roles = [makeRole(2, "Keyboard", 2)];
      const members = [makeMember(1, "Alice", [2])];

      const result = generateSchedule({
        dates: ["2026-03-04"],
        roles,
        members,
      });

      expect(result.assignments).toHaveLength(1);
      expect(result.unfilledSlots).toHaveLength(1);
      expect(result.unfilledSlots[0]).toEqual({
        date: "2026-03-04",
        roleId: 2,
      });
    });
  });

  describe("when dealing with a realistic full-band scenario", () => {
    it("generates a complete schedule for a month with all roles filled", () => {
      const roles = [
        LEADER,
        KEYBOARD,
        ELECTRIC_GUITAR,
        ACOUSTIC_GUITAR,
        BASS,
        DRUMS,
        VOICE,
      ];

      // Create enough members for each role
      const members: MemberInfo[] = [
        // Leaders
        makeMember(1, "Leader A", [1]),
        makeMember(2, "Leader B", [1]),
        // Keyboard players
        makeMember(3, "Keys A", [2]),
        makeMember(4, "Keys B", [2]),
        makeMember(5, "Keys C", [2]),
        // Electric guitar
        makeMember(6, "E.Guitar A", [3]),
        makeMember(7, "E.Guitar B", [3]),
        // Acoustic guitar
        makeMember(8, "A.Guitar A", [4]),
        makeMember(9, "A.Guitar B", [4]),
        // Bass
        makeMember(10, "Bass A", [5]),
        makeMember(11, "Bass B", [5]),
        // Drums
        makeMember(12, "Drums A", [6]),
        makeMember(13, "Drums B", [6]),
        // Voices
        makeMember(14, "Voice A", [7]),
        makeMember(15, "Voice B", [7]),
        makeMember(16, "Voice C", [7]),
        makeMember(17, "Voice D", [7]),
        makeMember(18, "Voice E", [7]),
      ];

      // March 2026: Wed 4, Fri 6, Sun 8, Wed 11, Fri 13, Sun 15, ...
      const marchDates = [
        "2026-03-04",
        "2026-03-06",
        "2026-03-08",
        "2026-03-11",
        "2026-03-13",
        "2026-03-15",
        "2026-03-18",
        "2026-03-20",
        "2026-03-22",
        "2026-03-25",
        "2026-03-27",
        "2026-03-29",
      ];

      const result = generateSchedule({
        dates: marchDates,
        roles,
        members,
      });

      // Total slots per date: 1 + 2 + 1 + 1 + 1 + 1 + 4 = 11
      const expectedTotal = marchDates.length * 11;
      expect(result.assignments).toHaveLength(expectedTotal);
      expect(result.unfilledSlots).toHaveLength(0);

      // Verify no member is assigned twice on the same date
      for (const date of marchDates) {
        const assignmentsOnDate = result.assignments.filter(
          (a) => a.date === date
        );
        const memberIds = assignmentsOnDate.map((a) => a.memberId);
        expect(new Set(memberIds).size).toBe(memberIds.length);
      }
    });
  });

  describe("when members can play multiple roles", () => {
    it("assigns a multi-role member to only one role per date when roles share an exclusive group", () => {
      const roles: RoleDefinition[] = [
        { id: 1, name: "Keyboard", requiredCount: 1, exclusiveGroup: "Instrumento" },
        { id: 3, name: "Electric Guitar", requiredCount: 1, exclusiveGroup: "Instrumento" },
      ];
      const members = [
        makeMember(1, "Alice", [1, 3]), // Can play keyboard and guitar
        makeMember(2, "Bob", [1]),
        makeMember(3, "Charlie", [3]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"],
        roles,
        members,
      });

      // Alice should appear at most once (exclusive group prevents double assignment)
      const aliceAssignments = result.assignments.filter(
        (a) => a.memberId === 1
      );
      expect(aliceAssignments.length).toBeLessThanOrEqual(1);

      // Both roles should be filled
      expect(result.assignments).toHaveLength(2);
      expect(result.unfilledSlots).toHaveLength(0);
    });
  });

  describe("when roles have day-level priorities", () => {
    it("fills higher-priority roles first for a given day of the week", () => {
      // On Wednesdays, Acoustic Guitar (priority 0) should be filled before
      // Electric Guitar (priority 1). This matters when a member can play both
      // and roles are in the same exclusive group.
      const roles: RoleDefinition[] = [
        { id: 3, name: "Electric Guitar", requiredCount: 1, exclusiveGroup: "Instrumento" },
        { id: 4, name: "Acoustic Guitar", requiredCount: 1, exclusiveGroup: "Instrumento" },
      ];
      const members = [
        makeMember(1, "Alice", [3, 4]), // Can play both guitars
        makeMember(2, "Bob", [3]),       // Only electric
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
        dayRolePriorities: {
          Wednesday: { 4: 0, 3: 1 }, // Acoustic first, Electric second
        },
      });

      // Alice should be assigned to Acoustic Guitar (higher priority)
      // Bob should fill Electric Guitar
      const acousticAssignment = result.assignments.find(
        (a) => a.roleId === 4
      );
      const electricAssignment = result.assignments.find(
        (a) => a.roleId === 3
      );

      expect(acousticAssignment?.memberId).toBe(1);
      expect(electricAssignment?.memberId).toBe(2);
      expect(result.unfilledSlots).toHaveLength(0);
    });

    it("uses default role order when no priorities are set for a day", () => {
      const roles = [
        makeRole(3, "Electric Guitar"),
        makeRole(4, "Acoustic Guitar"),
      ];
      const members = [
        makeMember(1, "Alice", [3, 4]),
        makeMember(2, "Bob", [4]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-06"], // Friday — no priorities set
        roles,
        members,
        dayRolePriorities: {
          Wednesday: { 4: 0, 3: 1 },
        },
      });

      // Without priorities, default order applies (Electric first since listed first)
      expect(result.assignments).toHaveLength(2);
      expect(result.unfilledSlots).toHaveLength(0);
    });
  });

  describe("exclusive role groups", () => {
    it("allows a member to fill roles in different groups on the same date", () => {
      // Voice has no exclusive group, Keyboard has "Instrumento"
      const roles: RoleDefinition[] = [
        { id: 1, name: "Voice", requiredCount: 1 },
        { id: 2, name: "Keyboard", requiredCount: 1, exclusiveGroup: "Instrumento" },
      ];
      const members = [makeMember(1, "David", [1, 2])];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
      });

      // David should be assigned to both Voice and Keyboard
      expect(result.assignments).toHaveLength(2);
      expect(result.unfilledSlots).toHaveLength(0);
      expect(result.assignments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ roleId: 1, memberId: 1 }),
          expect.objectContaining({ roleId: 2, memberId: 1 }),
        ])
      );
    });

    it("prevents a member from filling two roles in the same exclusive group on the same date", () => {
      // Both Keyboard and Electric Guitar are in "Instrumento" group
      const roles: RoleDefinition[] = [
        { id: 1, name: "Keyboard", requiredCount: 1, exclusiveGroup: "Instrumento" },
        { id: 2, name: "Electric Guitar", requiredCount: 1, exclusiveGroup: "Instrumento" },
      ];
      // David can play both but should only get one
      const members = [
        makeMember(1, "David", [1, 2]),
        makeMember(2, "Bob", [2]),
      ];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
      });

      // David gets Keyboard (first role), Bob gets Electric Guitar
      expect(result.assignments).toHaveLength(2);
      expect(result.unfilledSlots).toHaveLength(0);
      const davidAssignments = result.assignments.filter((a) => a.memberId === 1);
      const bobAssignments = result.assignments.filter((a) => a.memberId === 2);
      expect(davidAssignments).toHaveLength(1);
      expect(bobAssignments).toHaveLength(1);
      expect(davidAssignments[0].roleId).toBe(1); // David got Keyboard
      expect(bobAssignments[0].roleId).toBe(2); // Bob got Electric Guitar
    });

    it("allows a member to fill multiple roles when none have an exclusive group", () => {
      // Two roles with no exclusive group
      const roles: RoleDefinition[] = [
        { id: 1, name: "Voice", requiredCount: 1 },
        { id: 2, name: "Leader", requiredCount: 1 },
      ];
      const members = [makeMember(1, "David", [1, 2])];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
      });

      // David should be assigned to both
      expect(result.assignments).toHaveLength(2);
      expect(result.unfilledSlots).toHaveLength(0);
      expect(result.assignments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ roleId: 1, memberId: 1 }),
          expect.objectContaining({ roleId: 2, memberId: 1 }),
        ])
      );
    });

    it("reports unfilled slot when exclusive group blocks the only candidate", () => {
      // Both roles in "Instrumento" group, only one member
      const roles: RoleDefinition[] = [
        { id: 1, name: "Keyboard", requiredCount: 1, exclusiveGroup: "Instrumento" },
        { id: 2, name: "Electric Guitar", requiredCount: 1, exclusiveGroup: "Instrumento" },
      ];
      const members = [makeMember(1, "David", [1, 2])];

      const result = generateSchedule({
        dates: ["2026-03-04"], // Wednesday
        roles,
        members,
      });

      // David gets Keyboard, Electric Guitar is unfilled
      expect(result.assignments).toHaveLength(1);
      expect(result.assignments[0]).toEqual(
        expect.objectContaining({ roleId: 1, memberId: 1 })
      );
      expect(result.unfilledSlots).toHaveLength(1);
      expect(result.unfilledSlots[0]).toEqual(
        expect.objectContaining({ roleId: 2 })
      );
    });
  });
});
