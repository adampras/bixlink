import { z } from 'zod';

export const supportDeskSchema = z.object({
  whatsapp: z.string().trim().max(20).regex(/^\+?[0-9]{0,18}$/, 'WhatsApp: digits only').default(''),
  telegram: z.string().trim().max(64).regex(/^@?[A-Za-z0-9_]{0,40}$/, 'Telegram: username only').default(''),
  bixcallId: z.string().trim().max(40).default(''),
  bixcallUserId: z.string().uuid().or(z.literal('')).default(''),
  bixcallName: z.string().trim().max(60).default(''),
  float24: z.boolean().default(false),
  greeting: z.string().trim().max(160).default(''),
}).strict();
export type SupportDesk = z.infer<typeof supportDeskSchema>;

/** Pages where FOX AI is shown: public landing and the main member home only. */
export const FOX_CHAT_PATHS = ['/', '/dashboard'];
export const foxChatVisible = (path: string) => FOX_CHAT_PATHS.includes(path.replace(/\/+$/, '') || '/');

/** Issues FOX AI must hand to an official operator instead of the upline. */
export const ESCALATE = /\b(deposit|depo|withdraw|wd|penarikan|tarik|txid|tx\s*hash|hash|usdt|saldo|balance|belum masuk|tidak masuk|salah jaringan|wrong network|refund|akun|account|password|login|hack|scam|penipuan|locked|terkunci)\b/i;
export const needsOperator = (t: string) => ESCALATE.test(t);

export function waLink(num: string, text: string) {
  const d = num.replace(/[^0-9]/g, '').replace(/^0/, '62');
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : '';
}
export function tgLink(user: string) {
  const u = user.replace(/^@/, '');
  return u ? `https://t.me/${u}` : '';
}
