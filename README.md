# Job Summary Tracker

A focused job-application tracker with three pieces:

- Chrome extension: a side panel that reads the current job page URL and visible job description. Each tab has its own session, so you can generate summaries on several tabs at once.
- Express API: analyzes the job with local Ollama, writes the required `.txt` summary, and saves metadata in MongoDB.
- React dashboard: applications table plus analytics.

## Stack

- React 19 + Vite
- Express 5 on Node 24 (ESM)
- MongoDB + Mongoose
- Local Ollama chat API with JSON structured output
- Summary files stored under `server/uploads/`

## First run

1. Install Node 24, MongoDB, and [Ollama](https://ollama.com).
2. Pull a model, for example `ollama pull qwen3.5:4b`.
3. Copy `server/.env.example` to `server/.env` if needed. Default is `OLLAMA_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3.5:4b`, `OLLAMA_NUM_CTX=4096`, and `OLLAMA_NUM_GPU=0` (CPU). The 4B vision model can exhaust a 4 GB GPU over Vulkan; set `OLLAMA_NUM_GPU` higher only if you have enough VRAM.
4. From the repo root run `npm run install:all`.
5. Run `npm run dev`.
6. Open `http://127.0.0.1:5173` for the dashboard (use this address in ixBrowser; `localhost` is proxied and will fail).
6. In Chrome or ixBrowser, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension/` folder.
7. Open a job posting, click the extension icon to open the **side panel**, then click **Generate Summary**. Each tab has its own session, so you can start another job in a second tab while the first one is still running.

### ixBrowser

ixBrowser sends `localhost` and `127.0.0.1` through the profile proxy, so those addresses cannot reach this PC.

Use a public tunnel while `npm run dev` is already running:

```
npm run tunnel
```

Then open the printed `https://….trycloudflare.com` URL in ixBrowser and reload the unpacked extension.

Alternatively, edit the profile → Proxy → enable Bypass list → add `127.0.0.1`, `localhost`, and `::1` → close and reopen the profile.

## Result of Generate Summary

A successful click creates both:

- MongoDB application record with title, company, file name, applied date, and status=`applied`.
- `server/uploads/[company]-[role title].txt` with the exact required output structure.

The job URL is unique (tracking parameters stripped) to prevent accidental duplicate saves from repeated clicks.

Status values are `applied`, `intro`, `tech`, and `offer`.

## Dashboard

- **Applications**: search, filter by status, view/download the summary, edit title/company/status/date, delete.
- **Analytics**: date ranges, bids-per-day stacked chart, reply rate, job platforms (Indeed, Dice, and other link domains), company breakdown.

Profiles, resumes, and cover letters are not part of this project.

## API

- `POST /api/summaries`
- `GET /api/applications`
- `GET /api/applications/:id`
- `PATCH /api/applications/:id`
- `DELETE /api/applications/:id`
- `GET /api/applications/:id/download`
- `GET /api/analytics/overview?range=7d|30d|90d|1y|all`
