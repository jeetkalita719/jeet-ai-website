'use client';

import type { Note } from '@/lib/notes';
import { cn } from '@/lib/utils';
import { IconChevronDown } from '@tabler/icons-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

export type WallStatus = 'loading' | 'ready' | 'error' | 'offline';

interface NotesWallProps {
  notes: Note[];
  total: number;
  status: WallStatus;
  ownIds: Set<string>;
  flyingId: string | null; // the just-published note, which shares layoutId="note-draft" with the composer
  onFlightDone: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];
const rtf = new Intl.RelativeTimeFormat('en', {
  numeric: 'auto',
  style: 'narrow',
});

function relativeTime(iso: string) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(seconds) || seconds < 60) return 'just now';
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
  }
  return 'just now';
}

// Visitors sometimes type their own quotes; drop one wrapping pair so we don't show ““…””.
const WRAPPING_QUOTES = /^["“”'‘’](.+)["“”'‘’]$/u;
const unquote = (s: string) => s.match(WRAPPING_QUOTES)?.[1].trim() || s;

const LAYOUT_SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const;

export function NotesWall({
  notes,
  total,
  status,
  ownIds,
  flyingId,
  onFlightDone,
  scrollRef,
}: NotesWallProps) {
  const reduceMotion = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [moreBelow, setMoreBelow] = useState(false);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setOverflowing(el.scrollHeight > el.clientHeight + 1);
    setAtTop(el.scrollTop <= 8);
    setMoreBelow(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
  }, [scrollRef]);

  const showGrid = notes.length > 0;

  useEffect(() => {
    measure();
    if (!showGrid || typeof ResizeObserver === 'undefined') return;
    // The scroller's own size is capped, so watch the grid for content changes too.
    const ro = new ResizeObserver(measure);
    if (scrollRef.current) ro.observe(scrollRef.current);
    if (gridRef.current) ro.observe(gridRef.current);
    return () => ro.disconnect();
  }, [measure, notes, showGrid, scrollRef]);

  const countLabel =
    status === 'ready' || showGrid
      ? `${total} ${total === 1 ? 'note' : 'notes'}`
      : null;

  return (
    <section aria-label="Notes from visitors" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-foreground text-sm font-medium">
          Notes from visitors
        </h3>
        {countLabel && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {countLabel}
          </span>
        )}
      </div>

      {status === 'loading' && (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
          aria-hidden
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-card h-32 animate-pulse rounded-2xl" />
          ))}
        </div>
      )}

      {!showGrid && status !== 'loading' && (
        <p className="text-muted-foreground bg-card/40 rounded-2xl px-4 py-6 text-center text-sm">
          {status === 'offline'
            ? 'Notes are taking a break.'
            : status === 'error'
              ? "Couldn't load notes right now."
              : 'No notes yet — be the first.'}
        </p>
      )}

      {showGrid && (
        <>
          <motion.div
            layoutScroll
            ref={scrollRef}
            onScroll={measure}
            className={cn(
              'custom-scrollbar max-h-[21.5rem] overflow-y-auto overscroll-contain',
              moreBelow &&
                '[mask-image:linear-gradient(to_bottom,black_80%,transparent)]'
            )}
          >
            <div
              ref={gridRef}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3"
            >
              {notes.map((note) => {
                const flying = note.id === flyingId;
                return (
                  <motion.article
                    key={note.id}
                    layout={!reduceMotion}
                    layoutId={
                      !reduceMotion && flying ? 'note-draft' : undefined
                    }
                    onLayoutAnimationComplete={
                      flying ? onFlightDone : undefined
                    }
                    transition={{ layout: LAYOUT_SPRING }}
                    initial={reduceMotion && flying ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    className="bg-card flex h-32 flex-col rounded-2xl p-4 ring-1 ring-white/5"
                  >
                    <p className="text-foreground line-clamp-4 text-sm [overflow-wrap:anywhere]">
                      &ldquo;{unquote(note.text)}&rdquo;
                    </p>
                    <span className="flex-1" />
                    <p className="text-muted-foreground truncate text-xs">
                      — {note.name} · {relativeTime(note.createdAt)}
                      {ownIds.has(note.id) && ' · you'}
                    </p>
                  </motion.article>
                );
              })}
            </div>
          </motion.div>
          <p
            aria-hidden
            className={cn(
              'text-muted-foreground/70 -mt-1 flex items-center justify-center gap-1 text-xs transition-opacity duration-300',
              overflowing && atTop ? 'opacity-100' : 'opacity-0'
            )}
          >
            Scroll to view <IconChevronDown className="h-3 w-3" />
          </p>
        </>
      )}
    </section>
  );
}

export default NotesWall;
