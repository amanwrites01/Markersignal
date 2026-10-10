import { expect, test } from "@playwright/test";
import { ACCOUNTS, login, unique } from "./helpers";

test("brand creates, publishes and matches a campaign; it appears in search", async ({ page }) => {
  const title = `E2E juice launch ${unique("")}`;
  await login(page, ACCOUNTS.neha);
  await page.goto("/brand/campaigns/new");
  await page.getByLabel("Campaign title").fill(title);
  await page.getByLabel("Objective").fill("Launch a new mango juice to young professionals.");
  await page.getByLabel("Type").first().selectOption({ label: "Short-form video" });
  await page.getByLabel("Budget up to").fill("1200");
  const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Delivery deadline").fill(deadline);
  await page.getByRole("group", { name: "Desired creative style" }).getByRole("button", { name: "Story-driven" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();

  await expect(page).toHaveURL(/brand\/campaigns\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Campaign published")).toBeVisible();

  await page.getByRole("button", { name: "Find matches" }).click();
  await expect(page.getByText("How this was estimated").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Aman" })).toBeVisible();

  await page.goto(`/explore/campaigns?q=${encodeURIComponent("mango")}`);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});
