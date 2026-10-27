'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutGroup } from 'framer-motion';
import { useChatMessages } from '@/components/chat/chat-messages-context';
import { ChannelTiles } from '@/components/contact/channel-tiles';
import { DraftEmail } from '@/components/contact/draft-email';
import { NoteComposer } from '@/components/contact/note-composer';
import { NotesWall, type WallStatus } from '@/components/contact/notes-wall';
import { STORE_CAP, WALL_LIMIT, type Note } from '@/lib/notes';
import { PROFILE } from '@/lib/profile';

export function Contact() {
  const messages = useChatMessages();
  const [notes, setNotes] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<WallStatus>('loading');
  const [ownIds, setOwnIds] = useState<Set<string>>(() => new Set());
  const [flyingId, setFlyingId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/notes', { cache: 'no-store', signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { notes: Note[]; total: number; offline?: boolean } =
          await res.json();
        if (data.offline) return setStatus('offline');
        setNotes(data.notes.slice(0, WALL_LIMIT));
        setTotal(data.total);
        setStatus('ready');
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('error');
      });
    return () => ctrl.abort();
  }, []);

  // Safety net in case the flight's layout animation never reports completion.
  useEffect(() => {
    if (!flyingId) return;
    const t = setTimeout(() => setFlyingId(null), 1500);
    return () => clearTimeout(t);
  }, [flyingId]);

  const onPublishStart = useCallback(() => {
    setFlyingId(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const onPublished = useCallback((note: Note) => {
    setNotes((prev) => [note, ...prev].slice(0, WALL_LIMIT));
    setTotal((t) => Math.min(t + 1, STORE_CAP));
    setOwnIds((prev) => new Set(prev).add(note.id));
    setFlyingId(note.id);
    setStatus((s) => (s === 'error' ? 'ready' : s));
  }, []);

  const onFlightDone = useCallback(() => setFlyingId(null), []);

  return (
    <div className="mx-auto mt-8 w-full">
      <div className="bg-accent/90 flex w-full flex-col gap-6 overflow-hidden rounded-3xl px-5 py-7 font-sans sm:px-8 md:px-10 md:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-foreground text-3xl font-semibold md:text-4xl">
            {PROFILE.contact.heading}
          </h2>
          <span className="text-muted-foreground mt-2 text-sm sm:mt-0">
            {PROFILE.contact.subline}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <ChannelTiles />
          <DraftEmail messages={messages} />
        </div>

        <LayoutGroup>
          <NoteComposer
            offline={status === 'offline'}
            onPublishStart={onPublishStart}
            onPublished={onPublished}
          />
          <NotesWall
            notes={notes}
            total={total}
            status={status}
            ownIds={ownIds}
            flyingId={flyingId}
            onFlightDone={onFlightDone}
            scrollRef={scrollRef}
          />
        </LayoutGroup>
      </div>
    </div>
  );
}

export default Contact;
