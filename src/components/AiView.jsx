import { useState, useRef, useEffect } from 'react'
import { useAi } from '../contexts/AiContext'
import { streamChat, buildSystemPrompt } from '../lib/anthropic'

const FAQ_CHIPS = [
  'What is the single biggest thing to fix?',
  'Why did the score drop this month?',
  'Which clinic is underperforming and why?',
  'How does NCS compare to company average?',
  'What improved the most this period?',
  'Draft a summary I can share with my team.',
]

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div
        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`} style={{ maxWidth: '78%' }}>
        <div
          className={`text-sm leading-relaxed rounded-2xl px-4 py-3 ${
            isUser ? 'rounded-tr-sm text-white' : 'rounded-tl-sm text-slate-100'
          }`}
          style={
            isUser
              ? { background: 'linear-gradient(135deg, #0D9488, #0F766E)' }
              : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }
          }
        >
          {content}
        </div>
        {!isUser && content && (
          <div
            className="flex items-center gap-1.5 text-xs px-1"
            style={{ color: 'rgba(100,116,139,0.7)' }}
          >
            <span>Clinic performance data</span>
            <span>{'\u00b7'}</span>
            <span>Claude Sonnet</span>
            <span>{'\u00b7'}</span>
            <span>Validate with clinical team</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AiView({ chatbotContext, currentMonthData, clinicName, activeMonth }) {
  const { closeAi } = useAi()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('anthropic_api_key') ?? '')
  const [keyInput, setKeyInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const hasKey = !!apiKey

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [hasKey])

  function saveApiKey() {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem('anthropic_api_key', k)
    setApiKey(k)
    setKeyInput('')
  }

  function handleKeyFieldKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); saveApiKey() }
  }

  async function handleSend(overrideText) {
    const text = (overrideText ?? input).trim()
    if (!text || streaming || !hasKey) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setStreaming(true)

    const assistantIdx = nextMessages.length
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const systemPrompt = buildSystemPrompt(chatbotContext, currentMonthData)
      const apiMessages = nextMessages.map(m => ({ role: m.role, content: m.content }))
      let accumulated = ''
      for await (const chunk of streamChat(apiMessages, systemPrompt)) {
        accumulated += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[assistantIdx] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch (err) {
      // If API key was rejected, clear it so user can re-enter
      if (err.message.includes('401') || err.message.includes('invalid') || err.message.toLowerCase().includes('api key')) {
        localStorage.removeItem('anthropic_api_key')
        setApiKey('')
      }
      setError(err.message)
      setMessages(prev => {
        const updated = [...prev]
        updated[assistantIdx] = { role: 'assistant', content: '' }
        return updated.filter((m, i) => !(i === assistantIdx && m.content === ''))
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleChatKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const showTyping = streaming && messages.length > 0 && messages[messages.length - 1]?.content === ''

  const contextLabel = clinicName
    ? `${clinicName}${activeMonth ? ` \u00b7 ${activeMonth}` : ''}`
    : 'Network Overview'

  return (
    <div className="flex-1 flex flex-col min-h-0" style={{ animation: 'aiViewFadeIn 0.2s ease-out' }}>

      {/* Hero header */}
      <div
        className="flex-shrink-0 bg-slate-900 px-6 py-6"
        style={{
          boxShadow: '0 4px 24px rgba(13,148,136,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <button
            onClick={closeAi}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-400 transition-colors mb-4"
          >
            {'\u2190'} Back
          </button>
          <div className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-2">
            AI Intelligence
          </div>
          <h1 className="text-2xl font-bold text-white mb-1.5">What do you want to know?</h1>
          <p className="text-sm text-slate-500">
            {contextLabel}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: '#0B1220' }}
      >
        <div className="max-w-4xl mx-auto px-6 py-6">

          {/* Empty state */}
          {messages.length === 0 && hasKey && (
            <div className="text-center py-12">
              <div
                className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4"
                style={{ background: 'rgba(13,148,136,0.12)', border: '1px solid rgba(13,148,136,0.2)' }}
              >
                <span style={{ fontSize: '20px' }}>{'\u2726'}</span>
              </div>
              <p className="text-slate-500 text-sm">Select a question below or type your own.</p>
            </div>
          )}

          {/* No key state */}
          {!hasKey && (
            <div className="text-center py-12">
              <div
                className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="text-slate-400" style={{ fontSize: '18px' }}>{'\uD83D\uDD11'}</span>
              </div>
              <p className="text-slate-400 text-sm font-medium mb-1">API key required</p>
              <p className="text-slate-600 text-xs">Enter your Anthropic API key in the field below to begin.</p>
            </div>
          )}

          {/* Message list */}
          {messages.map((m, i) => {
            if (m.role === 'assistant' && m.content === '' && streaming) return null
            return <Message key={i} role={m.role} content={m.content} />
          })}

          {showTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* FAQ chips — shown before first message when key is present */}
      {messages.length === 0 && hasKey && (
        <div
          className="flex-shrink-0"
          style={{ background: '#0B1220', borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="max-w-4xl mx-auto px-6 py-4">
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wider mb-3">Suggested questions</p>
            <div className="flex flex-wrap gap-2">
              {FAQ_CHIPS.map(q => (
                <FaqChip key={q} label={q} onClick={() => handleSend(q)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{
          background: 'rgba(15,23,42,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            {!hasKey ? (
              <>
                <input
                  ref={inputRef}
                  type="password"
                  value={keyInput}
                  onChange={e => setKeyInput(e.target.value)}
                  onKeyDown={handleKeyFieldKeyDown}
                  placeholder="Enter your Anthropic API key to begin\u2026"
                  className="flex-1 text-slate-100 text-sm rounded-xl px-4 py-3 outline-none placeholder-slate-600 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(13,148,136,0.5)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.10)')}
                />
                <button
                  onClick={saveApiKey}
                  disabled={!keyInput.trim()}
                  className="text-sm px-5 py-3 rounded-xl font-medium transition-all flex-shrink-0"
                  style={{
                    background: keyInput.trim()
                      ? 'linear-gradient(135deg, #0D9488, #0F766E)'
                      : 'rgba(255,255,255,0.08)',
                    color: keyInput.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  Save {'\u2192'}
                </button>
              </>
            ) : (
              <>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  rows={1}
                  placeholder="Ask about performance data, trends, or benchmarks\u2026"
                  disabled={streaming}
                  className="flex-1 text-slate-100 text-sm rounded-xl px-4 py-3 resize-none outline-none placeholder-slate-600 transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                  onFocus={e => (e.currentTarget.style.border = '1px solid rgba(13,148,136,0.5)')}
                  onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.10)')}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || streaming}
                  className="text-sm px-5 py-3 rounded-xl font-medium transition-all flex-shrink-0"
                  style={{
                    background: !input.trim() || streaming
                      ? 'rgba(255,255,255,0.08)'
                      : 'linear-gradient(135deg, #0D9488, #0F766E)',
                    color: !input.trim() || streaming ? 'rgba(255,255,255,0.3)' : 'white',
                  }}
                >
                  {streaming ? '\u22ef' : '\u2191'}
                </button>
              </>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function FaqChip({ label, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-xs rounded-full px-3 py-2 transition-all text-left"
      style={{
        background: hovered ? 'rgba(13,148,136,0.12)' : 'rgba(255,255,255,0.04)',
        border: hovered ? '1px solid rgba(13,148,136,0.3)' : '1px solid rgba(255,255,255,0.09)',
        color: hovered ? '#2DD4BF' : '#94A3B8',
      }}
    >
      {label}
    </button>
  )
}
