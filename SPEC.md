# AI Task Demo

## Requirements

The task management demo provides a Vue frontend and ASP.NET Core API. Users can:

- View all tasks or filter them by `Todo`, `Doing`, or `Done`.
- Create a task with a title, optional description, and status.
- Change the status of an existing task.
- Receive validation errors for blank titles, titles over 100 characters, and unknown statuses.

## Start the backend

From the repository root:

```powershell
dotnet restore backend/AiTaskDemo.Api.csproj
dotnet run --project backend/AiTaskDemo.Api.csproj --urls http://localhost:5000
```

The API listens at `http://localhost:5000`.

## Start the frontend

In a separate PowerShell window:

```powershell
Set-Location frontend
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173` in a browser. The frontend API client targets the backend at `http://localhost:5000`.

## Run tests and builds

From the repository root:

```powershell
dotnet test backend.tests/AiTaskDemo.Api.Tests.csproj
dotnet build backend/AiTaskDemo.Api.csproj

Push-Location frontend
try {
  npm.cmd ci
  npm.cmd test
  npm.cmd run build
} finally {
  Pop-Location
}
```

## SQLite data

The application stores local task data in `backend/tasks.db`. It is created automatically when the backend starts. Remove this file only when a fresh local dataset is desired.
