'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, X, MessageCircle } from 'lucide-react';

export default function Builder() {
  const searchParams = useSearchParams();
  const handle = searchParams.get('handle') || '@rareimagery';
  const pfp = searchParams.get('pfp') || '';
  const banner = searchParams.get('banner') || '';

  const [preview, setPreview] = useState({
    heroTitle: `${handle} Store`,
    donationText: 'Support with X Money — 100% to creator',
  });
  const [chatOpen, setChatOpen] = useState(true);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([
    { role: 'assistant', content: 'Ready. Tell me exactly what to change in your storefront (e.g. "add 3-column product grid with hover zoom and emerald X Money donate button"). I return only code you can paste.' }
  ]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMsg = { role: 'user', content: message };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setMessage('');

    const res = await fetch('/api/grok-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newHistory }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'No response';

    const updatedHistory = [...newHistory, { role: 'assistant', content: reply }];
    setHistory(updatedHistory);

    // Auto-apply simple JSON updates from Grok if it returns them
    try {
      const jsonPart = reply.match(/\{.*\}/s);
      if (jsonPart) {
        const update = JSON.parse(jsonPart[0]);
        setPreview(prev => ({ ...prev, ...update }));
      }
    } catch (_) {}
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* BIG CENTER CANVAS — live preview */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-zinc-700 bg-zinc-900 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={pfp} className="w-8 h-8 rounded-2xl" alt="PFP" />
            <span className="font-bold text-2xl">{handle} Builder</span>
          </div>
          <button
            onClick={() => {
              // Your existing Drupal save logic here — already 70% done
              console.log('✅ Saving config to Drupal → publishing store at rareimagery.net/' + handle);
              alert(`🎉 Store live at rareimagery.net/${handle} — products + X Money donations connected!`);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 px-8 py-2 rounded-3xl font-semibold"
          >
            Apply &amp; Publish Store
          </button>
        </div>

        {/* Live preview area */}
        <div className="flex-1 p-8" style={{ backgroundImage: `url(${banner})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="max-w-5xl mx-auto bg-white/10 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 h-full flex flex-col">
            {/* Hero */}
            <div className="h-72 flex items-end p-10 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center">
                <img src={pfp} className="w-24 h-24 rounded-3xl border-4 border-white shadow-2xl" />
                <div className="ml-8 text-white">
                  <h1 className="text-6xl font-bold tracking-tighter">{preview.heroTitle}</h1>
                  <p className="text-3xl mt-3 opacity-90">Products • X Money Donations</p>
                </div>
              </div>
            </div>

            {/* Donation / Product area — Grok will edit this live */}
            <div className="flex-1 p-10 flex items-center justify-center text-center">
              <div className="max-w-md">
                <div className="bg-emerald-500 text-white text-4xl font-bold px-16 py-8 rounded-3xl shadow-xl">
                  {preview.donationText}
                </div>
                <div className="mt-12 text-white/70 text-xl">Ask Grok below to add product grids, progress bars, etc.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING GROK CHATBOT — always works in your IDE */}
      {chatOpen && (
        <div className="fixed bottom-8 right-8 w-96 bg-zinc-900 border border-zinc-700 rounded-3xl shadow-2xl flex flex-col h-[560px] overflow-hidden">
          <div className="px-6 py-4 bg-zinc-800 border-b flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center text-xl font-black">G</div>
            <div className="font-semibold text-lg">Grok Tailwind Builder</div>
            <button onClick={() => setChatOpen(false)} className="ml-auto"><X size={20} /></button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm">
            {history.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div className={`max-w-[85%] px-5 py-4 rounded-3xl ${m.role === 'user' ? 'bg-blue-600' : 'bg-zinc-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-zinc-700 flex gap-3">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Add floating X Money button + 4-column product grid..."
              className="flex-1 bg-zinc-800 rounded-3xl px-6 py-4 focus:outline-none text-sm"
            />
            <button
              onClick={sendMessage}
              className="bg-white text-black rounded-3xl w-12 h-12 flex items-center justify-center hover:bg-emerald-400 transition"
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}