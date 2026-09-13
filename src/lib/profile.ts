/**
 * ONE PLACE for everything about Jeet.
 * Edit this file to change what the site (and the AI assistant) says about you.
 * Cards in the chat and the system prompt both read from here.
 */

export const PROFILE = {
  name: 'Jeet Kalita',
  firstName: 'Jeet',
  title: 'AI Engineer',
  tagline: 'I build AI chatbots, automations and modern websites for businesses & creators — shipped and live.',
  location: 'India · working with clients worldwide (remote)',
  email: 'jeetkalita719@gmail.com',
  // TODO: add your LinkedIn / X URLs here and they appear everywhere automatically.
  socials: [
    { name: 'GitHub', url: 'https://github.com/jeetkalita719' },
    // { name: 'LinkedIn', url: 'https://www.linkedin.com/in/YOUR-HANDLE/' },
    // { name: 'X', url: 'https://x.com/YOUR-HANDLE' },
  ],
  education: 'B.E. Electronics & Communication Engineering, BITS Pilani (Goa campus)',
  intro:
    "Hey 👋\nI'm Jeet — an AI engineer from India who'd rather ship a working thing than pitch a roadmap. I build AI chatbots, agents and automations for businesses and creators, and the modern websites they live in. This assistant you're talking to? Built it myself — it's the same kind of thing I'd build into your site.",
  tags: ['AI Engineer', 'RAG & Agents', 'LangGraph', 'FastAPI', 'MCP', 'BITS Pilani'],
  resume: {
    // Drop your PDF at /public/resume.pdf and this card starts working.
    url: '/resume.pdf',
    description: 'AI Engineer • RAG, agents & automation',
    lastUpdated: 'September 2026',
  },
};

export const SERVICES = [
  {
    key: 'chatbots',
    title: 'AI chatbots & assistants',
    outcome: 'A custom assistant trained on your business that answers customers, qualifies leads and books calls — embedded in your site, like this one.',
    tools: ['OpenAI', 'RAG', 'LangChain', 'Vercel AI SDK'],
  },
  {
    key: 'automation',
    title: 'AI automation & agents',
    outcome: 'Agents and workflows that kill repetitive work — follow-ups, data entry, reports, integrations across your tools — running while you sleep.',
    tools: ['LangGraph', 'MCP', 'Python', 'FastAPI'],
  },
  {
    key: 'websites',
    title: 'Websites, built or redesigned',
    outcome: 'A fast, modern site that actually converts — from a one-pager to a full presence, with the AI features built in from day one.',
    tools: ['Next.js', 'React', 'Tailwind', 'Vercel'],
  },
  {
    key: 'deployment',
    title: 'Deployment & hosting',
    outcome: 'Getting it live and keeping it there — cloud deployment, domains, monitoring and maintenance without you babysitting it.',
    tools: ['Vercel', 'Docker', 'CI/CD'],
  },
];

export const SKILLS = [
  {
    category: 'AI & LLM engineering',
    skills: ['RAG pipelines', 'AI agents', 'LangChain', 'LangGraph', 'MCP (Model Context Protocol)', 'OpenAI API', 'Prompt engineering', 'Tool calling', 'Vector stores (FAISS)', 'Vercel AI SDK'],
  },
  {
    category: 'Machine learning & data',
    skills: ['Python', 'scikit-learn', 'Pandas / NumPy', 'Recommender systems', 'Data analysis', 'SQL'],
  },
  {
    category: 'Backend & web',
    skills: ['FastAPI', 'Node.js', 'REST APIs', 'Next.js / React', 'TypeScript', 'MongoDB', 'Flask'],
  },
  {
    category: 'Tooling',
    skills: ['Git / GitHub', 'Docker', 'Vercel', 'Claude Code', 'Linux / PowerShell'],
  },
  {
    category: 'How I work',
    skills: ['Ship small, ship live', 'Clear async communication', 'Fast learner', 'Ownership end-to-end'],
  },
];

