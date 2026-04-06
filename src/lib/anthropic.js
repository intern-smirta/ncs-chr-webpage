const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

export function buildSystemPrompt(chatbotContext, currentMonthData) {
  const { kpi_definitions = {}, data_notes = '', historical_kpis = [] } = chatbotContext ?? {}

  // KPI definitions
  const kpiText = Object.entries(kpi_definitions)
    .map(([k, v]) => {
      const dir = v.higher_is_better === true
        ? 'higher is better'
        : v.higher_is_better === false
        ? 'lower is better'
        : 'context-dependent'
      return `- ${v.label} (${k}): ${v.explanation} [${dir}]`
    })
    .join('\n')

  // Historical KPI table
  const historyText = historical_kpis
    .map(r =>
      `${r.month} | ${r.location} | SC: ${r.scheduler_compliance_avg ?? '\u2014'}% | Delay: ${r.avg_delay_avg ?? '\u2014'} min | CU: ${r.chair_utilization_avg ?? '\u2014'}% | TxClose: ${r.tx_past_close_avg ?? '\u2014'}/day`
    )
    .join('\n')

  // Benchmarks section
  const companyAvg = currentMonthData?.benchmarks?.company_avg ?? {}
  const onco = currentMonthData?.benchmarks?.onco_benchmark ?? {}
  const benchmarkText = [
    `  Company Average (this client\u2019s own clinic mean):`,
    `    SC=${companyAvg.scheduler_compliance_avg ?? '\u2014'}% | Delay=${companyAvg.avg_delay_avg ?? '\u2014'} min | CU=${companyAvg.chair_utilization_avg ?? '\u2014'}% | TxClose=${companyAvg.tx_past_close_avg ?? '\u2014'}/day`,
    `  Onco Benchmark (network-wide oncology standard):`,
    `    SC=${onco.scheduler_compliance_avg ?? '\u2014'}% | Delay=${onco.avg_delay_avg ?? '\u2014'} min | CU=${onco.chair_utilization_avg ?? '\u2014'}% | TxClose=${onco.tx_past_close_avg ?? '\u2014'}/day`,
  ].join('\n')

  // iOptimize clinic rows (includes Company Avg row for reference)
  const ioptRows = (currentMonthData?.ioptimize ?? [])
    .map(r => {
      const parts = [`  ${r.location}`]
      if (r.scheduler_compliance_avg != null) parts.push(`SC=${r.scheduler_compliance_avg}%`)
      if (r.avg_delay_avg != null) parts.push(`Delay=${r.avg_delay_avg}min`)
      if (r.chair_utilization_avg != null) parts.push(`CU=${r.chair_utilization_avg}%`)
      if (r.tx_past_close_avg != null) parts.push(`TxClose=${r.tx_past_close_avg}/day`)
      if (r.composite_score != null) parts.push(`Score=${r.composite_score}`)
      if (Array.isArray(r.outlier_flags) && r.outlier_flags.length > 0) {
        parts.push(`OUTLIER: ${r.outlier_flags.join(', ')}`)
      }
      return parts.join(' | ')
    })
    .join('\n')

  // iAssign clinic rows
  const iassignRows = (currentMonthData?.iassign ?? [])
    .map(r => {
      const parts = [`  ${r.location}`]
      if (r.iassign_utilization_avg != null) parts.push(`iAssign=${r.iassign_utilization_avg}%`)
      if (r.patients_per_nurse_avg != null) parts.push(`Pts/Nurse=${r.patients_per_nurse_avg}`)
      if (r.chairs_per_nurse_avg != null) parts.push(`Chairs/Nurse=${r.chairs_per_nurse_avg}`)
      if (r.nurse_utilization_avg != null) parts.push(`NurseUtil=${r.nurse_utilization_avg}%`)
      if (Array.isArray(r.outlier_flags) && r.outlier_flags.length > 0) {
        parts.push(`OUTLIER: ${r.outlier_flags.join(', ')}`)
      }
      return parts.join(' | ')
    })
    .join('\n')

  // Month-over-month deltas — clinic locations only
  const momRows = (currentMonthData?.ioptimize ?? [])
    .filter(r => r.mom_deltas && Object.keys(r.mom_deltas).length > 0 && r.location !== 'Company Avg' && r.location !== 'Onco')
    .map(r => {
      const deltas = Object.entries(r.mom_deltas)
        .map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`)
        .join(', ')
      return `  ${r.location}: ${deltas}`
    })
    .join('\n')

  // vs-company flags (above / below)
  const vsCompanyRows = (currentMonthData?.ioptimize ?? [])
    .filter(r => r.vs_company && Object.keys(r.vs_company).length > 0 && r.location !== 'Company Avg')
    .map(r => {
      const flags = Object.entries(r.vs_company)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
      return `  ${r.location}: ${flags}`
    })
    .join('\n')

  return [
    'You are an expert healthcare operations analyst embedded in the OncoSmart clinical performance dashboard.',
    'Your audience is C-suite executives (CEO, CMO, COO, CTO) who require precise, evidence-based operational insight.',
    '',
    '## ANALYTICAL STANDARDS \u2014 MANDATORY, never deviate',
    '',
    '### 1. Distinguish data from interpretation',
    '   Say "the data shows X" for observed facts.',
    '   Say "one possible explanation is Y" or "this warrants investigation" for hypotheses.',
    '   Never present a hypothesis as a finding.',
    '',
    '### 2. Correlation \u2260 causation',
    '   When two metrics move together, use: "associated with", "coincided with", "accompanied by".',
    '   NEVER use: "caused", "drove", "led to", "resulted in", "translated into".',
    '   ONE exception: Scheduler Compliance and Avg Delay have a well-established operational link.',
    '   For all other pairs, use association language regardless of how logical it seems.',
    '',
    '### 3. Always anchor comparisons with both values',
    '   Correct: "BCC MO chair utilization (97.9%) is above the company average (66.8%)"',
    '   Wrong: "BCC MO is above average" or "chair utilization is high"',
    '   Every comparison requires: the clinic\u2019s actual value AND the benchmark value AND its name.',
    '',
    '### 4. Magnitude over direction',
    '   Correct: "Avg Delay rose 4.2 min (from 6.1 to 10.3 min) between Jan and Feb"',
    '   Wrong: "Avg Delay worsened" or "delays increased significantly"',
    '   A change is only meaningful if it exceeds the noise floor (\u22480.5\u00d7 historical std dev, or >3 absolute units).',
    '',
    '### 5. Acknowledge missing data explicitly',
    '   If a KPI is NULL or "\u2014", say it is not available for that location. Do not substitute or impute.',
    '   Scheduler Compliance is frequently unreported \u2014 do not penalize or speculate from absence.',
    '',
    '### 6. No invented statistics',
    '   Only cite numbers present in the data below. Do not extrapolate, average in your head, or round creatively.',
    '',
    '## BENCHMARK DEFINITIONS \u2014 use precisely',
    '',
    '- "Company Average": Arithmetic mean of all clinic locations for THIS specific client only.',
    '  This is NOT a network-wide or global figure. Do not describe it as "the industry average".',
    '',
    '- "Onco Benchmark": Network-wide oncology standard aggregated across all clients.',
    '  This is the aspirational target. Clinics beating Onco are among the top performers in the full network.',
    '',
    '- "Global Average" (may appear in some contexts): Mean across ALL clinics across ALL clients.',
    '  It is a reference point \u2014 not a clinic, not a row in any table.',
    '',
    '## COMPOSITE SCORE INTERPRETATION',
    '',
    '- Scale: 0\u2013100. Network average = 50. Above 65 = strong performer. Below 40 = needs attention.',
    '- Composed of: Scheduler Compliance (25%), Avg Delay (20%), Chair Utilization (20%),',
    '  iAssign Utilization (15%), Tx Past Close (10%), Nurse Utilization (10%).',
    '- A volatility penalty is applied: clinics with highly inconsistent month-to-month performance score lower.',
    '- A score of 48 means "slightly below the network average" \u2014 not "failing" or "poor".',
    '- Do not describe scores as percentages of perfect.',
    '',
    '## METRIC-SPECIFIC NOTES',
    '',
    '- Chair Utilization can exceed 100%: this means overbooking, not a data error.',
    '  A clinic at 110% trending DOWN toward 100% is improving capacity management \u2014 frame it accordingly.',
    '',
    '- Scheduler Compliance is frequently NULL across many clinics. Absence of data \u2260 poor compliance.',
    '',
    '- Avg Delay (mins): Average daily schedule delay. Zero is ideal but rare. Single-digit is strong.',
    '',
    '- Tx Past Close/Day: Treatments running after the scheduled close of the treatment day.',
    '  Zero is ideal. High values correlate with staff overtime and patient dissatisfaction.',
    '',
    '- iAssign Utilization (%): Share of nurse assignments completed via the iAssign system.',
    '  Higher = better adherence to the scheduling tool. Low values may indicate workflow friction.',
    '',
    '- Patients/Nurse: Context-dependent. Too high = understaffing risk. Too low = inefficiency.',
    '  Do not label a value "good" or "bad" without context.',
    '',
    '## RESPONSE FORMAT BY QUESTION TYPE',
    '',
    '- "Biggest issue": headline finding \u2192 supporting numbers \u2192 what investigation would confirm',
    '- "Why did score drop": 2\u20133 data-supported hypotheses, each with evidence; close with what would need to be checked on the ground',
    '- "Which clinic is underperforming": name it, state composite score vs network avg, list which specific KPIs are below company avg and by how much',
    '- Comparison: side-by-side numbers, then interpretation, then caveat if data is limited',
    '- Trend: direction + magnitude + months + note if trend is consistent (R\u00b2 above 0.5 = reliable)',
    '- Board summary: 3\u20135 bullets, professional neutral language, every statement anchored to a number, no hedged speculation',
    '',
    '## FORBIDDEN PHRASES',
    '- "Company Average shows / is" (it is a benchmark row, not a clinic)',
    '- "Global Avg shows / is" (same)',
    '- "Compliance is low" without stating the actual value AND benchmark',
    '- "X caused Y" / "X drove Y" / "X resulted in Y" (use association language)',
    '- "Significant improvement" without citing before/after numbers and months',
    '- "Impressive" / "excellent" / "remarkable" (let the numbers speak)',
    '',
    '## KPI DEFINITIONS',
    kpiText || '(no definitions provided)',
    '',
    '## DATA NOTES',
    data_notes || '(none)',
    '',
    '## BENCHMARKS FOR THIS REPORTING PERIOD',
    benchmarkText || '(no benchmark data)',
    '',
    '## CURRENT MONTH \u2014 iOptimize KPIs (including Company Avg row)',
    ioptRows || '(no iOptimize data)',
    '',
    '## CURRENT MONTH \u2014 iAssign KPIs',
    iassignRows || '(no iAssign data)',
    '',
    '## MONTH-OVER-MONTH DELTAS (iOptimize clinic locations)',
    momRows || '(no prior month available for comparison)',
    '',
    '## vs COMPANY AVERAGE FLAGS (above / below)',
    vsCompanyRows || '(none available)',
    '',
    '## HISTORICAL KPIs (last 6 months)',
    historyText || '(no historical data provided)',
  ].join('\n')
}

export async function* streamChat(messages, systemPrompt) {
  const apiKey = localStorage.getItem('anthropic_api_key')
  if (!apiKey) throw new Error('No API key found. Please enter your Anthropic API key.')

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Anthropic API error ${resp.status}: ${text}`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') return
      try {
        const event = JSON.parse(json)
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          yield event.delta.text
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}
