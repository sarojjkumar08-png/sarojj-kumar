
"use client";

import { useEffect, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

type HeatmapItem = {
  subject: string;
  red_percent: number;
  yellow_percent: number;
  green_percent: number;
};

type RiskItem = {
  student_id: string;
  name: string;
  readiness: number;
};

type DeadSkill = {
  subject: string;
  student: string;
  score: number;
};

export default function HOD() {
  const [d, S] = useState<any>(null);
  const [report, R] = useState<any>(null);
  const [err, E] = useState("");
  const [busy, B] = useState(false);

  async function load() {
    try {
      const r = await fetch(`${API}/api/hod/dashboard`, { cache: "no-store" });

      if (!r.ok) {
        throw new Error(`Dashboard request failed: HTTP ${r.status}`);
      }

      S(await r.json());
      E("");
    } catch (e: any) {
      E(
        `Backend connect aagala. Port 8001-la backend running-a check pannu. ${
          e.message || ""
        }`
      );
    }
  }

  useEffect(() => {
    load();

    const timer = setInterval(load, 7000);

    return () => clearInterval(timer);
  }, []);

  async function generateReport() {
    B(true);
    E("");

    try {
      const r = await fetch(`${API}/api/hod/report`, {
        method: "POST",
      });

      const result = await r.json();

      if (!r.ok) {
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : JSON.stringify(result.detail || result)
        );
      }

      R(result);
    } catch (e: any) {
      E(`Report generation failed: ${e.message || "Unknown error"}`);
    } finally {
      B(false);
    }
  }

  function exportCSV() {
    if (!d?.heatmap) return;

    const rows = [
      ["Subject", "Red / Dead (%)", "Yellow / Decaying (%)", "Green / Fresh (%)"],
      ...d.heatmap.map((item: HeatmapItem) => [
        item.subject,
        item.red_percent,
        item.yellow_percent,
        item.green_percent,
      ]),
    ];

    const csv = rows
      .map((row: any[]) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "skilltruth-heatmap.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  const heatmap: HeatmapItem[] = d?.heatmap || [];
  const risks: RiskItem[] = d?.risk_list || [];
  const deadSkills: DeadSkill[] = d?.top_dead_skills || [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e5edf8",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <a
          href="/"
          style={{
            color: "#e5edf8",
            textDecoration: "none",
            fontSize: 24,
            fontWeight: 800,
          }}
        >
          Skill<span style={{ color: "#67e8f9" }}>Truth</span>
        </a>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <a href="/company" style={{ color: "#67e8f9", textDecoration: "none" }}>Company view →</a>
        <a
          href="/student"
          style={{
            color: "#67e8f9",
            textDecoration: "none",
          }}
        >
          Student view →
        </a>
        </div>
      </nav>

      <p style={{ color: "#67e8f9", fontSize: 12, letterSpacing: 2 }}>
        DEPARTMENT INTELLIGENCE
      </p>

      <h1 style={{ fontSize: 38, margin: "8px 0" }}>
        See the skills at risk.
      </h1>

      <p style={{ color: "#94a3b8" }}>
        Demo college aggregate data; not placement outcomes.
      </p>

      {err && (
        <div
          style={{
            padding: 14,
            margin: "20px 0",
            borderRadius: 10,
            background: "#451a1a",
            color: "#fecaca",
          }}
        >
          {err}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 16,
          marginTop: 28,
        }}
      >
        {[
          ["Students", d?.student_count ?? "—"],
          ["Subjects", heatmap.length || "—"],
          ["At-risk students", risks.length || 0],
          ["Dead skill records", deadSkills.length || 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            style={{
              padding: 22,
              borderRadius: 14,
              border: "1px solid #26364d",
              background: "#111c2e",
            }}
          >
            <p style={{ color: "#94a3b8", margin: 0 }}>{label}</p>
            <h2 style={{ fontSize: 32, marginBottom: 0 }}>{value}</h2>
          </div>
        ))}
      </section>

      <section
        style={{
          marginTop: 28,
          padding: 24,
          borderRadius: 16,
          background: "#111c2e",
          border: "1px solid #26364d",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Subject heatmap</h2>
        <h3>Skill status by subject</h3>

        {heatmap.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>
            {d ? "No heatmap data available." : "Loading heatmap..."}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {heatmap.map((item) => (
              <div key={item.subject}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <strong>{item.subject}</strong>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>
                    Dead {item.red_percent}% · Decaying {item.yellow_percent}% ·
                    Fresh {item.green_percent}%
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: 18,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#26364d",
                  }}
                >
                  <div
                    title={`Dead: ${item.red_percent}%`}
                    style={{
                      width: `${item.red_percent}%`,
                      background: "#fb7185",
                    }}
                  />
                  <div
                    title={`Decaying: ${item.yellow_percent}%`}
                    style={{
                      width: `${item.yellow_percent}%`,
                      background: "#facc15",
                    }}
                  />
                  <div
                    title={`Fresh: ${item.green_percent}%`}
                    style={{
                      width: `${item.green_percent}%`,
                      background: "#4ade80",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 18,
            flexWrap: "wrap",
            marginTop: 22,
            color: "#cbd5e1",
            fontSize: 13,
          }}
        >
          <span>🟥 Red / Dead</span>
          <span>🟨 Yellow / Decaying</span>
          <span>🟩 Green / Fresh</span>
        </div>
      </section>

      <section
        style={{
          marginTop: 24,
          padding: 24,
          borderRadius: 16,
          background: "#111c2e",
          border: "1px solid #26364d",
        }}
      >
        <p style={{ color: "#67e8f9", fontSize: 12, letterSpacing: 1 }}>
          PRINCIPAL AGENT
        </p>

        <h2 style={{ marginTop: 0 }}>AI department report</h2>

        <p style={{ color: "#94a3b8" }}>
          Generates a department report using the configured AI provider.
        </p>

        <button
          onClick={generateReport}
          disabled={busy}
          style={{
            border: 0,
            borderRadius: 9,
            padding: "12px 18px",
            background: "#67e8f9",
            color: "#082032",
            fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? "Generating report..." : "Generate AI report"}
        </button>

        {report ? (
          <pre
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 10,
              background: "#0b1220",
              border: "1px solid #26364d",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              fontFamily: "inherit",
              lineHeight: 1.7,
            }}
          >
            {typeof report === "string"
              ? report
              : JSON.stringify(report, null, 2)}
          </pre>
        ) : (
          <p style={{ color: "#94a3b8" }}>No report generated yet.</p>
        )}
      </section>

      <section
        style={{
          marginTop: 24,
          padding: 24,
          borderRadius: 16,
          background: "#111c2e",
          border: "1px solid #26364d",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Risk list · readiness under 40</h2>

        {risks.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>
            No students below threshold in current demo data.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Student</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Student ID</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Readiness</th>
                </tr>
              </thead>
              <tbody>
                {risks.map((student) => (
                  <tr key={student.student_id}>
                    <td style={{ padding: 10 }}>{student.name}</td>
                    <td style={{ padding: 10 }}>{student.student_id}</td>
                    <td style={{ padding: 10 }}>{student.readiness}/100</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section
        style={{
          marginTop: 24,
          padding: 24,
          borderRadius: 16,
          background: "#111c2e",
          border: "1px solid #26364d",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Top dead skills</h2>

          <button className="btn secondary" onClick={() => window.print()} style={{ marginLeft: 8 }}>
            Export PDF / Print
          </button>
          <button
            onClick={exportCSV}
            disabled={!heatmap.length}
            style={{
              border: "1px solid #3b506d",
              borderRadius: 9,
              padding: "10px 14px",
              background: "#17263b",
              color: "#e5edf8",
              cursor: "pointer",
            }}
          >
            Export heatmap CSV
          </button>
        </div>

        {deadSkills.length === 0 ? (
          <p style={{ color: "#94a3b8" }}>No dead skills in current data.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 10 }}>Subject</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Student</th>
                  <th style={{ textAlign: "left", padding: 10 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {deadSkills.map((skill, index) => (
                  <tr key={`${skill.subject}-${skill.student}-${index}`}>
                    <td style={{ padding: 10 }}>{skill.subject}</td>
                    <td style={{ padding: 10 }}>{skill.student}</td>
                    <td style={{ padding: 10 }}>{skill.score}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer
        style={{
          marginTop: 28,
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        CSV export and browser-based PDF/print export are available for this demo. Real authentication and persistent Supabase storage must be configured before production use.
      </footer>
    </main>
  );
}
