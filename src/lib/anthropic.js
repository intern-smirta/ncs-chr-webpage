const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = import.meta.env.VITE_ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'

export function buildSystemPrompt(chatbotContext, currentMonthData) {
  const { kpi_definitions = {}, data_notes = '', historical_kpis = [] } = chatbotContext ?? {}

  const kpiText = Object.entries(kpi_definitions)
    .map(([k, v]) => `- ${v.label} (${k}): ${v.explanation}`)
    .join('\n')

  const historyText = historical_kpis
    .map(r =>
      `${r.month} | ${r.location} | Sched Compliance: ${r.scheduler_compliance_avg ?? '\u2014'}% | Avg Delay: ${r.avg_delay_avg ?? '\u2014'} min | Chair Util: ${r.chair_utilization_avg ?? '\u2014'}% | Tx Past Close: ${r.tx_past_close_avg ?? '\u2014'}/day`
    )
    .join('\n')

  const ioptRows = (currentMonthData?.ioptimize ?? [])
    .map(r =>
      `  ${r.location}: SC=${r.scheduler_compliance_avg ?? '\u2014'}%, Delay=${r.avg_delay_avg ?? '\u2014'}min, CU=${r.chair_utilization_avg ?? '\u2014'}%`
    )
    .join('\n')

  return [
    'You are an AI assistant embedded in the OncoSmart clinic performance dashboard.',
    'Answer questions about clinic KPIs, trends, and benchmarks using the data provided.',
    'Be concise and analytical. Cite specific numbers from the data.',
    '',
    '## KPI Definitions',
    kpiText,
    '',
    '## Data Notes',
    data_notes,
    '',
    '## Historical KPIs (6 months)',
    historyText || '(none)',
    '',
    '## Current Month KPI Summary',
    ioptRows || '(none)',
  ].join('\n')
}

export async function* streamChat(messages, systemPrompt) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY is not set')

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
        // ignore parse errors on malformed SSE lines
      }
    }
  }
}
