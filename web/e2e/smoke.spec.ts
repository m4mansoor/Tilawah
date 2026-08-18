import { expect, test } from "@playwright/test";

// Smoke test for the Qari dashboard. Requires the API (localhost:8010) and the
// web app (localhost:5180) to be running: `npm run dev`.
test("auth screen loads with the Tilawah brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("تِلاوَة").first()).toBeVisible();
});

test("can register and reach onboarding", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@test.com`);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Welcome")).toBeVisible();
});
