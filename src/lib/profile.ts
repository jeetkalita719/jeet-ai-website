/**
 * ONE PLACE for everything about Jeet.
 * Edit this file to change what the site (and the AI assistant) says about you.
 * Cards in the chat and the system prompt both read from here.
 */

export const PROFILE = {
  name: 'Jeet Kalita',
  firstName: 'Jeet',
  title: 'AI Engineer',
  photo: '/jeet.jpg', // shown on the "Me" card; set to '' to fall back to the doodle
  // Hero subline on the landing page. Deliberately NOT a sales pitch.
  tagline: "Ask my AI anything about me — it knows me pretty well.",
  location: 'Pune, India · works remotely, worldwide',
  email: 'jeetkalita719@gmail.com',
  // TODO: paste your real LinkedIn / X URLs — they then appear on the Contact card automatically.
  socials: [
    { name: 'GitHub', url: 'https://github.com/jeetkalita719' },
    // { name: 'LinkedIn', url: 'https://www.linkedin.com/in/YOUR-HANDLE/' },
    // { name: 'X', url: 'https://x.com/YOUR-HANDLE' },
  ],
  education: 'B.E. Electronics & Communication Engineering — BITS Pilani, Goa campus (2022–2026)',
  intro:
    "Hey 👋\nI'm Jeet — 22, originally from Duliajan, a small oil town in Assam. Did my engineering at BITS Goa, now based in Pune.\n\nI build AI things: chatbots, agents, automations, and the websites they live in. Weekends go into RAG, LangGraph and whatever project has my attention that week.\n\nThis assistant you're talking to? Built it myself. Ask it anything.",
  tags: ['AI Engineer', 'Chatbots', 'RAG & Agents', 'LangGraph', 'BITS Goa', 'Pune'],

  /**
   * Story facts the AI can draw on. Not shown as a card — this is what lets the
   * assistant answer "how did you get into AI?", "what's your background?", etc.
   */
  background: [
    '22 years old. Grew up in Duliajan, a small oil town in Assam.',
    'B.E. Electronics & Communication Engineering at BITS Pilani, Goa campus (2022–2026). Four genuinely good years — great friends, and Goa turned him into a party person.',
    'In his first year he co-founded Media Groww, a video-editing agency, with Nikhil Sheoran. First real taste of running something and finding clients.',
    'Design head for TEDxBITSGoa — part of the team that organised the TEDx event on campus.',
    'Along the way he explored finance and swing trading, video editing, and writing LinkedIn content (planning to get back to that soon).',
    'Interned at Indian Oil Corporation and built a stationery-management application for them. Picked that posting mainly because it was closest to home.',
    'Final year is when he went deep on RAG, Gen-AI and LLMs — that is the thing that stuck.',
    'Works full-time at ZS Associates in Pune, on the AI-Commercials team, mostly data-science projects.',
    'Weekends are for building: chatbots, LangGraph and LangChain experiments, RAG pipelines, and whatever random project has his attention.',
    'Has a couple of stealth projects in progress that he cannot talk about yet.',
    'Most at home building chatbots and agents — RAG, tool-calling, LangGraph — and actually shipping them live.',
    'Takes on a small number of client projects at a time (roughly 12–15 hours a week alongside the full-time job), but once a project is accepted it gets priority. A typical build is 2–3 weeks.',
  ],

  resume: {
    // Drop your PDF at /public/resume.pdf and this card starts working.
    url: '/resume.pdf',
    description: 'AI Engineer • chatbots, RAG, agents',
    lastUpdated: 'September 2026',
  },
};

export const SERVICES = [
  {
    key: 'chatbots',
    title: 'AI chatbots & assistants',
    outcome:
      'A custom assistant that actually knows your business — answers customers, handles the repetitive questions, qualifies leads and points people to you. Embedded in your site, exactly like this one. This is the work I most like taking on.',
    tools: ['OpenAI', 'RAG', 'LangChain', 'Vercel AI SDK'],
  },
  {
    key: 'automation',
    title: 'AI automation & agents',
    outcome:
      'Agents and workflows that kill the boring work — follow-ups, data entry, reports, moving things between the tools you already use. Runs while you sleep.',
    tools: ['LangGraph', 'MCP', 'Python', 'FastAPI'],
  },
  {
    key: 'websites',
    title: 'Websites, built or redesigned',
    outcome:
      'A fast, modern site that does its job — from a one-pager to a full presence, with the AI bits built in from day one instead of bolted on later.',
    tools: ['Next.js', 'React', 'Tailwind', 'Vercel'],
  },
  {
    key: 'deployment',
    title: 'Deployment & hosting',
    outcome:
      'Getting it live and keeping it there — cloud deployment, domains, monitoring, maintenance. You should not have to babysit your own product.',
    tools: ['Vercel', 'Docker', 'CI/CD'],
  },
];

