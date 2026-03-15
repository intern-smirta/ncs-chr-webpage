import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine,
  Cell, LabelList, ResponsiveContainer
} from "recharts";

// ─── NCS DATA (February 2026) ───────────────────────────────
const CLIENT = "NCS";
const MONTH = "February 2026";
const PRIOR_MONTH = "January 2026";

const COMPANY_AVG = {
  scheduler_compliance: 80.1,
  avg_delay_mins: 5.1,
  avg_chair_utilization: 66.3,
  iassign_utilization: null,
  avg_nurse_util: null,
};

const LOCATIONS = [
  {
    name: "Legacy",
    score: 66,
    iopt: {
      scheduler_compliance: { val: 78.0, prior: 52.5 },
      avg_delay_mins: { val: 4.9, prior: 5.5 },
      delay_median: 4.7,
      chair_utilization: { val: 61.1, prior: 62.0 },
      chair_median: 60.9,
      tx_past_close: { val: 0.0, prior: 0.1 },
      mins_past_close: 0.0,
    },
    iasg: {
      iassign_util: { val: 100.0, prior: null },
      patients_per_nurse: 6.3,
      chairs_per_nurse: 4.2,
      nurse_util: { val: 65.4, prior: 65.1 },
    },
  },
  {
    name: "Methodist",
    score: 76,
    iopt: {
      scheduler_compliance: { val: 82.7, prior: 57.2 },
      avg_delay_mins: { val: 5.2, prior: 5.8 },
      delay_median: 5.5,
      chair_utilization: { val: 71.5, prior: 73.1 },
      chair_median: 73.2,
      tx_past_close: { val: 0.1, prior: 0.2 },
      mins_past_close: 13.0,
    },
    iasg: {
      iassign_util: { val: 100.0, prior: null },
      patients_per_nurse: 6.7,
      chairs_per_nurse: 4.0,
      nurse_util: { val: 69.3, prior: 73.4 },
    },
  },
];

const INSIGHTS = {
  executive_summary:
    "NCS delivered material improvements across both clinics in February 2026, with scheduler compliance rising sharply and overtime essentially eliminated. Legacy achieved a performance score of 66 out of 100 (where 50 represents the network average), while Methodist reached 76 out of 100, reflecting stronger scheduling discipline and patient flow management compared to the company average of 80.1% compliance.",
  highlights:
    "Legacy eliminated overtime entirely, with treatments past closing dropping from 0.1 in January to 0.0 in February — a 100% improvement that reflects tighter scheduling control. Scheduler compliance at Legacy rose 25.5 points from 52.5% in January to 78.0% in February, now tracking just 2.1 points below the company average of 80.1%. Methodist's compliance gained an identical 25.5 points to reach 82.7%, now 2.6 points above the company average.",
  areas_to_explore:
    "We noticed that Legacy's chair utilization of 61.1% trails the company average of 66.3% by 5.2 percentage points, suggesting room to optimize scheduling density without overbooking. Nurse utilization at Legacy stands at 65.4%, which we might explore in tandem with chair capacity, as the data suggests both metrics sitting below the company group — an area worth examining together.",
  recommendation:
    "We recommend that Legacy conduct a focused review of its scheduling templates and patient-slot allocation patterns to close the 5.2-point chair utilization gap versus the company average. A structured audit of how iOptimize recommendations are being applied to shift construction would help identify whether the gap stems from template design or day-of-schedule modifications.",
};

// ─── COLORS (matching email report) ─────────────────────────
const NAVY = "#1B2A4A";
const TEAL = "#2C7A7B";
const RED_BAR = "#E53E3E";
const ORANGE_BAR = "#DD6B20";
const SLATE = "#4A5568";
const GREEN = "#276749";
const GREEN_BG = "#C6F6D5";
const RED_BG = "#FED7D7";

function getBarColor(value, benchmark, lowerIsBetter = false) {
  if (benchmark == null) return TEAL;
  if (lowerIsBetter) {
    if (value <= benchmark) return TEAL;
    if (value > benchmark * 1.15) return RED_BAR;
    return ORANGE_BAR;
  }
  if (value >= benchmark) return TEAL;
  if (value < benchmark * 0.85) return RED_BAR;
  return ORANGE_BAR;
}

