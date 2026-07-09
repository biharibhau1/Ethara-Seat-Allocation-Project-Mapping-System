import { useState, useRef, useEffect } from "react";
import { api } from "../api";

const SUGGESTIONS = [
  "Where is employee Cheryl Avila seated?",
  "Show all available seats on Floor 3",
  "How many seats are occupied for Project Indigo?",
  "Which project is Cheryl Avila assigned to?",
];

export default function Assistant() {
  const [email, setEmail] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask me where someone sits, which project they're on, or which seats are free. Try one of the examples below, or type your own.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (query) => {
    if (!query.trim()) return;
    setMessages((m) => [...m, { role: "user", text: query }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.askAssistant(query, email || undefined);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `Something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl flex flex-col h-screen">
      <header className="mb-4">
        <h1 className="font-display font-semibold text-2xl text-ink">Assistant</h1>
        <p className="text-muted text-sm mt-1">
          Rule-based natural-language assistant for seat and project questions.
        </p>
      </header>

      <div className="mb-4">
        <label className="text-xs text-muted uppercase tracking-wide">
          Your email <span className="normal-case">(optional, for "my seat" / "near me" questions)</span>
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@ethara.ai"
          className="mt-1 w-full border border-line rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
      </div>

      <div className="flex-1 bg-surface border border-line rounded-lg p-4 overflow-y-auto flex flex-col gap-3 mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
              m.role === "user"
                ? "bg-brand text-white self-end"
                : "bg-canvas text-ink self-start"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && <div className="text-xs text-muted self-start">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs px-2.5 py-1 rounded-full border border-line text-muted hover:bg-canvas"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about a seat, project, or availability…"
          className="flex-1 border border-line rounded-md px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-brand text-white text-sm font-medium hover:opacity-90"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