export type Project = {
  title: string;
  category: string;
  description: string;
  techStack: string[];
  date: string;
  links: { name: string; url: string }[];
  cover: string; // path under /public
};

export const PROJECTS: Project[] = [
  {
    title: 'Job-Intelligence Agent',
    category: 'AI Agent',
    description:
      'An AI agent that runs a job search like a product: it discovers roles from live ATS feeds (Greenhouse, Lever, Ashby), ranks them against a profile, tracks them, drafts tailored application materials and triages inbox replies — read-only Gmail, draft-only output, human always submits. Local-first, graduating to Docker/cloud.',
    techStack: ['Python', 'OpenAI', 'RAG', 'LangGraph', 'Gmail API', 'ATS feeds'],
    date: '2026',
    links: [],
    cover: '/covers/job-agent.svg',
  },
  {
    title: 'This website',
    category: 'AI-native site',
    description:
      "The site you're on. A chat-first portfolio where an AI assistant answers questions about me, shows projects and services as interactive cards, and helps visitors figure out how I can help them. The same pattern I build for clients.",
    techStack: ['Next.js', 'Vercel AI SDK', 'OpenAI', 'Tool calling', 'Tailwind'],
    date: '2026',
    links: [],
    cover: '/covers/this-site.svg',
  },
  {
    title: 'Expense-Tracker MCP Server',
    category: 'MCP / Tool calling',
    description:
      'A local Model Context Protocol server built with FastMCP that logs real transactions and exposes them as tools an AI assistant can call — add, list and summarize expenses in plain language. A working demo of the tool-calling layer behind good AI products.',
    techStack: ['Python', 'FastMCP', 'MCP', 'Claude Desktop'],
    date: '2026',
    links: [],
    cover: '/covers/expense-mcp.svg',
  },
  {
    title: 'YouTube Transcript RAG Chatbot',
    category: 'RAG',
    description:
      'Paste a YouTube link, ask questions about the video. Pulls the transcript, chunks it, embeds it with OpenAI into a FAISS vector store, and answers with a contextual-compression retriever + LangChain. Small, clean, end-to-end RAG.',
    techStack: ['Python', 'LangChain', 'OpenAI embeddings', 'FAISS'],
    date: '2026',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/yt_transcript_chatbot' }],
    cover: '/covers/yt-rag.svg',
  },
  {
    title: 'Book Recommendation System',
    category: 'Machine learning',
    description:
      'A recommender web app: popularity-based picks plus collaborative filtering (item similarity) over a books dataset, served through a Flask app.',
    techStack: ['Python', 'Pandas', 'scikit-learn', 'Flask'],
    date: '2025',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/Book_Recommendation' }],
    cover: '/covers/book-rec.svg',
  },
  {
    title: 'Internal app for Indian Oil',
    category: 'Internship',
    description:
      'Built secure, production-ready internal applications as a Software Developer Intern at Indian Oil Corporation — backend APIs, auth and data handling for real users inside a large organisation.',
    techStack: ['JavaScript', 'Node.js', 'REST APIs', 'SQL / MongoDB'],
    date: '2024',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/ioclapp' }],
    cover: '/covers/iocl.svg',
  },
];

export const FUN = {
  headline: 'Off the keyboard',
  facts: [
    'I document my whole learning path in a “Data Science Journey” notebook — every rabbit hole gets a page.',
    'Roughly eight hours every weekend go into side projects. It’s how everything on this site got built.',
    'I once helped organise a TEDx event — I like being around people who ship ideas, not just talk about them.',
    'LangGraph is my favourite toy right now; MCP is a close second.',
    'Windows PC with a multi-drive setup — yes, I organise my drives like a filing cabinet.',
  ],
};

export const QUICK_QUESTIONS = {
  Me: 'Who are you? Tell me about yourself.',
  Projects: 'What have you built? Show me your projects.',
  Services: 'What can you build for my business?',
  Skills: 'What are your skills and stack?',
  Contact: 'How can I reach you to start a project?',
} as const;
