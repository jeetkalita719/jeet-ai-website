import { toast } from 'sonner';

/** Copies to the clipboard with a toast; shows `fallback` instead when the Clipboard API is unavailable. */
export async function copyText(text: string, ok: string, fallback: string) {
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  } catch {
    toast(fallback);
  }
}