// ─── REPORT-STYLE BAR CHART (Recharts) ──────────────────────
function ReportBarChart({ data, benchmarkVal, benchmarkLabel, title, yLabel, lowerIsBetter = false, suffix = "%" }) {
  const maxVal = Math.max(...data.map(d => d.value), benchmarkVal || 0) * 1.22;
  const renderLabel = (props) => {
    const { x, y, width, value } = props;
    return (
      <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="#2D3748">
        {typeof value === "number" ? value.toFixed(1) : value}{suffix}
      </text>
    );
  };

  return (
    <div style={{ background: "#F7F8FA", border: "1px solid #E2E8F0", borderRadius: 8, padding: "18px 14px 10px" }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: NAVY, marginBottom: 16, letterSpacing: 0.2 }}>{title}</h4>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 24, right: 20, bottom: 20, left: 10 }} barCategoryGap="35%">
          <CartesianGrid vertical={false} stroke="#EDF2F7" strokeWidth={0.8} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: SLATE, fontWeight: 500 }} axisLine={{ stroke: "#CBD5E0" }} tickLine={{ stroke: "#CBD5E0" }} />
          <YAxis domain={[0, Math.ceil(maxVal / 10) * 10]} tick={{ fontSize: 10, fill: "#718096" }} axisLine={{ stroke: "#CBD5E0" }} tickLine={false}
            label={{ value: yLabel, angle: -90, position: "insideLeft", style: { fontSize: 11, fill: SLATE }, offset: -5 }} />
          {benchmarkVal != null && (
            <ReferenceLine y={benchmarkVal} stroke={NAVY} strokeDasharray="6 3" strokeWidth={1.8}
              label={{ value: `${benchmarkLabel} (${benchmarkVal.toFixed(1)}${suffix})`, position: "insideTopRight", style: { fontSize: 10, fill: NAVY, fontWeight: 600 } }} />
          )}
          <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={80} isAnimationActive={true} animationDuration={800}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getBarColor(entry.value, benchmarkVal, lowerIsBetter)} fillOpacity={0.88} />
            ))}
            <LabelList content={renderLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────────
function Delta({ current, prior, higherIsBetter = true }) {
  if (prior == null) return null;
  const delta = current - prior;
  if (Math.abs(delta) < 0.05) return <span style={{ color: "#A0AEC0", fontSize: 10, marginLeft: 4 }}>→</span>;
  const isGood = higherIsBetter ? delta > 0 : delta < 0;
  const arrow = delta > 0 ? "↑" : "↓";
  return (
    <span style={{ color: isGood ? GREEN : "#9B2335", fontSize: 10, fontWeight: 600, marginLeft: 5 }}>
      {arrow}{Math.abs(delta).toFixed(1)}
      <span style={{ color: "#A0AEC0", fontSize: 9, fontWeight: 400, marginLeft: 3 }}>(was {prior.toFixed(1)})</span>
    </span>
  );
}

function ScoreBadge({ score }) {
  const bg = score >= 60 ? GREEN_BG : score < 40 ? RED_BG : "#FEF3C7";
  const color = score >= 60 ? GREEN : score < 40 ? "#9B2335" : "#92400E";
  return <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, background: bg, color, padding: "2px 8px", borderRadius: 5, marginLeft: 6 }}>{score}</span>;
}

function KpiCell({ val, benchmark, higherIsBetter = true, prior, suffix = "%", decimals = 1 }) {
  if (val == null) return <td style={{ padding: "8px 14px", textAlign: "center", color: "#CBD5E0" }}>—</td>;
  let bg = "transparent", color = SLATE;
  if (benchmark != null) {
    const diff = val - benchmark, threshold = Math.abs(benchmark) * 0.05;
    if (Math.abs(diff) <= threshold) bg = "#EDF2F7";
    else if ((diff > 0) === higherIsBetter) { bg = GREEN_BG; color = GREEN; }
    else { bg = RED_BG; color = "#9B2335"; }
  }
  return (
    <td style={{ padding: "8px 14px", textAlign: "center", fontWeight: 600, background: bg, color, whiteSpace: "nowrap", borderBottom: "1px solid #E2E8F0" }}>
      {val.toFixed(decimals)}{suffix}
      <Delta current={val} prior={prior} higherIsBetter={higherIsBetter} />
    </td>
  );
}

