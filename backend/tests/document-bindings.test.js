const { applyBindings, collectVariablesUsed, buildContext } = require("../src/modules/documents/document.bindings");

describe("document bindings", () => {
  const content = [
    {
      id: "1",
      type: "paragraph",
      content: [
        { type: "text", text: "Hello ", styles: {} },
        { type: "variable", props: { path: "supplier.name", label: "Supplier name", value: "", missing: false } },
        { type: "text", text: " GSTIN {{supplier.gstin}}", styles: {} },
      ],
      children: [],
    },
  ];

  it("collects chip and token variables", () => {
    expect(collectVariablesUsed(content)).toEqual(["supplier.name", "supplier.gstin"]);
  });

  it("fills chips and can replace tokens", () => {
    const { content: next, missingVariables } = applyBindings(
      content,
      { "supplier.name": "Pune Foods", "supplier.gstin": "27ABCDE1234F1Z5" },
      { replaceTokens: true }
    );
    expect(next[0].content[1].props.value).toBe("Pune Foods");
    expect(next[0].content[1].props.missing).toBe(false);
    expect(next[0].content[2].text).toBe(" GSTIN 27ABCDE1234F1Z5");
    expect(missingVariables).toEqual([]);
  });

  it("records missing values", () => {
    const { missingVariables } = applyBindings(content, { "supplier.name": "" });
    expect(missingVariables).toContain("supplier.name");
  });

  it("builds supplier and company context", () => {
    const context = buildContext({
      subjectType: "lead",
      subject: { name: "Acme", gstin: "22AAAAA0000A1Z5", legalName: "Acme Pvt Ltd" },
      settings: { name: "Nesmee", legalName: "Nesmee EOS", gstin: "27BBBBB0000B1Z5" },
      actor: { name: "Ada", email: "ada@example.com" },
      docMeta: { title: "NOC", type: "noc", number: "NOC-2026-0001" },
    });
    expect(context.values["supplier.name"]).toBe("Acme");
    expect(context.values["company.legalName"]).toBe("Nesmee EOS");
    expect(context.values["issuer.name"]).toBe("Ada");
    expect(context.values["doc.number"]).toBe("NOC-2026-0001");
  });
});
