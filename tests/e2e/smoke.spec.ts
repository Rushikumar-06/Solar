import { expect, test, type Page } from "@playwright/test";

interface Diagnostics {
  programs: number;
  unlinked: string[];
}

const diagnostics = (page: Page) =>
  page.evaluate<Diagnostics>(() => {
    const o = (window as unknown as { __orrery?: { gl: { getContext(): WebGL2RenderingContext; info: { programs: { id: number; program: WebGLProgram }[] } } } }).__orrery;
    if (!o) return { programs: 0, unlinked: ["renderer not exposed"] };
    const gl = o.gl.getContext();
    return {
      programs: o.gl.info.programs.length,
      unlinked: o.gl.info.programs.filter((p) => !gl.getProgramParameter(p.program, gl.LINK_STATUS)).map((p) => String(p.id)),
    };
  });

test.describe("Orrery", () => {
  test("loads, compiles every shader, and runs the tour and explore flows", async ({ page }) => {
    const errors: string[] = [];
    const glWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
      if (msg.type() === "warning" && /WebGL: INVALID/.test(msg.text())) glWarnings.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(String(err)));
    const maps = new Map<string, number>();
    page.on("response", (res) => {
      if (res.url().includes("/maps/")) maps.set(res.url().split("/").pop()!, res.status());
    });

    await page.goto("/");
    await expect(page.locator(".loader")).toHaveAttribute("data-hidden", "true", { timeout: 60_000 });

    const diag = await diagnostics(page);
    expect(diag.programs).toBeGreaterThan(10);
    expect(diag.unlinked).toEqual([]);

    // Tour: the hero is shown first; scrolling to a section reveals its panel.
    await expect(page.locator("#section-hero")).toHaveAttribute("data-shown", "true");
    await page.evaluate(() => {
      const el = document.getElementById("section-jupiter")!;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "instant" });
    });
    await expect(page.locator("#section-jupiter")).toHaveAttribute("data-shown", "true");
    await expect(page.locator("#section-jupiter .panel-title")).toHaveText("Jupiter");

    // Explore: enter from the nav, pick a world from the dock, then return.
    await page.getByRole("button", { name: "Explore", exact: true }).first().click();
    await expect(page.locator(".hud")).toHaveAttribute("data-open", "true");
    await page.locator(".dock-item", { hasText: "Saturn" }).click();
    await expect(page.locator(".hud-panel .panel-title")).toHaveText("Saturn");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".hud-panel .panel-title")).toHaveText("Uranus");
    await page.keyboard.press("Escape");
    await expect(page.locator(".hud")).toHaveAttribute("data-open", "false");
    await expect(page.locator("#section-uranus")).toHaveAttribute("data-shown", "true");

    // The real surface maps have to arrive. A missing one fails quietly, leaving
    // a world flat-coloured with nothing in the console to say why.
    expect([...maps.entries()].sort()).toEqual([
      ["earth-land.png", 200],
      ["earth.jpg", 200],
      ["mercury.jpg", 200],
      ["moon.jpg", 200],
    ]);

    expect(errors, errors.join("\n")).toEqual([]);
    expect(glWarnings, glWarnings.join("\n")).toEqual([]);
  });
});
