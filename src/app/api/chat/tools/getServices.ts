import { tool } from 'ai';
import { z } from 'zod';

export const getServices = tool({
  description: `Shows the four services Jeet offers to businesses and creators (chatbots, automation/agents, websites, deployment) with outcomes. Use for: what can you build for me, services, offerings, pricing, how do you work with clients.`,
  parameters: z.object({}),
  execute: async () => `These are the four ways I help (above). Tell me about your business and I will point you to the right one.`,
});
