# Task Management Demo

## Goal

建立一個簡單的任務管理系統，
展示 AI Coding Agent 如何協助需求分析、
程式生成、Code Review 與測試。

## Tech Stack

Frontend
- Vue 3
- TypeScript
- Pinia
- Vite

Backend
- ASP.NET Core Web API
- Entity Framework Core
- SQLite

## Task

欄位：

- id
- title
- description
- status
- createdAt

## Status

- Todo
- Doing
- Done

## Functions

1. 查詢 Task
2. 新增 Task
3. 修改 Task Status
4. 依 Status 篩選

## Validation

- title 必填
- title 最大 100 字
- status 必須為 Todo / Doing / Done

## API

GET /api/tasks

POST /api/tasks

PATCH /api/tasks/{id}/status

## Acceptance Criteria

- 可以新增 Task
- 可以查詢 Task
- 可以修改 Task 狀態
- 不允許空白 title
- title 超過 100 字回傳 400

## 後續補充

開發過程中，根據測試、實際操作與 Code Review 補充以下規則：

- createdAt 由後端產生，前端不需要傳入
- createdAt 使用台灣時間 UTC+8
- 空白 title 視為不合法
- status 不合法時回傳 400
- status 不允許數字或組合字串，例如 99、Todo,Doing
