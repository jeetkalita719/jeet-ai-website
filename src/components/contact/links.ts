import { filled, PROFILE } from '@/lib/profile';

const { handles, contact, email } = PROFILE;
const enc = encodeURIComponent;

/** Opens the DM thread (app on phones; instagram.com/direct on desktop, login required). */
export const instagramHref = () => `https://ig.me/m/${enc(handles.instagram)}`;

/** DM composer with prefilled text; falls back to the profile without a numeric user id. */
export const xHref = () =>
  filled(handles.xUserId)
    ? `https://x.com/messages/compose?recipient_id=${enc(handles.xUserId)}&text=${enc(contact.dmText)}`
    : `https://x.com/${enc(handles.x)}`;

/** LinkedIn has no reliable DM deep link, so this is the profile. */
export const linkedinHref = () =>
  `https://www.linkedin.com/in/${enc(handles.linkedin)}/`;

/**
 * Gmail compose on desktop (`mailto:` silently does nothing on many desktops
 * with no mail app); `mailto:` on touch devices, which opens the mail app.
 */
export function mailHref({
  subject = contact.emailSubject,
  body = contact.emailBody,
  coarse,
}: {
  subject?: string;
  body?: string;
  coarse: boolean;
}) {
  return coarse
    ? `mailto:${email}?subject=${enc(subject)}&body=${enc(body)}`
    : `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(email)}&su=${enc(subject)}&body=${enc(body)}`;
}
