import sys

def modify_tasks_controller():
    file_path = r'c:\Users\amdy2\Desktop\ai-task-demo\backend\Controllers\TasksController.cs'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    target = '''    private int GetCurrentUserId()
    {
        var nameId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(nameId ?? throw new InvalidOperationException("User ID claim not found."));
    }'''
    replacement = '''    private int GetCurrentUserId()
    {
        var nameId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return int.Parse(nameId ?? throw new InvalidOperationException("User ID claim not found."));
    }

    private string GetCurrentUserRole()
    {
        return User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? string.Empty;
    }'''
    content = content.replace(target, replacement)

    content = content.replace('[HttpPost]\n    public async Task<ActionResult<TaskResponse>> Create(', '[HttpPost]\n    [Authorize(Roles = "Admin,Editor")]\n    public async Task<ActionResult<TaskResponse>> Create(')
    content = content.replace('[HttpPut("{id:int}")]\n    public async Task<ActionResult<TaskResponse>> Update(', '[HttpPut("{id:int}")]\n    [Authorize(Roles = "Admin,Editor")]\n    public async Task<ActionResult<TaskResponse>> Update(')
    content = content.replace('''        var userId = GetCurrentUserId();
        var item = await service.UpdateAsync(
            id,
            request.Title,
            request.Description,
            request.Status.Value,
            userId,''', '''        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();
        var item = await service.UpdateAsync(
            id,
            request.Title,
            request.Description,
            request.Status.Value,
            userId,
            userRole,''')

    content = content.replace('[HttpPatch("{id:int}/status")]\n    public async Task<ActionResult<TaskResponse>> UpdateStatus(', '[HttpPatch("{id:int}/status")]\n    [Authorize(Roles = "Admin,Editor")]\n    public async Task<ActionResult<TaskResponse>> UpdateStatus(')
    content = content.replace('''        var userId = GetCurrentUserId();
        var item = await service.UpdateStatusAsync(id, request.Status.Value, userId, cancellationToken);''', '''        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();
        var item = await service.UpdateStatusAsync(id, request.Status.Value, userId, userRole, cancellationToken);''')

    content = content.replace('[HttpDelete("{id:int}")]\n    public async Task<IActionResult> Delete(', '[HttpDelete("{id:int}")]\n    [Authorize(Roles = "Admin,Editor")]\n    public async Task<IActionResult> Delete(')
    content = content.replace('''        var userId = GetCurrentUserId();
        var deleted = await service.DeleteAsync(id, userId, cancellationToken);''', '''        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();
        var deleted = await service.DeleteAsync(id, userId, userRole, cancellationToken);''')

    content = content.replace('''        var userId = GetCurrentUserId();
        var (items, totalCount) = await service.GetPagedAsync(taskStatus, search, sortBy, sortOrder, page, pageSize, userId, cancellationToken);''', '''        var userId = GetCurrentUserId();
        var userRole = GetCurrentUserRole();
        var (items, totalCount) = await service.GetPagedAsync(taskStatus, search, sortBy, sortOrder, page, pageSize, userId, userRole, cancellationToken);''')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

def modify_task_service():
    file_path = r'c:\Users\amdy2\Desktop\ai-task-demo\backend\Services\TaskService.cs'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace('''        int pageSize,
        int userId,
        CancellationToken cancellationToken)
    {
        var query = db.Tasks.AsNoTracking().Where(item => item.UserId == userId);''', '''        int pageSize,
        int userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var query = db.Tasks.AsNoTracking();
        if (userRole != UserRole.Admin.ToString())
        {
            query = query.Where(item => item.UserId == userId);
        }''')

    content = content.replace('''    public async Task<TaskItem?> UpdateStatusAsync(
        int id,
        TaskState status,
        int userId,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || item.UserId != userId)
        {
            return null;
        }''', '''    public async Task<TaskItem?> UpdateStatusAsync(
        int id,
        TaskState status,
        int userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
        {
            return null;
        }''')

    content = content.replace('''    public async Task<TaskItem?> UpdateAsync(
        int id,
        string title,
        string? description,
        TaskState? status,
        int userId,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || item.UserId != userId)
        {
            return null;
        }''', '''    public async Task<TaskItem?> UpdateAsync(
        int id,
        string title,
        string? description,
        TaskState? status,
        int userId,
        string userRole,
        CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
        {
            return null;
        }''')

    content = content.replace('''    public async Task<bool> DeleteAsync(int id, int userId, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || item.UserId != userId)
        {
            return false;
        }''', '''    public async Task<bool> DeleteAsync(int id, int userId, string userRole, CancellationToken cancellationToken)
    {
        var item = await db.Tasks.FindAsync([id], cancellationToken);
        if (item is null || (userRole != UserRole.Admin.ToString() && item.UserId != userId))
        {
            return false;
        }''')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

modify_tasks_controller()
modify_task_service()
