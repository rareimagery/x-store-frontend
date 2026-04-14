"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

/* ------------------------------------------------------------------ */
/*  Inline style block                                                 */
/* ------------------------------------------------------------------ */
const GUIDE_CSS = `
  .g *, .g *::before, .g *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .g {
    --purple: #7B2D8E; --purple-mid: #9B4AAD; --purple-light: #f5edf8; --purple-xlight: #faf5fc;
    --gold: #D4AF37; --gold-light: #fdf8e6;
    --green: #2e7d32; --green-light: #e8f5e9;
    --blue: #1565c0; --blue-light: #e3f2fd;
    --amber: #e65100; --amber-light: #fff3e0;
    --bg: #faf9f7; --surface: #ffffff;
    --border: rgba(0,0,0,0.08); --border-mid: rgba(0,0,0,0.13);
    --text: #1c1a18; --text-mid: #5a5754; --text-soft: #8a8784;
    --sidebar-w: 270px;
    --font: 'DM Sans', sans-serif; --font-serif: 'DM Serif Display', serif;
    font-family: var(--font); font-size: 15px; line-height: 1.8; color: var(--text);
    background: var(--bg); display: flex; min-height: 100vh;
  }
  .g-sidebar {
    position: fixed; top: 0; left: 0; width: var(--sidebar-w); height: 100vh;
    background: var(--surface); border-right: 1px solid var(--border);
    overflow-y: auto; z-index: 100; display: flex; flex-direction: column;
  }
  .g-sidebar-top { padding: 1.4rem 1.1rem 1.1rem; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 1; }
  .g-brand { display: flex; align-items: center; gap: 9px; margin-bottom: 0.4rem; }
  .g-brand-mark { width: 30px; height: 30px; border-radius: 8px; background: var(--purple); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .g-brand-mark span { color: var(--gold); font-size: 11px; font-weight: 700; }
  .g-brand-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .g-brand-tag { font-size: 11px; color: var(--purple); font-style: italic; letter-spacing: 0.02em; margin-left: 39px; }
  .g-nav-label { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-soft); padding: 1rem 1.1rem 0.3rem; }
  .g-nav-link { display: flex; align-items: center; gap: 9px; padding: 6px 1.1rem; font-size: 13.5px; color: var(--text-mid); text-decoration: none; transition: background 0.1s, color 0.1s; line-height: 1.4; cursor: pointer; border: none; background: none; width: 100%; text-align: left; }
  .g-nav-link:hover { background: var(--purple-xlight); color: var(--text); }
  .g-nav-link.active { background: var(--purple-light); color: var(--purple); font-weight: 500; }
  .g-nav-icon { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
  .g-sidebar-footer { margin-top: auto; padding: 1rem 1.1rem; border-top: 1px solid var(--border); font-size: 11.5px; color: var(--text-soft); line-height: 1.5; }
  .g-sidebar-footer strong { color: var(--purple); }

  .g-main { margin-left: var(--sidebar-w); flex: 1; max-width: 780px; padding: 3.5rem 2.5rem 6rem; }

  .g-hero { margin-bottom: 2.5rem; padding: 2.5rem; background: var(--purple); border-radius: 16px; color: white; position: relative; overflow: hidden; }
  .g-hero::before { content: ''; position: absolute; top: -40px; right: -40px; width: 200px; height: 200px; border-radius: 50%; background: rgba(212,175,55,0.15); }
  .g-hero-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); margin-bottom: 0.6rem; }
  .g-hero-title { font-family: var(--font-serif); font-size: 2.2rem; line-height: 1.15; color: white; margin-bottom: 0.75rem; position: relative; z-index: 1; }
  .g-hero-desc { font-size: 14.5px; color: rgba(255,255,255,0.8); max-width: 520px; line-height: 1.7; position: relative; z-index: 1; }
  .g-hero-chips { display: flex; gap: 8px; margin-top: 1.25rem; flex-wrap: wrap; position: relative; z-index: 1; }
  .g-hero-chip { font-size: 12px; padding: 4px 12px; border-radius: 20px; background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); border: 1px solid rgba(255,255,255,0.25); }

  .g-section { margin-bottom: 0.75rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); overflow: hidden; }
  .g-section summary { display: flex; align-items: center; gap: 12px; padding: 1rem 1.25rem; cursor: pointer; user-select: none; list-style: none; transition: background 0.12s; }
  .g-section summary::-webkit-details-marker { display: none; }
  .g-section summary:hover { background: var(--purple-xlight); }
  .g-section[open] > summary { background: var(--purple-xlight); border-bottom: 1px solid var(--border); }
  .g-sec-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--purple-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 17px; transition: background 0.12s; }
  .g-section[open] .g-sec-icon { background: var(--purple); }
  .g-sec-meta { flex: 1; }
  .g-sec-label { font-size: 15px; font-weight: 600; color: var(--text); line-height: 1.3; }
  .g-sec-sub { font-size: 12px; color: var(--text-soft); margin-top: 1px; }
  .g-arrow { color: var(--text-soft); font-size: 11px; transition: transform 0.2s; flex-shrink: 0; }
  .g-section[open] .g-arrow { transform: rotate(90deg); }
  .g-body { padding: 1.5rem 1.6rem 1.75rem; }
  .g-body h3 { font-family: var(--font-serif); font-size: 1.1rem; font-weight: 400; color: var(--text); margin: 1.5rem 0 0.6rem; }
  .g-body h3:first-child { margin-top: 0; }
  .g-body p { font-size: 14.5px; color: var(--text-mid); margin-bottom: 0.8rem; line-height: 1.75; }
  .g-body p:last-child { margin-bottom: 0; }
  .g-body strong { color: var(--text); font-weight: 600; }

  .g-steps { margin: 0.75rem 0 1rem; }
  .g-step { display: flex; gap: 14px; margin-bottom: 1rem; align-items: flex-start; }
  .g-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--purple); color: white; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
  .g-step-title { font-size: 14.5px; font-weight: 600; color: var(--text); line-height: 1.4; margin-bottom: 3px; }
  .g-step-desc { font-size: 13.5px; color: var(--text-mid); line-height: 1.65; }

  .g-callout { display: flex; gap: 11px; padding: 1rem 1.1rem; border-radius: 10px; margin: 1rem 0; font-size: 13.5px; line-height: 1.65; align-items: flex-start; }
  .g-callout-tip { background: var(--purple-light); border-left: 3px solid var(--purple); color: #4a1a58; }
  .g-callout-info { background: var(--blue-light); border-left: 3px solid var(--blue); color: #0d47a1; }
  .g-callout-good { background: var(--green-light); border-left: 3px solid var(--green); color: #1b5e20; }
  .g-callout-note { background: var(--gold-light); border-left: 3px solid var(--gold); color: #5c4a00; }
  .g-callout-icon { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
  .g-callout strong { font-weight: 600; display: block; margin-bottom: 3px; font-size: 13px; }

  .g-features { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin: 1rem 0; }
  .g-feat { border: 1px solid var(--border); border-radius: 10px; padding: 1rem; background: var(--bg); }
  .g-feat-icon { font-size: 22px; margin-bottom: 6px; }
  .g-feat-title { font-size: 13.5px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
  .g-feat-desc { font-size: 12.5px; color: var(--text-mid); line-height: 1.55; }

  .g-themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 10px; margin: 1rem 0; }
  .g-theme { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; background: var(--bg); }
  .g-theme-swatch { height: 56px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; letter-spacing: 0.02em; }
  .g-theme-info { padding: 0.65rem 0.8rem; }
  .g-theme-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .g-theme-vibe { font-size: 11.5px; color: var(--text-soft); margin-top: 2px; }

  .g-pill { display: inline-block; font-size: 11.5px; padding: 2px 9px; border-radius: 20px; font-weight: 500; margin-left: 4px; }
  .g-pill-purple { background: var(--purple-light); color: var(--purple); }
  .g-pill-gold { background: var(--gold-light); color: #7a5c00; }

  .g-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; font-size: 13.5px; }
  .g-table th { text-align: left; font-weight: 600; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-soft); padding: 7px 10px; background: var(--bg); border-bottom: 1px solid var(--border); border-top: 1px solid var(--border); }
  .g-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); color: var(--text-mid); vertical-align: top; line-height: 1.5; }
  .g-table tr:last-child td { border-bottom: none; }
  .g-table tr:hover td { background: var(--purple-xlight); }
  .g-fee { font-weight: 600; color: var(--text); font-size: 14px; }

  .g-check { list-style: none; margin: 0.5rem 0 1rem; padding: 0; }
  .g-check li { display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; color: var(--text-mid); padding: 4px 0; }
  .g-chk { color: var(--green); font-size: 13px; flex-shrink: 0; margin-top: 3px; }

  .g-products { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 1rem 0; }
  .g-pt { border: 1px solid var(--border); border-radius: 10px; padding: 1rem; text-align: center; }
  .g-pt-icon { font-size: 26px; margin-bottom: 6px; }
  .g-pt-name { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .g-pt-desc { font-size: 12px; color: var(--text-mid); line-height: 1.5; }

  .g-screenshot { border: 2px dashed var(--border-mid); border-radius: 12px; background: var(--bg); padding: 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; margin: 1rem 0; min-height: 180px; aspect-ratio: 16/9; max-height: 320px; }
  .g-screenshot-icon { font-size: 28px; opacity: 0.4; }
  .g-screenshot-label { font-size: 12px; color: var(--text-soft); text-align: center; max-width: 280px; }

  .g-faq { border-bottom: 1px solid var(--border); padding: 1rem 0; }
  .g-faq:first-child { padding-top: 0; }
  .g-faq:last-child { border-bottom: none; padding-bottom: 0; }
  .g-faq-q { font-size: 14.5px; font-weight: 600; color: var(--text); margin-bottom: 0.4rem; }
  .g-faq-a { font-size: 13.5px; color: var(--text-mid); line-height: 1.65; }

  .g-footer-cta { margin-top: 3rem; padding: 1.5rem; background: var(--purple); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }

  .g-editable { outline: 2px dashed transparent; transition: outline 0.15s; border-radius: 4px; padding: 2px 4px; margin: -2px -4px; }
  .g-editing .g-editable { outline: 2px dashed var(--purple-mid); cursor: text; }
  .g-editing .g-editable:focus { outline: 2px solid var(--purple); background: rgba(123,45,142,0.05); }
  .g-edit-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 200; display: flex; align-items: center; gap: 10px; padding: 10px 20px; border-radius: 50px; background: var(--purple); color: white; box-shadow: 0 8px 32px rgba(0,0,0,0.3); font-size: 13px; font-weight: 500; }
  .g-edit-btn { padding: 6px 16px; border-radius: 20px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
  .g-edit-save { background: var(--gold); color: #1c1a18; }
  .g-edit-save:hover { background: #e6c345; }
  .g-edit-cancel { background: rgba(255,255,255,0.2); color: white; }
  .g-edit-cancel:hover { background: rgba(255,255,255,0.3); }

  @media (max-width: 768px) {
    .g-sidebar { display: none; }
    .g-main { margin-left: 0; padding: 1.5rem 1rem; }
    .g-products { grid-template-columns: 1fr; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function EditableText({
  id, defaultText, overrides, editing, tag: Tag = "span", className,
}: {
  id: string; defaultText: string; overrides: Record<string, string>; editing: boolean; tag?: "span" | "p" | "div" | "h3"; className?: string;
}) {
  const text = overrides[id] ?? defaultText;
  if (!editing) return <Tag className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  return (
    <Tag className={`g-editable ${className || ""}`} contentEditable suppressContentEditableWarning data-field-id={id} dangerouslySetInnerHTML={{ __html: text }} />
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="g-step">
      <div className="g-step-num">{n}</div>
      <div><div className="g-step-title">{title}</div><div className="g-step-desc">{desc}</div></div>
    </div>
  );
}

function Callout({ type, icon, children }: { type: string; icon: string; children: React.ReactNode }) {
  return (<div className={`g-callout g-callout-${type}`}><span className="g-callout-icon">{icon}</span><div>{children}</div></div>);
}

function Check({ children }: { children: React.ReactNode }) {
  return (<li><span className="g-chk">&#10003;</span>{children}</li>);
}

function Screenshot({ label }: { label: string }) {
  return (
    <div className="g-screenshot">
      <span className="g-screenshot-icon">{"\uD83D\uDCF7"}</span>
      <span className="g-screenshot-label">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main guide component                                               */
/* ------------------------------------------------------------------ */

export default function GuideClient({ embedded = false }: { embedded?: boolean } = {}) {
  const { data: session } = useSession();
  const isAdmin = (session as any)?.role === "admin";
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [editing, setEditing] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/guide").then((r) => r.json()).then((d) => { if (d.content && typeof d.content === "object") setOverrides(d.content); }).catch(() => {}).finally(() => setLoaded(true));
    fetch("/api/public-howto").then((r) => r.json()).then((d) => {
      if (d.sections && Array.isArray(d.sections) && d.sections.length > 0) {
        const agentOverrides: Record<string, string> = {};
        for (const s of d.sections) { if (s.id && s.content) agentOverrides[s.id] = s.content; }
        setOverrides((prev) => ({ ...agentOverrides, ...prev }));
      }
    }).catch(() => {});
  }, []);

  const saveEdits = useCallback(async () => {
    if (!mainRef.current) return;
    setSaving(true);
    const fields = mainRef.current.querySelectorAll<HTMLElement>("[data-field-id]");
    const updated = { ...overrides };
    fields.forEach((el) => { const id = el.getAttribute("data-field-id"); const text = el.textContent?.trim() || ""; if (id && text) updated[id] = text; });
    try { const res = await fetch("/api/guide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: updated }) }); if (res.ok) { setOverrides(updated); setEditing(false); } } catch {} finally { setSaving(false); }
  }, [overrides]);

  useEffect(() => {
    const links = sidebarRef.current?.querySelectorAll<HTMLElement>(".g-nav-link");
    const sections = document.querySelectorAll<HTMLElement>(".g-section");
    if (!links || !sections.length) return;
    const obs = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) { const id = e.target.id; links.forEach((l) => l.classList.toggle("active", l.getAttribute("data-target") === id)); } }); }, { rootMargin: "-25% 0px -65% 0px" });
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  function scrollTo(id: string) { const el = document.getElementById(id); if (el) { el.setAttribute("open", ""); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }

  const navItems = [
    { group: "Getting started", items: [
      { id: "s-what", icon: "\u2726", label: "What is RareImagery?" },
      { id: "s-signup", icon: "\uD83D\uDD11", label: "Signing in with X" },
    ]},
    { group: "Building your store", items: [
      { id: "s-create", icon: "\uD83C\uDFEA", label: "Creating your store" },
      { id: "s-pagebuilding", icon: "\uD83D\uDDBC", label: "Page Building" },
      { id: "s-grok", icon: "\uD83E\uDD16", label: "Creating products" },
      { id: "s-products", icon: "\uD83D\uDCE6", label: "Managing products" },
    ]},
    { group: "Social & discovery", items: [
      { id: "s-favorites", icon: "\u2764\uFE0F", label: "My Favorites" },
      { id: "s-social", icon: "\uD83D\uDCF1", label: "Social Feeds" },
    ]},
    { group: "Store management", items: [
      { id: "s-orders", icon: "\uD83D\uDCCB", label: "Orders & Shipping" },
      { id: "s-payments", icon: "\uD83D\uDCB3", label: "Payments & Fees" },
    ]},
    { group: "", items: [
      { id: "s-faq", icon: "\u2753", label: "FAQ" },
    ]},
  ];

  return (
    <>
    <style dangerouslySetInnerHTML={{ __html: GUIDE_CSS }} />
    <div className={`g ${editing ? "g-editing" : ""}`}>
      {/* Sidebar */}
      {!embedded && (
        <nav className="g-sidebar" ref={sidebarRef}>
          <div className="g-sidebar-top">
            <div className="g-brand">
              <div className="g-brand-mark"><span>RI</span></div>
              <span className="g-brand-name">RareImagery</span>
            </div>
            <div className="g-brand-tag">Creator Guide</div>
          </div>
          {navItems.map((g) => (
            <div key={g.group || "misc"}>
              {g.group && <div className="g-nav-label">{g.group}</div>}
              {g.items.map((item) => (
                <button key={item.id} className="g-nav-link" data-target={item.id} onClick={() => scrollTo(item.id)}>
                  <span className="g-nav-icon">{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          ))}
          <div className="g-sidebar-footer">
            <strong>RareImagery</strong> &mdash; Be Rare.<br/>
            Questions? DM <a href="https://x.com/RareImagery" target="_blank" rel="noopener noreferrer" style={{ color: "var(--purple)" }}>@RareImagery</a>
          </div>
        </nav>
      )}

      {/* Main content */}
      <main className="g-main" ref={mainRef}>
        {/* Admin edit button */}
        {isAdmin && !editing && loaded && (
          <button onClick={() => setEditing(true)} style={{ position: "fixed", top: 16, right: 16, zIndex: 200, padding: "8px 16px", borderRadius: 20, background: "var(--purple)", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
            Edit Guide
          </button>
        )}

        {/* Hero */}
        <div className="g-hero">
          <div className="g-hero-eyebrow">Creator Guide</div>
          <EditableText id="hero-title" defaultText="Your store, your rules. Let&rsquo;s get you set up." overrides={overrides} editing={editing} tag="div" className="g-hero-title" />
          <EditableText id="hero-desc" defaultText="RareImagery is a creator commerce platform where X creators build subdomain storefronts. 3-day free trial, AI-powered setup, Grok-designed products, and Stripe payouts &mdash; all from your X profile." overrides={overrides} editing={editing} tag="div" className="g-hero-desc" />
          <div className="g-hero-chips">
            <span className="g-hero-chip">No coding needed</span>
            <span className="g-hero-chip">3-day free trial</span>
            <span className="g-hero-chip">Powered by your X profile</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* GETTING STARTED                                               */}
        {/* ============================================================ */}

        {/* What is RareImagery? */}
        <details className="g-section" id="s-what">
          <summary>
            <div className="g-sec-icon">{"\u2726"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">What is RareImagery?</div><div className="g-sec-sub">Platform overview and key features</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>RareImagery is a <strong>creator commerce platform</strong> where X (Twitter) creators build subdomain storefronts at <strong>yourname.rareimagery.net</strong>. Sign up with X, get a 3-day free trial, and AI does the heavy lifting &mdash; generating products, designing your storefront, and handling fulfillment.</p>
            <Screenshot label="Screenshot: RareImagery homepage / landing page" />
            <div className="g-features">
              {[
                { icon: "\uD83C\uDFEA", title: "Your own storefront", desc: "A subdomain store powered by your X profile, bio, and content." },
                { icon: "\uD83E\uDD16", title: "AI product creation", desc: "Grok Imagine generates print-ready designs for merch and digital drops." },
                { icon: "\uD83C\uDFA8", title: "AI backgrounds", desc: "Generate custom backgrounds with Grok Imagine. Match your X vibe automatically." },
                { icon: "\uD83D\uDCB8", title: "Direct payouts", desc: "Stripe Connect sends money straight to your account when someone buys." },
                { icon: "\uD83D\uDC55", title: "Print on demand", desc: "Printful prints, packs, and ships products. No inventory needed." },
                { icon: "\uD83D\uDD10", title: "Free trial", desc: "3-day free trial, no credit card required. $4/month after." },
              ].map((f) => (
                <div className="g-feat" key={f.title}><div className="g-feat-icon">{f.icon}</div><div className="g-feat-title">{f.title}</div><div className="g-feat-desc">{f.desc}</div></div>
              ))}
            </div>
          </div>
        </details>

        {/* Signing in with X */}
        <details className="g-section" id="s-signup">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDD11"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Signing in with X</div><div className="g-sec-sub">OAuth login and what we access</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <Screenshot label="Screenshot: Sign in page with 'Continue with X' button" />
            <div className="g-steps">
              <Step n={1} title="Click 'Continue with X'" desc="On the login page, click the X sign-in button. You'll be redirected to X to authorize." />
              <Step n={2} title="Authorize RareImagery" desc="X shows what we'll access: your public profile, username, bio, and profile picture. We never post on your behalf." />
              <Step n={3} title="You're in" desc="After authorization, you land in the Console dashboard. Your X profile data auto-fills your store." />
            </div>
            <h3>What we access from X</h3>
            <ul className="g-check">
              <Check>Public profile info (username, display name, bio)</Check>
              <Check>Profile picture and banner image</Check>
              <Check>Follower count and verification status</Check>
              <Check>Recent posts (for product suggestions and brand analysis)</Check>
            </ul>
            <Callout type="good" icon={"\u2705"}>We <strong>never</strong> post, like, follow, or DM on your behalf. Read-only access only.</Callout>
          </div>
        </details>


        {/* ============================================================ */}
        {/* BUILDING YOUR STORE                                           */}
        {/* ============================================================ */}

        {/* Creating your store */}
        <details className="g-section" id="s-create">
          <summary>
            <div className="g-sec-icon">{"\uD83C\uDFEA"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Creating your store</div><div className="g-sec-sub">From sign-in to live storefront in minutes</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>Your X profile does most of the work. AI analyzes your bio, posts, and aesthetic to suggest products, themes, and a store layout.</p>
            <div className="g-steps">
              <Step n={1} title="Choose your subdomain (permanent)" desc="Pick a URL for your store (e.g. rare.rareimagery.net). This is permanent and cannot be changed later. First come, first served. Must be 3+ characters." />
              <Step n={2} title="Review your profile" desc="Your X display name, bio, and profile picture auto-fill. Edit anything you'd like to change." />
              <Step n={3} title="Pick a template" desc="Choose from 5 store templates (Modern Cart, AI Video Store, Latest Posts, Retro, Blank). You can change this later." />
              <Step n={4} title="Your store is live" desc="That's it. Your storefront is accessible at your subdomain immediately. Customize it in the Page Builder." />
            </div>
            <Screenshot label="Screenshot: Store creation / onboarding wizard" />
            <Callout type="tip" icon={"\u2728"}>AI uses your X profile to suggest products, colors, and store bio. You can accept or change any suggestion.</Callout>
          </div>
        </details>

        {/* Page Building */}
        <details className="g-section" id="s-pagebuilding">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDDBC"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Page Building</div><div className="g-sec-sub">Drag-and-drop layout, AI backgrounds, color schemes</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>The Page Builder is where you design your storefront layout. Drag content blocks into a two-column wireframe, generate AI backgrounds, and choose your color scheme.</p>
            <Screenshot label="Screenshot: Full Page Builder view — sidebar + canvas + background generator" />

            <h3>Layout editor</h3>
            <p>Your page has two columns: <strong>Main Content</strong> (3/4 width) and <strong>Right Sidebar</strong> (1/4 width). Drag blocks from the Components palette on the left into either column.</p>
            <Screenshot label="Screenshot: Dragging a block into the Main Content column" />

            <h3>Available blocks</h3>
            <p>9 block types you can add to your page:</p>
            <div className="g-features">
              {[
                { icon: "\uD83D\uDED2", title: "Product Grid", desc: "Display your products in a grid" },
                { icon: "\uD83D\uDCCC", title: "Pinned Post", desc: "Feature a pinned X post" },
                { icon: "\uD83D\uDCE3", title: "Social Feed", desc: "Show your latest X posts" },
                { icon: "\uD83E\uDD16", title: "Grok Gallery", desc: "Showcase AI-generated designs" },
                { icon: "\uD83C\uDFAC", title: "TikTok Feed", desc: "Embed your TikTok content" },
                { icon: "\uD83D\uDCF7", title: "Instagram Feed", desc: "Show your Instagram posts" },
                { icon: "\uD83C\uDFAC", title: "YouTube Feed", desc: "Embed your YouTube videos" },
                { icon: "\u2764\uFE0F", title: "My Favorites", desc: "Curated list of favorite creators" },
                { icon: "\uD83D\uDC51", title: "Top Followers", desc: "Show your top followers" },
              ].map((b) => (
                <div className="g-feat" key={b.title}><div className="g-feat-icon">{b.icon}</div><div className="g-feat-title">{b.title}</div><div className="g-feat-desc">{b.desc}</div></div>
              ))}
            </div>

            <h3>Background Generator (Grok Imagine)</h3>
            <p>Generate custom AI backgrounds for your storefront. Type a prompt like &quot;dark cosmic nebula&quot; and Grok generates 4 variants. The selected background fills your wireframe canvas in real time.</p>
            <Screenshot label="Screenshot: Background Generator — prompt field, presets, and 4 generated variants" />
            <div className="g-steps">
              <Step n={1} title="Type a prompt or pick a preset" desc="Describe the background you want, or click one of the 6 quick presets (Dark Gradient, Nebula, Abstract Waves, Geometric, City Night, Nature Dark)." />
              <Step n={2} title="Click Generate" desc="Grok Imagine creates 4 background variants. The first one auto-applies to your wireframe canvas." />
              <Step n={3} title="Refine if needed" desc="Select a variant and click 'Refine selected' to tweak it (e.g. 'make it darker', 'add more purple'). Uses 1 generation." />
              <Step n={4} title="Save & Publish" desc="Click Save & Publish to apply the background to your live storefront." />
            </div>
            <Callout type="tip" icon={"\u2728"}>Enable <strong>&quot;Match my X vibe&quot;</strong> to use your X banner and bio as reference. Grok generates backgrounds that match your personal brand.</Callout>

            <h3>Color schemes</h3>
            <p>10 color schemes control your text, accent, and border colors (separate from the background image):</p>
            <div className="g-themes">
              {[
                { name: "Midnight", bg: "#09090b", fg: "#fff" },
                { name: "Ocean", bg: "#0c1222", fg: "#e0f2fe" },
                { name: "Forest", bg: "#0a0f0a", fg: "#dcfce7" },
                { name: "Sunset", bg: "#1a0a0a", fg: "#fff7ed" },
                { name: "Royal", bg: "#0f0a1a", fg: "#ede9fe" },
                { name: "Cherry", bg: "#1a0510", fg: "#fff1f2" },
                { name: "Arctic", bg: "#0a1520", fg: "#ecfeff" },
                { name: "Ember", bg: "#1a1008", fg: "#fffbeb" },
                { name: "Slate", bg: "#111318", fg: "#f1f5f9" },
                { name: "Neon", bg: "#0a0a14", fg: "#e0fcff" },
              ].map((t) => (
                <div className="g-theme" key={t.name}>
                  <div className="g-theme-swatch" style={{ background: t.bg, color: t.fg }}>{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* Creating products with Grok */}
        <details className="g-section" id="s-grok">
          <summary>
            <div className="g-sec-icon">{"\uD83E\uDD16"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Creating products with Grok</div><div className="g-sec-sub">AI design, refine, mockup, and publish to Printful</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>The <strong>Grok Product Creator</strong> is your AI design studio. Describe what you want, Grok generates it, you refine it, preview it on the actual product, and publish to Printful &mdash; all in one flow.</p>
            <Screenshot label="Screenshot: Grok Product Creator — full page view" />

            <h3>Step 1: Choose your product type</h3>
            <p>6 product types available:</p>
            <div className="g-products">
              {[
                { icon: "\uD83D\uDC55", name: "T-Shirt", desc: "Classic tee" },
                { icon: "\uD83E\uDDE5", name: "Hoodie", desc: "Pullover hoodie" },
                { icon: "\uD83E\uDDE2", name: "Ballcap", desc: "Baseball cap" },
                { icon: "\uD83D\uDC36", name: "Pet Bandana", desc: "For dogs" },
                { icon: "\uD83D\uDC3E", name: "Pet Hoodie", desc: "For small pets" },
                { icon: "\u2B50", name: "Digital Drop", desc: "Digital art NFT" },
              ].map((p) => (
                <div className="g-pt" key={p.name}><div className="g-pt-icon">{p.icon}</div><div className="g-pt-name">{p.name}</div><div className="g-pt-desc">{p.desc}</div></div>
              ))}
            </div>
            <Screenshot label="Screenshot: Product type selector grid" />

            <h3>Step 2: Describe your design</h3>
            <p>Type a prompt describing what you want. For example: &quot;retro sunset with palm trees&quot; or &quot;bold geometric wolf&quot;. You can also:</p>
            <ul className="g-check">
              <Check>Upload a reference image (JPEG/PNG/WebP, max 4MB)</Check>
              <Check>Use your X profile picture as a starting point</Check>
              <Check>Import an X post&apos;s image as reference</Check>
              <Check>Click &quot;Enhance&quot; for AI-optimized prompt rewriting</Check>
            </ul>
            <Screenshot label="Screenshot: Prompt input field with reference image options" />

            <h3>Step 3: Generate and pick your favorite</h3>
            <p>Grok generates up to <strong>4 design variants</strong>. Click any to select it. You get <strong>100 free generations per month</strong>.</p>
            <Screenshot label="Screenshot: 4 generated design variants in a grid" />

            <h3>Step 4: Refine your design</h3>
            <p>Not perfect? Click <strong>Refine</strong> on any variant. Type a refinement prompt like &quot;warmer colors&quot; or &quot;bolder contrast&quot;. Quick chips available: Warmer colors, More detail, Bolder contrast, Simpler/cleaner, Darker mood, Add texture.</p>
            <Screenshot label="Screenshot: Refine panel with prompt and quick chips" />

            <h3>Step 5: Preview on product</h3>
            <p>Click <strong>Preview</strong> to see your design on the actual product via Printful&apos;s mockup API. See exactly how it looks on a hoodie, t-shirt, etc. before publishing.</p>
            <Screenshot label="Screenshot: Mockup preview showing design on a hoodie" />

            <h3>Step 6: Set price and publish</h3>
            <p>Enter your retail price, then click <strong>Publish</strong>. Your design is sent to Printful, which creates the product with all size and color variants. It&apos;s automatically imported into your store.</p>
            <Screenshot label="Screenshot: Publish dialog with price field" />

            <Callout type="info" icon={"\uD83D\uDCA1"}>
              <strong>Generation limits:</strong> 100 free generations per month. After that, $0.25 per generation. The counter is visible in your sidebar and in the Product Creator. Publishing costs a flat $1.00 fee.
            </Callout>
          </div>
        </details>

        {/* Managing products */}
        <details className="g-section" id="s-products">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCE6"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Managing products</div><div className="g-sec-sub">Product grid, tabs, editing, and reordering</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>The <strong>Products</strong> page shows all your products in a drag-and-drop grid. Reorder by dragging, edit or delete with hover buttons.</p>
            <Screenshot label="Screenshot: Products page — drag-and-drop grid with product cards" />
            <h3>Three tabs</h3>
            <ul className="g-check">
              <Check><strong>All Products</strong> &mdash; Everything in your store</Check>
              <Check><strong>Printful</strong> &mdash; Products synced from Printful with pricing and profit info</Check>
              <Check><strong>My Uploads</strong> &mdash; Products you&apos;ve added manually</Check>
            </ul>
            <h3>Editing products</h3>
            <p>Hover over any product card to see edit and delete buttons. Click edit to open a modal where you can change the title, price, description, and images.</p>
            <Screenshot label="Screenshot: Edit product modal" />
          </div>
        </details>

        {/* ============================================================ */}
        {/* SOCIAL & DISCOVERY                                            */}
        {/* ============================================================ */}

        {/* My Favorites */}
        <details className="g-section" id="s-favorites">
          <summary>
            <div className="g-sec-icon">{"\u2764\uFE0F"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">My Favorites</div><div className="g-sec-sub">Curate and showcase your favorite creators</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>Add your favorite X creators to your storefront. Visitors can discover creators you recommend.</p>
            <Screenshot label="Screenshot: My Favorites page — drag-and-drop creator cards" />
            <div className="g-steps">
              <Step n={1} title="Go to My Favorites" desc="Open My Favorites from the Console sidebar." />
              <Step n={2} title="Search for creators" desc="Search by X username to find creators. Click to add them to your favorites list." />
              <Step n={3} title="Drag to reorder" desc="Drag and drop creator cards to arrange them in your preferred order." />
              <Step n={4} title="Shows on your page" desc="Add the 'My Favorites' block in Page Building to display them on your storefront." />
            </div>
          </div>
        </details>

        {/* Social Feeds */}
        <details className="g-section" id="s-social">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCF1"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Social Feeds</div><div className="g-sec-sub">Connect TikTok, Instagram, and YouTube</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>Connect your other social accounts to show content on your storefront. Add the TikTok, Instagram, or YouTube blocks in the Page Builder.</p>
            <Screenshot label="Screenshot: Social Feeds settings page" />
            <div className="g-steps">
              <Step n={1} title="Go to Social Feeds" desc="Open Social Feeds from the Console sidebar." />
              <Step n={2} title="Connect your accounts" desc="Enter your TikTok, Instagram, or YouTube username/URL." />
              <Step n={3} title="Add blocks to your page" desc="In Page Building, drag the TikTok, Instagram, or YouTube blocks into your layout." />
            </div>
          </div>
        </details>

        {/* ============================================================ */}
        {/* STORE MANAGEMENT                                              */}
        {/* ============================================================ */}

        {/* Orders & Shipping */}
        <details className="g-section" id="s-orders">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCCB"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Orders & Shipping</div><div className="g-sec-sub">Track orders, shipping, and fulfillment</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>When someone buys from your store, the order flows through Stripe (payment) and Printful (fulfillment) automatically.</p>
            <Screenshot label="Screenshot: Orders dashboard" />
            <div className="g-steps">
              <Step n={1} title="Customer places order" desc="They pay via Stripe Checkout. Money goes directly to your Stripe account." />
              <Step n={2} title="Printful receives the order" desc="Printful automatically gets the order details, prints the product, and packs it." />
              <Step n={3} title="Shipping notification" desc="When Printful ships, tracking info is updated in your Orders dashboard." />
              <Step n={4} title="Customer gets tracking" desc="The customer receives shipping updates via email." />
            </div>
            <Callout type="good" icon={"\u2705"}>You don&apos;t need to do anything after the sale. Printful handles printing, packing, and shipping.</Callout>
          </div>
        </details>

        {/* Payments & Fees */}
        <details className="g-section" id="s-payments">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCB3"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Payments & Fees</div><div className="g-sec-sub">Stripe Connect, pricing, and fee breakdown</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            <p>Payments are processed through <strong>Stripe Connect</strong>. Money goes directly from the customer to your Stripe account &mdash; RareImagery never holds your funds.</p>
            <Screenshot label="Screenshot: Stripe Connect onboarding / settings" />

            <h3>Setting up Stripe</h3>
            <div className="g-steps">
              <Step n={1} title="Go to Console > Store > Settings" desc="Find the Stripe Connect section." />
              <Step n={2} title="Click 'Connect with Stripe'" desc="You'll be redirected to Stripe to create or connect your account." />
              <Step n={3} title="Complete verification" desc="Stripe may ask for identity verification. Once approved, you can accept payments." />
            </div>

            <h3>Fee breakdown</h3>
            <table className="g-table">
              <thead><tr><th>Fee</th><th>Amount</th><th>Details</th></tr></thead>
              <tbody>
                <tr><td>Payment processing</td><td className="g-fee">2.9% + $0.30</td><td>Stripe&apos;s standard rate, deducted at checkout</td></tr>
                <tr><td>AI generations</td><td className="g-fee">$0.00</td><td>First 100/month free. Then $0.25 per generation.</td></tr>
                <tr><td>Publish to Printful</td><td className="g-fee">$1.00</td><td>Flat fee per product published</td></tr>
                <tr><td>Printful base cost</td><td className="g-fee">Varies</td><td>Printful&apos;s production + shipping cost (deducted from sale price)</td></tr>
                <tr><td>Platform fee</td><td className="g-fee">$0.00</td><td>No monthly subscription during beta</td></tr>
              </tbody>
            </table>

            <Callout type="note" icon={"\uD83D\uDCB0"}>
              <strong>Example:</strong> You sell a hoodie for $45. Stripe takes ~$1.60. Printful&apos;s base cost is ~$25. You keep ~$18.40 profit.
            </Callout>
          </div>
        </details>

        {/* ============================================================ */}
        {/* FAQ                                                           */}
        {/* ============================================================ */}

        <details className="g-section" id="s-faq">
          <summary>
            <div className="g-sec-icon">{"\u2753"}</div>
            <div className="g-sec-meta"><div className="g-sec-label">Frequently Asked Questions</div><div className="g-sec-sub">Common questions answered</div></div>
            <span className="g-arrow">{"\u25B6"}</span>
          </summary>
          <div className="g-body">
            {[
              { q: "How long does setup take?", a: "Your store goes live immediately after signing up. The 3-day free trial starts right away." },
              { q: "Can I change my subdomain?", a: "No. Your subdomain is permanent and set during store creation. Choose carefully — first come, first served." },
              { q: "What if a customer doesn't receive their order?", a: "Printful handles all fulfillment. Contact Printful support with the order ID, or reach out to @RareImagery for help." },
              { q: "Do I need to handle shipping myself?", a: "No. Printful prints, packs, and ships directly to the customer. You never touch inventory." },
              { q: "Can I sell things other than Printful products?", a: "Yes. Upload custom products (physical or digital) from the Products page. You handle fulfillment for those." },
              { q: "How often does my X profile sync?", a: "Automatically on every sign-in, plus periodic background syncs. Your store always shows your latest bio and photo." },
              { q: "Can I have multiple stores?", a: "Not yet. One store per X account during beta." },
              { q: "How do I cancel my store?", a: "Contact @RareImagery on X. We'll deactivate your store and subdomain." },
              { q: "What happens after my free trial?", a: "After 3 days, subscribe for $4/month to keep your store active. Your content is preserved if you don't subscribe right away." },
              { q: "How many AI generations do I get?", a: "100 free per month. After that, $0.25 per generation. The counter is visible in your Console sidebar." },
            ].map((faq, i) => (
              <div className="g-faq" key={i}><div className="g-faq-q">{faq.q}</div><div className="g-faq-a">{faq.a}</div></div>
            ))}
          </div>
        </details>

        {/* Footer CTA */}
        <div className="g-footer-cta">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "white", marginBottom: 4 }}>Ready to build your store?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Be Rare.</div>
          </div>
        </div>

        {/* Edit bar (admin only) */}
        {editing && (
          <div className="g-edit-bar">
            <span>Editing guide</span>
            <button className="g-edit-btn g-edit-save" onClick={saveEdits} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button className="g-edit-btn g-edit-cancel" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        )}
      </main>
    </div>
    </>
  );
}
