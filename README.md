# Job Summary Tracker

A focused job-application tracker with three pieces:

- Chrome extension: a side panel that captures the job page and queues analysis on the server. Each tab has its own session.
- Express API: saves the page text immediately, then analyzes with local Ollama in the background, writes the `.txt` summary, and stores metadata in MongoDB.
- React dashboard: applications table, application analytics, and interview analytics.

## Stack

- React 19 + Vite
- Express 5 on Node 24 (ESM)
- MongoDB + Mongoose
- Local Ollama chat API with JSON structured output
- Summary files stored under `server/uploads/`

## First run

1. Install Node 24, MongoDB, and [Ollama](https://ollama.com).
2. Pull a model, for example `ollama pull qwen2.5:3b`.
3. Copy `server/.env.example` to `server/.env` if needed. Default is `OLLAMA_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen2.5:3b`, and `OLLAMA_NUM_CTX=1024`. Leave `OLLAMA_NUM_GPU` unset so Ollama uses the GPU. Forcing `OLLAMA_NUM_GPU=0` loads the whole model in RAM and can fail with `CPU_REPACK` on this machine.
4. From the repo root run `npm run install:all`.
5. Run `npm run dev`.
6. Open `http://127.0.0.1:5173` for the dashboard (use this address in ixBrowser; `localhost` is proxied and will fail).
6. In Chrome or ixBrowser, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension/` folder.
7. Open a job posting, click the extension icon to open the **side panel**, then click **Generate Summary**. The job is saved immediately; Ollama analysis continues on the server even if you close the browser. Watch **Analysis** on the dashboard (Queued / Analyzing / Ready / Failed).

### ixBrowser

ixBrowser sends `localhost` and `127.0.0.1` through the profile proxy, so those addresses cannot reach this PC.

Use a public tunnel while `npm run dev` is already running:

```
npm run tunnel
```

Then open the printed `https://….trycloudflare.com` URL in ixBrowser and reload the unpacked extension.

Alternatively, edit the profile → Proxy → enable Bypass list → add `127.0.0.1`, `localhost`, and `::1` → close and reopen the profile.

## Result of Generate Summary

A click queues the job immediately:

- MongoDB application record with the page text (`sourceText`), applied date, and pipeline status=`applied`.
- Background Ollama analysis, then `server/uploads/[company]-[role title].txt` when it succeeds.

If Ollama fails, the row stays on the dashboard as **Failed** with the error text. Fix Ollama and click Retry — you do not need to reopen the job page.

The job URL is unique (tracking parameters stripped) to prevent accidental duplicate saves from repeated clicks.

Pipeline status values are `applied`, `intro`, `tech`, `offer`, and `started`. Analysis status values are `queued`, `running`, `ready`, `error`, and `stopped`.

## Dashboard

- **Applications** (`/`): search; filter by pipeline status, analysis status, platform, company, and applied date range; analysis badge (Queued / Analyzing / Ready / Failed); retry failed jobs; view/download the summary; edit title/company/status/notes/date; delete.
- **Application analytics** (`/analytics/applications`): date ranges, bids-per-day stacked chart, job platforms, company volume.
- **Interview analytics** (`/analytics/interviews`): interview pass rates, monthly pass-rate trend and month-over-month change, replies by company and platform.

Profiles, resumes, and cover letters are not part of this project.

## API

- `POST /api/summaries`
- `GET /api/applications` (`q`, `status`, `analysis`, `platform`, `company`, `from`, `to`)
- `GET /api/applications/filter-options`
- `GET /api/applications/analysis-overview`
- `GET /api/applications/:id`
- `POST /api/applications/:id/retry`
- `POST /api/applications/:id/cancel`
- `PATCH /api/applications/:id`
- `DELETE /api/applications/:id`
- `GET /api/applications/:id/download`
- `GET /api/analytics/overview?range=7d|30d|90d|1y|all`
