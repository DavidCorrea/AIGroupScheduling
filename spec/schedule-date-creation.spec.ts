/**
 * Tests for schedule date creation: ensure recurring events (including "for everyone" days like Friday)
 * are correctly turned into schedule_date entries when generating a schedule.
 *
 * These tests document and verify the same logic used in POST /api/schedules so we can
 * check fixes (e.g. weekday name matching) and avoid regressions.
 */
import {
  getScheduleDates,
  getDayNameFromDateString,
} from "@/lib/dates";

describe("Schedule date creation (recurring events)", () => {
  describe("getDayNameFromDateString", () => {
    it("returns Viernes for a known Friday (YYYY-MM-DD)", () => {
      // 2026-02-06 is a Friday in UTC
      expect(getDayNameFromDateString("2026-02-06")).toBe("Viernes");
    });

    it("returns the same Spanish weekday names used in the weekdays table", () => {
      // Weekdays table has: Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo
      // Use fixed dates to avoid locale/format drift
      expect(getDayNameFromDateString("2026-02-02")).toBe("Lunes");
      expect(getDayNameFromDateString("2026-02-03")).toBe("Martes");
      expect(getDayNameFromDateString("2026-02-04")).toBe("Miércoles");
      expect(getDayNameFromDateString("2026-02-05")).toBe("Jueves");
      expect(getDayNameFromDateString("2026-02-06")).toBe("Viernes");
      expect(getDayNameFromDateString("2026-02-07")).toBe("Sábado");
      expect(getDayNameFromDateString("2026-02-01")).toBe("Domingo");
    });
  });

  describe("getScheduleDates", () => {
    it("returns all Fridays in a month when Viernes is in activeDays", () => {
      // February 2026: 6, 13, 20, 27 are Fridays
      const dates = getScheduleDates(2, 2026, ["Viernes"]);
      expect(dates).toContain("2026-02-06");
      expect(dates).toContain("2026-02-13");
      expect(dates).toContain("2026-02-20");
      expect(dates).toContain("2026-02-27");
      expect(dates).toHaveLength(4);
      expect(dates).toEqual([...dates].sort());
    });

    it("returns no dates when activeDays is empty", () => {
      const dates = getScheduleDates(2, 2026, []);
      expect(dates).toEqual([]);
    });

    it("returns only days that match activeDays", () => {
      const dates = getScheduleDates(2, 2026, ["Viernes", "Domingo"]);
      // All Fridays and Sundays in Feb 2026
      expect(dates).toContain("2026-02-06"); // Fri
      expect(dates).toContain("2026-02-01"); // Sun
      expect(dates).toContain("2026-02-08"); // Sun
      expect(dates.length).toBeGreaterThan(4);
    });
  });

  describe("schedule creation flow (same logic as POST /api/schedules)", () => {
    /**
     * Simulates the config and date loop used when creating a schedule.
     * If this passes, the API would create schedule_date rows for every Friday with type for_everyone.
     */
    it("includes all Fridays as schedule dates when Viernes is active and for_everyone", () => {
      // Config as returned by loadScheduleConfig when user has only Friday active, type for_everyone
      const activeDayNames = ["Viernes"];
      const recurringTypeByDay: Record<string, { type: string; label: string | null }> = {
        Viernes: { type: "for_everyone", label: "Ensayo" },
      };

      const month = 2;
      const year = 2026;

      const dates = getScheduleDates(month, year, activeDayNames);
      expect(dates.length).toBeGreaterThan(0);

      const scheduleDatesWeWouldCreate: Array<{ date: string; type: string; label: string | null }> = [];
      for (const date of dates) {
        const dayName = getDayNameFromDateString(date);
        const { type, label } = recurringTypeByDay[dayName] ?? { type: "assignable", label: null };
        scheduleDatesWeWouldCreate.push({ date, type, label });
      }

      const fridayDates = scheduleDatesWeWouldCreate.filter((sd) => sd.type === "for_everyone");
      expect(fridayDates.length).toBe(4); // 4 Fridays in Feb 2026
      fridayDates.forEach((sd) => {
        expect(getDayNameFromDateString(sd.date)).toBe("Viernes");
        expect(sd.type).toBe("for_everyone");
        expect(sd.label).toBe("Ensayo");
      });
    });

    it("includes both assignable and for_everyone days when both are active", () => {
      const activeDayNames = ["Miércoles", "Viernes"];
      const recurringTypeByDay: Record<string, { type: string; label: string | null }> = {
        Miércoles: { type: "assignable", label: null },
        Viernes: { type: "for_everyone", label: "Ensayo" },
      };

      const dates = getScheduleDates(2, 2026, activeDayNames);

      const byDay: Array<{ date: string; type: string; label: string | null }> = [];
      for (const date of dates) {
        const dayName = getDayNameFromDateString(date);
        const { type, label } = recurringTypeByDay[dayName] ?? { type: "assignable", label: null };
        byDay.push({ date, type, label });
      }

      const wednesdays = byDay.filter((d) => getDayNameFromDateString(d.date) === "Miércoles");
      const fridays = byDay.filter((d) => getDayNameFromDateString(d.date) === "Viernes");

      expect(wednesdays.every((d) => d.type === "assignable")).toBe(true);
      expect(fridays.every((d) => d.type === "for_everyone" && d.label === "Ensayo")).toBe(true);
      expect(wednesdays.length).toBe(4);
      expect(fridays.length).toBe(4);
    });
  });
});
