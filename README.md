# Samurai Planner

A small full-stack daily planner with a React frontend and an ASP.NET Core API.

I was wondering, why not just use one of the many application already set up in your device (such as calendar, notes, excel, etc.) but then I realized how I am naturally attracted to "kawaii" things, which means, cute and aestethic tools, otherwise I won't remember using the app if it is optional. 

## Stack

- `web/app`: React 19 + Vite, with Node.js/npm for development and builds
- `api`: ASP.NET Core 8 minimal API in C#
- The frontend proxies `/api` requests to `http://localhost:5000`

## Run locally

Start the API in one terminal:

```
Set-Location api
dotnet run
```

Start the frontend in another terminal:

```
Set-Location web/app
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

The API stores tasks in `api/tasks.json`, so data persists when the API restarts. Its routes are `GET /api/tasks`, `POST /api/tasks` (with an optional `time`), `PATCH /api/tasks/{id}`, and `DELETE /api/tasks/{id}`.

Each task has a reminder bell. The first activation asks for browser notification permission; reminders are checked while the planner page is open and fire at the task's saved time.
