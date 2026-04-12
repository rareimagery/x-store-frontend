"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

/* ------------------------------------------------------------------ */
/*  Inline style block — mirrors the original HTML guide exactly      */
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

function EditableText({
  id,
  defaultText,
  overrides,
  editing,
  tag: Tag = "span",
  className,
}: {
  id: string;
  defaultText: string;
  overrides: Record<string, string>;
  editing: boolean;
  tag?: "span" | "p" | "div" | "h3";
  className?: string;
}) {
  const text = overrides[id] ?? defaultText;
  if (!editing) return <Tag className={className} dangerouslySetInnerHTML={{ __html: text }} />;
  return (
    <Tag
      className={`g-editable ${className || ""}`}
      contentEditable
      suppressContentEditableWarning
      data-field-id={id}
      dangerouslySetInnerHTML={{ __html: text }}
    />
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="g-step">
      <div className="g-step-num">{n}</div>
      <div>
        <div className="g-step-title">{title}</div>
        <div className="g-step-desc">{desc}</div>
      </div>
    </div>
  );
}

function Callout({ type, icon, children }: { type: string; icon: string; children: React.ReactNode }) {
  return (
    <div className={`g-callout g-callout-${type}`}>
      <span className="g-callout-icon">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="g-chk">&#10003;</span>
      {children}
    </li>
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

  // Load saved overrides (manual admin edits)
  useEffect(() => {
    fetch("/api/guide")
      .then((r) => r.json())
      .then((d) => {
        if (d.content && typeof d.content === "object") setOverrides(d.content);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // Load agent-generated howto updates
    fetch("/api/public-howto")
      .then((r) => r.json())
      .then((d) => {
        if (d.sections && Array.isArray(d.sections) && d.sections.length > 0) {
          const agentOverrides: Record<string, string> = {};
          for (const s of d.sections) {
            if (s.id && s.content) agentOverrides[s.id] = s.content;
          }
          setOverrides((prev) => ({ ...agentOverrides, ...prev }));
        }
      })
      .catch(() => {});
  }, []);

  const saveEdits = useCallback(async () => {
    if (!mainRef.current) return;
    setSaving(true);
    // Collect all editable fields
    const fields = mainRef.current.querySelectorAll<HTMLElement>("[data-field-id]");
    const updated = { ...overrides };
    fields.forEach((el) => {
      const id = el.getAttribute("data-field-id");
      const text = el.textContent?.trim() || "";
      if (id && text) updated[id] = text;
    });
    try {
      const res = await fetch("/api/guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: updated }),
      });
      if (res.ok) {
        setOverrides(updated);
        setEditing(false);
      }
    } catch {} finally {
      setSaving(false);
    }
  }, [overrides]);

  useEffect(() => {
    const links = sidebarRef.current?.querySelectorAll<HTMLElement>(".g-nav-link");
    const sections = document.querySelectorAll<HTMLElement>(".g-section");
    if (!links || !sections.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.id;
            links.forEach((l) =>
              l.classList.toggle("active", l.getAttribute("data-target") === id)
            );
          }
        });
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );

    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.setAttribute("open", "");
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const navItems = [
    { group: "Getting started", items: [
      { id: "s-what", icon: "\u2726", label: "What is RareImagery?" },
      { id: "s-signup", icon: "\uD83D\uDD11", label: "Signing in with X" },
      { id: "s-invite", icon: "\uD83C\uDF9F", label: "Invite codes" },
    ]},
    { group: "Your store", items: [
      { id: "s-create", icon: "\uD83C\uDFEA", label: "Creating your store" },
      { id: "s-products", icon: "\uD83D\uDCE6", label: "Adding products" },
      { id: "s-themes", icon: "\uD83C\uDFA8", label: "Customizing your look" },
      { id: "s-console", icon: "\u2699\uFE0F", label: "Your dashboard" },
    ]},
    { group: "Getting paid", items: [
      { id: "s-payments", icon: "\uD83D\uDCB3", label: "Payments & fees" },
      { id: "s-subscriptions", icon: "\u2B50", label: "Fan subscriptions" },
    ]},
    { group: "Community", items: [
      { id: "s-social", icon: "\uD83E\uDD1D", label: "Following & social" },
      { id: "s-faq", icon: "\uD83D\uDCAC", label: "Common questions" },
    ]},
  ];

  return (
    <div className={`g ${editing ? "g-editing" : ""} ${embedded ? "g-embedded" : ""}`}>
      <style dangerouslySetInnerHTML={{ __html: GUIDE_CSS + `
        .g-embedded .g-sidebar { display: none !important; }
        .g-embedded .g-main { margin-left: 0 !important; max-width: 100% !important; padding: 2rem 1.5rem 4rem !important; }
      ` }} />

      {/* Admin edit bar */}
      {isAdmin && !editing && (
        <button
          onClick={() => setEditing(true)}
          style={{ position: "fixed", top: 16, right: 16, zIndex: 200, padding: "8px 16px", borderRadius: 20, background: "var(--purple)", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
        >
          Edit Guide
        </button>
      )}
      {editing && (
        <div className="g-edit-bar">
          <span>Editing guide</span>
          <button className="g-edit-btn g-edit-save" onClick={saveEdits} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button className="g-edit-btn g-edit-cancel" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      )}

      {/* Sidebar — hidden when embedded in console */}
      <nav className="g-sidebar" ref={sidebarRef}>
        <div className="g-sidebar-top">
          <div className="g-brand">
            <div className="g-brand-mark"><span>RI</span></div>
            <div className="g-brand-name">RareImagery</div>
          </div>
          <div className="g-brand-tag">Creator Guide</div>
        </div>

        {navItems.map((group) => (
          <div key={group.group}>
            <div className="g-nav-label">{group.group}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className="g-nav-link"
                data-target={item.id}
                onClick={() => scrollTo(item.id)}
              >
                <span className="g-nav-icon">{item.icon}</span> {item.label}
              </button>
            ))}
          </div>
        ))}

        <div className="g-sidebar-footer">
          Need help? Reach out to the team at <strong>rareimagery.net</strong>.<br />
          <em>Be Rare.</em>
        </div>
      </nav>

      {/* Main content */}
      <main className="g-main" ref={mainRef}>
        {/* Hero */}
        <div className="g-hero">
          <div className="g-hero-eyebrow">Creator Guide</div>
          <EditableText tag="div" id="hero-title" editing={editing} overrides={overrides} className="g-hero-title" defaultText="Your store, your rules. Let's get you set up." />
          <EditableText tag="p" id="hero-desc" editing={editing} overrides={overrides} className="g-hero-desc" defaultText="RareImagery is an invite-only marketplace for creators. This guide walks you through everything — from signing up to making your first sale." />
          <div className="g-hero-chips">
            <span className="g-hero-chip">No coding needed</span>
            <span className="g-hero-chip">Invite-only platform</span>
            <span className="g-hero-chip">Powered by your X profile</span>
          </div>
        </div>

        {/* What is RareImagery */}
        <details className="g-section" id="s-what" open>
          <summary>
            <div className="g-sec-icon">&#10022;</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">What is RareImagery?</div>
              <div className="g-sec-sub">The big picture &mdash; what you&apos;re getting into</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <EditableText tag="p" id="what-p1" editing={editing} overrides={overrides} defaultText="RareImagery is a creator marketplace where you get your own personal storefront — with your own subdomain at yourname.rareimagery.net — that you can fill with products, customize with your own style, and share with your audience." />
            <EditableText tag="p" id="what-p2" editing={editing} overrides={overrides} defaultText="It's built around your X (Twitter) identity. When you sign in, we pull in your profile, your bio, your posts, and your follower count. An AI then uses that to help you set up your store automatically — you don't have to start from a blank page." />
            <div className="g-features">
              {[
                { icon: "\uD83C\uDFEA", title: "Your own storefront", desc: "Your own subdomain at yourname.rareimagery.net, styled however you want." },
                { icon: "\uD83E\uDD16", title: "AI-assisted setup", desc: "Your X profile auto-fills your store info, bio, and product ideas." },
                { icon: "\uD83C\uDFA8", title: "10 color schemes", desc: "Customize your look with color schemes, backgrounds, and drag-and-drop layout." },
                { icon: "\uD83D\uDCB8", title: "Automatic payouts", desc: "When someone buys from you, money goes directly to your account." },
                { icon: "\uD83D\uDCE6", title: "Print-on-demand", desc: "Sell merch without keeping inventory \u2014 we handle printing and shipping." },
                { icon: "\uD83D\uDD10", title: "Invite-only access", desc: "You need an invite code from the RareImagery team to get started." },
              ].map((f) => (
                <div className="g-feat" key={f.title}>
                  <div className="g-feat-icon">{f.icon}</div>
                  <div className="g-feat-title">{f.title}</div>
                  <div className="g-feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
            <Callout type="tip" icon="&#10022;">
              <strong>Why invite-only?</strong> We keep the platform tight on purpose. Every store that goes live is reviewed and approved by the team. This keeps the quality high for everyone &mdash; creators and shoppers alike.
            </Callout>
          </div>
        </details>

        {/* Signing in */}
        <details className="g-section" id="s-signup">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDD11"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Signing in with X</div>
              <div className="g-sec-sub">How to log in and what we access from your account</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>RareImagery uses your X (Twitter) account to log you in. There&apos;s no separate username or password to create &mdash; just click <strong>Sign in with X</strong> and you&apos;re in.</p>
            <h3>How to sign in</h3>
            <div className="g-steps">
              <Step n={1} title={'Go to rareimagery.net and click "Sign in with X"'} desc="You'll find this button on the homepage or the login page." />
              <Step n={2} title="X will ask you to approve access" desc='A screen pops up asking if RareImagery can access your account. Click "Authorize app".' />
              <Step n={3} title="You're redirected back to your dashboard" desc="That's it. You're in. If it's your first time, you'll be prompted to create your store." />
            </div>
            <h3>What we access from X</h3>
            <ul className="g-check">
              <Check>Your public profile &mdash; name, bio, profile photo, banner image</Check>
              <Check>Your follower count and public metrics</Check>
              <Check>Your recent public posts (to help set up your store)</Check>
              <Check>The accounts you follow (optional, for social features)</Check>
            </ul>
            <Callout type="good" icon="&#128274;">
              <strong>We never post on your behalf</strong> RareImagery can read your profile and posts &mdash; but we will never tweet, post, or do anything from your X account without you explicitly asking us to.
            </Callout>
            <p>Each time you log in, we quietly refresh your X profile in the background so your store always shows your latest bio, photo, and stats.</p>
          </div>
        </details>

        {/* Invite codes */}
        <details className="g-section" id="s-invite">
          <summary>
            <div className="g-sec-icon">{"\uD83C\uDF9F"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Invite codes</div>
              <div className="g-sec-sub">How to use yours and what it unlocks</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>RareImagery is invitation-only. To create a store, you need an invite code from the RareImagery team. If you&apos;ve been given one, here&apos;s how to use it.</p>
            <h3>Using your invite code</h3>
            <div className="g-steps">
              <Step n={1} title="Sign in with X (if you haven't already)" desc="Follow the sign-in steps above first." />
              <Step n={2} title="Go to your dashboard \u2014 you'll see a code entry box" desc="If you're new, the store creation page will ask for your invite code before you can proceed." />
              <Step n={3} title="Enter your code exactly as given" desc='Codes look like RARE-XXXXXX. They are case-sensitive. Enter it and click Verify.' />
              <Step n={4} title="Once verified, the store creation wizard opens" desc="Your code is remembered on this device \u2014 you won't need to enter it again." />
            </div>
            <Callout type="note" icon="&#128221;">
              <strong>Each code is single-use</strong> Once a code is used to create a store, it can&apos;t be used again. If you&apos;re having trouble, reach out to the team &mdash; don&apos;t share your code with someone else first.
            </Callout>
            <p>Don&apos;t have a code yet? Follow <strong>@RareImagery</strong> on X and keep an eye out &mdash; we periodically open up new spots.</p>
          </div>
        </details>

        {/* Creating your store */}
        <details className="g-section" id="s-create">
          <summary>
            <div className="g-sec-icon">{"\uD83C\uDFEA"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Creating your store</div>
              <div className="g-sec-sub">The 5-step wizard walkthrough</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>Once your invite code is verified, you&apos;ll go through a short setup wizard. Most of it gets filled in automatically from your X profile &mdash; you just review and confirm.</p>
            <Callout type="tip" icon="&#10022;">
              <strong>AI does the heavy lifting</strong> Before the wizard even opens, we fetch your X profile and send it to our AI. By the time you see Step 1, your bio, product ideas, and recommended theme are already filled in. You can change anything you want &mdash; these are just smart starting points.
            </Callout>
            <h3>Step 1 &mdash; Store basics</h3>
            <p>Fill in the essentials:</p>
            <ul className="g-check">
              <Check><strong>Store name</strong> &mdash; what you want your store to be called</Check>
              <Check><strong>Store URL</strong> &mdash; this becomes <em>yourname</em>.rareimagery.net (your own subdomain). Choose carefully, this is your permanent URL.</Check>
              <Check><strong>Contact email</strong> &mdash; for order notifications</Check>
              <Check><strong>Currency</strong> &mdash; the currency your products will be priced in</Check>
            </ul>
            <h3>Step 2 &mdash; Creator profile</h3>
            <p>Your X data is already here. Review and edit your bio, check that your profile photo and banner look right. You&apos;ll also see AI-suggested product ideas based on your posts and audience.</p>
            <h3>Step 3 &mdash; Customize your look</h3>
            <p>Pick a color scheme and page background for your storefront. You can choose from 10 color schemes and 9 background presets, or upload your own custom background image. You can always change this later from the Page Building editor.</p>
            <h3>Step 4 &mdash; Add products (optional)</h3>
            <p>You can add products now or skip this and do it later. Your store goes into review once you hit Submit &mdash; you don&apos;t need products to get approved.</p>
            <h3>Step 5 &mdash; Submitted!</h3>
            <p>Your store is submitted for review. You&apos;ll get an email as soon as the RareImagery team approves it. Once approved, your store goes live at your chosen subdomain.</p>
            <Callout type="info" icon="&#8505;">
              <strong>Review usually takes 24&ndash;48 hours</strong> The team manually checks each new store to make sure everything looks good. You&apos;ll get an email either way &mdash; approval or if something needs adjusting.
            </Callout>
          </div>
        </details>

        {/* Adding products */}
        <details className="g-section" id="s-products">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCE6"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Adding products</div>
              <div className="g-sec-sub">Design with Grok AI, print with Printful, or upload your own</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>RareImagery gives you multiple ways to create and sell products. You can design merch with AI, import from Printful, or upload products you&apos;ve created elsewhere &mdash; all from the same store.</p>

            <h3>Creating products with Grok Product Creator</h3>
            <p>The fastest way to go from idea to product. Grok Product Creator uses AI to generate print-ready designs that are automatically published to Printful and imported into your store.</p>
            <div className="g-steps">
              <Step n={1} title="Open Grok Product Creator" desc="Go to your Dashboard and click Grok Product Creator in the sidebar. Choose your product type: T-Shirt, Hoodie, Ballcap, Pet Bandana, Pet Hoodie, or Digital Drop." />
              <Step n={2} title="Describe your design" desc="Type a prompt describing what you want. For example: 'retro sunset with palm trees' or 'bold geometric wolf'. You can also upload a reference image or use your X profile picture as a starting point." />
              <Step n={3} title="Generate and pick your favorite" desc="Grok generates up to 4 design variants. Choose the one you like best. You get 100 free generations per month." />
              <Step n={4} title="Set your price and publish" desc="Enter the retail price you want to charge. Hit Publish and your design is sent to Printful, where the product is created with all size and color variants. It's automatically imported into your store." />
            </div>
            <Callout type="tip" icon="&#10022;">
              <strong>How it works behind the scenes</strong> When you publish, Grok sends your design to Printful as a print-ready file. Printful creates the product with all available sizes and colors. The product then appears in your store&apos;s Products tab, ready for customers to buy. When someone orders, Printful prints it, packs it, and ships it directly to the customer. You never touch inventory.
            </Callout>

            <h3>Importing from Printful</h3>
            <p>If you already have products on Printful, you can connect your account and import them directly.</p>
            <div className="g-steps">
              <Step n={1} title="Connect Printful" desc="Go to Dashboard &rarr; Store &rarr; Printful and enter your Printful API key. You can find this in your Printful dashboard under Settings &rarr; API." />
              <Step n={2} title="View your Printful products" desc="Once connected, go to Dashboard &rarr; Products and click the Printful tab. You'll see all your synced products with pricing and variant counts." />
              <Step n={3} title="Products appear in your store automatically" desc="Synced Printful products show up on your public storefront alongside any other products you've added." />
            </div>

            <h3>Uploading your own products</h3>
            <p>Sell anything &mdash; handmade goods, digital downloads, or products you&apos;ve created outside of RareImagery.</p>
            <div className="g-steps">
              <Step n={1} title="Go to Dashboard &rarr; Products" desc="Click the 'My Uploads' tab to see your custom products, or 'All Products' to see everything." />
              <Step n={2} title='Click "Add Product"' desc="Choose your product type: General (physical goods you ship yourself), Digital (files delivered instantly), or Physical (handmade/custom items)." />
              <Step n={3} title="Add details and images" desc="Enter a name, description, price, and upload a product image. You can also paste an image URL." />
              <Step n={4} title="Save and it's live" desc="Your product appears in your store immediately. No approval needed for individual products once your store is approved." />
            </div>

            <h3>Pricing</h3>
            <p><strong>Grok generations:</strong> 100 free per month. After that, $0.25 per generation.</p>
            <p><strong>Publishing to Printful:</strong> $1.00 flat fee per product published.</p>
            <p><strong>Product listings:</strong> Your first 50 products are free. After that, $0.05 per listing.</p>
            <p><strong>Print-on-demand:</strong> You set the retail price. Printful charges a base cost per item (shown in your Products tab). The difference is your profit.</p>
          </div>
        </details>

        {/* Themes */}
        <details className="g-section" id="s-themes">
          <summary>
            <div className="g-sec-icon">{"\uD83C\uDFA8"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Customizing your look</div>
              <div className="g-sec-sub">Color schemes, backgrounds, and page layout</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>Your storefront&apos;s look is controlled through the <strong>Page Building</strong> editor. You choose a color scheme, a page background, and arrange content blocks in a drag-and-drop layout.</p>

            <h3>Color schemes</h3>
            <p>Choose from 10 color schemes that control all text, borders, accents, and surfaces across your page:</p>
            <div className="g-themes">
              {[
                { name: "Midnight", bg: "#0f0d1a", fg: "#e2e0ff", vibe: "Deep purple-black, default" },
                { name: "Ocean", bg: "#0a1628", fg: "#c5d5e8", vibe: "Deep sea blue tones" },
                { name: "Forest", bg: "#0d1a0f", fg: "#c5e0c8", vibe: "Dark green nature" },
                { name: "Sunset", bg: "#1a0f0d", fg: "#e8c5c0", vibe: "Warm amber and red" },
                { name: "Royal", bg: "#0d0f1a", fg: "#c5c8e8", vibe: "Rich blue-purple" },
                { name: "Cherry", bg: "#1a0d12", fg: "#e8c0cc", vibe: "Deep red-pink" },
                { name: "Arctic", bg: "#0f1a1a", fg: "#c5e5e5", vibe: "Cool icy teal" },
                { name: "Ember", bg: "#1a110d", fg: "#e8d0c0", vibe: "Warm orange glow" },
                { name: "Slate", bg: "#141414", fg: "#d4d4d4", vibe: "Clean neutral gray" },
                { name: "Neon", bg: "#0a000f", fg: "#e0c0ff", vibe: "Cyberpunk purple glow" },
              ].map((t) => (
                <div className="g-theme" key={t.name}>
                  <div className="g-theme-swatch" style={{ background: t.bg, color: t.fg }}>{t.name}</div>
                  <div className="g-theme-info">
                    <div className="g-theme-name">{t.name}</div>
                    <div className="g-theme-vibe">{t.vibe}</div>
                  </div>
                </div>
              ))}
            </div>

            <h3>Page backgrounds</h3>
            <p>Add a background image to your storefront. Choose from 9 presets (Nature, Mountain, Space, Ocean Waves, City Night, Desert, Aurora, Abstract) or upload your own custom image.</p>

            <h3>How to change your look</h3>
            <p>Go to <strong>Console &rarr; Page Building</strong>. The color scheme and background selectors are at the top of the editor. Changes save when you publish your layout.</p>

            <Callout type="tip" icon="&#10022;">
              <strong>Drag-and-drop layout</strong> The Page Building editor lets you arrange content blocks (products, posts, galleries, music, etc.) into a two-column layout: Main Content and Right Sidebar. No coding needed.
            </Callout>
          </div>
        </details>

        {/* Dashboard */}
        <details className="g-section" id="s-console">
          <summary>
            <div className="g-sec-icon">{"\u2699\uFE0F"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Your dashboard</div>
              <div className="g-sec-sub">Everything you can manage from one place</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>Your dashboard lives at <strong>yourname.rareimagery.net/console</strong>. It&apos;s the control center for everything about your store.</p>
            <h3>What&apos;s in the sidebar</h3>
            <table className="g-table">
              <thead><tr><th>Page</th><th>What it does</th></tr></thead>
              <tbody>
                <tr><td><strong>How To</strong></td><td>This guide &mdash; always accessible from your dashboard</td></tr>
                <tr><td><strong>Page Building</strong></td><td>Drag-and-drop layout editor for your public storefront</td></tr>
                <tr><td><strong>Grok Product Creator</strong></td><td>AI design tool powered by Grok. Generate designs for 6 product types (T-Shirt, Hoodie, Ballcap, Pet Bandana, Pet Hoodie, Digital Drop). Upload images for Grok to edit. Set your own price and publish directly to Printful.</td></tr>
                <tr><td><strong>Products</strong></td><td>View and manage all your products in one place. Three tabs: All Products (everything), Printful (synced from Printful with pricing and profit), My Uploads (products you&apos;ve added manually).</td></tr>
                <tr><td><strong>Grok Library</strong></td><td>Your AI-generated designs organized in folders with save/manage</td></tr>
                <tr><td><strong>My Subscribers</strong></td><td>View your X Creator Subscribers who have signed in to RareImagery. See stats, manage tiers, and track growth.</td></tr>
                <tr><td><strong>My Favorites</strong></td><td>Curate favorite X creators into drag-and-drop category columns for your public page</td></tr>
                <tr><td><strong>Social Feeds</strong></td><td>Connect TikTok, Instagram, and YouTube accounts</td></tr>
                <tr><td><strong>Music</strong></td><td>Add Spotify and Apple Music tracks to your storefront</td></tr>
                <tr><td><strong>Store</strong></td><td>Orders, shipping, accounting, Printful connection, and store settings</td></tr>
              </tbody>
            </table>
            <Callout type="info" icon="&#8505;">
              <strong>Notifications</strong> You can turn on email and SMS alerts in Settings. We&apos;ll notify you when your store is approved, when you get a new sale, and for other important updates.
            </Callout>
          </div>
        </details>

        {/* Payments */}
        <details className="g-section" id="s-payments">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCB3"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Payments &amp; fees</div>
              <div className="g-sec-sub">How you get paid, where your money goes, and what it costs</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <h3>How payments work &mdash; full transparency</h3>
            <p>RareImagery uses <strong>Stripe Connect</strong> to handle all payments. Here&apos;s exactly what happens when a customer buys a product from your store:</p>
            <div className="g-steps">
              <Step n={1} title="Customer clicks Buy" desc="They're taken to a Stripe-hosted checkout page. They enter their card info directly on Stripe's secure site. RareImagery never sees or stores their card number." />
              <Step n={2} title="Stripe processes the payment" desc="Stripe collects the money and automatically splits it: your earnings go directly to YOUR Stripe account, and the small platform fee is deducted." />
              <Step n={3} title="You get paid directly by Stripe" desc="Stripe deposits your earnings to your bank account on a rolling basis (typically 2 business days). RareImagery never holds your money — it goes straight from the customer to you via Stripe." />
              <Step n={4} title="Printful fulfills the order" desc="For print-on-demand products, the order is automatically sent to Printful. They print it, pack it, and ship it directly to the customer. You don't handle inventory or shipping." />
            </div>

            <Callout type="good" icon="&#128161;">
              <strong>RareImagery never holds your money.</strong> When someone buys from your store, the payment goes directly to your connected Stripe account. We cannot access, withdraw, or redirect your funds. Stripe handles all payouts to your bank. You can log into your Stripe dashboard at any time to see every transaction, pending payout, and deposit.
            </Callout>

            <h3>Do I have to connect Stripe?</h3>
            <p><strong>No.</strong> Connecting Stripe is optional. You can set up your store, design products, build your page, and do everything else without connecting Stripe. You only need Stripe when you&apos;re ready to actually receive payments from customers.</p>
            <p>If a customer buys a product before you&apos;ve connected Stripe, the payment goes to the platform and we&apos;ll work with you to get it to you. But connecting Stripe first means everything is automatic and instant &mdash; no middleman, no delays.</p>

            <h3>Connecting Stripe (takes 2&ndash;5 minutes)</h3>
            <div className="g-steps">
              <Step n={1} title='Go to Console \u2192 Settings' desc="Scroll to the Payments section. You'll see a 'Connect Stripe for Payouts' button." />
              <Step n={2} title="Complete Stripe's onboarding" desc="You'll be redirected to Stripe's website. They'll ask for your name, bank account details, and verify your identity. This is Stripe's standard process — the same one used by Shopify, DoorDash, and thousands of other platforms." />
              <Step n={3} title="You're connected" desc="Once complete, your Console Settings will show 'Payouts Active'. Every future sale will be deposited directly to your bank account." />
            </div>
            <p>You can update your bank details, view transactions, and manage your payouts anytime by visiting your <strong>Stripe Express Dashboard</strong> (linked from your Console Settings).</p>

            <h3>What does the customer see?</h3>
            <p>Customers never need a Stripe account. When they click Buy, they see a clean Stripe checkout page with your product name and price. They enter their card, pay, and get a confirmation. That&apos;s it.</p>

            <h3>Fees</h3>
            <table className="g-table">
              <thead><tr><th>Fee</th><th>Amount</th><th>When</th></tr></thead>
              <tbody>
                <tr><td><strong>Payment processing</strong></td><td><span className="g-fee">2.9% + $0.30</span></td><td>Per transaction &mdash; standard Stripe rate, deducted automatically</td></tr>
                <tr><td><strong>Grok AI generations</strong></td><td><span className="g-fee">100 free/month</span></td><td>Then $0.25 per generation after the free tier</td></tr>
                <tr><td><strong>Publish to Printful</strong></td><td><span className="g-fee">$1.00</span></td><td>Per product published to Printful for print-on-demand</td></tr>
                <tr><td><strong>Product listings</strong></td><td><span className="g-fee">50 free</span></td><td>Then $0.05 per listing after the first 50</td></tr>
                <tr><td><strong>Printful base cost</strong></td><td><span className="g-fee">Varies</span></td><td>Per item ordered &mdash; deducted from sale price. You keep the difference as profit.</td></tr>
              </tbody>
            </table>

            <Callout type="tip" icon="&#10022;">
              <strong>Example:</strong> You create a hoodie and set the price at $45. Printful&apos;s base cost is $25. When a customer buys it: Stripe collects $45, deducts the 2.9% + $0.30 fee ($1.61), and deposits $43.39 to your Stripe account. Printful charges $25 to print and ship. Your profit: <strong>$18.39</strong>.
            </Callout>

            <h3>Where to check your earnings</h3>
            <p>You can track everything in two places:</p>
            <div className="g-steps">
              <Step n={1} title="Console &rarr; Store &rarr; Accounting" desc="See your revenue, order count, and platform fees directly in your RareImagery dashboard." />
              <Step n={2} title="Stripe Express Dashboard" desc="View every transaction, pending payout, and bank deposit. Stripe provides tax documents (1099s) at year end." />
            </div>

            <Callout type="info" icon="&#8505;">
              <strong>X Money &mdash; coming soon</strong> When X launches its payment system, you&apos;ll be able to accept X Money payments alongside Stripe. We&apos;ll handle the switch automatically &mdash; no action needed on your part.
            </Callout>
          </div>
        </details>

        {/* Subscriptions */}
        <details className="g-section" id="s-subscriptions">
          <summary>
            <div className="g-sec-icon">{"\u2B50"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Fan subscriptions</div>
              <div className="g-sec-sub">Create tiers, gate content, and reward supporters</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>Fan subscriptions let you create monthly membership tiers for your audience. Subscribers get access to exclusive products, early releases, or anything else you reserve for your biggest supporters.</p>
            <div className="g-steps">
              <Step n={1} title="Go to Dashboard \u2192 Subscriptions" desc="You'll see an option to create subscription tiers." />
              <Step n={2} title='Click "Add tier" and fill in the details' desc='Name your tier (e.g. "Silver Fan"), set a monthly price, and list the perks.' />
              <Step n={3} title="Mark products as subscriber-only (optional)" desc='When editing any product, toggle "Subscriber only" and pick the minimum tier.' />
              <Step n={4} title="Subscribers see gated content; others see a teaser" desc="Non-subscribers know exclusive products exist, but can't purchase until they subscribe." />
            </div>
          </div>
        </details>

        {/* Social */}
        <details className="g-section" id="s-social">
          <summary>
            <div className="g-sec-icon">{"\uD83E\uDD1D"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Following &amp; social features</div>
              <div className="g-sec-sub">Build community within the platform</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            <p>RareImagery isn&apos;t just a store &mdash; it&apos;s a community of creators. You can follow other creators, shout them out, and be featured in the Picks section.</p>
            <div className="g-features">
              {[
                { icon: "\u2764", title: "Follow creators", desc: "Follow stores you love. Your follower count shows on your storefront." },
                { icon: "\uD83D\uDD04", title: "Mutual follows", desc: "When you both follow each other, a mutual badge appears on your profiles." },
                { icon: "\uD83D\uDCE3", title: "Shoutouts", desc: "Endorse other creators. Your shoutout shows on their storefront." },
                { icon: "\uD83C\uDFC6", title: "Picks", desc: "Curated featured stores spotlighted across the platform." },
              ].map((f) => (
                <div className="g-feat" key={f.title}>
                  <div className="g-feat-icon">{f.icon}</div>
                  <div className="g-feat-title">{f.title}</div>
                  <div className="g-feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* FAQ */}
        <details className="g-section" id="s-faq">
          <summary>
            <div className="g-sec-icon">{"\uD83D\uDCAC"}</div>
            <div className="g-sec-meta">
              <div className="g-sec-label">Common questions</div>
              <div className="g-sec-sub">Things creators ask most often</div>
            </div>
            <span className="g-arrow">&#9654;</span>
          </summary>
          <div className="g-body">
            {[
              { q: "How long does store approval take?", a: "Usually 24\u201348 hours. The team reviews every store manually. You'll get an email the moment it's approved." },
              { q: "Can I change my store's subdomain after I create it?", a: "Not currently. Your subdomain (yourname.rareimagery.net) is permanent once created. Choose something close to your X handle." },
              { q: "What happens if I miss a monthly payment?", a: "Your store will be temporarily unpublished. Update your payment method in Settings \u2192 Billing to restore it." },
              { q: "Do I need to handle my own shipping?", a: "Only for Physical Custom products. Print-on-demand (Printful) and digital products are handled automatically." },
              { q: "Can I sell products unrelated to my X content?", a: "Yes! Your store is yours. The AI suggestions are based on your X profile, but you're not limited to them." },
              { q: "What if I change my X profile photo or bio?", a: "Every time you log in, we sync your latest X data. Updates appear on RareImagery within a day." },
              { q: "Can I have more than one store?", a: "Currently, each X account can have one store. Reach out to the team if you need a second." },
              { q: "How do I cancel my store subscription?", a: "Go to Dashboard \u2192 Settings \u2192 Billing. Cancel anytime \u2014 your store stays live until the end of the billing period." },
              { q: "Is my store visible while it's in review?", a: 'No. While in "pending" status, visitors see a "Coming Soon" page. Once approved, everything goes live.' },
              { q: "How does the AI fill in my store automatically?", a: "When you sign in with X, we send your public X data to our AI. It generates a store bio, product suggestions, and recommends a theme. You review everything before anything is saved." },
            ].map((faq) => (
              <div className="g-faq" key={faq.q}>
                <div className="g-faq-q">{faq.q}</div>
                <div className="g-faq-a">{faq.a}</div>
              </div>
            ))}
          </div>
        </details>

        {/* Footer CTA */}
        <div className="g-footer-cta">
          <div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", color: "white", marginBottom: 4 }}>Ready to build your store?</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Head to rareimagery.net and sign in with X to get started.</div>
          </div>
          <div style={{ fontSize: 13, color: "var(--gold)", fontStyle: "italic", fontWeight: 500 }}>Be Rare.</div>
        </div>
      </main>
    </div>
  );
}
