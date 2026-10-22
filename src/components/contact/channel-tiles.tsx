'use client';

import { filled, PROFILE } from '@/lib/profile';
import { cn } from '@/lib/utils';
import {
  IconBrandInstagram,
  IconBrandLinkedin,
  IconBrandX,
  IconCopy,
  IconMail,
} from '@tabler/icons-react';
import { copyText } from './copy-text';
import { instagramHref, linkedinHref, mailHref, xHref } from './links';
import { useCoarsePointer } from './use-coarse-pointer';

type Tile = {
  key: string;
  label: string;
  hint: string;
  href: string;
  Icon: typeof IconMail;
  tint: string; // full class string so Tailwind sees it
  external: boolean;
  show: boolean;
};

const TILE =
  'group bg-card flex h-full flex-col gap-3 rounded-2xl p-4 ring-1 ring-white/5 transition outline-none hover:-translate-y-0.5 hover:ring-white/15 focus-visible:ring-2 focus-visible:ring-white/60';

export function ChannelTiles() {
  const coarse = useCoarsePointer();
  const { handles, email } = PROFILE;

  const tiles: Tile[] = [
    {
      key: 'instagram',
      label: 'Instagram',
      hint: 'DM me',
      href: instagramHref(),
      Icon: IconBrandInstagram,
      tint: 'group-hover:text-pink-400',
      external: true,
      show: filled(handles.instagram),
    },
    {
      key: 'x',
      label: 'X',
      hint: 'DM me',
      href: xHref(),
      Icon: IconBrandX,
      tint: 'group-hover:text-foreground',
      external: true,
      show: filled(handles.x),
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      hint: 'Connect',
      href: linkedinHref(),
      Icon: IconBrandLinkedin,
      tint: 'group-hover:text-sky-400',
      external: true,
      show: filled(handles.linkedin),
    },
    {
      key: 'mail',
      label: 'Mail',
      hint: 'Email me',
      href: mailHref({ coarse }),
      Icon: IconMail,
      tint: 'group-hover:text-amber-400',
      external: !coarse, // Gmail web opens in a new tab; mailto: never does
      show: filled(email),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles
        .filter((t) => t.show)
        .map(({ key, label, hint, href, Icon, tint, external }) => (
          // The copy button is a sibling of the link, never nested inside it.
          <div key={key} className="relative">
            <a
              href={href}
              className={TILE}
              {...(external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            >
              <Icon
                aria-hidden
                className={cn(
                  'text-muted-foreground h-6 w-6 transition-colors',
                  tint
                )}
              />
              <span className="flex flex-col">
                <span className="text-foreground text-sm font-medium">
                  {label}
                </span>
                <span className="text-muted-foreground text-xs">{hint}</span>
              </span>
            </a>
            {key === 'mail' && (
              <button
                type="button"
                aria-label="Copy email address"
                onClick={() =>
                  copyText(email, 'Email copied', `Email: ${email}`)
                }
                className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded-lg p-1.5 transition-colors outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <IconCopy aria-hidden className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
    </div>
  );
}

export default ChannelTiles;
