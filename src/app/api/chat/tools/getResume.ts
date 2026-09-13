import { tool } from 'ai';
import { z } from 'zod';

export const getResume = tool({
  description: `Shows a card to download Jeet's resume / CV. Use for: resume, CV, download your resume.`,
  parameters: z.object({}),
  execute: async () => `My resume is above — click to download.`,
});
