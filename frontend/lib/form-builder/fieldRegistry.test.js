import { createField, fieldSupportsProperty, fieldSupportsValidator, validateField, createValidator } from "@/lib/form-builder/engine";
import { getFieldEntry, libraryGroups } from "@/lib/form-builder/fieldRegistry";

describe("field registry", () => {
  it("exposes basic and advanced groups and type-specific properties", () => {
    const groups = libraryGroups();
    expect(groups.find((group) => group.id === "basic").items.some((item) => item.type === "text")).toBe(true);
    expect(groups.find((group) => group.id === "advanced").items.some((item) => item.type === "currency")).toBe(true);
    expect(getFieldEntry("dropdown").component).toBeTruthy();
    expect(fieldSupportsProperty("text", "minLength")).toBe(true);
    expect(fieldSupportsProperty("text", "maxSizeMb")).toBe(false);
    expect(fieldSupportsValidator("email", "email")).toBe(true);
    expect(fieldSupportsValidator("number", "email")).toBe(false);
  });

  it("marks a required text field invalid when empty", () => {
    const field = createField("text", { key: "company_name", label: "Company Name", required: true });
    expect(validateField(field, "").ok).toBe(false);
    expect(validateField(field, "Acme").ok).toBe(true);
    field.validators = [createValidator("min_length", { value: 10 })];
    expect(validateField(field, "Acme").ok).toBe(false);
  });
});
