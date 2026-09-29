import { useRef, useState, useEffect } from 'react';
import { askData } from '../../lib/aiApi.js';

const SUGGESTIONS = [
  'Berapa persentase kehadiran saya?',
  'Berapa jumlah siswa dan kelas?',
  'Kelas dan mata pelajaran apa yang saya ajar?',
];

export default function AskYourData() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Halo! Tanyakan apa saja tentang data absensi yang boleh Anda lihat. Saya hanya menjawab berdasarkan data yang tersedia.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setLoading(true);
    try {
      const res = await askData(question);
      setMessages((m) => [...m, { role: 'ai', text: res.answer }]);
    } catch (err) {
      const text =
        err?.response?.data?.error || 'Gagal mendapatkan jawaban dari AI.';
      setMessages((m) => [...m, { role: 'ai', text, error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[70vh] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Riwayat chat */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : m.error
                  ? 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'
                  : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.3s]" />
              </span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Saran pertanyaan */}
      <div className="flex flex-wrap gap-2 px-4 pb-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            disabled={loading}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pertanyaan…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          Kirim
        </button>
      </form>
    </div>
  );
}
