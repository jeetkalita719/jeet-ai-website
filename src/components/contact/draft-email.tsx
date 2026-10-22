'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cpClamp } from '@/lib/notes';
import { PROFILE } from '@/lib/profile';
import { IconCopy, IconLoader2, IconMail, IconX } from '@tabler/icons-react';
import type { UIMessage } from 'ai';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { copyText } from './copy-text';
import { FIELD } from './field';
import { mailHref } from './links';
import { useCoarsePointer } from './use-coarse-pointer';

const BODY_MAX = 1000;
const SUBJECT_MAX = 80;

type Status = 'idle' | 'drafting' | 'open';

/**
 * "Draft my email from this chat": two steps on purpose. The draft is fetched
 * first, then a second click opens the mail client from a real link, so it is
 * never popup-blocked and the visitor sees what goes out in their name.
 */
export function DraftEmail({ messages }: { messages: UIMessage[] }) {
  const coarse = useCoarsePointer();
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>('idle');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // The contact prompt counts as one visitor message, so they must have asked something else first.
  if (messages.filter((m) => m.role === 'user').length < 2) return null;

  const openWith = (s: string, b: string) => {
    setSubject(s);
    setBody(b);
    setStatus('open');
  };

  const draft = async () => {
    setStatus('drafting');
    let result: { subject: string; body: string } | null = null;
    try {
      const res = await fetch('/api/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (res.ok) result = await res.json();
    } catch {
      // fall through to the starter template
    }
    if (!mounted.current) return;
    if (result?.subject && result?.body) {
      openWith(result.subject, result.body);
    } else {
      toast("Couldn't draft that — here's a starter instead.");
      openWith(PROFILE.contact.emailSubject, PROFILE.contact.emailBody);
    }
  };

  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, height: 0 },
        animate: { opacity: 1, height: 'auto' },
        exit: { opacity: 0, height: 0 },
      };

  return (
    <div className="flex flex-col gap-3">
      {status !== 'open' && (
        <button
          type="button"
          onClick={draft}
          disabled={status === 'drafting'}
          className="bg-card/60 text-foreground hover:bg-card flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm ring-1 ring-white/10 transition outline-none hover:ring-white/15 focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-wait disabled:opacity-70"
        >
          {status === 'drafting' ? (
            <>
              <IconLoader2 aria-hidden className="h-4 w-4 animate-spin" />{' '}
              Drafting…
            </>
          ) : (
            '✨ Draft my email from this chat'
          )}
        </button>
      )}

      <AnimatePresence initial={false}>
        {status === 'open' && (
          <motion.div
            key="draft-panel"
            {...panelMotion}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="bg-card flex flex-col gap-3 rounded-2xl p-4 ring-1 ring-white/10">
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Subject</span>
                <input
                  value={subject}
                  onChange={(e) =>
                    setSubject(cpClamp(e.target.value, SUBJECT_MAX))
                  }
                  className={FIELD}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Message</span>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(cpClamp(e.target.value, BODY_MAX))}
                  rows={6}
                  className="max-h-64"
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild size="sm">
                  <a
                    href={mailHref({ subject, body, coarse })}
                    {...(coarse
                      ? {}
                      : { target: '_blank', rel: 'noopener noreferrer' })}
                  >
                    <IconMail aria-hidden />{' '}
                    {coarse ? 'Open in Mail' : 'Open in Gmail'}
                  </a>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    copyText(
                      `Subject: ${subject}\n\n${body}`,
                      'Draft copied',
                      `Email: ${PROFILE.email}`
                    )
                  }
                >
                  <IconCopy aria-hidden /> Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setStatus('idle')}
                  className="ml-auto"
                >
                  <IconX aria-hidden /> Discard
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DraftEmail;
