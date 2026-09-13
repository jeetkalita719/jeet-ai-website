import { tool } from 'ai';
import { z } from 'zod';

export const getPresentation = tool({
  description: `Shows a card introducing Jeet Kalita. Use for: who are you, tell me about yourself, introduce yourself.`,
  parameters: z.object({}),
  execute: async () => `Here is a quick intro to me (card above). Ask me anything else!`,
});
