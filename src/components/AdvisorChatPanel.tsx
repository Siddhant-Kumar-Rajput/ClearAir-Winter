import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { AdvisorMessage } from '../types/airQuality.ts';

interface AdvisorChatPanelProps {
  city: string;
  messages: AdvisorMessage[];
  loading: boolean;
  error: string | null;
  onSendQuestion: (question: string) => Promise<void>;
}

const STARTER_PROMPTS = [
  'Is it safe for children to walk to school this morning?',
  'How do I build an affordable DIY indoor air filter?',
  'What indoor humidity level reduces winter respiratory irritation?',
];

export function AdvisorChatPanel({
  city,
  messages,
  loading,
  error,
  onSendQuestion,
}: AdvisorChatPanelProps) {
  const [input, setInput] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed.length < 2 || loading) return;
    setInput('');
    await onSendQuestion(trimmed);
  };

  return (
    <section
      aria-labelledby="advisor-heading"
      className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="advisor-heading"
            className="text-lg font-semibold text-[#0F172A] flex items-center gap-2"
          >
            <MessageSquare aria-hidden="true" className="w-5 h-5 text-[#0369A1]" />
            <span>Ask the Smog Advisor</span>
          </h2>
          <p className="text-sm text-[#475569] mt-0.5">
            Context-aware guidance grounded in {city}’s live air quality and your household setup
          </p>
        </div>
      </div>

      {/* Starter Prompt Buttons */}
      <div className="flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => onSendQuestion(prompt)}
            className="px-3 py-2 min-h-[38px] text-xs font-medium text-[#334155] bg-[#F8FAFC] hover:bg-[#EFF6FF] hover:text-[#0369A1] border border-[#E2E8F0] rounded-lg transition-colors text-left cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-[#0369A1]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Transcript */}
      <div
        aria-live="polite"
        className="max-h-80 overflow-y-auto space-y-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-[#64748B]">
            Ask any question about school commutes, indoor humidity, cooking fumes, or low-cost filtration in {city}.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3.5 rounded-lg text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#0F172A] ml-6'
                  : 'bg-white border border-[#E2E8F0] text-[#1E293B] mr-6'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs text-[#64748B] mb-1">
                <span className="font-semibold text-[#334155]">
                  {msg.role === 'user' ? 'Your Household' : 'ClearAir Advisor'}
                </span>
                <span className="font-mono tabular-nums">{msg.timestamp}</span>
              </div>
              <p className="whitespace-pre-line">{msg.text}</p>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#475569] py-1">
            <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin text-[#0369A1]" />
            <span>Evaluating local telemetry and household impact...</span>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-[#B91C1C]">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
        <label htmlFor="advisor-question-input" className="sr-only">
          Ask a winter smog question
        </label>
        <input
          id="advisor-question-input"
          type="text"
          maxLength={600}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about commute safety, indoor filtration, or emission swaps..."
          className="flex-1 min-h-[44px] px-3.5 text-sm text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#0369A1]"
        />
        <button
          type="submit"
          disabled={loading || input.trim().length < 2}
          className="min-h-[44px] px-4 py-2 text-sm font-medium text-white bg-[#0369A1] hover:bg-[#075985] rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0369A1]"
        >
          <Send aria-hidden="true" className="w-4 h-4" />
          <span>Ask</span>
        </button>
      </form>
    </section>
  );
}
