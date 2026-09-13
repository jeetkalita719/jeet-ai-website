import { tool } from 'ai';
import { z } from 'zod';

export const getSkills = tool({
  description: `Shows Jeet's skills and tech stack grouped by category. Use for: skills, stack, technologies, what are you good at.`,
  parameters: z.object({}),
  execute: async () => `My skills and stack are above. Ask me how any of them applies to what you want to build.`,
});
