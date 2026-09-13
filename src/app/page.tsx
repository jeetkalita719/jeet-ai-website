'use client';

import DoodleAvatar from '@/components/doodle-avatar';
import FluidCursor from '@/components/FluidCursor';
import { Button } from '@/components/ui/button';
import { PROFILE, QUICK_QUESTIONS } from '@/lib/profile';
import { motion } from 'framer-motion';
import { ArrowRight, BriefcaseBusiness, GraduationCap, Laugh, Layers, UserRoundSearch } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

const questionConfig = [
  { key: 'Me', color: '#329696', icon: Laugh },
  { key: 'Projects', color: '#3E9858', icon: BriefcaseBusiness },
  { key: 'Services', color: '#0E9DBF', icon: Layers },
  { key: 'Skills', color: '#856ED9', icon: GraduationCap },
  { key: 'Contact', color: '#C19433', icon: UserRoundSearch },
] as const;

export default function Home() {
  const [input, setInput] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const goToChat = (query: string) => router.push(`/chat?query=${encodeURIComponent(query)}`);

  const topElementVariants = {
    hidden: { opacity: 0, y: -60 },
    visible: { opacity: 1, y: 0, transition: { type: 'ease', duration: 0.8 } },
  };
  const bottomElementVariants = {
    hidden: { opacity: 0, y: 80 },
    visible: { opacity: 1, y: 0, transition: { type: 'ease', duration: 0.8, delay: 0.2 } },
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pb-10 md:pb-20">
      {/* big blurred footer word */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center overflow-hidden">
        <div
          className="hidden bg-gradient-to-b from-neutral-500/10 to-neutral-500/0 bg-clip-text text-[10rem] leading-none font-black text-transparent select-none sm:block lg:text-[16rem]"
          style={{ marginBottom: '-2.5rem' }}
        >
          {PROFILE.firstName}
        </div>
      </div>

      {/* header */}
      <motion.div
        className="z-1 mt-24 mb-6 flex flex-col items-center text-center md:mt-4 md:mb-10"
        variants={topElementVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-secondary-foreground mt-1 text-xl font-semibold md:text-2xl">Hey, I&apos;m {PROFILE.firstName} 👋</h2>
        <h1 className="text-4xl font-bold sm:text-5xl md:text-6xl lg:text-7xl">{PROFILE.title}</h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm md:text-base">{PROFILE.tagline}</p>
      </motion.div>

      {/* centre avatar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.19, 1, 0.22, 1] }}
        className="relative z-10 flex items-end justify-center"
      >
        <DoodleAvatar size={200} />
      </motion.div>

      {/* input + quick buttons */}
      <motion.div
        variants={bottomElementVariants}
        initial="hidden"
        animate="visible"
        className="z-10 mt-4 flex w-full flex-col items-center justify-center md:px-0"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) goToChat(input.trim());
          }}
          className="relative w-full max-w-lg"
        >
          <div className="mx-auto flex items-center rounded-full border border-neutral-200 bg-white/30 py-2.5 pr-2 pl-6 backdrop-blur-lg transition-all hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything…"
              className="w-full border-none bg-transparent text-base text-neutral-800 placeholder:text-neutral-500 focus:outline-none dark:text-neutral-200 dark:placeholder:text-neutral-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              aria-label="Submit question"
              className="flex items-center justify-center rounded-full bg-[#0E9DBF] p-2.5 text-white transition-colors hover:bg-[#0b8aa8] disabled:opacity-70"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </form>

        <div className="mt-4 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {questionConfig.map(({ key, color, icon: Icon }) => (
            <Button
              key={key}
              onClick={() => goToChat(QUICK_QUESTIONS[key])}
              variant="outline"
              className="border-border hover:bg-border/30 aspect-square w-full cursor-pointer rounded-2xl border bg-white/30 py-8 shadow-none backdrop-blur-lg active:scale-95 md:p-10 dark:bg-neutral-800/40"
            >
              <div className="text-foreground flex h-full flex-col items-center justify-center gap-1">
                <Icon size={22} strokeWidth={2} color={color} />
                <span className="text-xs font-medium sm:text-sm">{key}</span>
              </div>
            </Button>
          ))}
        </div>

        <p className="text-muted-foreground mt-8 text-xs">
          Powered by an AI assistant I built — the same kind I build for clients.
        </p>
      </motion.div>
      <FluidCursor />
    </div>
  );
}
