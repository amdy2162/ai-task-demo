# 使用者管理後台 (RBAC UI) 實作計畫

> **代理工作指南 (For agentic workers):** 需要使用的子技能：建議使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans` 來逐項實作此計畫。任務步驟採用核取方塊 (`- [ ]`) 語法來追蹤進度。

**目標 (Goal):** 建立一個專屬於 Admin 的「使用者管理後台 (RBAC UI)」，允許管理員在網頁上檢視所有註冊使用者，並動態調整他們的權限角色 (Admin, Editor, Viewer)。

**架構 (Architecture):** 
1. 後端新增 `UsersController` 與 `UserService`，提供 `GET /api/users` (列表) 與 `PATCH /api/users/{id}/role` (修改權限) API，並以 `[Authorize(Roles = "Admin")]` 嚴格保護。
2. 前端新增 `userApi.ts` 與 `AdminUsers.vue` 頁面，透過簡單的狀態切換保護路由，並在主選單新增 Admin 專屬入口。

**技術棧 (Tech Stack):** ASP.NET Core Web API, Entity Framework Core, Vue 3, Pinia, Tailwind CSS.

---

### 任務 1: 後端 - 建立 UserService 與 UsersController

**異動檔案 (Files):**
- 建立 (Create): `backend/DTOs/UserDtos.cs`
- 建立 (Create): `backend/Services/UserService.cs`
- 建立 (Create): `backend/Controllers/UsersController.cs`
- 修改 (Modify): `backend/Program.cs`

- [ ] **步驟 1: 建立 DTO (資料傳輸物件)**
```csharp
// backend/DTOs/UserDtos.cs
using System;

namespace AiTaskDemo.Api.DTOs;

public record UserListItemResponse(int Id, string Username, string Role, DateTime CreatedAt);
public record UpdateUserRoleRequest(string Role);
```

- [ ] **步驟 2: 建立 UserService**
```csharp
// backend/Services/UserService.cs
using AiTaskDemo.Api.Data;
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace AiTaskDemo.Api.Services;

