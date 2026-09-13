import { tool } from 'ai';
import { z } from 'zod';

export const getProjects = tool({
  description: `Shows a carousel of all projects Jeet has built. Use for: projects, portfolio, what have you built, examples of your work.`,
  parameters: z.object({}),
  execute: async () => `Here are my projects (above). Tap any card for details. Happy to go deeper on any of them.`,
});
