const { test, expect } = require("@playwright/test");

test("homepage renders marketing content", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /run export from one operating system/i })).toBeVisible();
});

test("protected route redirects to login", async ({ page }) => {
  await page.goto("/users");
  await expect(page).toHaveURL(/\/login/);
});

test("login page is available", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});
