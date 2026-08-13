import { test, expect } from '@playwright/test'

test.describe('Task Management Real Backend E2E Tests (Full Stack)', () => {
  // Check if C# backend is running. If not, skip these integration tests.
  test.beforeAll(async ({ request }) => {
    try {
      const response = await request.get('http://localhost:5000/api/tasks')
      // If we get 401, it is alive and secured. If 200, it's open. Both mean it is running.
      if (response.status() !== 401 && response.status() !== 200) {
        throw new Error('Not running')
      }
    } catch {
      console.warn('⚠️ ASP.NET Core backend is not running at http://localhost:5000. Skipping real E2E tests.')
      test.skip()
    }
  })

  test('full user lifecycle: register, login, crud, edit content, filter/search/sort, paginate, and logout', async ({ page }) => {
    const uniqueId = Date.now() + Math.floor(Math.random() * 1000)
    const username = `real_user_${uniqueId}`
    const password = `Password123!`

    // 1. Go to homepage
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Task Management')

    // 2. Open login modal
    await page.click('[data-test="prompt-login-btn"]')
    await expect(page.locator('#modal-title')).toContainText('Welcome Back')

    // 3. Switch to Register and create account
    await page.click('[data-test="tab-register"]')
    await page.fill('[data-test="username"]', username)
    await page.fill('[data-test="password"]', password)
    await page.click('[data-test="submit"]')

    // 4. Verify auto login
    await expect(page.locator('[data-test="welcome-message"]')).toContainText(`Welcome, ${username}`)

    // 5. Create Tasks
    // Task 1: To do
    await page.fill('[data-test="title"]', 'E2E Title A')
    await page.fill('[data-test="description"]', 'E2E Description A')
    await page.selectOption('form select', 'Todo')
    await page.click('form button[type="submit"]')
    await expect(page.locator('li.task-card').filter({ hasText: 'E2E Title A' })).toBeVisible()

    // Task 2: Doing
    await page.fill('[data-test="title"]', 'E2E Title B')
    await page.fill('[data-test="description"]', 'E2E Description B')
    await page.selectOption('form select', 'Doing')
    await page.click('form button[type="submit"]')
    await expect(page.locator('li.task-card').filter({ hasText: 'E2E Title B' })).toBeVisible()

    // Task 3: Done
    await page.fill('[data-test="title"]', 'E2E Title C')
    await page.fill('[data-test="description"]', 'E2E Description C')
    await page.selectOption('form select', 'Done')
    await page.click('form button[type="submit"]')
    await expect(page.locator('li.task-card').filter({ hasText: 'E2E Title C' })).toBeVisible()

    // 6. Test Inline Editing
    // Find Task A, click Edit
    const taskACard = page.locator('li.task-card').filter({ hasText: 'E2E Title A' })
    const taskIdAttr = await taskACard.locator('[data-test^="delete-task-"]').getAttribute('data-test')
    const taskId = taskIdAttr?.replace('delete-task-', '')
    
    await taskACard.locator(`[data-test="edit-task-btn-${taskId}"]`).click()
    await page.fill('[data-test="edit-title"]', 'E2E Title A Edited')
    await page.fill('[data-test="edit-description"]', 'E2E Description A Edited')
    await page.click('[data-test="save-edit"]')

    // Verify persisted edits
    const editedCard = page.locator('li.task-card').filter({ hasText: 'E2E Title A Edited' })
    await expect(editedCard.locator('[data-test="task-title"]')).toContainText('E2E Title A Edited')
    await expect(editedCard.locator('[data-test="task-description"]')).toContainText('E2E Description A Edited')

    // 7. Test Search
    await page.fill('[data-test="search-input"]', 'Edited')
    // Wait for debounce filter
    await page.waitForTimeout(400)
    await expect(page.locator('li.task-card')).toHaveCount(1)
    await expect(page.locator('[data-test="task-title"]')).toContainText('E2E Title A Edited')

    // Clear search
    await page.fill('[data-test="search-input"]', '')
    await page.waitForTimeout(400)
    await expect(page.locator('li.task-card')).toHaveCount(3)

    // 8. Test Sorting
    await page.selectOption('[data-test="sort-by"]', 'title')
    // Sort Ascending (▲) / Descending (▼)
    // Click toggle sort order
    const orderBtn = page.locator('[data-test="toggle-sort-order"]')
    const currentOrder = await orderBtn.innerText()
    if (currentOrder.includes('▼')) {
      await orderBtn.click() // Switch to asc
    }
    await page.waitForTimeout(100)
    // Titles should be A, B, C sorted ascending
    await expect(page.locator('[data-test="task-title"]').nth(0)).toContainText('E2E Title A Edited')
    await expect(page.locator('[data-test="task-title"]').nth(1)).toContainText('E2E Title B')
    await expect(page.locator('[data-test="task-title"]').nth(2)).toContainText('E2E Title C')

    // 9. Test Pagination UI controls (Verify previous/next buttons exist)
    await expect(page.locator('[data-test="pagination-bar"]')).toBeVisible()
    await expect(page.locator('[data-test="pagination-info"]')).toContainText('Page 1 of 1')

    // 10. Delete Task C
    const taskCCard = page.locator('li.task-card').filter({ hasText: 'E2E Title C' })
    const taskCIdAttr = await taskCCard.locator('[data-test^="delete-task-"]').getAttribute('data-test')
    const taskCId = taskCIdAttr?.replace('delete-task-', '')
    await taskCCard.locator(`[data-test="delete-task-${taskCId}"]`).click()

    // Verify task count is now 2
    await expect(page.locator('li.task-card')).toHaveCount(2)

    // 11. Logout
    await page.click('[data-test="logout-btn"]')
    await expect(page.locator('[data-test="prompt-login-btn"]')).toBeVisible()
  })
})
