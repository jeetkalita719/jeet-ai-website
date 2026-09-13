'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { FUN } from '@/lib/profile';
import DoodleAvatar from './doodle-avatar';

export default function Fun() {
  return (
    <div className="mx-auto w-full max-w-5xl py-6 font-sans">
      <div className="bg-accent grid grid-cols-1 gap-6 rounded-3xl p-6 md:grid-cols-[160px_1fr] md:p-8">
        <div className="flex items-end justify-center">
          <DoodleAvatar size={150} />
        </div>
        <div>
          <h2 className="text-foreground text-2xl font-semibold md:text-3xl">{FUN.headline}</h2>
          <ul className="mt-4 space-y-3">
            {FUN.facts.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="text-foreground flex gap-3 leading-relaxed"
              >
                <span className="text-muted-foreground mt-0.5">✦</span>
                <span>{f}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
