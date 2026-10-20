
import asyncio
import logging
import os
from pathlib import Path
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from . import store, agents

load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

app = FastAPI(title="SkillTruth API", version="1.0.0")
logger = logging.getLogger("skilltruth.scheduler")
_scheduler_task = None


async def _daily_agent_cycle():
    """Run the retention workflow daily; endpoints remain available separately."""
    while True:
        try:
            await agents.tracker()
            await agents.prophet()
            await agents.principal()
            logger.info("Daily SkillTruth agent cycle completed")
        except Exception:
            logger.exception("Daily SkillTruth agent cycle failed; will retry tomorrow")
        await asyncio.sleep(24 * 60 * 60)


@app.on_event("startup")
async def start_daily_agent_cycle():
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_daily_agent_cycle())


@app.on_event("shutdown")
async def stop_daily_agent_cycle():
    global _scheduler_task
    if _scheduler_task is not None:
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
        _scheduler_task = None

# Allow the Next.js frontend on ports 3000 and 3001.
app.add_middleware(
    CORSMiddleware,
   allow_origins=[
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://10.104.103.27:3001",
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def prevent_dashboard_cache(request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


class QuizRequest(BaseModel):
    student_id: str = "student-001"
    skill_id: str


class Submit(BaseModel):
    quiz_id: str
    answers: list[int]


class CoachRequest(BaseModel):
    student_id: str = "student-001"
    message: str


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "groq_configured": bool(os.getenv("GROQ_API_KEY", "").strip()),
        "students": len(store.STUDENTS),
        "skills": len(store.SKILLS),
    }


@app.get("/api/student/dashboard")
def dashboard(student_id: str = "student-001"):
    user = store.student(student_id)
    return {
        "student": user,
        "skills": store.skills(user["id"]),
        "readiness_score": store.readiness(user["id"]),
    }


@app.get("/api/agents/logs")
def logs():
    return {"logs": store.LOGS[:50]}


@app.post("/api/agents/run-cycle")
async def run_cycle():
    try:
        tracker_result = await agents.tracker()
        prophet_result = await agents.prophet()
        principal_result = await agents.principal()

        return {
            "tracker": tracker_result,
            "prophet": {
                "urgent_count": len(prophet_result["urgent"]),
                "summary": prophet_result["summary"],
            },
            "principal_report": principal_result,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/quizzes/rescue")
async def rescue(req: QuizRequest):
    skill = next(
        (
            item
            for item in store.SKILLS
            if item["id"] == req.skill_id
            and item["user_id"] == req.student_id
        ),
        None,
    )

    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    try:
        return await agents.quizsmith(skill)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/quizzes/latest")
def latest_quiz(student_id: str = "student-001"):
    quiz = next(
        (
            item
            for item in reversed(store.QUIZZES)
            if item["user_id"] == student_id
        ),
        None,
    )
    return {"quiz": quiz}


@app.post("/api/quizzes/submit")
def submit(req: Submit):
    quiz = next(
        (item for item in store.QUIZZES if item["id"] == req.quiz_id),
        None,
    )

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if len(req.answers) != len(quiz["questions"]):
        raise HTTPException(
            status_code=400,
            detail=f"Submit exactly {len(quiz['questions'])} answers",
        )

    score = round(
        100
        * sum(
            1
            for question, answer in zip(quiz["questions"], req.answers)
            if question["answer"] == answer
        )
        / len(quiz["questions"])
    )

    quiz["score"] = score

    skill = next(
        item for item in store.SKILLS if item["id"] == quiz["skill_id"]
    )

    before = skill["freshness_score"]
    # A successful rescue gives the documented +20 practice boost; for the
    # hackathon demo, an 80% quiz on a 35% skill therefore reaches 70%.
    skill["freshness_score"] = (
        min(100, max(before + 20, score - 10)) if score >= 70 else max(0, before - 25)
    )

    practiced_at = datetime.now(timezone.utc).isoformat()
    skill["last_practiced_at"] = practiced_at
    skill["decay_baseline_at"] = practiced_at
    skill["baseline_freshness_score"] = skill["freshness_score"]
    skill["last_quiz_score"] = score
    skill["decay_history"].append(
        {
            "date": skill["last_practiced_at"][:10],
            "score": skill["freshness_score"],
        }
    )

    store.refresh(skill)
    store.log(
        "Tracker Agent",
        "Recorded quiz practice",
        f"{quiz['subject_name']} score {score}%",
        f"Freshness {before}% -> {skill['freshness_score']}%",
    )

    return {
        "score": score,
        "freshness_before": before,
        "freshness_after": skill["freshness_score"],
        "status": skill["status"],
        "readiness_score": store.readiness(quiz["user_id"]),
    }


@app.get("/api/hod/dashboard")
def hod():
    heatmap = []

    for subject in sorted(set(s["subject_name"] for s in store.SKILLS)):
        subject_skills = [
            s for s in store.SKILLS if s["subject_name"] == subject
        ]
        count = len(subject_skills)

        if count == 0:
            continue

        heatmap.append(
            {
                "subject": subject,
                "red_percent": round(
                    100
                    * sum(s["freshness_score"] < 40 for s in subject_skills)
                    / count,
                    1,
                ),
                "yellow_percent": round(
                    100
                    * sum(
                        40 <= s["freshness_score"] <= 70
                        for s in subject_skills
                    )
                    / count,
                    1,
                ),
                "green_percent": round(
                    100
                    * sum(s["freshness_score"] > 70 for s in subject_skills)
                    / count,
                    1,
                ),
            }
        )

    risk_list = [
        {
            "student_id": user["id"],
            "name": user["name"],
            "readiness": store.readiness(user["id"]),
        }
        for user in store.STUDENTS
        if store.readiness(user["id"]) < 40
    ]

    dead_skills = sorted(
        [
            {
                "subject": skill["subject_name"],
                "student": store.student(skill["user_id"])["name"],
                "score": skill["freshness_score"],
            }
            for skill in store.SKILLS
            if skill["freshness_score"] < 40
        ],
        key=lambda item: item["score"],
    )[:10]

    return {
        "student_count": len(store.STUDENTS),
        "heatmap": heatmap,
        "risk_list": risk_list,
        "top_dead_skills": dead_skills,
        "latest_report": store.REPORTS[-1] if store.REPORTS else None,
    }


@app.get("/api/company/students")
def company_students(min_readiness: int = 70):
    """Demo talent view: only students meeting the readiness threshold."""
    threshold = max(70, min(100, int(min_readiness)))
    qualified = []
    for user in store.STUDENTS:
        score = store.readiness(user["id"])
        if score > threshold:
            skills = store.skills(user["id"])
            qualified.append({
                "student_id": user["id"],
                "name": user["name"],
                "department": user["department"],
                "year": user["year"],
                "readiness": score,
                "skills": [{"subject": x["subject_name"], "freshness_score": x["freshness_score"], "status": x["status"]} for x in skills],
            })
    return {"threshold_exclusive": threshold, "count": len(qualified), "students": qualified, "demo_notice": "Illustrative demo data; company access/consent authentication must be enabled before production use."}


@app.post("/api/hod/report")
async def report():
    try:
        return await agents.principal()
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/coach/chat")
async def chat(req: CoachRequest):
    try:
        return await agents.coach(req.student_id, req.message)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
