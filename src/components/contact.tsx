'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { PROFILE } from '@/lib/profile';

export function Contact() {
  const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <div className="mx-auto mt-8 w-full">
      <div className="bg-accent w-full overflow-hidden rounded-3xl px-6 py-8 font-sans sm:px-10 md:px-16 md:py-12">
        <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-foreground text-3xl font-semibold md:text-4xl">Let&apos;s build something</h2>
          <span className="text-muted-foreground mt-2 text-sm sm:mt-0">Replies personally, usually within a day</span>
        </div>
        <p className="text-muted-foreground max-w-xl">
          Send a line about what you want to build — a chatbot, an automation, a site — and where you&apos;re stuck. That&apos;s enough to start.
        </p>

        <div className="mt-8 flex flex-col md:mt-10">
          <a href={`mailto:${PROFILE.email}?subject=Project%20inquiry`} className="group mb-5 inline-flex w-fit items-center gap-1">
            <span className="text-base font-medium text-blue-500 hover:underline sm:text-lg">{PROFILE.email}</span>
            <ChevronRight className="h-5 w-5 text-blue-500 transition-transform duration-300 group-hover:translate-x-1" />
          </a>

          <div className="flex flex-wrap gap-x-6 gap-y-5 sm:gap-x-8">
            {PROFILE.socials.map((social) => (
              <button
                key={social.name}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-sm transition-colors"
                onClick={() => openLink(social.url)}
                title={social.name}
              >
                {social.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
