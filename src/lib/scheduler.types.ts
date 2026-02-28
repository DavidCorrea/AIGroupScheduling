export interface RoleDefinition {
  id: number;
  name: string;
  requiredCount: number;
  exclusiveGroupId?: number | null;
}

export interface MemberInfo {
  id: number;
  name: string;
  /** Role IDs this member can perform */
  roleIds: number[];
  /** Days of the week this member is available (e.g., "Wednesday", "Friday", "Sunday") */
  availableDays: string[];
  /**
   * Optional: for each day name, the member's availability blocks (HH:MM UTC).
   * When dayEventTimeWindow is used, a member is eligible only if at least one block overlaps the event window.
   */
  availabilityBlocksByDay?: Record<string, { startUtc: string; endUtc: string }[]>;
  /** Date ranges when the member is on holiday (ISO date strings "YYYY-MM-DD") */
  holidays: { startDate: string; endDate: string }[];
}

export interface ScheduleAssignment {
  date: string;
  roleId: number;
  memberId: number;
}

export interface SchedulerInput {
  /** The dates to schedule (ISO date strings "YYYY-MM-DD") */
  dates: string[];
  /** Role definitions with required counts */
  roles: RoleDefinition[];
  /** All available members with their capabilities and constraints */
  members: MemberInfo[];
  /** Previous assignments to consider for fair rotation continuity (optional) */
  previousAssignments?: ScheduleAssignment[];
  /**
   * Day-of-week role priorities. Keys are day names (e.g. "Wednesday"),
   * values are maps of roleId → priority (lower number = filled first).
   * Roles not listed use a default priority of Infinity (filled last).
   */
  dayRolePriorities?: Record<string, Record<number, number>>;
  /**
   * Optional: event time window per day of week (HH:MM UTC).
   * When set for a day, only members with at least one availability block overlapping this window are eligible.
   * Omitted or missing day = full day (00:00–23:59).
   */
  dayEventTimeWindow?: Record<string, { startUtc: string; endUtc: string }>;
}

export interface SchedulerOutput {
  assignments: ScheduleAssignment[];
  /** Slots that could not be filled due to insufficient eligible members */
  unfilledSlots: { date: string; roleId: number }[];
}
