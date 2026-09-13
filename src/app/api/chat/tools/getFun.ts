import { tool } from 'ai';
import { z } from 'zod';

export const getFun = tool({
  description: `Shows fun facts about Jeet outside work. Use for: hobbies, fun, what do you do outside work, tell me something interesting about you.`,
  parameters: z.object({}),
  execute: async () => `Some off-keyboard facts about me (above).`,
});
