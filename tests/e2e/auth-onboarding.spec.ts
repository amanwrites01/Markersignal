import { expect, test } from "@playwright/test";
import { ACCOUNTS, login, unique } from "./helpers";

test("sign up with on-screen code, choose creator, finish onboarding", async ({ page }) => {
  const email = `${unique("e2e")}@example.com`;
  await page.goto("/auth/sign-up");
  await page.getByLabel("Full name").fill("Kabir");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Kabir@2026");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/check-email/);
  await expect(page.getByText("Temporary: email sending isn't set up yet")).toBeVisible();
  await page.getByRole("button", { name: "Verify and continue" }).click();

  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole("button", { name: /I'm a creator/ }).click();
  await expect(page).toHaveURL(/creator\/onboarding/);

  await page.getByLabel("Headline").fill("Food reels with a story");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/step=2/);
  await page.getByRole("button", { name: "Video creator" }).click();
  await page.getByRole("button", { name: "Story-driven" }).click();
  await page.getByRole("button", { name: "Videography" }).click();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/step=3/);
  await page.getByLabel("Starting rate").fill("400");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/step=4/);
  await page.getByRole("button", { name: "Finish and go to dashboard" }).click();
  await expect(page).toHaveURL(/creator\/dashboard/);
  await expect(page.getByRole("heading", { name: /Kabir/ })).toBeVisible();
});

test("login rejects a wrong password without revealing which field was wrong", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(ACCOUNTS.aman.email);
  await page.getByLabel("Password", { exact: true }).fill("Wrong-pass-1");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("alert").first()).toHaveText("Email or password is incorrect.");
});

test("protected pages redirect to login and role areas are enforced", async ({ page }) => {
  await page.goto("/brand/dashboard");
  await expect(page).toHaveURL(/auth\/login\?next=/);
  await login(page, ACCOUNTS.aman);
  await page.goto("/brand/campaigns");
  await expect(page).toHaveURL(/creator\/dashboard/);
});

test("logout ends the session", async ({ page }) => {
  await login(page, ACCOUNTS.aman);
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/creator/dashboard");
  await expect(page).toHaveURL(/auth\/login/);
});
