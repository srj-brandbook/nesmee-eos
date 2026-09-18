const { api } = require("./helpers");

describe("validation envelope", () => {
  it("returns field errors", async () => {
    const res = await api().post("/api/v1/auth/signup").send({
      name: "A",
      email: "not-an-email",
      password: "short",
    });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toBeDefined();
  });
});
