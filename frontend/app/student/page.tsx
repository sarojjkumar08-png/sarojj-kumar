
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

// SkillTruth backend runs on port 8001
const API = "http://10.104.103.27:8001";
const STUDENTS = [
  { id: "student-001", name: "Arjun" },
  { id: "student-002", name: "Priya" },
  { id: "student-003", name: "Kavin" },
  { id: "student-004", name: "Meena" },
  { id: "student-005", name: "Rahul" },
  { id: "student-006", name: "Divya" },
  { id: "student-007", name: "Santhosh" },
  { id: "student-008", name: "Nila" },
  { id: "student-009", name: "Vijay" },
  { id: "student-010", name: "Anu" },
];

export default function Student() {
  const [data, S] = useState<any>(null);
  const [studentId, setStudentId] = useState("student-001");
  const [logs, L] = useState<any[]>([]);
  const [err, E] = useState("");
  const [sel, Q] = useState<any>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [quiz, Z] = useState<any>(null);
  const [answers, A] = useState<number[]>([]);
  const [msg, M] = useState("");
  const [ask, K] = useState("");
  const [busy, B] = useState(false);

  async function load() {
    try {
      
const r = await fetch(
  `${API}/api/student/dashboard?student_id=${studentId}`, { cache: "no-store" }
);
      if (!r.ok) throw new Error(`Dashboard failed: HTTP ${r.status}`);

      const dashboard = await r.json();
      S(dashboard);

      const lr = await fetch(`${API}/api/agents/logs`, { cache: "no-store" });
      if (lr.ok) {
        const logData = await lr.json();
        L(logData.logs || []);
      }

      E("");
    } catch (e: any) {
      E(
        `Backend connect ஆகவில்லை. Backend port 8001-ல் running இருக்கிறதா check பண்ணவும். ${e.message || ""}`
      );
    }
  }

  async function restoreLatestQuiz() {
    try {
      const r = await fetch(
        `${API}/api/quizzes/latest?student_id=${studentId}`
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      const result = await r.json();
      if (result.quiz) {
        if (!Array.isArray(result.quiz.questions) || !result.quiz.questions.length) {
          throw new Error("The saved quiz has no questions.");
        }

        Z(result.quiz);
        A(Array(result.quiz.questions.length).fill(-1));
      }
    } catch (e: any) {
      E(`Could not restore the latest quiz: ${e.message || "Unknown error"}`);
    }
  }

  useEffect(() => {
    load();
    restoreLatestQuiz();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [studentId]);

  // Keep the history graph in a true full-screen overlay instead of
  // scrolling down the dashboard to find it.
  useEffect(() => {
    if (!historyOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setHistoryOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [historyOpen]);

  async function rescue(skill: any) {
    B(true);
    E("");
    M("");
    Z(null);

    try {
      const r = await fetch(`${API}/api/quizzes/rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
         student_id: studentId,
          skill_id: skill.id,
        }),
      });

      const result = await r.json();

      if (!r.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(result.detail || result)
        );
      }

      if (!Array.isArray(result.questions) || result.questions.length === 0) {
        throw new Error("Quiz generated, but no questions were returned.");
      }

      Z(result);
      Q(skill);
      A(Array(result.questions.length).fill(-1));

      setTimeout(() => {
        document
          .getElementById("rescue-quiz")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: any) {
      E(`Rescue Quiz failed: ${e.message}`);
    } finally {
      B(false);
    }
  }

  async function submit() {
    if (!quiz) return;

    B(true);
    E("");

    try {
      const r = await fetch(`${API}/api/quizzes/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_id: quiz.id,
          answers,
        }),
      });

      const result = await r.json();

      if (!r.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(result.detail || result)
        );
      }

      M(
        `Quiz score: ${result.score}% · Freshness: ${result.freshness_before}% → ${result.freshness_after}% · Readiness: ${result.readiness_score}%`
      );

      Z(null);
      await load();

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      E(`Quiz submission failed: ${e.message}`);
    } finally {
      B(false);
    }
  }

  async function coach() {
    if (!ask.trim()) return;

    B(true);
    E("");
    M("");

    try {
      const r = await fetch(`${API}/api/coach/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        student_id: studentId,
          message: ask,
        }),
      });

      const result = await r.json();

      if (!r.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(result.detail || result)
        );
      }

      M(result.answer || "Coach response received.");
    } catch (e: any) {
      E(`Coach request failed: ${e.message}`);
    } finally {
      B(false);
    }
  }

  const skills = data?.skills || [];
  const groups = [
    ["Fresh", "fresh", "green"],
    ["Decaying", "decaying", "yellow"],
    ["Dead", "dead", "red"],
  ];

  return (
    <main className="shell">
      <nav className="nav">
        <Link href="/" className="brand">
          Skill<span>Truth</span>
        </Link>
        <div className="row">
          
<select
  className="field"
  value={studentId}
  onChange={(e) => {
    setStudentId(e.target.value);
    setHistoryOpen(false);
    Q(null);
    Z(null);
    M("");
  }}
  style={{ width: 180, padding: "8px 12px" }}
>
  {STUDENTS.map((student) => (
    <option key={student.id} value={student.id}>
      {student.name}
    </option>
  ))}
</select>

          <button className="btn secondary" onClick={() => window.print()}>Download SkillTruth Report PDF</button>
          <Link className="btn secondary" href="/hod">
            HOD view →
          </Link>
        </div>
      </nav>

      <div className="eyebrow">Student workspace</div>
      <h1>Your skills, without guesswork.</h1>
      <p className="muted">
        Practice history, risk forecasts, targeted rescue quizzes.
      </p>

      {err && <div className="notice">{err}</div>}

      {msg && (
        <div className="notice">
          {msg}
          <button className="btn secondary" onClick={() => M("")}>
            Dismiss
          </button>
        </div>
      )}

      <section className="grid stats">
        <div className="panel">
          <span className="muted">Placement readiness</span>
          <h1>
            {data?.readiness_score ?? "—"}
            <small>/100</small>
          </h1>
          <div className="bar">
            <span
              style={{
                width: `${data?.readiness_score || 0}%`,
                background: "#67e8f9",
              }}
            />
          </div>
        </div>

        <div className="panel">
          Fresh
          <strong
            className="green"
            style={{ display: "block", fontSize: 30 }}
          >
            {skills.filter((s: any) => s.status === "fresh").length}
          </strong>
        </div>

        <div className="panel">
          Decaying
          <strong
            className="yellow"
            style={{ display: "block", fontSize: 30 }}
          >
            {skills.filter((s: any) => s.status === "decaying").length}
          </strong>
        </div>

        <div className="panel">
          Dead
          <strong
            className="red"
            style={{ display: "block", fontSize: 30 }}
          >
            {skills.filter((s: any) => s.status === "dead").length}
          </strong>
        </div>
      </section>

      <h2 className="section-title">Skill map</h2>

      <section className="grid skill-columns">
        {groups.map(([title, status, cls]) => (
          <div className="panel" key={status}>
            <strong className={cls}>{title}</strong>

            {skills
              .filter((s: any) => s.status === status)
              .map((s: any) => (
                <div className="skill-card" key={s.id}>
                  <div className="row space">
                    <h3>{s.subject_name}</h3>
                    <strong className={cls}>{s.freshness_score}%</strong>
                  </div>

                  <div className="bar">
                    <span
                      style={{
                        width: `${s.freshness_score}%`,
                        background:
                          status === "fresh"
                            ? "#4ade80"
                            : status === "decaying"
                              ? "#facc15"
                              : "#fb7185",
                      }}
                    />
                  </div>

                  <p className="muted" style={{ fontSize: 12 }}>
                    Last practiced:{" "}
                    {s.last_practiced_at
                      ? new Date(s.last_practiced_at).toLocaleDateString()
                      : "Not available"}
                  </p>

                  <button
                    className="btn secondary"
                    onClick={() => {
                      Q(s);
                      setHistoryOpen(true);
                    }}
                  >
                    View history ↗
                  </button>

                  <button
                    className="btn"
                    style={{ marginTop: 7, width: "100%" }}
                    disabled={busy}
                    onClick={() => rescue(s)}
                  >
                    {busy ? "Please wait..." : "Generate rescue quiz"}
                  </button>
                </div>
              ))}
          </div>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 20 }}>
        <div className="eyebrow">Coach Agent</div>
        <h2>Ask for help</h2>
        <p className="muted">
          Ask a question, get a coding explanation, or request a personalized study plan.
        </p>

        <textarea
          className="field"
          rows={3}
          value={ask}
          onChange={(e) => K(e.target.value)}
          placeholder="Ask anything about your skills, coding, or study plan..."
        />

        <button
          className="btn"
          style={{ marginTop: 10 }}
          disabled={busy || !ask.trim()}
          onClick={coach}
        >
          Ask Coach Agent
        </button>
      </section>

      {quiz && (
        <section
          className="panel"
          id="rescue-quiz"
          style={{ marginTop: 20 }}
        >
          <h2>{quiz.subject_name} rescue quiz</h2>
          <p className="muted">
            Generated by QuizSmith via Groq. Select one answer per question.
          </p>

          {quiz.questions.map((q: any, i: number) => (
            <div className="question" key={i}>
              <strong>
                {i + 1}. {q.question}
              </strong>

              {q.options.map((option: string, j: number) => (
                <label className="option" key={j}>
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === j}
                    onChange={() =>
                      A((previous) =>
                        previous.map((value, index) =>
                          index === i ? j : value
                        )
                      )
                    }
                  />
                  {option}
                </label>
              ))}
            </div>
          ))}

          <button
            className="btn"
            disabled={busy || answers.some((answer) => answer < 0)}
            onClick={submit}
          >
            {busy ? "Submitting..." : "Submit quiz"}
          </button>
        </section>
      )}

      <h2 className="section-title">Agent activity feed</h2>

      <section className="panel feed">
        {logs.map((log: any) => (
          <div className="feed-item" key={log.id}>
            <div className="row space">
              <strong>{log.agent_name}</strong>
              <span className="muted">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div>{log.action}</div>
            <p className="muted">{log.output}</p>
          </div>
        ))}
      </section>

      {historyOpen && sel && (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setHistoryOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(2, 6, 23, 0.94)",
            backdropFilter: "blur(12px)",
            padding: "clamp(12px, 2.5vw, 32px)",
            display: "flex",
            flexDirection: "column",
            color: "#e5edf8",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              paddingBottom: 18,
              borderBottom: "1px solid #26364d",
            }}
          >
            <div>
              <div className="eyebrow">SkillTruth · Skill history</div>
              <h1 style={{ margin: "6px 0 4px", fontSize: "clamp(24px, 3vw, 38px)" }}>
                {sel.subject_name}
              </h1>
              <p className="muted" style={{ margin: 0 }}>
                Current freshness score: {sel.freshness_score}% · Historical scores from your dashboard data
              </p>
            </div>
            <button
              className="btn secondary"
              onClick={() => setHistoryOpen(false)}
              aria-label="Close full-screen skill history"
              style={{ minWidth: 112 }}
            >
              ✕ Close
            </button>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              paddingTop: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Freshness over time</h2>
                <p className="muted" style={{ margin: "5px 0 0" }}>
                  Score (%) · use the chart tooltip to inspect recorded points
                </p>
              </div>
              <div
                style={{
                  border: "1px solid #334155",
                  borderRadius: 12,
                  padding: "10px 16px",
                  background: "#0f172a",
                }}
              >
                <span className="muted" style={{ fontSize: 12, display: "block" }}>Current score</span>
                <strong style={{ fontSize: 26, color: "#67e8f9" }}>{sel.freshness_score}%</strong>
              </div>
            </div>

            {(sel.decay_history || []).length > 0 ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 260,
                  width: "100%",
                  border: "1px solid #26364d",
                  borderRadius: 18,
                  background: "linear-gradient(145deg, rgba(15,23,42,0.98), rgba(8,15,30,0.98))",
                  padding: "clamp(10px, 2vw, 24px)",
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sel.decay_history || []} margin={{ top: 20, right: 24, left: 4, bottom: 12 }}>
                    <CartesianGrid stroke="#26364d" strokeDasharray="4 4" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#a7b6cc", fontSize: 12 }}
                      tickLine={{ stroke: "#475569" }}
                      axisLine={{ stroke: "#475569" }}
                      minTickGap={24}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "#a7b6cc", fontSize: 12 }}
                      tickLine={{ stroke: "#475569" }}
                      axisLine={{ stroke: "#475569" }}
                      tickFormatter={(value) => `${value}%`}
                      width={54}
                    />
                    <Tooltip
                      contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, color: "#e5edf8" }}
                      labelStyle={{ color: "#cbd5e1" }}
                      formatter={(value: any) => [`${value}%`, "Freshness score"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Freshness score"
                      stroke="#67e8f9"
                      strokeWidth={4}
                      dot={{ r: 4, fill: "#67e8f9", stroke: "#0f172a", strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: "#ffffff", stroke: "#67e8f9", strokeWidth: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div
                style={{
                  flex: 1,
                  minHeight: 260,
                  display: "grid",
                  placeItems: "center",
                  textAlign: "center",
                  border: "1px dashed #475569",
                  borderRadius: 18,
                  padding: 24,
                  background: "#0f172a",
                }}
              >
                <div>
                  <div style={{ fontSize: 42, marginBottom: 12 }}>◷</div>
                  <h2 style={{ margin: "0 0 8px" }}>No history points available yet</h2>
                  <p className="muted" style={{ maxWidth: 520, margin: "0 auto" }}>
                    The API has not returned historical scores for {sel.subject_name}. This view will show the real graph when history data is available; no sample points are being displayed.
                  </p>
                </div>
              </div>
            )}
            <p className="muted" style={{ margin: "12px 0 0", fontSize: 12 }}>
              Forecasts are estimates, not guarantees. Press Esc or select Close to return to the dashboard.
            </p>
          </div>
        </div>
      )}

      <footer className="footer">
        The demo refreshes the activity feed every 5 seconds. Production
        should use Supabase Realtime or WebSockets.
      </footer>
    </main>
  );
}