public class UserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<UserListItemResponse>> GetAllUsersAsync(CancellationToken cancellationToken)
    {
        return await _db.Users
            .AsNoTracking()
            .Select(u => new UserListItemResponse(u.Id, u.Username, u.Role.ToString(), u.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> UpdateUserRoleAsync(int userId, string newRole, CancellationToken cancellationToken)
    {
        if (!System.Enum.TryParse<UserRole>(newRole, out var parsedRole))
        {
            return false;
        }

        var user = await _db.Users.FindAsync(new object[] { userId }, cancellationToken);
        if (user == null) return false;

        user.Role = parsedRole;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
```

- [ ] **步驟 3: 建立 UsersController**
```csharp
// backend/Controllers/UsersController.cs
using AiTaskDemo.Api.DTOs;
using AiTaskDemo.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace AiTaskDemo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserListItemResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _userService.GetAllUsersAsync(cancellationToken);
        return Ok(users);
    }

    [HttpPatch("{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, [FromBody] UpdateUserRoleRequest request, CancellationToken cancellationToken)
    {
        var success = await _userService.UpdateUserRoleAsync(id, request.Role, cancellationToken);
        if (!success) return BadRequest(new { Message = "無效的使用者或角色。" });
        
        return NoContent();
    }
}
```

- [ ] **步驟 4: 註冊 Service 與建置驗證**
修改 `backend/Program.cs`，在 `builder.Services.AddScoped<TaskService>();` 下方加入：
```csharp
builder.Services.AddScoped<UserService>();
```
執行: `cd backend && dotnet build`
預期結果: Build 成功 (PASS)

- [ ] **步驟 5: 提交程式碼 (Commit)**
```bash
git add backend/
git commit -m "feat(backend): 新增 UsersController 與 UserService 實作 RBAC 後台管理"
```

---

### 任務 2: 前端 - 建立 API Client 與 Type

**異動檔案 (Files):**
- 建立 (Create): `frontend/src/types/user.ts`
- 建立 (Create): `frontend/src/api/userApi.ts`

- [ ] **步驟 1: 定義 User 型別**
```typescript
// frontend/src/types/user.ts
export interface UserListItem {
  id: number
  username: string
  role: 'Admin' | 'Editor' | 'Viewer'
  createdAt: string
}
```

- [ ] **步驟 2: 建立 userApi.ts**
```typescript
// frontend/src/api/userApi.ts
import type { UserListItem } from '../types/user'
import { getAuthHeaders } from './taskApi'

const API_BASE = '/api/users'

export async function fetchAllUsers(): Promise<UserListItem[]> {
  const res = await fetch(API_BASE, {
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error('獲取使用者列表失敗')
  return res.json()
}

export async function updateUserRole(userId: number, role: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${userId}/role`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ role })
  })
  if (!res.ok) throw new Error('更新權限失敗')
}
```

- [ ] **步驟 3: 提交程式碼 (Commit)**
```bash
git add frontend/src/types/user.ts frontend/src/api/userApi.ts
git commit -m "feat(frontend): 新增 user API client 處理 RBAC 權限管理請求"
```

---

### 任務 3: 前端 - 建立 AdminUsers 元件與導覽切換

**異動檔案 (Files):**
- 建立 (Create): `frontend/src/components/AdminUsers.vue`
- 修改 (Modify): `frontend/src/App.vue`

- [ ] **步驟 1: 實作 AdminUsers 元件**
```vue
<!-- frontend/src/components/AdminUsers.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchAllUsers, updateUserRole } from '../api/userApi'
import type { UserListItem } from '../types/user'

const users = ref<UserListItem[]>([])
const loading = ref(true)

async function loadUsers() {
  try {
    users.value = await fetchAllUsers()
  } catch (e) {
    console.error(e)
    alert('載入使用者失敗，請確認您是否有 Admin 權限')
  } finally {
    loading.value = false
  }
}

async function handleRoleChange(user: UserListItem, newRole: string) {
  try {
    await updateUserRole(user.id, newRole)
    user.role = newRole as 'Admin' | 'Editor' | 'Viewer'
    alert(`已將 ${user.username} 的權限設為 ${newRole}`)
  } catch (e) {
    console.error(e)
    alert('更新權限失敗')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow mt-6">
    <h2 class="text-xl font-bold mb-4">使用者管理台 (RBAC)</h2>
    <div v-if="loading" class="text-gray-500">資料載入中...</div>
    <table v-else class="w-full text-left border-collapse">
      <thead>
        <tr class="border-b">
          <th class="p-2">使用者 ID</th>
          <th class="p-2">帳號</th>
          <th class="p-2">加入時間</th>
          <th class="p-2">角色權限</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id" class="border-b hover:bg-gray-50">
          <td class="p-2">{{ u.id }}</td>
          <td class="p-2">{{ u.username }}</td>
          <td class="p-2">{{ new Date(u.createdAt).toLocaleString() }}</td>
          <td class="p-2">
            <select :value="u.role" @change="(e) => handleRoleChange(u, (e.target as HTMLSelectElement).value)" class="border rounded p-1">
              <option value="Admin">Admin (管理員)</option>
              <option value="Editor">Editor (編輯者)</option>
              <option value="Viewer">Viewer (檢視者)</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
```

- [ ] **步驟 2: 在 App.vue 顯示管理台**
修改 `frontend/src/App.vue`:
在 `<script setup>` 區塊引入元件：
```typescript
import AdminUsers from './components/AdminUsers.vue'
const showAdminPanel = ref(false)
```
在網頁上方的 Navbar (右側登出按鈕旁邊)，加入切換按鈕 (僅 Admin 可見)：
```html
<button v-if="authStore.user?.role === 'Admin'" @click="showAdminPanel = !showAdminPanel" class="text-blue-600 hover:underline mr-4">
  {{ showAdminPanel ? '返回任務看板' : '進入系統管理台' }}
</button>
```
在 `<template>` 區塊：把原本包著 `TaskForm`, `TaskKanban` 的那一整塊邏輯，用 `v-if="!showAdminPanel"` 包起來，並在下方加上 `<AdminUsers v-else />`。

- [ ] **步驟 3: 編譯驗證與提交**
```bash
cd frontend && npm run type-check
git add .
git commit -m "feat(frontend): 實作 Admin 後台與元件切換功能"
```
