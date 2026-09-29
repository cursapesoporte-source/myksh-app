import type { CSSProperties } from "react";

const SYMBOLS = ["$", "S/", "€", "₿", "Ξ", "%", "+", "0.5%", "100", "1,250", "USDT", "+2.4%", "0.01", "99.9", "$", "S/", "₿", "%", "5,000", "+8%", "€", "Ξ", "$", "S/", "250", "+1.2%", "₿", "$", "S/", "%"];
const random = (() => { let state = 20260929; return () => { state = (state * 1664525 + 1013904223) % 4294967296; return state / 4294967296; }; })();
const PARTICLES = SYMBOLS.map((symbol, index) => { const duration = 24 + random() * 28; return { symbol, left: Math.round(random() * 96), size: Math.round(11 + random() * 15), duration: Math.round(duration), delay: -Math.round(random() * duration), drift: Math.round((random() - 0.5) * 160), rotate: Math.round((random() - 0.5) * 50), opacity: Number((0.07 + random() * 0.09).toFixed(2)), blur: random() > 0.65 ? 1.5 : 0, }; });
const CSS = `
@keyframes mykshFloat { 0%{transform:translate3d(0,0,0) rotate(0deg);opacity:0} 12%{opacity:var(--o)} 85%{opacity:var(--o)} 100%{transform:translate3d(var(--dx),-125vh,0) rotate(var(--rot));opacity:0} }
@keyframes mykshOrb { 0%,100%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(40px,-30px,0) scale(1.12)} }
@keyframes mykshFadeUp { from{opacity:0;transform:translate3d(0,14px,0)} to{opacity:1;transform:translate3d(0,0,0)} }
.myksh-float{position:absolute;bottom:-12vh;font-weight:600;line-height:1;white-space:nowrap;will-change:transform,opacity;animation:mykshFloat var(--d) linear infinite;animation-delay:var(--delay);opacity:0}
.myksh-orb{position:absolute;border-radius:9999px;filter:blur(90px);animation:mykshOrb 18s ease-in-out infinite}
.myksh-fade-up{animation:mykshFadeUp .6s cubic-bezier(.22,.8,.3,1) both}
@media (prefers-reduced-motion:reduce){.myksh-float{animation:none;opacity:.06;bottom:auto}.myksh-orb,.myksh-fade-up{animation:none}}
`;

export default function DashboardBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <style>{CSS}</style>
      <div className="myksh-orb" style={{ top: "-12%", left: "-8%", width: 520, height: 520, background: "rgba(74,222,128,0.13)" }} />
      <div className="myksh-orb" style={{ bottom: "-15%", right: "-10%", width: 560, height: 560, background: "rgba(74,222,128,0.08)", animationDelay: "-9s" }} />
      {PARTICLES.map((particle, index) => (
        <span key={`${particle.symbol}-${index}`} className="myksh-float" style={{ left: `${particle.left}%`, fontSize: particle.size, color: "var(--myksh-green)", filter: particle.blur ? `blur(${particle.blur}px)` : undefined, "--d": `${particle.duration}s`, "--delay": `${particle.delay}s`, "--dx": `${particle.drift}px`, "--rot": `${particle.rotate}deg`, "--o": particle.opacity } as CSSProperties}>{particle.symbol}</span>
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,#0B0F14_100%)] dark-vignette" />
    </div>
  );
}
