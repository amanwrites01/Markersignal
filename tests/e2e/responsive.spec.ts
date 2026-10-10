import { expect, test } from "@playwright/test";
import { ACCOUNTS, login } from "./helpers";

const noHorizontalScroll = async (page: import("@playwright/test").Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

test("public pages fit a phone screen and the menu works", async ({ page }) => {
  for (const path of ["/", "/explore/creators", "/explore/campaigns", "/creators/aman", "/auth/sign-up", "/about", "/terms"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Find creators" })).toBeVisible();
});

test("workspace pages fit a phone screen and the navigation drawer opens", async ({ page }) => {
  await login(page, ACCOUNTS.aman);
  for (const path of ["/creator/dashboard", "/creator/portfolio", "/creator/profile", "/creator/opportunities", "/creator/proposals", "/creator/messages", "/tools/scope-to-price"]) {
    await page.goto(path);
    await noHorizontalScroll(page);
  }
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Workspace" }).getByRole("link", { name: "Portfolio" })).toBeVisible();
});
