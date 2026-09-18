const {
  createField,
  createSection,
  createRule,
  createCondition,
  createConditionGroup,
  createAction,
  createValidator,
  createOption,
  emptyDefinition,
  validateField,
  validateForm,
  evaluateCondition,
  evaluateGroup,
  evaluateRule,
  evaluateRules,
  buildDependencyMap,
  validateFormConfiguration,
  createSupplierOnboardingTemplate,
  createFrozenFoodPermitTemplate,
  normalizeValue,
  normalizeDocument,
} = require("../../shared/form-engine");

function definitionWith(fields, rules = []) {
  const section = createSection({ title: "Main" });
  return emptyDefinition({
    name: "Test form",
    sections: [section],
    fields: fields.map((field) => ({ ...field, sectionId: section.id })),
    rules,
  });
}

describe("form-engine validation", () => {
  it("validates required, min/max, regex, email, number, date, and file rules", () => {
    const name = createField("text", {
      key: "company_name",
      label: "Company Name",
      required: true,
      validators: [createValidator("min_length", { value: 3 }), createValidator("regex", { value: "^[A-Za-z0-9 ]+$" })],
    });
    expect(validateField(name, "").ok).toBe(false);
    expect(validateField(name, "AB").ok).toBe(false);
    expect(validateField(name, "Acme Co").ok).toBe(true);
    expect(validateField(name, "Acme!").ok).toBe(false);

    const email = createField("email", { key: "email", label: "Email", validators: [createValidator("email")] });
    expect(validateField(email, "not-an-email").ok).toBe(false);
    expect(validateField(email, "ops@example.com").ok).toBe(true);

    const amount = createField("number", {
      key: "amount",
      label: "Amount",
      validators: [createValidator("number"), createValidator("min", { value: 10 }), createValidator("max", { value: 20 })],
    });
    expect(validateField(amount, "abc").ok).toBe(false);
    expect(validateField(amount, 9).ok).toBe(false);
    expect(validateField(amount, 21).ok).toBe(false);
    expect(validateField(amount, 15).ok).toBe(true);

    const date = createField("date", {
      key: "started",
      label: "Started",
      validators: [createValidator("date"), createValidator("date_range", { value: { from: "2020-01-01", to: "2020-12-31" } })],
    });
    expect(validateField(date, "not-a-date").ok).toBe(false);
    expect(validateField(date, "2019-12-31").ok).toBe(false);
    expect(validateField(date, "2020-06-01").ok).toBe(true);

    const file = createField("file", {
      key: "license",
      label: "License",
      validators: [createValidator("file_type", { value: ".pdf" }), createValidator("file_size", { value: 1 })],
    });
    expect(validateField(file, { name: "scan.jpg", size: 100, type: "image/jpeg" }).ok).toBe(false);
    expect(validateField(file, { name: "scan.pdf", size: 2 * 1024 * 1024, type: "application/pdf" }).ok).toBe(false);
    expect(validateField(file, { name: "scan.pdf", size: 500, type: "application/pdf" }).ok).toBe(true);

    const emptyPlaceholder = createField("document", { key: "permit", label: "Permit" });
    expect(validateField(emptyPlaceholder, { name: "", url: "", publicId: "", size: 0, resourceType: "image" }).ok).toBe(true);
    expect(validateField(emptyPlaceholder, { files: [] }).ok).toBe(true);
    const stored = normalizeValue(file, {
      name: "scan.pdf",
      size: 500,
      type: "application/pdf",
      url: "https://res.cloudinary.com/demo/raw/upload/v1/nesmee/forms/scan.pdf",
      publicId: "nesmee/forms/scan",
      resourceType: "raw",
    });
    expect(stored).toEqual({
      name: "scan.pdf",
      size: 500,
      type: "application/pdf",
      url: "https://res.cloudinary.com/demo/raw/upload/v1/nesmee/forms/scan.pdf",
      publicId: "nesmee/forms/scan",
      resourceType: "raw",
    });
  });
});

