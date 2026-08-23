import { expect, test } from "@playwright/test";

const SAVE_KEY = "reversi:save";

function readSave(page: import("@playwright/test").Page) {
  return page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
}

test("keeps an in-progress game after a reload", async ({ page }) => {
  await page.goto("/");

  await page.getByText("vs Player").click();
  await expect(page.getByRole("radio", { name: "vs Player" })).toBeChecked(); // guards against the aiAvailable-probe race auto-switching mode

  await page.getByText("Start Game").click();
  await expect(page.getByLabel("Menu")).toBeVisible();

  await page.locator('[class*="cell"]').nth(19).click(); // d3, a legal opening move

  // Board updates on click, but persistence waits out the flip animation
  // (createGameStore.ts) before saving - poll instead of asserting on the
  // immediately-visible board so this isn't racing that animation.
  await expect.poll(() => readSave(page)).toContain('"lastMove":19');
  const savedBefore = await readSave(page);

  await page.reload();

  await expect(page.getByLabel("Menu")).toBeVisible();
  await expect(page.getByText("Start Game")).toHaveCount(0);
  await expect(
    page.locator('[class*="cell"]').nth(19).locator('[class*="disc"]'),
  ).toBeVisible();
  expect(await readSave(page)).toEqual(savedBefore);
});
