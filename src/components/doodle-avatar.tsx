'use client';

import React from 'react';

/**
 * Jeet's avatar: a hand-drawn "doodle" character (white body, ink outline).
 * Pure inline SVG + CSS, so it needs no image assets and animates for free:
 * idle bob + blink, and a talking mouth while the assistant is answering.
 */
export function DoodleAvatar({
  talking = false,
  size = 112,
  className = '',
}: {
  talking?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`doodle-wrap ${talking ? 'is-talking' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label="Jeet's doodle avatar"
      role="img"
    >
      <svg viewBox="0 0 120 120" width={size} height={size} className="doodle-svg">
        <defs>
          <filter id="doodle-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#0b1220" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* body / shoulders */}
        <g className="doodle-body" filter="url(#doodle-shadow)">
          <path
            d="M26 118 C26 92 40 82 60 82 C80 82 94 92 94 118 Z"
            fill="var(--doodle-body)"
            stroke="var(--doodle-ink)"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* collar line */}
          <path d="M48 84 Q60 96 72 84" fill="none" stroke="var(--doodle-ink)" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* head */}
        <g className="doodle-head" filter="url(#doodle-shadow)">
          <circle cx="60" cy="50" r="30" fill="var(--doodle-body)" stroke="var(--doodle-ink)" strokeWidth="3.2" />
          {/* hair tuft */}
          <path d="M40 30 Q48 14 60 20 Q72 12 80 30" fill="none" stroke="var(--doodle-ink)" strokeWidth="3" strokeLinecap="round" />
          {/* ear */}
          <path d="M31 50 q-6 0 -5 7 q1 5 6 4" fill="var(--doodle-body)" stroke="var(--doodle-ink)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M89 50 q6 0 5 7 q-1 5 -6 4" fill="var(--doodle-body)" stroke="var(--doodle-ink)" strokeWidth="2.4" strokeLinecap="round" />
          {/* eyes */}
          <g className="doodle-eyes">
            <ellipse cx="49" cy="49" rx="3" ry="4.2" fill="var(--doodle-ink)" />
            <ellipse cx="71" cy="49" rx="3" ry="4.2" fill="var(--doodle-ink)" />
            <circle cx="50.2" cy="47.6" r="1" fill="#fff" />
            <circle cx="72.2" cy="47.6" r="1" fill="#fff" />
          </g>
          {/* brows */}
          <path d="M43 40 q6 -4 12 -1" fill="none" stroke="var(--doodle-ink)" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M65 39 q6 -3 12 1" fill="none" stroke="var(--doodle-ink)" strokeWidth="2.4" strokeLinecap="round" />
          {/* nose */}
          <path d="M60 52 q-3 5 1 7" fill="none" stroke="var(--doodle-ink)" strokeWidth="2.2" strokeLinecap="round" />
          {/* mouth: smile at rest, opens while talking */}
          <path className="doodle-mouth" d="M50 64 Q60 72 70 64" fill="none" stroke="var(--doodle-ink)" strokeWidth="2.8" strokeLinecap="round" />
          <ellipse className="doodle-mouth-open" cx="60" cy="66" rx="6" ry="4" fill="var(--doodle-ink)" />
          {/* cheeks */}
          <circle cx="42" cy="58" r="3.2" fill="var(--doodle-accent)" opacity="0.35" />
          <circle cx="78" cy="58" r="3.2" fill="var(--doodle-accent)" opacity="0.35" />
        </g>
      </svg>

      <style jsx>{`
        .doodle-wrap {
          --doodle-body: #ffffff;
          --doodle-ink: #151b26;
          --doodle-accent: #18b4d8;
          display: inline-block;
          line-height: 0;
        }
        :global(.dark) .doodle-wrap {
          --doodle-ink: #4fe3ff;
        }
        .doodle-svg {
          overflow: visible;
        }
        .doodle-head {
          transform-origin: 60px 80px;
          animation: doodle-bob 3.2s ease-in-out infinite;
        }
        .doodle-body {
          transform-origin: 60px 118px;
          animation: doodle-breathe 3.2s ease-in-out infinite;
        }
        .doodle-eyes {
          transform-origin: 60px 49px;
          animation: doodle-blink 4.6s infinite;
        }
        .doodle-mouth-open {
          opacity: 0;
          transform-origin: 60px 66px;
        }
        .is-talking .doodle-mouth {
          opacity: 0;
        }
        .is-talking .doodle-mouth-open {
          opacity: 1;
          animation: doodle-talk 0.28s ease-in-out infinite alternate;
        }
        .is-talking .doodle-head {
          animation: doodle-nod 0.9s ease-in-out infinite;
        }
        @keyframes doodle-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-2px) rotate(-2deg); }
        }
        @keyframes doodle-breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.02); }
        }
        @keyframes doodle-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.08); }
        }
        @keyframes doodle-talk {
          from { transform: scaleY(0.35); }
          to { transform: scaleY(1); }
        }
        @keyframes doodle-nod {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-1px) rotate(2.5deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .doodle-head, .doodle-body, .doodle-eyes, .doodle-mouth-open { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default DoodleAvatar;
