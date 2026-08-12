# Automated Testing & CI/CD DevOps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為專案建置前端 Playwright E2E 端到端測試套件，以及 GitHub Actions CI/CD Pipeline 自動化流程（包含後端測試與覆蓋率、前端單元測試、型別檢查、生產建置與自動品質閘門）。

**Architecture:** 前端安裝 `@playwright/test` 並配置 `playwright.config.ts` 與 `e2e/tasks.spec.ts`，模擬使用者從輸入、新增、狀態切換、看板切換到刪除的完整旅程；在專案根目錄建立 `.github/workflows/ci.yml`，在每次 Push 與 Pull Request 時並行執行前後端測試與驗證，未通過時自動阻擋合併。

**Tech Stack:** Playwright (`@playwright/test`), GitHub Actions, .NET 10 SDK, Node.js 22, Vitest, xUnit, Coverlet.

---

### Task 1: Playwright E2E End-to-End Testing Setup

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/e2e/tasks.spec.ts`

- [ ] **Step 1: Install @playwright/test package**

In `frontend`:
```bash
npm install -D @playwright/test
```

- [ ] **Step 2: Create playwright.config.ts**

Create `frontend/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
```

- [ ] **Step 3: Create E2E test scenarios in frontend/e2e/tasks.spec.ts**

Create `frontend/e2e/tasks.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Task Management E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend API requests with realistic mock data to ensure deterministic E2E runs
    let currentTasks = [
      { id: 1, title: 'Existing Task', description: 'Sample description', status: 'Todo', createdAt: new Date().toISOString() },
    ]

    await page.route('**/api/tasks**', async route => {
      const request = route.request()
      const method = request.method()

      if (method === 'GET') {
        const url = new URL(request.url())
        const status = url.searchParams.get('status')
        const filtered = status && status !== 'All' ? currentTasks.filter(t => t.status === status) : currentTasks
        await route.fulfill({ json: filtered })
      } else if (method === 'POST') {
        const data = JSON.parse(request.postData() || '{}')
        const newTask = {
          id: currentTasks.length + 1,
          title: data.title,
          description: data.description || '',
          status: data.status || 'Todo',
          createdAt: new Date().toISOString(),
        }
        currentTasks.unshift(newTask)
        await route.fulfill({ status: 201, json: newTask })
      } else {
        await route.continue()
      }
    })

    await page.route('**/api/tasks/*/status', async route => {
      const data = JSON.parse(route.request().postData() || '{}')
      const match = route.request().url().match(/\/api\/tasks\/(\d+)\/status/)
      const id = match ? parseInt(match[1]) : 0
      const item = currentTasks.find(t => t.id === id)
      if (item) {
        item.status = data.status
        await route.fulfill({ json: item })
      } else {
        await route.fulfill({ status: 404 })
      }
    })

    await page.route('**/api/tasks/*', async route => {
      if (route.request().method() === 'DELETE') {
        const match = route.request().url().match(/\/api\/tasks\/(\d+)$/)
        const id = match ? parseInt(match[1]) : 0
        currentTasks = currentTasks.filter(t => t.id !== id)
        await route.fulfill({ status: 204 })
      } else {
        await route.continue()
      }
    })

    await page.goto('/')
  })

  test('loads task management page with initial tasks', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Task Management')
    await expect(page.locator('.task-card')).toContainText('Existing Task')
  })

  test('validates required title and adds a new task', async ({ page }) => {
    // 1. Test empty title error
    await page.locator('[data-test="title"]').fill('   ')
    await page.locator('form.form-card button[type="submit"]').click()
    await expect(page.locator('.error')).toContainText('Title is required.')

    // 2. Add valid task
    await page.locator('[data-test="title"]').fill('New E2E Task')
    await page.locator('[data-test="description"]').fill('E2E automation test description')
    await page.locator('form.form-card button[type="submit"]').click()

    await expect(page.locator('.tasks')).toContainText('New E2E Task')
    await expect(page.locator('.tasks')).toContainText('E2E automation test description')
  })

  test('switches view to Kanban board mode', async ({ page }) => {
    await page.locator('[data-test="view-kanban"]').click()
    await expect(page.locator('.kanban-board')).toBeVisible()
    await expect(page.locator('[data-test="column-todo"]')).toContainText('Existing Task')
  })

  test('deletes a task', async ({ page }) => {
    await expect(page.locator('.tasks')).toContainText('Existing Task')
    await page.locator('[data-test="delete-task-1"]').click()
    await expect(page.locator('.tasks')).not.toContainText('Existing Task')
  })
})
```

- [ ] **Step 4: Update package.json scripts**

In `frontend/package.json`, add scripts:
```json
"test:e2e": "playwright test",
"test:all": "npm run test && npm run test:e2e"
```

- [ ] **Step 5: Run Playwright tests to verify**

Run: `cd frontend && npx playwright test`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/playwright.config.ts frontend/e2e/tasks.spec.ts
git commit -m "feat(devops): setup Playwright E2E testing suite with user workflow tests"
```

---

### Task 2: GitHub Actions CI/CD Pipeline Configuration

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows/ci.yml**

Create `.github/workflows/ci.yml`:
```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, interview-clean-history, 'feature/**' ]
  pull_request:
    branches: [ main, interview-clean-history ]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  backend-test:
    name: Backend Build & Test (.NET 10)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup .NET SDK
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'

      - name: Restore Backend Dependencies
        run: dotnet restore backend/AiTaskDemo.Api.csproj

      - name: Build Backend Solution
        run: dotnet build backend/AiTaskDemo.Api.csproj --configuration Release --no-restore

      - name: Run Backend Integration & Unit Tests
        run: dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj --configuration Release --verbosity normal --collect:"XPlat Code Coverage"

  frontend-test:
    name: Frontend Test & Build (Vue 3 + Vite)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Frontend Dependencies
        working-directory: frontend
        run: npm ci

      - name: Run Frontend Unit & Component Tests (Vitest)
        working-directory: frontend
        run: npm test

      - name: Run Type Check & Production Build (Vite)
        working-directory: frontend
        run: npm run build

      - name: Install Playwright Browsers
        working-directory: frontend
        run: npx playwright install --with-deps chromium

      - name: Run E2E End-to-End Tests (Playwright)
        working-directory: frontend
        run: npm run test:e2e
```

- [ ] **Step 2: Commit CI/CD configuration**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI pipeline for backend and frontend tests"
```

---

### Task 3: Documentation Updates (SPEC.md, README.md, ROLES.md)

**Files:**
- Modify: `SPEC.md`
- Modify: `README.md`
- Modify: `ROLES.md`

- [ ] **Step 1: Update SPEC.md**
  - Add Automated Testing & CI/CD specifications
  - Add Playwright E2E test verification rules

- [ ] **Step 2: Update README.md**
  - Add E2E 測試指令與說明（`npm run test:e2e`）
  - Add GitHub Actions CI/CD Pipeline 架構與狀態說明
  - Add CI 徽章展示指引

- [ ] **Step 3: Update ROLES.md**
  - 更新 QA 與全端工程師角色關於 E2E 自動化腳本與 CI 品質閘門規範

- [ ] **Step 4: Run all test suites across backend and frontend**

Run:
```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
cd frontend && npm test && npm run build
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add SPEC.md README.md ROLES.md docs/superpowers/plans/2026-08-12-testing-and-cicd-devops.md
git commit -m "docs: update spec, readme, and roles with E2E and CI/CD DevOps specifications"
```
