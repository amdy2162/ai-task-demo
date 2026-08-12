import { defineConfig, devices } from '@playwright/test'

/**
 * ==============================================================================
 * Playwright E2E 端到端測試設定檔 (playwright.config.ts)
 * ==============================================================================
 * 此檔案負責設定自動化瀏覽器測試的行為，包括：
 * 1. 測試檔案放置路徑 (testDir)
 * 2. 測試目標網址 (baseURL)
 * 3. 測試瀏覽器環境 (projects: Chromium / Chrome)
 * 4. 自動啟動前端開發伺服器 (webServer)
 */
export default defineConfig({
  // 指定 E2E 測試檔案所在的目錄
  testDir: './e2e',

  // 是否平行執行測試（提高本機測試速度）
  fullyParallel: true,

  // 在 CI 伺服器上若有 test.only 則視為錯誤（避免誤把只跑單一測試的程式碼推上線）
  forbidOnly: !!process.env.CI,

  // 測試失敗時的重試次數（CI 環境下重試 2 次以避免網路偶發問題）
  retries: process.env.CI ? 2 : 0,

  // 同時執行的工作執行緒數量
  workers: process.env.CI ? 1 : undefined,

  // 測試報告格式：生成漂亮的 HTML 互動式報告
  reporter: 'html',

  // 所有測試共用的通用設定
  use: {
    // 前端應用程式的基礎網址
    baseURL: 'http://localhost:5173',

    // 當測試失敗時自動錄製詳細軌跡 (Trace)，方便事後除錯
    trace: 'on-first-retry',
  },

  // 定義要測試的目標瀏覽器（此處使用 Desktop Chrome）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 自動化伺服器設定：執行測試前，自動啟動 Vite 開發伺服器 (npm run dev)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    // 本機開發時若伺服器已經在跑，就直接共用，不用重複啟動
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
