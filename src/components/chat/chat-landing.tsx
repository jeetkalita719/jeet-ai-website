'use client';

import { motion } from 'framer-motion';
import { Award, Code, Mail, MessageSquare } from 'lucide-react';
import React from 'react';

interface ChatLandingProps {
  submitQuery: (query: string) => void;
  
}

const ChatLanding: React.FC<ChatLandingProps> = ({
  submitQuery,
}) => {
  const hasReachedLimit = false; // message limits are enforced server-side now
  // Suggested questions that the user can click on
  const suggestedQuestions = [
    {
      icon: <MessageSquare className="h-4 w-4" />,
      text: 'Who are you?',
    },
    {
      icon: <Code className="h-4 w-4" />,
      text: 'What have you built?',
    },
    {
      icon: <Award className="h-4 w-4" />,
      text: 'What can you build for my business?',
    },
    {
      icon: <Mail className="h-4 w-4" />,
      text: 'How do we start a project?',
    },
  ];

  // Animation variants for staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.div
      className="flex w-full flex-col items-center px-4 py-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h2 variants={itemVariants} className="text-foreground text-center text-2xl font-semibold md:text-3xl">
        Ask me anything about Jeet.
      </motion.h2>
      <motion.p variants={itemVariants} className="text-muted-foreground mt-2 max-w-md text-center">
        What he builds, how he works, and whether he can help with what you have in mind.
      </motion.p>
      <div className="mt-8 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestedQuestions.map((q) => (
          <motion.button
            key={q.text}
            variants={itemVariants}
            onClick={() => submitQuery(q.text)}
            className="bg-accent hover:bg-accent/70 text-foreground flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-left text-sm transition-colors"
          >
            <span className="text-muted-foreground">{q.icon}</span>
            {q.text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default ChatLanding;
