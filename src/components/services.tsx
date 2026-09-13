'use client';

import { motion } from 'framer-motion';
import { Bot, Globe, Rocket, Workflow } from 'lucide-react';
import React from 'react';
import { SERVICES } from '@/lib/profile';

const ICONS: Record<string, React.ReactNode> = {
  chatbots: <Bot className="h-5 w-5" />,
  automation: <Workflow className="h-5 w-5" />,
  websites: <Globe className="h-5 w-5" />,
  deployment: <Rocket className="h-5 w-5" />,
};

export default function Services() {
  return (
    <div className="mx-auto w-full max-w-5xl py-6 font-sans">
      <h2 className="text-foreground text-2xl font-semibold md:text-3xl">What I build for you</h2>
      <p className="text-muted-foreground mt-1 mb-6">Framed by outcome, not jargon. Every engagement ends with something live.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SERVICES.map((s, i) => (
          <motion.div
            key={s.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.45, ease: 'easeOut' }}
            className="bg-accent flex flex-col gap-3 rounded-2xl p-5"
          >
            <div className="text-foreground flex items-center gap-2 font-semibold">
              <span className="bg-background text-foreground flex h-9 w-9 items-center justify-center rounded-xl">{ICONS[s.key]}</span>
              <span className="text-lg">{s.title}</span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">{s.outcome}</p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {s.tools.map((t) => (
                <span key={t} className="bg-background text-muted-foreground rounded-md px-2 py-0.5 text-xs">
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