// ─── MAIN ───────────────────────────────────────────────────
export default function NcsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const avgScore = (LOCATIONS.reduce((s, l) => s + l.score, 0) / LOCATIONS.length).toFixed(0);
  const sectionTitle = { fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.8, paddingBottom: 10, marginBottom: 14, borderBottom: `2px solid ${NAVY}` };
  const tabBtn = (id) => ({ padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", transition: "all 0.2s", background: activeTab === id ? NAVY : "transparent", color: activeTab === id ? "white" : SLATE, boxShadow: activeTab === id ? "0 1px 3px rgba(0,0,0,.15)" : "none" });

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4f8 0%, #e8ecf1 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontSize: 13, lineHeight: 1.6, color: "#2D3748" }}>
      {/* NAV */}
      <nav style={{ background: NAVY, color: "white", padding: "12px 0", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(0,0,0,.2)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #2dd4bf, #14b8a6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontWeight: 900, fontSize: 14 }}>O</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.3 }}>OncoSmart</span>
            <span style={{ color: "#94a3b8", fontSize: 13, marginLeft: 4 }}>Clinic Health Report</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13 }}>
            <span style={{ color: "#94a3b8" }}>{CLIENT}</span>
            <span style={{ background: TEAL, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{MONTH}</span>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: -0.5, margin: 0 }}>{CLIENT}</h1>
          <p style={{ color: SLATE, marginTop: 4, fontSize: 13 }}>{MONTH} · Monthly Performance Summary</p>
        </div>

        {/* METRIC CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "Locations", value: String(LOCATIONS.length), sub: "Active clinics" },
            { label: "Avg Performance Score", value: avgScore, sub: "Network avg: 50", good: Number(avgScore) >= 50 },
            { label: "Company Avg Compliance", value: `${COMPANY_AVG.scheduler_compliance}%`, sub: "Scheduler compliance" },
            { label: "Company Avg Delay", value: `${COMPANY_AVG.avg_delay_mins} min`, sub: "Patient wait time" },
          ].map((c) => (
            <div key={c.label} style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#94a3b8", margin: 0 }}>{c.label}</p>
              <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, margin: "4px 0 2px", color: c.good === false ? "#9B2335" : c.good === true ? GREEN : "#0f172a" }}>{c.value}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{c.sub}</p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "white", borderRadius: 12, padding: 4, boxShadow: "0 1px 3px rgba(0,0,0,.04)", border: "1px solid #E2E8F0", width: "fit-content" }}>
          {[{ id: "overview", label: "Performance Overview" }, { id: "ioptimize", label: "iOptimize Metrics" }, { id: "iassign", label: "iAssign Metrics" }, { id: "charts", label: "Charts" }].map((t) => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: "24px 28px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
              <h2 style={sectionTitle}>Performance Overview</h2>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: "#2D3748" }}>{INSIGHTS.executive_summary}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div style={{ background: "#F0FFF4", borderRadius: 10, padding: "18px 20px", borderLeft: `4px solid ${GREEN}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#718096", marginBottom: 8 }}>What's Working Well</p>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: "#2D3748", margin: 0 }}>{INSIGHTS.highlights}</p>
              </div>
              <div style={{ background: "#EBF8FF", borderRadius: 10, padding: "18px 20px", borderLeft: "4px solid #2B6CB0" }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#718096", marginBottom: 8 }}>Areas to Explore</p>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: "#2D3748", margin: 0 }}>{INSIGHTS.areas_to_explore}</p>
              </div>
            </div>
            <div style={{ background: "#EBF4FF", borderRadius: 10, padding: "18px 20px", borderLeft: `4px solid ${NAVY}`, marginBottom: 28 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#718096", marginBottom: 8 }}>How We Can Help</p>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: "#2D3748", margin: 0 }}>{INSIGHTS.recommendation}</p>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "#94a3b8", marginBottom: 12 }}>Clinic Performance Scores</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              {LOCATIONS.map((loc) => (
                <div key={loc.name} style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>{loc.name}</span>
                    <ScoreBadge score={loc.score} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
                    {[
                      { label: "Compliance", val: loc.iopt.scheduler_compliance.val, suf: "%", prior: loc.iopt.scheduler_compliance.prior, hib: true },
                      { label: "Avg Delay", val: loc.iopt.avg_delay_mins.val, suf: " min", prior: loc.iopt.avg_delay_mins.prior, hib: false },
                      { label: "Chair Util", val: loc.iopt.chair_utilization.val, suf: "%", prior: loc.iopt.chair_utilization.prior, hib: true },
                    ].map((k) => (
                      <div key={k.label}>
                        <p style={{ fontSize: 10, color: "#94a3b8", margin: "0 0 3px" }}>{k.label}</p>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>{k.val.toFixed(1)}{k.suf}</p>
                        <Delta current={k.val} prior={k.prior} higherIsBetter={k.hib} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", marginBottom: 3 }}>
                      <span>0</span><span>Network Avg (50)</span><span>100</span>
                    </div>
                    <div style={{ height: 10, background: "#f1f5f9", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                      <div style={{ height: "100%", borderRadius: 99, transition: "width 1s ease-out", width: `${loc.score}%`, background: loc.score >= 60 ? "#10b981" : loc.score >= 40 ? "#f59e0b" : "#ef4444" }} />
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "#64748b", opacity: 0.4 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 8 }}>
              Performance Score: weighted blend of compliance (25%), delay (20%), chair utilization (20%), iAssign adoption (15%), overtime (10%), and nurse utilization (10%). 50 = network average, 100 = top decile.
            </p>
          </div>
        )}

        {/* iOPTIMIZE TAB */}
        {activeTab === "ioptimize" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0" }}>
              <h2 style={{ ...sectionTitle, marginBottom: 4 }}>iOptimize — Scheduling & Flow Metrics</h2>
              <p style={{ fontSize: 11, color: "#718096" }}>Colour coding vs company average · Arrows show MoM change with prior value</p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: NAVY, color: "white" }}>
                    {["Location", "Scheduler Compliance", "Avg Delay (min)", "Median Delay", "Chair Utilization", "Chair Util. Median", "Tx Past Close", "Mins Past Close / Pt"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: h === "Location" ? "left" : "center", fontWeight: 600, fontSize: 11, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LOCATIONS.map((loc) => (
                    <tr key={loc.name} style={{ borderBottom: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "8px 14px", fontWeight: 600, color: NAVY, whiteSpace: "nowrap" }}>{loc.name}<ScoreBadge score={loc.score} /></td>
                      <KpiCell val={loc.iopt.scheduler_compliance.val} benchmark={COMPANY_AVG.scheduler_compliance} prior={loc.iopt.scheduler_compliance.prior} />
                      <KpiCell val={loc.iopt.avg_delay_mins.val} benchmark={COMPANY_AVG.avg_delay_mins} higherIsBetter={false} prior={loc.iopt.avg_delay_mins.prior} suffix=" min" />
                      <td style={{ padding: "8px 14px", textAlign: "center", color: SLATE, borderBottom: "1px solid #E2E8F0" }}>{loc.iopt.delay_median} min</td>
                      <KpiCell val={loc.iopt.chair_utilization.val} benchmark={COMPANY_AVG.avg_chair_utilization} prior={loc.iopt.chair_utilization.prior} />
                      <td style={{ padding: "8px 14px", textAlign: "center", color: SLATE, borderBottom: "1px solid #E2E8F0" }}>{loc.iopt.chair_median}%</td>
                      <KpiCell val={loc.iopt.tx_past_close.val} benchmark={0.5} higherIsBetter={false} prior={loc.iopt.tx_past_close.prior} suffix="/day" />
                      <td style={{ padding: "8px 14px", textAlign: "center", color: SLATE, borderBottom: "1px solid #E2E8F0" }}>{loc.iopt.mins_past_close} min</td>
                    </tr>
                  ))}
                  <tr style={{ background: "#EBF4FF", fontWeight: 700, color: NAVY }}>
                    <td style={{ padding: "8px 14px" }}>Company Average</td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }}>{COMPANY_AVG.scheduler_compliance}%</td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }} colSpan={2}>{COMPANY_AVG.avg_delay_mins} min</td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }} colSpan={2}>{COMPANY_AVG.avg_chair_utilization}%</td>
                    <td style={{ padding: "8px 14px", textAlign: "center" }} colSpan={2}>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style={{ padding: "10px 24px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 14, fontSize: 11 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: GREEN_BG, border: "1px solid #9ae6b4", display: "inline-block" }} /> Above avg</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: RED_BG, border: "1px solid #feb2b2", display: "inline-block" }} /> Below avg</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "#EDF2F7", border: "1px solid #CBD5E0", display: "inline-block" }} /> Within 5%</span>
            </div>
            <div style={{ padding: "8px 24px 14px", fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
              Performance Score (badge): weighted blend of compliance, delay, chair utilization, iAssign adoption, overtime, and nurse utilization. 50 = network average, 100 = top decile.
            </div>
          </div>
        )}

        {/* iASSIGN TAB */}
        {activeTab === "iassign" && (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0" }}>
              <h2 style={{ ...sectionTitle, marginBottom: 4 }}>iAssign — Staffing & Nurse Metrics</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: NAVY, color: "white" }}>
                    {["Location", "iAssign Utilization", "Patients / Nurse", "Chairs / Nurse", "Nurse Utilization"].map((h) => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: h === "Location" ? "left" : "center", fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LOCATIONS.map((loc) => (
                    <tr key={loc.name} style={{ borderBottom: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "8px 14px", fontWeight: 600, color: NAVY }}>{loc.name}</td>
                      <td style={{ padding: "8px 14px", textAlign: "center", fontWeight: 600, color: GREEN, background: GREEN_BG, borderBottom: "1px solid #E2E8F0" }}>{loc.iasg.iassign_util.val.toFixed(1)}%</td>
                      <td style={{ padding: "8px 14px", textAlign: "center", borderBottom: "1px solid #E2E8F0" }}>{loc.iasg.patients_per_nurse}</td>
                      <td style={{ padding: "8px 14px", textAlign: "center", borderBottom: "1px solid #E2E8F0" }}>{loc.iasg.chairs_per_nurse}</td>
                      <KpiCell val={loc.iasg.nurse_util.val} benchmark={67} prior={loc.iasg.nurse_util.prior} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CHARTS TAB */}
        {activeTab === "charts" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <ReportBarChart data={LOCATIONS.map(l => ({ name: l.name, value: l.iopt.scheduler_compliance.val }))} benchmarkVal={COMPANY_AVG.scheduler_compliance} benchmarkLabel="Company Avg" title="Scheduler Compliance by Location" yLabel="Scheduler Compliance (%)" suffix="%" />
            <ReportBarChart data={LOCATIONS.map(l => ({ name: l.name, value: l.iopt.avg_delay_mins.val }))} benchmarkVal={COMPANY_AVG.avg_delay_mins} benchmarkLabel="Company Avg" title="Avg Delay Before Treatment" yLabel="Minutes" lowerIsBetter={true} suffix=" min" />
            <ReportBarChart data={LOCATIONS.map(l => ({ name: l.name, value: l.iopt.chair_utilization.val }))} benchmarkVal={COMPANY_AVG.avg_chair_utilization} benchmarkLabel="Company Avg" title="Chair Utilization by Location" yLabel="Chair Utilization (%)" suffix="%" />
            <ReportBarChart data={LOCATIONS.map(l => ({ name: l.name, value: l.iasg.iassign_util.val }))} benchmarkVal={null} benchmarkLabel="" title="iAssign Utilization by Location" yLabel="iAssign Utilization (%)" suffix="%" />
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 48, textAlign: "center", fontSize: 11, color: "#94a3b8", padding: "20px 0", borderTop: "1px solid #E2E8F0" }}>
          {CLIENT} · {MONTH} Clinic Health Report · Prepared by the OncoSmart Analytics Team<br />
          Confidential — for internal review only
        </div>
      </div>
    </div>
  );
}
