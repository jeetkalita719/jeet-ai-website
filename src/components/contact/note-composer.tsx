'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  cpClamp,
  cpLength,
  NAME_MAX,
  normalise,
  NOTE_MAX,
  validateNote,
  type Note,
} from '@/lib/notes';
import { cn } from '@/lib/utils';
import { IconArrowRight, IconLoader2, IconPencil } from '@tabler/icons-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { FIELD } from './field';

interface NoteComposerProps {
  offline: boolean;
  onPublishStart: () => void;
  onPublished: (note: Note) => void; // parent inserts at index 0
}

/**
 * The dashed "leave a note" tile, which expands in place into the composer
 * (shared layoutId, no modal). On publish, its text surface shares
 * layoutId="note-draft" with the new wall card, so the note visibly flies
 * into the top-left slot. The draft survives Esc/Cancel until unmount.
 */
export function NoteComposer({
  offline,
  onPublishStart,
  onPublished,
}: NoteComposerProps) {
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const tileRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (expanded) {
      textRef.current?.focus({ preventScroll: true });
    } else if (returnFocus.current) {
      returnFocus.current = false;
      tileRef.current?.focus({ preventScroll: true });
    }
  }, [expanded]);

  const collapse = () => {
    if (pending) return;
    returnFocus.current = true;
    setExpanded(false);
  };

  const publish = async () => {
    if (pending || offline) return;
    // Same rules as the server, so obvious mistakes never cost a request.
    const check = validateNote({ name, text });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError('');
    setPending(true);
    onPublishStart();

    let note: Note | null = null;
    let message = 'Something went wrong — try again.';
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, text, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data?.note) note = data.note;
      else if (typeof data?.error === 'string') message = data.error;
    } catch {
      // network error: keep the generic message
    }

    if (!mounted.current) return;
    setPending(false);
    if (note) {
      // One commit: the composer collapses and the note lands on the wall.
      setExpanded(false);
      setText('');
      setName('');
      onPublished(note);
    } else {
      setError(message);
    }
  };

  const canPublish = !offline && !pending && normalise(text).length > 0;
  const count = cpLength(text);

  if (!expanded) {
    return (
      <motion.button
        ref={tileRef}
        type="button"
        layoutId={reduceMotion ? undefined : 'note-composer'}
        aria-expanded={false}
        disabled={offline}
        onClick={() => setExpanded(true)}
        className="group text-foreground flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 p-4 text-left text-sm transition-colors outline-none hover:border-white/30 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconPencil
          aria-hidden
          className="text-muted-foreground h-5 w-5 shrink-0"
        />
        <span className="flex-1">I want to leave a note for everyone</span>
        <IconArrowRight
          aria-hidden
          className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
        />
      </motion.button>
    );
  }

  return (
    <motion.div
      layoutId={reduceMotion ? undefined : 'note-composer'}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          collapse();
        }
      }}
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-white/15 p-4"
    >
      <input
        value={name}
        onChange={(e) => setName(cpClamp(e.target.value, NAME_MAX))}
        placeholder="Your name (optional)"
        aria-label="Your name (optional)"
        autoComplete="nickname"
        disabled={pending}
        className={FIELD}
      />

      <motion.div
        layoutId={reduceMotion ? undefined : 'note-draft'}
        className="bg-card rounded-2xl"
      >
        <Textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(cpClamp(e.target.value, NOTE_MAX))}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault(); // notes are single-line
              publish();
            }
          }}
          placeholder="Say hi, share a thought…"
          aria-label="Your note"
          aria-invalid={error ? true : undefined}
          aria-describedby="note-counter"
          rows={2}
          disabled={pending}
          className="resize-none border-0 bg-transparent [overflow-wrap:anywhere] dark:bg-transparent"
        />
      </motion.div>

      {/* Bots fill every field; people never see this one. */}
      <input
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="sr-only"
      />

      <div className="flex items-start justify-between gap-3">
        <p role="alert" className="text-destructive min-h-4 text-xs">
          {error}
        </p>
        <span
          id="note-counter"
          className={cn(
            'shrink-0 text-xs tabular-nums',
            count >= NOTE_MAX ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {count}/{NOTE_MAX}
        </span>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={collapse}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={publish}
          disabled={!canPublish}
        >
          {pending ? (
            <>
              <IconLoader2 aria-hidden className="animate-spin" /> Publishing…
            </>
          ) : (
            'Publish'
          )}
        </Button>
      </div>
    </motion.div>
  );
}

export default NoteComposer;
