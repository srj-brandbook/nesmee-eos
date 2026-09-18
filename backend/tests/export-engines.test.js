const { scoreFromBreakdown, validateProfile } = require("../src/modules/export/engines/score.engine");
const { calculateLandedCost } = require("../src/modules/export/engines/landedCost.engine");
const { convertAmount } = require("../src/modules/export/engines/fx.engine");
const { evaluateRules } = require("../src/modules/export/engines/tradeRule.engine");
const { DEFAULT_MARKET_FACTORS, DEFAULT_THRESHOLDS, DEFAULT_INCOTERMS } = require("../src/constants/export");

describe("export score engine", () => {
  const profile = { factors: DEFAULT_MARKET_FACTORS, thresholds: DEFAULT_THRESHOLDS };

  it("rejects weights that do not sum to 100", () => {
    const check = validateProfile({ factors: [{ key: "a", label: "A", weight: 40 }] });
    expect(check.ok).toBe(false);
  });

  it("computes a weighted market score and label", () => {
    const result = scoreFromBreakdown(profile, {
      demand: 80,
      profitability: 70,
      competition: 20,
      logistics: 90,
      regulatory_ease: 60,
      market_growth: 50,
      country_risk: 10,
    });
    expect(result.score).toBeGreaterThan(70);
    expect(result.label).toMatch(/Good|Excellent/);
  });
});

describe("export landed cost engine", () => {
  it("includes only incoterm cost components", () => {
    const cif = DEFAULT_INCOTERMS.find((item) => item.code === "CIF");
    const result = calculateLandedCost({
      lines: [
        { componentCode: "product_cost", amount: 100, currency: "INR" },
        { componentCode: "freight", amount: 20, currency: "INR" },
        { componentCode: "duties", amount: 40, currency: "INR" },
      ],
      incoterm: cif,
      sellingPrice: 200,
      viewCurrency: "INR",
      rates: [],
    });
    expect(result.landedCost).toBe(120);
    expect(result.grossProfit).toBe(80);
    expect(result.grossMarginPct).toBe(40);
    expect(result.lines.find((line) => line.componentCode === "duties").included).toBe(false);
  });
});

describe("export fx engine", () => {
  it("converts with buffer", () => {
    const amount = convertAmount(100, "USD", "INR", [{ base: "USD", quote: "INR", rate: 80, bufferPct: 5, riskAdjustmentPct: 0, rateDate: new Date("2020-01-01") }]);
    expect(amount).toBe(8400);
  });
});

describe("export trade rules", () => {
  it("matches nested AND/OR conditions", () => {
    const executed = evaluateRules(
      [
        {
          name: "Food Germany",
          enabled: true,
          priority: 10,
          conditionGroup: {
            operator: "AND",
            conditions: [
              { field: "productCategory", operator: "equals", value: "Food" },
              { field: "marketCode", operator: "equals", value: "DE" },
            ],
            groups: [],
          },
          actions: [{ type: "require_certification", payload: { name: "Lab test" } }],
        },
      ],
      { productCategory: "Food", marketCode: "DE" }
    );
    expect(executed).toHaveLength(1);
    expect(executed[0].actions[0].type).toBe("require_certification");
  });
});
