import { expect, test, type Page } from "@playwright/test";

/*
  End-to-end scenario (README → "Testy end-to-end"). Requires a running app connected to a Supabase project and:
    E2E_COACH_EMAIL / E2E_COACH_PASSWORD     an existing coach account
    E2E_ATHLETE_EMAIL / E2E_ATHLETE_PASSWORD an athlete already linked to that coach (accepted invitation)
  The test creates sessions dated tomorrow with a unique tag, so it can run repeatedly.
*/

const coach = { email: process.env.E2E_COACH_EMAIL ?? "", password: process.env.E2E_COACH_PASSWORD ?? "" };
const athlete = { email: process.env.E2E_ATHLETE_EMAIL ?? "", password: process.env.E2E_ATHLETE_PASSWORD ?? "" };
const tag = `E2E ${Date.now().toString(36)}`;
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

test.skip(!coach.email || !athlete.email, "Set E2E_* credentials to run end-to-end tests");
test.describe.configure({ mode: "serial" });

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Hasło").fill(who.password);
  await page.getByRole("button", { name: "Zaloguj się" }).click();
}

async function logout(page: Page) {
  await page.context().clearCookies();
}

test("unauthenticated users are redirected to login", async ({ page }) => {
  await page.goto("/coach");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/athlete/history");
  await expect(page).toHaveURL(/\/login/);
});

test("coach is routed to the coach panel and plans a running and a strength session", async ({ page }) => {
  await login(page, coach);
  await expect(page).toHaveURL(/\/coach$/);

  // running intervals
  await page.goto(`/coach/sessions/new?date=${tomorrow}`);
  await page.locator("label", { hasText: /./ }).filter({ has: page.locator('input[type="checkbox"]') }).first().click();
  await page.getByLabel("Rodzaj").selectOption("intervals");
  await page.getByLabel("Nazwa", { exact: true }).fill(`${tag} 6×800 m`);
  await page.getByLabel(/Dystans/).first().fill("10");
  await page.getByRole("button", { name: "Odcinek", exact: true }).click();
  await page.getByLabel("Powt.").fill("6");
  await page.getByRole("button", { name: /Dodaj trening/ }).click();
  await expect(page.getByRole("heading", { name: `${tag} 6×800 m` })).toBeVisible();

  // strength with varied sets
  await page.goto(`/coach/sessions/new?date=${tomorrow}&kind=strength`);
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByLabel("Nazwa", { exact: true }).fill(`${tag} Siła`);
  await page.getByPlaceholder("np. Przysiad ze sztangą").fill("Przysiad");
  await page.getByLabel("Seria 1: powtórzenia").fill("10");
  await page.getByLabel("Seria 1: obciążenie kg").fill("40");
  await page.getByLabel("Seria 2: powtórzenia").fill("8");
  await page.getByLabel("Seria 2: obciążenie kg").fill("45");
  await page.getByLabel("Seria 3: powtórzenia").fill("6");
  await page.getByLabel("Seria 3: obciążenie kg").fill("50");
  await page.getByRole("button", { name: /Dodaj trening/ }).click();
  await expect(page.getByRole("heading", { name: `${tag} Siła` })).toBeVisible();
  await logout(page);
});

test("athlete sees only own plan and records actual results", async ({ page }) => {
  await login(page, athlete);
  await expect(page).toHaveURL(/\/athlete$/);
  await page.goto(`/athlete/calendar?view=day&date=${tomorrow}`);
  await page.getByRole("link", { name: new RegExp(`${tag} 6×800 m`) }).click();
  await page.getByLabel(/Dystans/).first().fill("10,2");
  await page.getByLabel("Czas", { exact: false }).first().fill("41:30");
  await page.getByRole("button", { name: /Zakończ trening/ }).click();
  await expect(page.getByText("Plan a wykonanie")).toBeVisible();

  await page.goto(`/athlete/calendar?view=day&date=${tomorrow}`);
  await page.getByRole("link", { name: new RegExp(`${tag} Siła`) }).click();
  await page.getByLabel("Seria 1: kg").fill("42,5");
  await page.getByRole("button", { name: "Wszystkie serie wykonane" }).click();
  await page.getByRole("button", { name: /Zakończ trening/ }).click();
  await expect(page.getByText("zgodnie z planem").first()).toBeVisible();

  // athletes cannot open coach routes
  await page.goto("/coach");
  await expect(page).toHaveURL(/\/athlete$/);
  await logout(page);
});

test("coach sees the athlete's results next to the plan", async ({ page }) => {
  await login(page, coach);
  await page.goto(`/coach/calendar?view=day&date=${tomorrow}`);
  await page.getByRole("link", { name: new RegExp(`${tag} Siła`) }).first().click();
  await expect(page.getByText("Plan a wykonanie")).toBeVisible();
  await expect(page.getByText("+2,5 kg")).toBeVisible();
});
