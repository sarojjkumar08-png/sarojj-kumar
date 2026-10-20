# SkillTruth — Autonomous Multi-Agent Skill Decay Prevention System

> **Your degree isn't permanent. Your skills decay daily. Five AI agents help prevent it.**

SkillTruth is a hackathon MVP for tracking skill freshness, estimating likely skill-death dates, generating personalized rescue quizzes, coaching students, and producing department-risk reports. It is a forgetting-prevention system, not another course platform.

## Included in this MVP

- **Next.js 14 App Router** frontend with the existing dark navy/cyan UI preserved.
- **FastAPI** backend and Groq chat-completions integration (Groq replaces Gemini; set your own key).
- **Five agent workflows:** Tracker, Prophet, QuizSmith, Principal, Coach. AI-generated quiz/report/coach responses use Groq when configured. The tracker and Prophet also perform deterministic calculations in Python.
- **10 demo students / 50 skill records** across Python, Data Structures, DBMS, Machine Learning, and Computer Networks.
- Student dashboard with freshness states, readiness score, history chart, rescue quiz, Coach chat, and browser-based PDF/print report.
- HOD dashboard with dead-skill list, risk list, subject heatmap, report generation, CSV export, and browser-based PDF/print export.
- Company shortlist route (`/company`) showing only demo students with readiness strictly above 70.
- Agent activity feed and dashboard polling to reflect current in-memory backend state.
- Supabase SQL schema starter in `backend/supabase/schema.sql`.

## Run locally (Windows PowerShell)

1. Copy `backend/.env.example` to `backend/.env` and add your **own** Groq key. Never share or commit `.env`.
2. In terminal 1:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
   ```
3. In terminal 2:
   ```powershell
   cd frontend
   npm install
   npm run dev -- --port 3001
   ```
4. Open `http://localhost:3001`. Student: `/student`; HOD: `/hod`; Company demo: `/company`; API health: `http://127.0.0.1:8001/api/health`; API docs: `http://127.0.0.1:8001/docs`.

## Skill logic

- Fresh: score `>70`; Decaying: `40–70` inclusive; Dead: `<40`.
- Tracker recalculates freshness from a fixed baseline at 0.5 points per inactive day. This avoids repeatedly subtracting the same elapsed days when the tracker runs again.
- Failed quiz (`<70%`) reduces freshness by 25 points. Successful quiz applies the documented +20 practice boost; the demo also ensures an 80% rescue quiz can lift a 35% skill to 70% so the two-minute judge flow is demonstrable.
- Prophet estimates time to the 40% threshold with the Ebbinghaus-style approximation `R = e^(-t/S)`. It is a heuristic, not a validated psychological or placement prediction.
- Student dashboard polls the API every five seconds; HOD dashboard polls every three seconds; company shortlist polls every four seconds. API responses use no-store headers.

## Configure Groq

`backend/.env.example`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
FRONTEND_ORIGIN=http://localhost:3001
```

Use a currently enabled model for your Groq account. Health shows whether a key is configured; it does **not** prove that the remote API key/model can successfully make a request. The live AI calls require network access and valid Groq credentials.

## Database, security, and demo boundaries

The included MVP's sample data is stored in Python memory and resets when the backend restarts. The Supabase SQL file is a schema starter; persistent Supabase queries, Supabase Auth, production role-based authorization/RLS, consent workflows, real email delivery, and a durable external cron service are not enabled in this local demo. The in-process daily agent cycle only runs while the API process is running. Browser print-to-PDF is used for report downloads; it opens the system print dialog, where the user can choose “Save as PDF.”

Before production: wire Supabase reads/writes and RLS, add verified authentication/authorization for all roles, obtain student consent before company disclosure, use a durable scheduler, and validate the model/API behavior. The company route is a demo view, not a secure talent marketplace. Readiness is an assessment indicator, not a placement guarantee.

## Hackathon pitch

- **Problem:** Students can forget older-semester skills, while ordinary dashboards show grades rather than retained ability.
- **Solution:** Five agent workflows track, predict, rescue, report, and coach.
- **Innovation:** The Prophet combines a forgetting-curve heuristic with skill history rather than using only a fixed reminder.
- **Business model hypothesis:** College subscription, student-certified reports, and consent-based company talent search. These are proposed pricing hypotheses, not validated revenue.

## Test checklist

- Backend syntax: `python -m compileall app`
- API integration tests: `pip install -r requirements.txt` then `pytest -q`
- Frontend production build: `npm install` then `npm run build`
- Live Groq integration must be separately tested with a valid local key; no secret is bundled in this ZIP.