export const SKILLS = [
  {
    category: 'AI & LLM engineering',
    skills: [
      'Chatbots & assistants',
      'RAG pipelines',
      'AI agents',
      'LangGraph',
      'LangChain',
      'MCP (Model Context Protocol)',
      'OpenAI API',
      'Prompt engineering',
      'Tool calling',
      'Vector stores (FAISS)',
      'Vercel AI SDK',
    ],
  },
  {
    category: 'Machine learning & data',
    skills: ['Python', 'scikit-learn', 'Pandas / NumPy', 'Recommender systems', 'Data analysis', 'SQL'],
  },
  {
    category: 'Backend & web',
    skills: ['FastAPI', 'Node.js', 'REST APIs', 'Next.js / React', 'TypeScript', 'MongoDB', 'Flask', 'C++'],
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
    title: 'This website',
    category: 'AI-native site',
    description:
      "The site you're on. A chat-first portfolio where an AI assistant answers questions about me and renders projects, services and contact details as interactive cards instead of walls of text. Built with the Vercel AI SDK and OpenAI tool-calling — the same pattern I build into client sites.",
    techStack: ['Next.js', 'Vercel AI SDK', 'OpenAI', 'Tool calling', 'Tailwind', 'TypeScript'],
    date: '2026',
    links: [
      { name: 'Live', url: 'https://jeetkalita.com' },
      { name: 'GitHub', url: 'https://github.com/jeetkalita719/jeet-ai-website' },
    ],
    cover: '/covers/this-site.svg',
  },
  {
    title: 'Job-Intelligence Agent',
    category: 'AI Agent',
    description:
      'An AI agent that runs a job search like a product: discovers roles from live ATS feeds (Greenhouse, Lever, Ashby), ranks them against a profile, tracks them, drafts tailored application material and triages inbox replies. Read-only on email, draft-only output — a human always presses submit.',
    techStack: ['Python', 'OpenAI', 'RAG', 'LangGraph', 'Gmail API', 'ATS feeds'],
    date: '2026',
    links: [],
    cover: '/covers/job-agent.svg',
  },
  {
    title: 'Expense-Tracker MCP Server',
    category: 'MCP / Tool calling',
    description:
      'A local Model Context Protocol server built with FastMCP that logs real transactions and exposes them as tools an AI assistant can call — add, list and summarise expenses in plain language. A working demo of the tool-calling layer that sits underneath good AI products.',
    techStack: ['Python', 'FastMCP', 'MCP', 'Claude Desktop'],
    date: '2026',
    links: [],
    cover: '/covers/expense-mcp.svg',
  },
  {
    title: 'YouTube Transcript RAG Chatbot',
    category: 'RAG',
    description:
      'Paste a YouTube link, then ask questions about the video. Pulls the transcript, chunks it, embeds it with OpenAI into a FAISS vector store and answers using a contextual-compression retriever on top of LangChain. Small, clean, end-to-end RAG.',
    techStack: ['Python', 'LangChain', 'OpenAI embeddings', 'FAISS'],
    date: '2026',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/yt_transcript_chatbot' }],
    cover: '/covers/yt-rag.svg',
  },
  {
    title: 'Media Groww',
    category: 'Co-founded venture',
    description:
      'A video-editing agency I co-founded with Nikhil Sheoran in my first year at BITS Goa. We found our own clients and delivered edits on deadline. It taught me the unglamorous half of running an agency — scoping, pricing, chasing feedback — which is exactly the half most technical people skip.',
    techStack: ['Video editing', 'Client delivery', 'Ops'],
    date: '2022–2024',
    links: [],
    cover: '/covers/media-groww.svg',
  },
  {
    title: 'Book Recommendation System',
    category: 'Machine learning',
    description:
      'A recommender web app: popularity-based picks plus collaborative filtering over a books dataset, served through a Flask app with a simple browsing UI.',
    techStack: ['Python', 'Pandas', 'scikit-learn', 'Flask'],
    date: '2025',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/Book_Recommendation' }],
    cover: '/covers/book-rec.svg',
  },
  {
    title: 'University Course Allocation',
    category: 'Algorithms',
    description:
      'A graph-optimisation solution to a real scheduling problem: assign courses to faculty across three load categories (0.5, 1 and 1.5 courses a semester) while respecting each professor’s ranked preference list and allowing courses to be shared. The goal is to maximise assignments without ever violating a preference constraint.',
    techStack: ['C++', 'Graph optimisation', 'Algorithm design'],
    date: '2025',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/course_allocation_system' }],
    cover: '/covers/course-allocation.svg',
  },
  {
    title: 'Stationery system — Indian Oil',
    category: 'Internship',
    description:
      'Built a stationery-management application during my internship at Indian Oil Corporation — a small internal tool with real users inside a large organisation. First time shipping something that people other than me depended on.',
    techStack: ['JavaScript', 'Node.js', 'REST APIs', 'SQL / MongoDB'],
    date: '2024',
    links: [{ name: 'GitHub', url: 'https://github.com/jeetkalita719/ioclapp' }],
    cover: '/covers/iocl.svg',
  },
];

export const FUN = {
  headline: 'Off the keyboard',
  facts: [
    'Cricket, both ways — I watch it and I play it.',
    'Most weekends involve a gaming café with friends. The rest go into random side projects.',
    'Grew up in Duliajan, a small oil town in Assam. Four years at BITS Goa then turned me into a party person.',
    'Design head for TEDxBITSGoa — we actually pulled the event off.',
    'Currently obsessed with LangGraph and Claude Code.',
    'Gym, cooking my own meals, and an unreasonable number of web series.',
  ],
};

export const QUICK_QUESTIONS = {
  Me: 'Who are you? Tell me about yourself.',
  Projects: 'What have you built? Show me your projects.',
  Services: 'What can you build for my business?',
  Skills: 'What are your skills and stack?',
  Contact: 'How can I reach you to start a project?',
} as const;
