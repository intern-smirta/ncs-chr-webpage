import { useState, useRef, useEffect } from 'react'
import { streamChat, buildSystemPrompt } from '../lib/anthropic'

function Message({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-600 text-white rounded-tr-sm'
            : 'bg-slate-800 text-slate-100 rounded-tl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

export default function ChatBot({ chatbotContext, currentMonthData }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
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
      setError(err.message)
      setMessages(prev => {
        const updated = [...prev]
        updated[assistantIdx] = { role: 'assistant', content: '[Error: ' + err.message + ']' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-600 hover:bg-teal-500 text-white shadow-lg flex items-center justify-center text-xl transition-all z-40"
        aria-label="Open AI assistant"
      >
        {open ? '\u00d7' : '\u{1F4AC}'}
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed bottom-24 right-6 w-96 max-h-[70vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl z-40 border border-slate-700"
          style={{ background: '#0F172A', boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
            <span className="text-teal-400 text-sm font-semibold">OncoSmart AI</span>
            <span className="text-xs text-slate-500 ml-auto">Ask about clinic KPIs</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-slate-500 text-xs text-center py-6">
                Ask me about scheduler compliance, delays, chair utilization, trends, or comparisons.
              </div>
            )}
            {messages.map((m, i) => <Message key={i} role={m.role} content={m.content} />)}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-700 flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask a question\u2026"
              className="flex-1 bg-slate-800 text-slate-100 text-sm rounded-xl px-3 py-2 resize-none outline-none placeholder-slate-500 border border-slate-700 focus:border-teal-500 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              className="bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm px-4 rounded-xl transition-colors font-medium"
            >
              {streaming ? '\u22ef' : '\u2191'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
