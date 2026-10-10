import { expect, test } from "@playwright/test";
import { ACCOUNTS, createPublishedCampaign, login, unique } from "./helpers";

test("proposal → project → private file version → revision → approval → completion; outsiders are blocked", async ({ browser }) => {
  test.setTimeout(600_000);
  const brand = await (await browser.newContext()).newPage();
  const creator = await (await browser.newContext()).newPage();
  const outsider = await (await browser.newContext()).newPage();
  const title = `E2E collab ${unique("")}`;

  // Brand publishes a campaign.
  await login(brand, ACCOUNTS.neha);
  const campaignId = await createPublishedCampaign(brand, title);

  // Creator drafts and sends a proposal.
  await login(creator, ACCOUNTS.aman);
  await creator.goto(`/campaigns/${campaignId}`);
  await creator.getByRole("link", { name: "Send proposal" }).click();
  await creator.getByLabel("Approach").fill("I'll film three short morning-routine stories in natural light, with the product at the centre of each.");
  await creator.getByLabel("Total quote").fill("900");
  await creator.getByRole("button", { name: "Save draft" }).click();
  await expect(creator).toHaveURL(/creator\/proposals\/[0-9a-f-]{36}/);
  await creator.getByRole("button", { name: "Submit proposal" }).click();
  await creator.getByRole("alertdialog").getByRole("button", { name: "Send proposal" }).click();
  await expect(creator.getByText("Submitted", { exact: true }).first()).toBeVisible();

  // Brand accepts → project.
  await brand.goto(`/brand/proposals?campaign=${campaignId}`);
  await expect(brand.getByText("Aman").first()).toBeVisible();
  await brand.getByRole("button", { name: /^Accept/ }).first().click();
  await brand.getByRole("alertdialog").getByRole("button", { name: /Accept/ }).click();
  await expect(brand).toHaveURL(/brand\/projects\/[0-9a-f-]{36}/, { timeout: 30_000 });
  const projectId = brand.url().split("/").pop()!;

  // Both confirm scope → active.
  await brand.getByRole("button", { name: "Confirm scope" }).click();
  await creator.goto(`/creator/projects/${projectId}`);
  await creator.getByRole("button", { name: "Confirm scope" }).click();
  await expect(creator.getByText("Active").first()).toBeVisible();

  // Creator uploads version 1 as a private file.
  await creator.reload();
  await creator.getByRole("button", { name: "Submit version 1" }).first().click();
  await creator.getByLabel("Upload file (max 50 MB)").setInputFiles({ name: "cut-v1.txt", mimeType: "text/plain", buffer: Buffer.from("first cut") });
  await expect(creator.getByText("Attached: cut-v1.txt")).toBeVisible();
  await creator.getByRole("button", { name: "Submit for review" }).click();
  await expect(creator.getByRole("list", { name: "Version history" }).getByText(/^Version 1/)).toBeVisible();

  // Brand downloads it via a signed link, then asks for a revision.
  await brand.reload();
  const download = brand.getByRole("link", { name: /cut-v1\.txt/ });
  await expect(download).toBeVisible();
  const href = await download.getAttribute("href");
  expect(href).toMatch(/token=/); // signed, expiring URL — not a public link
  expect(await (await brand.request.get(href!)).text()).toBe("first cut");
  await brand.getByLabel("Feedback").first().fill("Please brighten the opening shot.");
  await brand.getByRole("button", { name: "Request revision" }).click();
  // Wait until the decision is saved (shown in the version history), not just typed.
  await expect(brand.getByText(/Revision requested by/)).toBeVisible();

  // Creator submits version 2 as a link; version 1 stays in history.
  await creator.reload();
  await creator.getByRole("button", { name: "Submit version 2" }).first().click();
  await creator.getByLabel("Or link to the work").fill("https://example.com/cut-v2");
  await creator.getByRole("button", { name: "Submit for review" }).click();
  await expect(creator.getByText("Version 2")).toBeVisible();
  await expect(creator.getByRole("list", { name: "Version history" }).getByText(/^Version 1/)).toBeVisible();

  // Brand approves and completes.
  await brand.reload();
  await brand.getByRole("button", { name: "Approve version 2" }).click();
  await expect(brand.getByText(/Approved by/)).toBeVisible();
  await brand.reload();
  await brand.getByRole("button", { name: "Complete project" }).first().click();
  await brand.getByRole("alertdialog").getByRole("button", { name: "Complete project" }).click();
  await expect(brand.getByText("Completed").first()).toBeVisible();

  // Rights Passport is reachable and carries the legal notice.
  await brand.goto(`/projects/${projectId}/rights`);
  await expect(brand.getByText(/not, on its own, a legally binding/)).toBeVisible();

  // An unrelated creator can't see the project, its rights or its file.
  await login(outsider, ACCOUNTS.maya);
  for (const path of [`/creator/projects/${projectId}`, `/projects/${projectId}/rights`, `/projects/${projectId}/rights/export/json`]) {
    const res = await outsider.goto(path);
    expect(res!.status(), path).toBe(404);
  }
});