describe("form-engine conditions", () => {
  const country = createField("country", { key: "country", label: "Country" });
  const amount = createField("currency", { key: "annual_turnover", label: "Annual Turnover" });
  const tags = createField("dropdown", {
    key: "markets",
    label: "Markets",
    metadata: { multiple: true },
    options: [createOption("India"), createOption("UAE")],
  });
  const fieldsByKey = { country, annual_turnover: amount, markets: tags };

  it("supports text, number, contains, empty, AND, OR, and nested groups", () => {
    expect(evaluateCondition({ field: "country", operator: "equals", value: "India" }, { country: "india" }, fieldsByKey).matched).toBe(true);
    expect(evaluateCondition({ field: "country", operator: "not_equals", value: "India" }, { country: "UAE" }, fieldsByKey).matched).toBe(true);
    expect(evaluateCondition({ field: "country", operator: "contains", value: "Ind" }, { country: "India" }, fieldsByKey).matched).toBe(true);
    expect(evaluateCondition({ field: "country", operator: "is_empty", value: "" }, { country: "" }, fieldsByKey).matched).toBe(true);
    expect(evaluateCondition({ field: "annual_turnover", operator: "greater_than", value: 100 }, { annual_turnover: 150 }, fieldsByKey).matched).toBe(true);
    expect(evaluateCondition({ field: "annual_turnover", operator: "less_than", value: 100 }, { annual_turnover: 50 }, fieldsByKey).matched).toBe(true);
    expect(
      evaluateCondition({ field: "markets", operator: "contains", value: "India" }, { markets: ["India", "UAE"] }, fieldsByKey).matched
    ).toBe(true);

    const nested = createConditionGroup({
      operator: "OR",
      groups: [
        createConditionGroup({
          operator: "AND",
          conditions: [
            { field: "country", operator: "equals", value: "India" },
            { field: "annual_turnover", operator: "greater_than", value: 10 },
          ],
        }),
        createConditionGroup({
          operator: "AND",
          conditions: [{ field: "country", operator: "equals", value: "UAE" }],
        }),
      ],
    });
    expect(evaluateGroup(nested, { country: "India", annual_turnover: 20 }, fieldsByKey).matched).toBe(true);
    expect(evaluateGroup(nested, { country: "India", annual_turnover: 5 }, fieldsByKey).matched).toBe(false);
    expect(evaluateGroup(nested, { country: "UAE", annual_turnover: 0 }, fieldsByKey).matched).toBe(true);
  });
});

describe("form-engine rules", () => {
  it("matches, skips, applies priority, uses a dependency map, and stops loops", () => {
    const section = createSection({ title: "Main" });
    const type = createField("dropdown", {
      key: "supplier_type",
      label: "Supplier Type",
      sectionId: section.id,
      options: [createOption("Manufacturer"), createOption("Trader")],
    });
    const country = createField("country", { key: "country", label: "Country", sectionId: section.id });
    const gst = createField("text", { key: "gst_number", label: "GST Number", sectionId: section.id, visible: false });
    const ping = createField("text", { key: "ping", label: "Ping", sectionId: section.id });
    const pong = createField("text", { key: "pong", label: "Pong", sectionId: section.id });

    const showGst = createRule({
      id: "rule_high",
      name: "GST required",
      priority: 100,
      when: createConditionGroup({
        conditions: [{ field: "supplier_type", operator: "equals", value: "manufacturer" }],
      }),
      then: [createAction("show_field", { target: "gst_number" }), createAction("make_required", { target: "gst_number" })],
    });
    const hideGst = createRule({
      id: "rule_low",
      name: "GST optional abroad",
      priority: 10,
      when: createConditionGroup({
        conditions: [{ field: "country", operator: "equals", value: "UAE" }],
      }),
      then: [createAction("make_optional", { target: "gst_number" }), createAction("hide_field", { target: "gst_number" })],
    });
    const loopA = createRule({
      id: "loop_a",
      name: "Loop A",
      priority: 40,
      when: createConditionGroup({ conditions: [{ field: "ping", operator: "equals", value: "X" }] }),
      then: [createAction("set_value", { target: "pong", config: { value: "Y" } })],
    });
    const loopB = createRule({
      id: "loop_b",
      name: "Loop B",
      priority: 40,
      when: createConditionGroup({ conditions: [{ field: "pong", operator: "equals", value: "Y" }] }),
      then: [createAction("set_value", { target: "ping", config: { value: "X" } })],
    });

    const definition = emptyDefinition({
      name: "Rules",
      sections: [section],
      fields: [type, country, gst, ping, pong],
      rules: [showGst, hideGst, loopA, loopB],
    });

    const miss = evaluateRule(showGst, definition, { supplier_type: "trader" });
    expect(miss.matched).toBe(false);

    const hit = evaluateRules({
      definition,
      values: { supplier_type: "manufacturer", country: "UAE" },
    });
    expect(hit.derived.fields.gst_number.visible).toBe(true);
    expect(hit.derived.fields.gst_number.required).toBe(true);

    const deps = buildDependencyMap(definition.rules);
    expect(deps.supplier_type).toContain("rule_high");
    expect(deps.country).toContain("rule_low");
    expect(deps.annual_turnover).toBeUndefined();

    const looped = evaluateRules({
      definition,
      values: { ping: "X" },
      changedKeys: ["ping"],
    });
    expect(looped.aborted === "max_cycles" || looped.executed.length <= 16).toBe(true);
    expect(looped.values.pong).toBe("Y");
  });
});

