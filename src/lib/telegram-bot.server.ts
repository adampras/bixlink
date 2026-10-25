// Server-only: two-way Telegram Command Center for the owner chat (TELEGRAM_CHAT_ID only).
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const money = (n: unknown) => `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function webhookSecret(token: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bixlink-tg-webhook:${token}`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function tg(method: string, body: unknown) {
  const token = process.env['TELEGRAM_BOT_TOKEN'];
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing');
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) console.error('tg', method, r.status, await r.text());
  return r;
}

const reply = (chat: number | string, text: string, markup?: unknown) => tg('sendMessage', { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true, ...(markup ? { reply_markup: markup } : {}) });

export const reviewButtons = (id: string) => ({ inline_keyboard: [[{ text: '✅ Setujui', callback_data: `ap:${id}` }, { text: '❌ Tolak', callback_data: `rj:${id}` }]] });

async function cloneIds(admin: any): Promise<Set<string>> {
  const { data } = await admin.from('bix_clone_accounts').select('user_id');
  return new Set((data ?? []).map((r: any) => r.user_id).filter(Boolean));
}

async function summary(admin: any) {
  const clones = await cloneIds(admin);
  const { data: profiles } = await admin.from('profiles').select('user_id,created_at').limit(100000);
  const members = (profiles ?? []).filter((p: any) => !clones.has(p.user_id));
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const newToday = members.filter((p: any) => new Date(new Date(p.created_at).getTime() + 8 * 3600_000).toISOString().slice(0, 10) === today).length;
  const { data: tx } = await admin.from('wallet_transactions').select('user_id,type,status,amount_usd').in('type', ['deposit', 'withdraw']).limit(100000);
  const real = (tx ?? []).filter((t: any) => !clones.has(t.user_id));
  const dep = real.filter((t: any) => t.type === 'deposit' && t.status === 'approved');
  const depositors = new Set(dep.map((t: any) => t.user_id));
  const sum = (a: any[]) => a.reduce((s, t) => s + Number(t.amount_usd ?? 0), 0);
  const wd = real.filter((t: any) => t.type === 'withdraw' && t.status === 'approved');
  const pendDep = real.filter((t: any) => t.type === 'deposit' && t.status === 'pending').length;
  const pendWd = real.filter((t: any) => t.type === 'withdraw' && t.status === 'pending').length;
  const { data: stakes } = await admin.from('stakes').select('user_id,amount_usd,status').eq('status', 'active').limit(100000);
  const act = (stakes ?? []).filter((s: any) => !clones.has(s.user_id));
  const stakers = new Set(act.map((s: any) => s.user_id));
  return [
    '<b>📊 RINGKASAN BIXLINK</b>',
    `Member: <b>${members.length}</b> (baru hari ini ${newToday})`,
    `Sudah deposit: <b>${depositors.size}</b> · Belum deposit: <b>${members.length - depositors.size}</b>`,
    `Deposit disetujui: <b>${money(sum(dep))}</b> (${dep.length} trx)`,
    `Withdraw disetujui: <b>${money(sum(wd))}</b> (${wd.length} trx)`,
    `Menunggu review: ${pendDep} deposit · ${pendWd} withdraw`,
    `Staking aktif: <b>${act.length}</b> posisi · ${stakers.size} member · ${money(act.reduce((s: number, r: any) => s + Number(r.amount_usd ?? 0), 0))}`,
    '<i>Akun clone/support tidak dihitung.</i>',
  ].join('\n');
}

async function pending(admin: any, chat: number): Promise<unknown> {
  const { data } = await admin.from('wallet_transactions').select('id,user_id,type,amount_usd,network,tx_hash,created_at').in('type', ['deposit', 'withdraw']).eq('status', 'pending').order('created_at').limit(10);
  if (!data?.length) return reply(chat, 'Tidak ada transaksi menunggu review.');
  for (const t of data) {
    const { data: p } = await admin.from('profiles').select('username').eq('user_id', t.user_id).maybeSingle();
    await reply(chat, `<b>${t.type === 'deposit' ? '🟢 DEPOSIT' : '🟡 WITHDRAW'}</b> · ${esc(p?.username ?? '-')}\nJumlah: <b>${money(t.amount_usd)}</b>${t.network ? `\nJaringan: ${esc(t.network)}` : ''}${t.tx_hash ? `\nTxID: <code>${esc(t.tx_hash)}</code>` : ''}`, reviewButtons(t.id));
  }
  return null;
}

