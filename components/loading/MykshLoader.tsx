const WAVE_FRONT =
  "M-100 12 Q-75 0 -50 12 T0 12 T50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12 T450 12 T500 12 V200 H-100 Z";

const WAVE_BACK =
  "M-100 12 Q-75 24 -50 12 T0 12 T50 12 T100 12 T150 12 T200 12 T250 12 T300 12 T350 12 T400 12 T450 12 T500 12 V200 H-100 Z";

const FONT = "var(--font-geist-sans), system-ui, -apple-system, 'Segoe UI', sans-serif";

const CSS = `
@keyframes mykshRise {
  from { transform: translateY(118px); }
  to   { transform: translateY(-8px); }
}
@keyframes mykshWave {
  from { transform: translateX(0); }
  to   { transform: translateX(-100px); }
}
@keyframes mykshLoaderIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes mykshHint {
  0%, 100% { opacity: 0.35; }
  50%      { opacity: 0.8; }
}
.myksh-loader-root { animation: mykshLoaderIn 0.18s ease-out both; }
.myksh-loader-svg { filter: drop-shadow(0 0 22px rgba(74, 222, 128, 0.35)); }
.myksh-liquid {
  transform: translateY(118px);
  animation: mykshRise 1.8s cubic-bezier(0.22, 0.8, 0.3, 1) forwards;
}
.myksh-wave-front { animation: mykshWave 1.4s linear infinite; }
.myksh-wave-back  { animation: mykshWave 2.2s linear infinite reverse; }
.myksh-loader-hint { animation: mykshHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .myksh-liquid { animation: none; transform: translateY(-8px); }
  .myksh-wave-front, .myksh-wave-back, .myksh-loader-hint { animation: none; }
}
`;

export default function MykshLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="myksh-loader-root fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0B0F14]"
    >
      <style>{CSS}</style>

      <div
        aria-hidden="true"
        className="absolute h-72 w-72 rounded-full bg-[#4ADE80]/10 blur-[90px]"
      />

      <svg
        viewBox="0 0 400 120"
        className="myksh-loader-svg relative w-[min(80vw,420px)]"
        aria-hidden="true"
      >
        <defs>
          <mask
            id="myksh-loader-mask"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="400"
            height="120"
          >
            <text
              x="200"
              y="92"
              textAnchor="middle"
              fontSize="96"
              fontWeight="800"
              fontFamily={FONT}
              fill="#ffffff"
            >
              MYKSH
            </text>
          </mask>
        </defs>

        <text
          x="200"
          y="92"
          textAnchor="middle"
          fontSize="96"
          fontWeight="800"
          fontFamily={FONT}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(74,222,128,0.45)"
          strokeWidth="1.2"
        >
          MYKSH
        </text>

        <g mask="url(#myksh-loader-mask)">
          <g className="myksh-liquid">
            <path className="myksh-wave-back" d={WAVE_BACK} fill="#22C55E" fillOpacity="0.6" />
            <path className="myksh-wave-front" d={WAVE_FRONT} fill="#4ADE80" />
          </g>
        </g>
      </svg>

      <p className="myksh-loader-hint relative mt-6 text-xs uppercase tracking-[0.35em] text-white/50">
        Cargando
      </p>
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