describe("form-engine configuration", () => {
  it("flags duplicate keys, broken rule refs, invalid validators, and invalid action targets", () => {
    const section = createSection({ title: "Main" });
    const one = createField("text", { key: "company_name", label: "Company", sectionId: section.id });
    const two = createField("text", { key: "company_name", label: "Also company", sectionId: section.id });
    const dropdown = createField("dropdown", { key: "kind", label: "Kind", sectionId: section.id, options: [] });
    dropdown.validators = [createValidator("email")];
    const rule = createRule({
      name: "Broken",
      when: createConditionGroup({ conditions: [{ field: "missing_field", operator: "equals", value: "x" }] }),
      then: [createAction("show_field", { target: "nope" })],
    });
    const result = validateFormConfiguration(
      emptyDefinition({ name: "Bad", sections: [section], fields: [one, two, dropdown], rules: [rule] })
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((item) => item.code === "duplicate_key")).toBe(true);
    expect(result.errors.some((item) => item.code === "broken_rule_reference")).toBe(true);
    expect(result.errors.some((item) => item.code === "invalid_validator")).toBe(true);
    expect(result.errors.some((item) => item.code === "invalid_action_target")).toBe(true);
    expect(result.errors.some((item) => item.code === "missing_options")).toBe(true);
  });

  it("accepts the supplier onboarding template", () => {
    const template = createSupplierOnboardingTemplate();
    const result = validateFormConfiguration(template);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("accepts the frozen food verification template", () => {
    const template = createFrozenFoodPermitTemplate();
    const result = validateFormConfiguration(template);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

describe("form-engine runtime GST example", () => {
  it("shows GST fields only when the combined rule matches", () => {
    const definition = createSupplierOnboardingTemplate();
    const miss = evaluateRules({
      definition,
      values: { country: "India", supplier_type: "manufacturer", annual_turnover: 50000000 },
    });
    expect(miss.derived.fields.gst_number.visible).toBe(false);

    const hit = evaluateRules({
      definition,
      values: { country: "India", supplier_type: "Manufacturer", annual_turnover: 150000000 },
    });
    expect(hit.derived.fields.gst_number.visible).toBe(true);
    expect(hit.derived.fields.gst_number.required).toBe(true);
    expect(hit.derived.documents.gst_certificate.required).toBe(true);
    expect(hit.derived.stages.tax_verification.active).toBe(true);
    expect(hit.derived.assignment).toBe("Compliance Team");
    expect(validateForm(definition.fields, hit.values, hit.derived).errors.gst_number).toBeTruthy();
  });
});

describe("verification document values", () => {
  it("normalizes evidence objects and keeps file blobs compatible", () => {
    const evidence = normalizeDocument({
      title: "Permit",
      issuedDate: "2026-01-15",
      expiryDate: "2027-01-15",
      issuer: "FSSAI",
      files: [{ url: "https://cdn.example/permit.pdf", publicId: "permit", name: "permit.pdf", size: 12 }],
    });
    expect(evidence.title).toBe("Permit");
    expect(evidence.issuedAt).toBe("2026-01-15");
    expect(evidence.files[0].url).toContain("permit.pdf");

    const blob = normalizeValue({ type: "document" }, { url: "https://cdn.example/a.pdf", publicId: "a", name: "a.pdf" });
    expect(blob.url).toContain("a.pdf");
    expect(blob.files).toBeUndefined();
  });

  it("requests a cold storage license when frozen processing is selected", () => {
    const definition = createFrozenFoodPermitTemplate();
    const hit = evaluateRules({
      definition,
      values: {
        facility_name: "Arctic Foods",
        facility_address: "1 Harbour Road",
        fssai_number: "10012011000000",
        processing_types: ["frozen"],
      },
    });
    expect(hit.derived.documents.cold_storage_license.required).toBe(true);
    expect(hit.derived.stages.cold_storage_check.active).toBe(true);
  });
});
