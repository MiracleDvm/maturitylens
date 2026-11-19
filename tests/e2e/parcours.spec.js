const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { test, expect } = require("@playwright/test");

const INDEX_URL = pathToFileURL(path.join(__dirname, "..", "..", "index.html")).href;

test("parcours complet (accueil -> exemple -> résultats) sans erreur console", async ({ page }) => {
  const erreurs = [];
  page.on("pageerror", function (e) { erreurs.push(String(e)); });
  page.on("console", function (msg) { if (msg.type() === "error") { erreurs.push(msg.text()); } });

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto(INDEX_URL);

  await page.getByRole("button", { name: "Commencer l'auto-évaluation" }).click();
  await page.getByRole("button", { name: "Charger un exemple" }).click();

  await page.getByRole("button", { name: /A\.5 Organisationnel/ }).click();
  await expect(page.locator(".carte").first()).toBeVisible();
  await page.screenshot({ path: "docs/questionnaire.png" });

  await page.getByRole("button", { name: "Résultats" }).click();
  await expect(page.locator(".radar")).toBeVisible();
  await page.screenshot({ path: "docs/resultats.png", fullPage: true });

  expect(erreurs).toEqual([]);
});
