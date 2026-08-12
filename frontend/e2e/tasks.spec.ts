import { test, expect } from '@playwright/test'

/**
 * ==============================================================================
 * Task Management 核心使用者流程 E2E 端到端測試 (e2e/tasks.spec.ts)
 * ==============================================================================
 * 目的：模擬真實使用者在瀏覽器上的操作行為（載入頁面、輸入表單、切換看板、刪除任務等）
 * 特色：透過 Playwright 網路攔截 (page.route)，確保 E2E 測試快速、穩定且不依賴外部資料庫髒資料。
 */
test.describe('Task Management 任務管理系統 E2E 完整流程測試', () => {

  // 每個測試案例開始前執行的初始化邏輯
  test.beforeEach(async ({ page }) => {
    // 建立一筆初始模擬資料，確保每個測試都在乾淨可預期的狀態下開始
    let currentTasks = [
      {
        id: 1,
        title: '現有初始任務',
        description: '這是系統預先載入的任務描述',
        status: 'Todo',
        createdAt: new Date().toISOString(),
      },
    ]

    // 攔截 SignalR negotiate 請求以支援優雅離線/模擬環境
    await page.route('**/hubs/tasks/**', async route => {
      await route.fulfill({
        status: 200,
        json: {
          connectionId: 'mock-connection-id',
          availableTransports: [],
        },
      })
    })

    // 攔截 /api/tasks 的所有 GET 與 POST 網路請求
    await page.route('**/api/tasks**', async route => {
      const request = route.request()
      const method = request.method()

      if (method === 'GET') {
        // 處理查詢請求（支援 status 篩選）
        const url = new URL(request.url())
        const status = url.searchParams.get('status')
        const filtered = status && status !== 'All'
          ? currentTasks.filter(t => t.status === status)
          : currentTasks

        await route.fulfill({
          json: {
            items: filtered,
            totalCount: filtered.length,
            page: 1,
            pageSize: 20,
            totalPages: Math.ceil(filtered.length / 20) || 1,
          },
        })
      } else if (method === 'POST') {
        // 處理新增任務請求
        const data = JSON.parse(request.postData() || '{}')
        const newTask = {
          id: currentTasks.length + 1,
          title: data.title,
          description: data.description || '',
          status: data.status || 'Todo',
          createdAt: new Date().toISOString(),
        }
        currentTasks.unshift(newTask) // 加到最前面
        await route.fulfill({ status: 201, json: newTask })
      } else {
        await route.continue()
      }
    })

    // 攔截狀態更新請求 (PATCH /api/tasks/:id/status)
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

    // 攔截刪除請求 (DELETE /api/tasks/:id)
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

    // 前往網站首頁
    await page.goto('/')
  })

  // 測試案例 1：驗證首頁標題與預設任務是否正常載入
  test('1. 頁面正常載入並呈現初始任務卡片', async ({ page }) => {
    // 驗證主標題文字
    await expect(page.locator('h1')).toContainText('Task Management')
    // 驗證任務列表中包含初始任務
    await expect(page.locator('.task-card')).toContainText('現有初始任務')
  })

  // 測試案例 2：驗證新增任務表單（含空白防護與成功新增）
  test('2. 驗證標題必填驗證，並能成功新增一筆新任務', async ({ page }) => {
    // 步驟 A：輸入純空白標題並點擊提交，確認前端出現錯誤警告
    await page.locator('[data-test="title"]').fill('   ')
    await page.locator('form.form-card button[type="submit"]').click()
    await expect(page.locator('.error')).toContainText('Title is required.')

    // 步驟 B：輸入合法的標題與描述
    await page.locator('[data-test="title"]').fill('新自動化測試任務')
    await page.locator('[data-test="description"]').fill('透過 Playwright 模擬真實點擊新增')
    await page.locator('form.form-card button[type="submit"]').click()

    // 步驟 C：確認畫面上成功渲染出剛新增的任務
    await expect(page.locator('.tasks')).toContainText('新自動化測試任務')
    await expect(page.locator('.tasks')).toContainText('透過 Playwright 模擬真實點擊新增')
  })

  // 測試案例 3：驗證視圖切換（切換至 Kanban 看板模式）
  test('3. 點擊 Kanban 按鈕能切換至三欄式看板視圖', async ({ page }) => {
    // 點擊看板切換按鈕
    await page.locator('[data-test="view-kanban"]').click()

    // 驗證看板元件已出現在畫面上
    await expect(page.locator('.kanban-board')).toBeVisible()

    // 驗證 To Do 欄位中包含任務
    await expect(page.locator('[data-test="column-todo"]')).toContainText('現有初始任務')
  })

  // 測試案例 4：驗證刪除任務
  test('4. 點擊 Delete 按鈕能將任務從畫面上移除', async ({ page }) => {
    // 確認任務一開始存在
    await expect(page.locator('.task-card')).toContainText('現有初始任務')

    // 點擊刪除按鈕
    await page.locator('[data-test="delete-task-1"]').click()

    // 驗證該任務已經從清單中消失，畫面顯示「No tasks found.」無任務狀態
    await expect(page.locator('.task-card')).toHaveCount(0)
    await expect(page.locator('.state')).toContainText('No tasks found.')
  })
})
