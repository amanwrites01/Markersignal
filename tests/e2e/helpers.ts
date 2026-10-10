import { expect, type Page } from "@playwright/test";

export const ACCOUNTS = {
  aman: { email: "aman@example.com", password: "Aman@2026" },
  neha: { email: "neha.kapoor@example.com", password: "Neha@2026" },
  lumen: { email: "ava.chen@example.com", password: "Ava@2026" },
  maya: { email: "maya.okafor@example.com", password: "Maya@2026" },
};

export async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/dashboard|onboarding/);
}

export const unique = (prefix: string) => `${prefix}${Date.now().toString(36)}`;

/** Brand creates and publishes a campaign through the UI; returns its id. */
export async function createPublishedCampaign(page: Page, title: string) {
  await page.goto("/brand/campaigns/new");
  await page.getByLabel("Campaign title").fill(title);
  await page.getByLabel("Objective").fill("Launch a new product to young professionals with real, everyday content.");
  await page.getByLabel("Type").first().selectOption({ label: "Short-form video" });
  await page.getByLabel("Budget up to").fill("1200");
  await page.getByLabel("Delivery deadline").fill(new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page).toHaveURL(/brand\/campaigns\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Campaign published")).toBeVisible();
  return page.url().split("/").pop()!;
}
