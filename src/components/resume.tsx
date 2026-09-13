'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { PROFILE } from '@/lib/profile';

export function Resume() {
  const r = PROFILE.resume;
  return (
    <div className="mx-auto w-full py-8 font-sans">
      <motion.a
        href={r.url}
        download
        className="group relative block cursor-pointer overflow-hidden rounded-xl bg-accent p-0 transition-all duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-foreground">{PROFILE.firstName}&apos;s Resume</h3>
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <div className="mt-1 flex text-xs text-muted-foreground">
                <span>PDF</span>
                <span className="mx-2">•</span>
                <span>Updated {r.lastUpdated}</span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background group-hover:opacity-80">
              <Download className="h-5 w-5" />
            </div>
          </div>
        </div>
      </motion.a>
    </div>
  );
}

export default Resume;
