const { setupDb, teardownDb, login, createMember } = require("./helpers");
const env = require("../src/config/env");
const { seedExport } = require("../src/seeds/export");

beforeAll(async () => {
  await setupDb();
  await seedExport();
});
afterAll(teardownDb);

function csrf(req) {
  return req.set("Origin", "http://localhost:3000").set("X-Requested-With", "XMLHttpRequest");
}

describe("export markets and corridors", () => {
  it("blocks members from listing markets", async () => {
    await createMember({ email: "export-member@example.com" });
    const { agent } = await login("export-member@example.com", "Password123");
    const res = await csrf(agent.get("/api/v1/export/markets"));
    expect(res.status).toBe(403);
  });

  it("creates a product, market, mapping, corridor and calculates landed cost", async () => {
    const { agent } = await login(env.SUPERADMIN_EMAIL, env.SUPERADMIN_PASSWORD);

    const product = await csrf(agent.post("/api/v1/export/products")).send({
      name: "Malabar Black Pepper",
      sku: "PEP-001",
      hsCode: "0904",
      category: "Food",
      baseCost: 8,
      baseCurrency: "USD",
    });
    expect(product.status).toBe(201);
    const productId = product.body.data.product.id;

    const market = await csrf(agent.post("/api/v1/export/markets")).send({
      name: "United Arab Emirates",
      countryCode: "AE",
      countryName: "United Arab Emirates",
      regionCode: "MEA",
      currencyCode: "AED",
      status: "research",
    });
    expect(market.status).toBe(201);
    const marketId = market.body.data.market.id;

    const scored = await csrf(agent.post(`/api/v1/export/markets/${marketId}/score`)).send({
      breakdown: { demand: 90, profitability: 80, competition: 20, logistics: 85, regulatory_ease: 70, market_growth: 75, country_risk: 15 },
    });
    expect(scored.status).toBe(200);
    expect(scored.body.data.market.opportunityScore).toBeGreaterThan(70);

    const mapping = await csrf(agent.post(`/api/v1/export/markets/${marketId}/products`)).send({
      productId,
      eligibilityStatus: "active",
      targetPrice: 14,
      minPrice: 11,
      currency: "USD",
      incotermCode: "CIF",
    });
    expect(mapping.status).toBe(201);

    const sea = await csrf(agent.post("/api/v1/export/corridors")).send({
      name: "Cochin to Jebel Ali",
      code: "COK-JEA",
      marketId,
      originCountryCode: "IN",
      originCity: "Cochin",
      destCountryCode: "AE",
      destCity: "Dubai",
      primaryMode: "sea",
      costs: [
        { componentCode: "freight", nameSnapshot: "Freight", amount: 2, currency: "USD" },
        { componentCode: "insurance", nameSnapshot: "Insurance", amount: 0.4, currency: "USD" },
      ],
      segments: [
        { locationType: "origin", locationLabel: "Cochin warehouse", mode: "road", transitAvgDays: 1 },
        { locationType: "port", locationLabel: "Cochin Port", mode: "sea", transitAvgDays: 10 },
        { locationType: "destination", locationLabel: "Jebel Ali", mode: "road", transitAvgDays: 1 },
      ],
    });
    expect(sea.status).toBe(201);
    expect(sea.body.data.corridor.segments).toHaveLength(3);

    const air = await csrf(agent.post("/api/v1/export/corridors")).send({
      name: "Cochin air to Dubai",
      code: "COK-DXB",
      marketId,
      primaryMode: "air",
      destCountryCode: "AE",
      costs: [{ componentCode: "freight", nameSnapshot: "Air freight", amount: 6, currency: "USD" }],
    });
    expect(air.status).toBe(201);

    const compared = await csrf(agent.post("/api/v1/export/corridors/compare")).send({
      corridorIds: [sea.body.data.corridor.id, air.body.data.corridor.id],
    });
    expect(compared.status).toBe(200);
    expect(compared.body.data.items).toHaveLength(2);

    const calc = await csrf(agent.post("/api/v1/export/calculator/landed-cost")).send({
      productId,
      marketId,
      corridorId: sea.body.data.corridor.id,
      quantity: 10,
      unitPrice: 8,
      sellingPrice: 140,
      incotermCode: "CIF",
      currency: "USD",
    });
    expect(calc.status).toBe(200);
    expect(calc.body.data.landedCost).toBeGreaterThan(0);
    expect(calc.body.data.grossMarginPct).not.toBeNull();

    const dashboard = await csrf(agent.get("/api/v1/export/dashboard"));
    expect(dashboard.status).toBe(200);
    expect(dashboard.body.data.underEvaluation + dashboard.body.data.activeMarkets).toBeGreaterThanOrEqual(0);
    expect(dashboard.body.data.marketStatus.research).toBeGreaterThanOrEqual(1);
  });
});
