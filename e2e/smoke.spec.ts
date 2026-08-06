import { expect, test } from "@playwright/test";

test("app loads without console errors", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto("/");

  await expect(page.locator("#root")).not.toBeEmpty();
  expect(consoleErrors).toEqual([]);
});
