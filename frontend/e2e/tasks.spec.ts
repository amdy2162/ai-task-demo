import { test, expect } from '@playwright/test'

/**
 * ==============================================================================
 * Task Management 核心使用者流程 E2E 端到端測試 (e2e/tasks.spec.ts)
 * ==============================================================================
 * 目的：模擬真實使用者在瀏覽器上的操作行為（註冊、登入、新增任務、切換看板、狀態變更、多用戶隔離、刪除等）
 * 特色：透過 Playwright 網路攔截 (page.route)，確保 E2E 測試快速、穩定且不依賴外部資料庫髒資料。
 */
test.describe('Task Management 任務管理系統 E2E 完整流程測試', () => {

  // 每個測試案例開始前執行的初始化邏輯
  test.beforeEach(async ({ page }) => {
    // 建立初始模擬資料與使用者
    let currentTasks = [
      {
        id: 1,
        title: '現有初始任務',
        description: '這是系統預先載入的任務描述',
        status: 'Todo',
        userId: 1,
        createdAt: new Date().toISOString(),
      },
    ]

    let users = [
      {
        id: 1,
        username: 'UserA',
        password: 'password123',
        token: 'token-UserA',
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

    // 攔截 /api/auth/register
    await page.route('**/api/auth/register', async route => {
      const data = JSON.parse(route.request().postData() || '{}')
      const username = data.username
      const password = data.password

      if (users.some(u => u.username === username)) {
        await route.fulfill({
          status: 409,
          json: {
            status: 409,
            title: 'Username already exists',
            detail: `The username '${username}' is already taken.`
          }
        })
        return
      }

      const newUser = {
        id: users.length + 1,
        username,
        password,
        token: `token-${username}`
      }
      users.push(newUser)

      await route.fulfill({
        status: 201,
        json: {
          token: newUser.token,
          user: {
            id: newUser.id,
            username: newUser.username,
            createdAt: new Date().toISOString()
          }
        }
      })
    })

    // 攔截 /api/auth/login
    await page.route('**/api/auth/login', async route => {
      const data = JSON.parse(route.request().postData() || '{}')
      const username = data.username
      const password = data.password

      const user = users.find(u => u.username === username && u.password === password)
      if (!user) {
        await route.fulfill({
          status: 401,
          json: {
            status: 401,
            title: 'Unauthorized',
            detail: 'Invalid username or password.'
          }
        })
        return
      }

      await route.fulfill({
        status: 200,
        json: {
          token: user.token,
          user: {
            id: user.id,
            username: user.username,
            createdAt: new Date().toISOString()
          }
        }
      })
    })

    // 攔截 /api/auth/me
    await page.route('**/api/auth/me', async route => {
      const authHeader = route.request().headers()['authorization']
      const token = authHeader?.replace('Bearer ', '')
      const user = users.find(u => u.token === token)

      if (!user) {
        await route.fulfill({
          status: 401,
          json: {
            status: 401,
            title: 'Unauthorized',
            detail: 'Invalid token.'
          }
        })
        return
      }

      await route.fulfill({
        status: 200,
        json: {
          id: user.id,
          username: user.username,
          createdAt: new Date().toISOString()
        }
      })
    })

    // 攔截 /api/tasks 的所有 GET 與 POST 網路請求
    await page.route('**/api/tasks**', async route => {
      const authHeader = route.request().headers()['authorization']
      const token = authHeader?.replace('Bearer ', '')
      const user = users.find(u => u.token === token)

      if (!user) {
        await route.fulfill({ status: 401 })
        return
      }

      const request = route.request()
      const method = request.method()

      if (method === 'GET') {
        const url = new URL(request.url())
        const status = url.searchParams.get('status')
        const userTasks = currentTasks.filter(t => t.userId === user.id)
        const filtered = status && status !== 'All'
          ? userTasks.filter(t => t.status === status)
          : userTasks

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
        const data = JSON.parse(request.postData() || '{}')
        const newTask = {
          id: currentTasks.length + 1,
          title: data.title,
          description: data.description || '',
          status: data.status || 'Todo',
          userId: user.id,
          createdAt: new Date().toISOString(),
        }
        currentTasks.unshift(newTask)
        await route.fulfill({ status: 201, json: newTask })
      } else {
        await route.continue()
      }
    })

    // 攔截狀態更新請求 (PATCH /api/tasks/:id/status)
    await page.route('**/api/tasks/*/status', async route => {
      const authHeader = route.request().headers()['authorization']
      const token = authHeader?.replace('Bearer ', '')
      const user = users.find(u => u.token === token)

      if (!user) {
        await route.fulfill({ status: 401 })
        return
      }

      const data = JSON.parse(route.request().postData() || '{}')
      const match = route.request().url().match(/\/api\/tasks\/(\d+)\/status/)
      const id = match ? parseInt(match[1]) : 0
      const item = currentTasks.find(t => t.id === id && t.userId === user.id)

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
        const authHeader = route.request().headers()['authorization']
        const token = authHeader?.replace('Bearer ', '')
        const user = users.find(u => u.token === token)

        if (!user) {
          await route.fulfill({ status: 401 })
          return
        }

        const match = route.request().url().match(/\/api\/tasks\/(\d+)$/)
        const id = match ? parseInt(match[1]) : 0
        const item = currentTasks.find(t => t.id === id && t.userId === user.id)

        if (item) {
          currentTasks = currentTasks.filter(t => t.id !== id)
          await route.fulfill({ status: 204 })
        } else {
          await route.fulfill({ status: 404 })
        }
      } else {
        await route.continue()
      }
    })

    // 前往網站首頁
    await page.goto('/')
  })

  // 登入輔助函式
  async function performLogin(page: any, username = 'UserA', password = 'password123') {
    await page.locator('[data-test="prompt-login-btn"]').click()
    await page.locator('[data-test="tab-login"]').click()
    await page.locator('[data-test="username"]').fill(username)
    await page.locator('[data-test="password"]').fill(password)
    await page.locator('[data-test="submit"]').click()
    await expect(page.locator('[data-test="welcome-message"]')).toBeVisible()
  }

  // 測試案例 1：驗證首頁標題與預設任務是否正常載入
  test('1. 頁面正常載入並呈現初始任務卡片', async ({ page }) => {
    await performLogin(page)
    // 驗證主標題文字
    await expect(page.locator('h1')).toContainText('Task Management')
    // 驗證任務列表中包含初始任務
    await expect(page.locator('.tasks')).toContainText('現有初始任務')
  })

  // 測試案例 2：驗證新增任務表單（含空白防護與成功新增）
  test('2. 驗證標題必填驗證，並能成功新增一筆新任務', async ({ page }) => {
    await performLogin(page)
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
    await performLogin(page)
    // 點擊看板切換按鈕
    await page.locator('[data-test="view-kanban"]').click()

    // 驗證看板元件已出現在畫面上
    await expect(page.locator('.kanban-board')).toBeVisible()

    // 驗證 To Do 欄位中包含任務
    await expect(page.locator('[data-test="column-todo"]')).toContainText('現有初始任務')
  })

  // 測試案例 4：驗證刪除任務
  test('4. 點擊 Delete 按鈕能將任務從畫面上移除', async ({ page }) => {
    await performLogin(page)
    // 確認任務一開始存在
    await expect(page.locator('.tasks')).toContainText('現有初始任務')

    // 點擊刪除按鈕
    await page.locator('[data-test="delete-task-1"]').click()

    // 驗證該任務已經從清單中消失，畫面顯示「No tasks found.」無任務狀態
    await expect(page.locator('.task-card')).toHaveCount(0)
    await expect(page.locator('.state')).toContainText('No tasks found.')
  })

  // 測試案例 5：驗證註冊、登入及任務狀態切換與刪除完整流程
  test('5. 測試使用者註冊、登入及任務狀態切換與刪除完整流程', async ({ page }) => {
    // A. 測試註冊新使用者 UserB
    await page.locator('[data-test="prompt-login-btn"]').click()
    await expect(page.locator('[data-test="auth-modal-overlay"]')).toHaveClass(/open/)
    await page.locator('[data-test="tab-register"]').click()
    await page.locator('[data-test="username"]').fill('UserB')
    await page.locator('[data-test="password"]').fill('passwordB123')
    await page.locator('[data-test="submit"]').click()

    // B. 驗證註冊成功並自動登入
    await expect(page.locator('[data-test="welcome-message"]')).toContainText('Welcome, UserB!')
    await expect(page.locator('.state')).toContainText('No tasks found.')

    // C. 建立一筆新任務 (會被賦予 id: 2)
    await page.locator('[data-test="title"]').fill('UserB 的專屬任務')
    await page.locator('[data-test="description"]').fill('這筆任務只有 UserB 看得到')
    await page.locator('form.form-card button[type="submit"]').click()
    await expect(page.locator('.tasks')).toContainText('UserB 的專屬任務')

    // D. 變更任務狀態為 Doing
    await page.locator('[data-test="task-status-2"]').selectOption('Doing')
    
    // 驗證狀態徽章更新
    await expect(page.locator('.tasks')).toContainText('Doing')

    // E. 切換至 Kanban 視圖並驗證
    await page.locator('[data-test="view-kanban"]').click()
    await expect(page.locator('.kanban-board')).toBeVisible()
    await expect(page.locator('[data-test="column-doing"]')).toContainText('UserB 的專屬任務')

    // F. 刪除任務
    await page.locator('[data-test="delete-task-2"]').click()
    await expect(page.locator('.task-card')).toHaveCount(0)
    await expect(page.locator('.state')).toContainText('No tasks found.')
  })

  // 測試案例 6：驗證多用戶任務資料隔離
  test('6. 測試多用戶任務隔離 (User A 與 User B)', async ({ page }) => {
    // A. 登入預設使用者 UserA，建立一筆任務，然後登出
    await performLogin(page, 'UserA', 'password123')
    await page.locator('[data-test="title"]').fill('UserA 的私有任務')
    await page.locator('[data-test="description"]').fill('User B 不應該看到這個')
    await page.locator('form.form-card button[type="submit"]').click()
    await expect(page.locator('.tasks')).toContainText('UserA 的私有任務')
    
    await page.locator('[data-test="logout-btn"]').click()
    await expect(page.locator('[data-test="prompt-login-btn"]')).toBeVisible()

    // B. 註冊並登入新使用者 UserC
    await page.locator('[data-test="prompt-login-btn"]').click()
    await page.locator('[data-test="tab-register"]').click()
    await page.locator('[data-test="username"]').fill('UserC')
    await page.locator('[data-test="password"]').fill('passwordC123')
    await page.locator('[data-test="submit"]').click()
    await expect(page.locator('[data-test="welcome-message"]')).toContainText('Welcome, UserC!')

    // C. 驗證 UserC 看不到 UserA 的私有任務
    await expect(page.locator('.task-card')).toHaveCount(0)
    await expect(page.locator('.state')).toContainText('No tasks found.')

    // D. UserC 建立自己的任務，確認只看得到自己的
    await page.locator('[data-test="title"]').fill('UserC 的任務')
    await page.locator('form.form-card button[type="submit"]').click()
    await expect(page.locator('.tasks')).toContainText('UserC 的任務')
    await expect(page.locator('.task-card', { hasText: 'UserA 的私有任務' })).toHaveCount(0)

    // E. UserC 登出，重新以 UserA 登入，確認 UserA 只能看到自己的任務，看不到 UserC 的
    await page.locator('[data-test="logout-btn"]').click()
    await performLogin(page, 'UserA', 'password123')
    await expect(page.locator('.tasks')).toContainText('UserA 的私有任務')
    await expect(page.locator('.task-card', { hasText: 'UserC 的任務' })).toHaveCount(0)
  })
})

