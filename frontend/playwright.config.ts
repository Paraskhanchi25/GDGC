import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: String.raw`..\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8100`,
      url: "http://127.0.0.1:8100/health",
      reuseExistingServer: false,
      env: {
        LOG_TO_FILE: "false",
        DATABASE_URL: "",
        FIREBASE_SERVICE_ACCOUNT_JSON: "",
      },
    },
    {
      command:
        "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 90000,
      env: {
        API_BASE_URL: "http://127.0.0.1:8100",
        NEXT_PUBLIC_FIREBASE_API_KEY: "pulse-qa-key",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "pulse-qa.invalid",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: "pulse-qa",
        NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:qa",
      },
    },
  ],
});
