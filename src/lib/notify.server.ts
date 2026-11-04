// Server-only: sends owner alerts to Telegram and WhatsApp (Fonnte). Credentials live in secrets.
export type NotifyToggles = { telegram: boolean; whatsapp: boolean; deposit: boolean; withdraw: boolean; review: boolean };
export const DEFAULT_TOGGLES: NotifyToggles = { telegram: true, whatsapp: true, deposit: true, withdraw: true, review: true };

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

export function channelStatus() {
  return {
    telegram: Boolean(process.env['TELEGRAM_BOT_TOKEN'] && process.env['TELEGRAM_CHAT_ID']),
    whatsapp: Boolean(process.env['WHATSAPP_GATEWAY_TOKEN'] && process.env['WHATSAPP_TARGET']),
  };
}

export async function sendAll(html: string, t: NotifyToggles, markup?: unknown) {
  const out: Record<string, string> = {};
  const tg = process.env['TELEGRAM_BOT_TOKEN'], chat = process.env['TELEGRAM_CHAT_ID'];
  if (t.telegram && tg && chat) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${tg}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: html, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) }) });
      out['telegram'] = r.ok ? 'ok' : `failed (${r.status})`;
      if (!r.ok) console.error('telegram', r.status, await r.text());
    } catch (e) { out['telegram'] = 'gagal'; console.error(e); }
  }
  const wa = process.env['WHATSAPP_GATEWAY_TOKEN'], target = process.env['WHATSAPP_TARGET'];
  if (t.whatsapp && wa && target) {
    try {
      const text = html.replace(/<b>|<\/b>/g, '*').replace(/<\/?code>/g, '`').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const body = new URLSearchParams({ target, message: text });
      const r = await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { Authorization: wa }, body });
      out['whatsapp'] = r.ok ? 'ok' : `failed (${r.status})`;
      if (!r.ok) console.error('whatsapp', r.status, await r.text());
    } catch (e) { out['whatsapp'] = 'gagal'; console.error(e); }
  }
  return out;
}

export async function readToggles(admin: any): Promise<NotifyToggles> {
  const { data } = await admin.from('app_settings').select('value').eq('key', 'notify_channels').maybeSingle();
  return { ...DEFAULT_TOGGLES, ...((data?.value as Partial<NotifyToggles>) ?? {}) };
}

const money = (n: unknown) => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Scans recent wallet activity and sends each event once (idempotent via bix_notify_log).
export async function dispatchWalletAlerts(admin: any) {
  try { const { dispatchGrowthAlert } = await import('./growth.server'); await dispatchGrowthAlert(admin); } catch (e) { console.error('growth-alert', e); }
  const t = await readToggles(admin);
  if (!t.telegram && !t.whatsapp) return 0;
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  const { data: rows } = await admin.from('wallet_transactions').select('*').in('type', ['deposit', 'withdraw'])
    .or(`created_at.gte.${since},reviewed_at.gte.${since},verified_at.gte.${since}`).order('created_at').limit(50);
  let sent = 0;
  for (const tx of rows ?? []) {
    const events: { key: string; title: string }[] = [];
    const isDep = tx.type === 'deposit';
    if ((isDep ? t.deposit : t.withdraw) && tx.created_at >= since) events.push({ key: `${tx.id}:new`, title: isDep ? '🟢 INCOMING DEPOSIT' : '🟡 PENGAJUAN WITHDRAW' });
    if (t.review && tx.status !== 'pending') events.push({ key: `${tx.id}:${tx.status}`, title: tx.status === 'approved' ? (isDep ? '✅ DEPOSIT DIKONFIRMASI' : '🔵 WITHDRAWAL APPROVED') : `❌ ${isDep ? 'DEPOSIT' : 'WITHDRAW'} DITOLAK` });
    if (!events.length) continue;
    const { data: p } = await admin.from('profiles').select('username,full_name').eq('user_id', tx.user_id).maybeSingle();
    for (const ev of events) {
      const { data: claimed } = await admin.from('bix_notify_log').upsert({ event_key: ev.key }, { onConflict: 'event_key', ignoreDuplicates: true }).select('event_key');
      if (!claimed?.length) continue;
      const lines = [
        `<b>${ev.title}</b> · BIXLINK`,
        `Member: <b>${esc(p?.username ?? '-')}</b>${p?.full_name ? ` (${esc(p.full_name)})` : ''}`,
        `Amount: <b>${money(tx.amount_usd)}</b>${tx.fee_usd ? ` · Fee ${money(tx.fee_usd)} · Bersih ${money(tx.net_usd)}` : ''}`,
        tx.network ? `Jaringan: ${esc(String(tx.network))}` : '',
        tx.address ? `Alamat: <code>${esc(String(tx.address))}</code>` : '',
        tx.tx_hash ? `TxID: <code>${esc(String(tx.tx_hash))}</code>` : '',
        `Status: ${String(tx.status).toUpperCase()}`,
        `Waktu: ${new Date(tx.reviewed_at ?? tx.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA`,
        `Review: https://bixlink.com/admin`,
      ].filter(Boolean);
      await sendAll(lines.join('\n'), t, ev.key.endsWith(':new') && tx.status === 'pending' ? { inline_keyboard: [[{ text: '✅ Setujui', callback_data: `ap:${tx.id}` }, { text: '❌ Tolak', callback_data: `rj:${tx.id}` }]] } : undefined);
      sent++;
    }
  }
  return sent;
}
