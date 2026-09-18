import { can } from "./can";

describe("can", () => {
  it("allows when the permission is present", () => {
    expect(can(["users.view", "users.create"], "users.view")).toBe(true);
  });

  it("denies when the permission is missing", () => {
    expect(can(["users.view"], "users.delete")).toBe(false);
  });

  it("allows empty permission checks", () => {
    expect(can([], undefined)).toBe(true);
  });
});