async function member(admin: any, q: string) {
  const term = q.trim();
  if (!term) return 'Format: /member KODE atau username';
  let uid: string | null = null;
  const { data: rc } = await admin.from('referral_codes').select('user_id,code,referred_by').ilike('code', term).maybeSingle();
  if (rc) uid = rc.user_id;
  if (!uid) { const { data: p } = await admin.from('profiles').select('user_id').ilike('username', term).maybeSingle(); uid = p?.user_id ?? null; }
  if (!uid) return 'Member tidak ditemukan.';
  const [{ data: p }, { data: code }, { data: tx }, { data: st }, clones] = await Promise.all([
    admin.from('profiles').select('username,full_name,created_at').eq('user_id', uid).maybeSingle(),
    admin.from('referral_codes').select('code,referred_by').eq('user_id', uid).maybeSingle(),
    admin.from('wallet_transactions').select('type,status,amount_usd').eq('user_id', uid).in('type', ['deposit', 'withdraw']),
    admin.from('stakes').select('amount_usd,status').eq('user_id', uid).eq('status', 'active'),
    cloneIds(admin),
  ]);
  let sponsor = '-';
  if (code?.referred_by) { const { data: s } = await admin.from('profiles').select('username').eq('user_id', code.referred_by).maybeSingle(); sponsor = s?.username ?? '-'; }
  const dep = (tx ?? []).filter((t: any) => t.type === 'deposit' && t.status === 'approved').reduce((s: number, t: any) => s + Number(t.amount_usd), 0);
  const wd = (tx ?? []).filter((t: any) => t.type === 'withdraw' && t.status === 'approved').reduce((s: number, t: any) => s + Number(t.amount_usd), 0);
  return [
    `<b>👤 ${esc(p?.username ?? '-')}</b>${p?.full_name ? ` (${esc(p.full_name)})` : ''}`,
    `Kode: ${esc(code?.code ?? '-')} · Sponsor: ${esc(sponsor)}`,
    `Tipe: ${clones.has(uid) ? 'Clone/support' : 'Organik'}`,
    `Bergabung: ${new Date(p?.created_at ?? Date.now()).toLocaleDateString('id-ID')}`,
    `Deposit: ${money(dep)} · Withdraw: ${money(wd)}`,
    `Stake aktif: ${(st ?? []).length} · ${money((st ?? []).reduce((s: number, r: any) => s + Number(r.amount_usd ?? 0), 0))}`,
  ].join('\n');
}

async function toggle(admin: any, which: 'loan' | 'register', arg: string) {
  const on = /^(on|buka|1)$/i.test(arg), off = /^(off|tutup|0)$/i.test(arg);
  const { data } = await admin.from('app_settings').select('value').eq('key', 'readiness').maybeSingle();
  const v: any = { ...(data?.value ?? {}) };
  const cur = which === 'loan' ? v.loanEnabled !== false : v.modules?.register !== false;
  if (!on && !off) return `Status ${which === 'loan' ? 'akun pinjaman' : 'pendaftaran'}: <b>${cur ? 'ON' : 'OFF'}</b>\nGunakan: on / off`;
  if (which === 'loan') v.loanEnabled = on; else v.modules = { ...(v.modules ?? {}), register: on };
  const { error } = await admin.from('app_settings').upsert({ key: 'readiness', value: v }, { onConflict: 'key' });
  if (error) return `Gagal: ${esc(error.message)}`;
  return `✅ ${which === 'loan' ? 'Akun pinjaman' : 'Pendaftaran'} sekarang <b>${on ? 'ON' : 'OFF'}</b>`;
}

const HELP = ['<b>🦊 BIXLINK Command Center</b>', '/ringkasan — laporan lengkap', '/pending — antrean deposit & withdraw (dengan tombol)', '/member KODE — detail member', '/saklar_loan on|off — akun pinjaman', '/saklar_daftar on|off — pendaftaran member'].join('\n');

export async function handleUpdate(admin: any, update: any) {
  const owner = String(process.env['TELEGRAM_CHAT_ID'] ?? '');
  if (update.callback_query) {
    const cq = update.callback_query;
    const chat = String(cq.message?.chat?.id ?? '');
    if (!owner || chat !== owner) { await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Tidak diizinkan' }); return; }
    const m = /^(ap|rj):([0-9a-f-]{36})$/.exec(String(cq.data ?? ''));
    if (!m) return;
    const status = m[1] === 'ap' ? 'approved' : 'rejected';
    const { data: changed } = await admin.from('wallet_transactions').update({ status, reviewed_at: new Date().toISOString() }).eq('id', m[2]).eq('status', 'pending').in('type', ['deposit', 'withdraw']).select('id,type,amount_usd').maybeSingle();
    if (changed) await admin.from('deposit_intents').update({ status: 'reviewed' }).eq('claim_tx_id', m[2]).eq('status', 'pending');
    const msg = changed ? `${status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'} · ${changed.type} ${money(changed.amount_usd)}` : 'Sudah direview sebelumnya.';
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: msg });
    await tg('editMessageReplyMarkup', { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: [] } });
    await reply(cq.message.chat.id, msg);
    return;
  }
  const msg = update.message;
  if (!msg?.chat?.id || typeof msg.text !== 'string') return;
  if (!owner || String(msg.chat.id) !== owner) return; // ignore strangers silently
  const [cmdRaw, ...rest] = msg.text.trim().split(/\s+/);
  const cmd = cmdRaw.toLowerCase().replace(/@.*$/, ''), arg = rest.join(' ');
  if (cmd === '/ringkasan') return reply(msg.chat.id, await summary(admin));
  if (cmd === '/pending') return pending(admin, msg.chat.id);
  if (cmd === '/member') return reply(msg.chat.id, await member(admin, arg));
  if (cmd === '/saklar_loan') return reply(msg.chat.id, await toggle(admin, 'loan', arg));
  if (cmd === '/saklar_daftar') return reply(msg.chat.id, await toggle(admin, 'register', arg));
  return reply(msg.chat.id, HELP);
}
