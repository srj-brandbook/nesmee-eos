const { money, taxSplitFor, splitTax, computeLine, computeTotals, amountDue } = require("../src/modules/billing/tax.engine");

describe("billing tax engine", () => {
  it("splits GST as CGST/SGST within the same state and IGST across states", () => {
    expect(taxSplitFor("Maharashtra", "Maharashtra")).toBe("intra");
    expect(taxSplitFor("Maharashtra", "Gujarat")).toBe("inter");
    expect(splitTax(10000, 18, "intra")).toEqual({ cgst: 900, sgst: 900, igst: 0, tax: 1800 });
    expect(splitTax(10000, 18, "inter")).toEqual({ cgst: 0, sgst: 0, igst: 1800, tax: 1800 });
  });

  it("computes line and invoice totals with discounts", () => {
    const line = computeLine({ quantity: 2, unitPrice: 5000, discount: 1000, taxRate: 18 }, { split: "intra" });
    expect(line.taxableAmount).toBe(9000);
    expect(line.cgst).toBe(810);
    expect(line.lineTotal).toBe(10620);
    const totals = computeTotals([line], 20);
    expect(totals.grandTotal).toBe(10600);
    expect(amountDue({ grandTotal: 10600, amountPaid: 600, amountCredited: 0 })).toBe(10000);
    expect(money(1.225)).toBe(1.23);
  });
});
