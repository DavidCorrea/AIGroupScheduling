import { isConfigFormPageWithUnsavedGuard } from "@/lib/config-nav-guard";

describe("Config nav guard (unsaved changes)", () => {
  it("returns true for the new event page so leaving shows a warning when dirty", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/events/new")).toBe(true);
    expect(isConfigFormPageWithUnsavedGuard("/slug/config/events/new")).toBe(true);
  });

  it("returns true for the edit event page so leaving shows a warning when dirty", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/events/1")).toBe(true);
    expect(isConfigFormPageWithUnsavedGuard("/slug/config/events/42")).toBe(true);
  });

  it("returns false for the events list page", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/events")).toBe(false);
  });

  it("returns true for the new role page so leaving shows a warning when dirty", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/roles/new")).toBe(true);
    expect(isConfigFormPageWithUnsavedGuard("/abc/config/roles/new")).toBe(true);
  });

  it("returns true for the edit role page so leaving shows a warning when dirty", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/roles/1")).toBe(true);
    expect(isConfigFormPageWithUnsavedGuard("/slug/config/roles/42")).toBe(true);
  });

  it("returns false for the roles list page", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/roles")).toBe(false);
  });

  it("returns false for other config pages", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/members")).toBe(false);
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/holidays")).toBe(false);
  });

  it("returns false for null or missing pathname", () => {
    expect(isConfigFormPageWithUnsavedGuard(null)).toBe(false);
  });
});
