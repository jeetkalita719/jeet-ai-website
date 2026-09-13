'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import React from 'react';
import { PROFILE } from '@/lib/profile';
import DoodleAvatar from './doodle-avatar';

export function Presentation() {
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };
  const paragraphAnimation = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut', delay: 0.2 } },
  };

  return (
    <div className="mx-auto w-full max-w-5xl py-6 font-sans">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
        {/* Photo (with the doodle mascot as a small badge) */}
        <div className="relative mx-auto aspect-square w-full max-w-xs">
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            className="bg-accent relative h-full w-full overflow-hidden rounded-3xl"
          >
            {PROFILE.photo ? (
              <Image
                src={PROFILE.photo}
                alt={PROFILE.name}
                fill
                priority
                sizes="(max-width: 768px) 80vw, 320px"
                className="object-cover object-center"
              />
            ) : (
              <div className="flex h-full w-full items-end justify-center pb-2">
                <DoodleAvatar size={240} />
              </div>
            )}
          </motion.div>
          {PROFILE.photo && (
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              animate={{ scale: 1, rotate: -6 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 18 }}
              className="bg-background absolute -right-3 -bottom-3 rounded-2xl p-1 shadow-lg"
              aria-hidden="true"
            >
              <DoodleAvatar size={64} />
            </motion.div>
          )}
        </div>

        <div className="flex flex-col">
          <motion.div initial="hidden" animate="visible" variants={textVariants}>
            <h1 className="from-foreground to-muted-foreground bg-gradient-to-r bg-clip-text text-xl font-semibold text-transparent md:text-3xl">
              {PROFILE.name}
            </h1>
            <div className="mt-1 flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
              <p className="text-muted-foreground">{PROFILE.title}</p>
              <div className="bg-border hidden h-1.5 w-1.5 rounded-full md:block" />
              <p className="text-muted-foreground">{PROFILE.location}</p>
            </div>
          </motion.div>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={paragraphAnimation}
            className="text-foreground mt-6 leading-relaxed whitespace-pre-line"
          >
            {PROFILE.intro}
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-4 flex flex-wrap gap-2"
          >
            {PROFILE.tags.map((tag) => (
              <span key={tag} className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                {tag}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default Presentation;
