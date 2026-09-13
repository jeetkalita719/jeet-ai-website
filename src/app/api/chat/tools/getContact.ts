import { tool } from 'ai';
import { z } from 'zod';

export const getContact = tool({
  description: `Shows Jeet's contact card (email + links). Use for: contact, reach you, email, start a project, book a call, hire you.`,
  parameters: z.object({}),
  execute: async () => `My contact details are above. Email me a line about what you want to build and I will reply personally, usually within a day.`,
});
