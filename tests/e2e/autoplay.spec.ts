import { expect, test } from "@playwright/test";

test("autoplay scrolls the tour by itself and pauses on a wheel gesture", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveAttribute("data-hidden", "true", { timeout: 60_000 });

  const toggle = page.getByRole("button", { name: "Play the tour automatically" });
  await toggle.click();
  await expect(page.locator(".autoplay button")).toHaveAttribute("aria-pressed", "true");

  await page.waitForFunction(() => window.scrollY > 300, null, { timeout: 15_000 });
  await expect(page.locator("#section-sun")).toHaveAttribute("data-shown", "true", { timeout: 20_000 });

  await page.mouse.wheel(0, 120);
  await expect(page.locator(".autoplay button")).toHaveAttribute("aria-pressed", "false");
});
