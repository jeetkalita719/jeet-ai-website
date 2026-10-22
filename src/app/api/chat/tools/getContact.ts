import { tool } from 'ai';
import { z } from 'zod';

export const getContact = tool({
  description: `Shows Jeet's contact card (Instagram, X, LinkedIn and email tiles, plus a public notes wall visitors can write on). Use for: contact, connect, reach you, email, socials, Instagram, LinkedIn, Twitter/X, DM, leave a note, guestbook, start a project, book a call, hire you.`,
  parameters: z.object({}),
  execute: async () => `My contact options and the visitors' notes wall are above. Pick whichever's easiest — or leave a note for everyone.`,
});
