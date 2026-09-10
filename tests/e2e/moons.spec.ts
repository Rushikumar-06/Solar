import { expect, test } from "@playwright/test";

test("moons are reachable from their planet and lead back to it", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
    if (msg.type() === "warning" && /WebGL: INVALID/.test(msg.text())) errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await expect(page.locator(".loader")).toHaveAttribute("data-hidden", "true", { timeout: 60_000 });

  // The tour panels carry the moon row too.
  await page.evaluate(() => {
    const el = document.getElementById("section-saturn")!;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
  });
  await expect(page.locator("#section-saturn .moon-chip")).toHaveText(["Mimas", "Enceladus", "Titan"]);

  // Explore: a planet lists its moons, and each moon links back to its planet.
  await page.getByRole("button", { name: "Explore", exact: true }).first().click();
  await page.locator(".dock-item", { hasText: /^Jupiter$/ }).click();
  await expect(page.locator(".hud-panel .moon-chip")).toHaveText(["Io", "Europa", "Ganymede", "Callisto"]);

  await page.locator(".hud-panel .moon-chip", { hasText: /^Europa$/ }).click();
  await expect(page.locator(".hud-panel .panel-title")).toHaveText("Europa");
  await expect(page.locator(".hud-panel .moon-row-label")).toHaveText("Orbits");
  await expect(page.locator(".hud-panel .moon-chip")).toHaveText(["Jupiter"]);

  // Arrow keys step on to the next planet rather than through the moons.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".hud-panel .panel-title")).toHaveText("Saturn");

  // Mercury really has none, and says so.
  await page.locator(".dock-item", { hasText: /^Mercury$/ }).click();
  await expect(page.locator(".hud-panel .moon-row-none")).toHaveText("None at all");

  // The dock stays a list of planets, not of every body in the system.
  await expect(page.locator(".dock-item")).toHaveCount(12);

  expect(errors, errors.join("\n")).toEqual([]);
});
