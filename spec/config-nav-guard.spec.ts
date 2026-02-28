import { isConfigFormPageWithUnsavedGuard } from "@/lib/config-nav-guard";

describe("Config nav guard (unsaved changes)", () => {
  it("returns true for the configuration page so leaving shows a warning when dirty", () => {
    expect(isConfigFormPageWithUnsavedGuard("/mygroup/config/configuration")).toBe(true);
    expect(isConfigFormPageWithUnsavedGuard("/slug/config/configuration")).toBe(true);
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
