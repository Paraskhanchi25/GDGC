import { test, expect, type Page } from "@playwright/test";
import overview from "./fixtures/overview.json";

// Firebase SDK persistence is seeded only inside the test browser. All identity
// and financial responses are intercepted. No backend auth bypass is introduced.
async function signedIn(page: Page) {
  await page.route("https://identitytoolkit.googleapis.com/**", (route) =>
    route.fulfill({
      json: {
        users: [
          {
            localId: "qa-student",
            displayName: "QA Student",
            email: "qa@example.test",
            emailVerified: true,
            providerUserInfo: [
              {
                providerId: "google.com",
                rawId: "qa-student",
                email: "qa@example.test",
                displayName: "QA Student",
              },
            ],
            createdAt: "1700000000000",
            lastLoginAt: "1700000000000",
          },
        ],
      },
    }),
  );
  await page.addInitScript(async () => {
    const encode = (value: object) =>
      btoa(JSON.stringify(value))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    const now = Math.floor(Date.now() / 1000);
    const token = `${encode({ alg: "none" })}.${encode({ sub: "qa-student", user_id: "qa-student", aud: "pulse-qa", iss: "https://securetoken.google.com/pulse-qa", iat: now, exp: now + 3600, auth_time: now, firebase: { sign_in_provider: "google.com", identities: {} } })}.test`;
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open("firebaseLocalStorageDb", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("firebaseLocalStorage", {
          keyPath: "fbase_key",
        });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("firebaseLocalStorage", "readwrite");
        tx.objectStore("firebaseLocalStorage").put({
          fbase_key: "firebase:authUser:pulse-qa-key:[DEFAULT]",
          value: {
            uid: "qa-student",
            email: "qa@example.test",
            emailVerified: true,
            displayName: "QA Student",
            isAnonymous: false,
            providerData: [
              {
                providerId: "google.com",
                uid: "qa-student",
                email: "qa@example.test",
                displayName: "QA Student",
                photoURL: null,
              },
            ],
            stsTokenManager: {
              refreshToken: "qa-refresh",
              accessToken: token,
              expirationTime: Date.now() + 3600000,
            },
            apiKey: "pulse-qa-key",
            appName: "[DEFAULT]",
            createdAt: "1700000000000",
            lastLoginAt: "1700000000000",
          },
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  });
  await page.route("**/api/v1/auth/sync", (route) =>
    route.fulfill({ json: { profile: { onboarding_completed: true } } }),
  );
}

test("public routes fit all required viewports and expose the canonical icon", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const width of [1920, 1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/learn/credit-cards", "/showcase"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      if (route.includes("learn"))
        await expect(
          page.getByRole("button", { name: /Credit, decoded/ }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            ) <= window.innerWidth,
        ),
      ).toBeTruthy();
      await expect(
        page.locator('link[rel="icon"][href="/brand/symbol.svg"]'),
      ).toHaveCount(1);
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: `test-results/${route.replaceAll("/", "-") || "landing"}-${width}.png`,
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
});

for (const width of [1920, 1440, 1024, 768, 390, 360]) {
  test(`authenticated finance screens remain usable at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await signedIn(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/v1/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let json: unknown = {};
      if (path.includes("analytics/overview")) json = overview;
      else if (path.endsWith("/accounts")) json = { accounts: [] };
      else if (path.endsWith("/transactions"))
        json = {
          total: overview.recent_transactions.length,
          items: overview.recent_transactions,
        };
      else if (path.endsWith("/goals")) json = [];
      else if (path.endsWith("/ai/conversations")) json = [];
      else if (path.endsWith("/notifications"))
        json = {
          unread_count: 0,
          items: [],
          preferences: {
            email_enabled: false,
            in_app_enabled: true,
            weekly_summary_enabled: true,
            payment_reminders_enabled: true,
            spending_alerts_enabled: true,
          },
        };
      else if (path.endsWith("/profile"))
        json = {
          display_name: "QA Student",
          email: "qa@example.test",
          country: "India",
          currency: "INR",
          monthly_allowance_minor: 1200000,
          current_savings_minor: 200000,
          allowance_frequency: "monthly",
          expected_next_allowance_date: null,
          onboarding_completed: true,
        };
      else if (path.endsWith("/gmail/status"))
        json = {
          oauth_available: false,
          connected: false,
          connection_status: "disconnected",
          latest_sync: null,
        };
      else if (path.endsWith("/subscriptions"))
        json = {
          summary: {
            total_detected: 0,
            active_count: 0,
            estimated_monthly_minor: 0,
            estimated_annual_minor: 0,
            upcoming_renewals_count: 0,
            upcoming_renewals_total_minor: 0,
            trials_ending_count: 0,
            failed_payments_count: 0,
            has_uncertain_estimates: false,
          },
          subscriptions: [],
          upcoming_renewals: [],
          trials_ending_soon: [],
          failed_payments: [],
          category_breakdown: [],
          merchant_breakdown: [],
        };
      return route.fulfill({ json });
    });
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/home",
      "/transactions",
      "/analytics",
      "/forecast",
      "/recurring",
      "/subscriptions",
      "/goals",
      "/simulator",
      "/copilot",
      "/notifications",
      "/profile",
      "/settings",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            ) <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBeTruthy();
      if (route === "/home" && [1440, 390].includes(width))
        await page.screenshot({
          path: `test-results/dashboard-${width}.png`,
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
}

test("landing stays public with an authenticated SDK session", async ({
  page,
}) => {
  await signedIn(page);
  await page.route("**/api/v1/analytics/overview**", route => route.fulfill({ json: overview }));
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open Dashboard" }).first(),
  ).toBeVisible();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.getByRole("button", { name: "Open Dashboard" }).first().click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole("heading", { name: "Your money, today." })).toBeVisible();
  await page.getByTitle("Return to PULSE homepage").click();
  await expect(page).toHaveURL("http://127.0.0.1:3100/");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open Dashboard" }).first(),
  ).toBeVisible();
});

test("protected route uses the existing sign-in page", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
});

test("login manifest uses credentials and is served publicly", async ({ page }) => {
  await page.goto("/login");
  const manifest = page.locator('link[rel="manifest"]');
  await expect(manifest).toHaveCount(1);
  await expect(manifest).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(manifest).toHaveAttribute("crossorigin", "use-credentials");
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  expect((await response.json()).name).toBe("PULSE Student Finance");
});

test("showcase completes, skips and restarts without writes", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET" && req.url().includes("/api/"))
      writes.push(req.url());
  });
  await page.goto("/showcase");
  await page.getByRole("button", { name: "Start guided demo" }).click();
  for (const heading of [
    "Meet the student",
    "Understand the money",
    "Look ahead",
    "Ask the assistant",
    "Learn before borrowing",
    "Inside PULSE",
  ]) {
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    if (heading === "Ask the assistant")
      await expect(
        page.getByText("Deterministic example · not a live AI response"),
      ).toBeVisible();
    if (heading !== "Inside PULSE")
      await page.getByRole("button", { name: "Next step" }).click();
  }
  await page.getByLabel("Skip to section").selectOption("1");
  await expect(
    page.getByRole("heading", { name: "Understand the money" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(
    page.getByRole("button", { name: "Start guided demo" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test("Academy interactions and source links are usable without sign-in", async ({
  page,
}) => {
  await page.goto("/learn/credit-cards");
  await page.getByRole("button", { name: /Know your CIBIL score/ }).click();
  await expect(
    page.getByRole("heading", { name: "What if your spending changes?" }),
  ).toBeVisible();
  await page.getByLabel(/Monthly spend/).fill("2000");
  await expect(page.getByText("10%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Follow the billing cycle/ }).click();
  await page.getByLabel(/Purchase on day/).fill("25");
  await expect(page.getByText(/month after next/)).toBeVisible();
  await page.getByRole("button", { name: /Choose your next step/ }).click();
  await page.getByLabel("I know where my money goes").check();
  await expect(page.getByText(/1\/5 reflected on/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /TransUnion CIBIL/ }),
  ).toHaveAttribute("href", "https://www.cibil.com/faq-brochure");
});

test("smart entry reviews, warns for duplicate, saves and undoes with voice fallback", async ({
  page,
}) => {
  await signedIn(page);
  const tx = {
    id: "qa-tx",
    merchant: "College canteen",
    description: "Lunch",
    amount_minor: 25000,
    transaction_type: "expense",
    category_name: "Food",
    transaction_date: "2026-11-27",
    account_id: null,
    payment_method: "UPI",
    source_name: "Personal entry",
    currency: "INR",
  };
  const mutations: string[] = [];
  await page.route("**/api/v1/accounts", (route) =>
    route.fulfill({ json: { accounts: [] } }),
  );
  await page.route("**/api/v1/transactions?**", (route) =>
    route.fulfill({ json: { total: 0, items: [] } }),
  );
  await page.route("**/api/v1/transactions/parse", (route) =>
    route.fulfill({ json: { ...tx, warnings: [] } }),
  );
  await page.route("**/api/v1/transactions/duplicates", (route) =>
    route.fulfill({ json: { likely_duplicate: true, count: 1 } }),
  );
  await page.route("**/api/v1/transactions", (route) => {
    mutations.push(route.request().method());
    return route.fulfill({ json: tx });
  });
  await page.route("**/api/v1/transactions/qa-tx", (route) => {
    mutations.push(route.request().method());
    return route.fulfill({ json: { deleted: true } });
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
    });
  });
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Add Transaction", exact: true })
    .click();
  await page.getByRole("button", { name: "Use voice" }).click();
  await expect(page.getByText(/not supported in this browser/)).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(window, "SpeechRecognition", { configurable: true, value: class {
      onerror: ((event: { error: string }) => void) | null = null;
      start() { setTimeout(() => this.onerror?.({ error: "not-allowed" }), 0); }
      stop() {}
    } });
  });
  await page.getByRole("button", { name: "Use voice" }).click();
  await expect(page.getByText(/Microphone access was declined/)).toBeVisible();
  await page
    .getByLabel("What happened?")
    .fill("Spent 250 on lunch at the college canteen");
  await page.getByRole("button", { name: "Review entry" }).click();
  await expect(page.getByLabel("Amount (₹)")).toHaveValue("250");
  expect(mutations).toEqual([]);
  await page.getByRole("button", { name: "Confirm and save" }).click();
  await expect(page.getByText(/already exists/)).toBeVisible();
  expect(mutations).toEqual([]);
  await page.getByRole("button", { name: "Save separate payment" }).click();
  await expect(page.getByText(/Saved ₹250/)).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("What happened?")).toBeVisible();
  expect(mutations).toEqual(["POST", "DELETE"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Copilot loading, retry, duplicate protection and saved conversation work", async ({ page }) => {
  await signedIn(page);
  await page.setViewportSize({ width: 390, height: 900 });
  let calls = 0;
  let release: () => void = () => {};
  const waiting = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/v1/ai/conversations", route => route.fulfill({ json: [{ id: "saved", title: "A saved question" }] }));
  await page.route("**/api/v1/ai/conversations/saved", route => route.fulfill({ json: { id: "saved", messages: [{ role: "user", content: "My older question" }, { role: "assistant", content: "Your saved explanation" }] } }));
  await page.route("**/api/v1/ai/chat", async route => {
    calls++;
    if (calls === 1) { await waiting; return route.fulfill({ json: { status: "error", retryable: true, error_category: "timeout", conversation_id: null } }); }
    expect(route.request().postDataJSON().conversation_id).toBeNull();
    return route.fulfill({ json: { status: "ok", answer: "Your largest recorded category is food.", conversation_id: "new-conversation" } });
  });
  await page.goto("/copilot");
  const input = page.getByLabel("Question for your financial assistant");
  await input.fill("Explain my spending");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("Reviewing your financial records...")).toBeVisible();
  await input.press("Enter");
  expect(calls).toBe(1);
  release();
  await expect(page.getByRole("link", { name: "View spending insights" })).toBeVisible();
  await page.getByRole("button", { name: "Retry question" }).click();
  await expect(page.getByText("Your largest recorded category is food.")).toBeVisible();
  expect(calls).toBe(2);
  await page.getByText("Your conversations", { exact: true }).click();
  await page.getByRole("button", { name: "A saved question" }).click();
  await expect(page.getByText("Your saved explanation")).toBeVisible();
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.getByText("Ask a question about your finances")).toBeVisible();
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBeTruthy();
});
