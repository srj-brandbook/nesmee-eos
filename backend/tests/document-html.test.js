const { documentToHtml } = require("../src/modules/documents/document.html");

describe("document html", () => {
  it("renders BlockNote tableContent without throwing", () => {
    const html = documentToHtml({
      title: "Supplier NOC",
      docNumber: "NOC-2026-0002",
      letterhead: { legalName: "Nesmee EOS" },
      company: { legalName: "Nesmee EOS" },
      content: [
        {
          id: "h1",
          type: "heading",
          props: { level: 1 },
          content: [{ type: "text", text: "No Objection Certificate", styles: {} }],
          children: [],
        },
        {
          id: "t1",
          type: "table",
          props: {},
          content: {
            type: "tableContent",
            columnWidths: [120, 240],
            headerRows: 1,
            rows: [
              {
                cells: [
                  { type: "tableCell", props: {}, content: [{ type: "text", text: "Field", styles: {} }] },
                  { type: "tableCell", props: {}, content: [{ type: "text", text: "Value", styles: {} }] },
                ],
              },
              {
                cells: [
                  [{ type: "text", text: "Supplier", styles: {} }],
                  [{ type: "variable", props: { path: "supplier.name", label: "Supplier", value: "Nestle" } }],
                ],
              },
            ],
          },
          children: [],
        },
      ],
    });
    expect(html).toContain("<table>");
    expect(html).toContain("Field");
    expect(html).toContain("Nestle");
    expect(html).toContain("No Objection Certificate");
  });
});
