import { defaultGrowth } from './growth';

export async function growthReport(admin: any) {
  const { data: control, error } = await admin.from('bix_growth_control').select('*').eq('id',1).maybeSingle();
  if (error) throw new Error('Growth controls unavailable');
  const c = { ...defaultGrowth, ...control };
  const since = new Date(Date.now() - c.window_minutes * 60000).toISOString();
  const { data: queue, error: queueError } = await admin.from('wallet_transactions').select('user_id,amount_usd').eq('type','withdraw').eq('status','pending').gte('created_at',since);
  if (queueError) throw new Error('Withdrawal queue unavailable');
  let total = 0, count = 0;
  const eligibility = new Map<string,boolean>();
  for (const row of queue ?? []) {
    if (!eligibility.has(row.user_id)) {
      const { data: excluded, error: scopeError } = await admin.rpc('bix_growth_excluded',{p_user:row.user_id});
      if (scopeError) throw new Error('Network scope unavailable');
      eligibility.set(row.user_id, !excluded);
    }
    if (eligibility.get(row.user_id)) { total += Number(row.amount_usd); count++; }
  }
  return { control: c, queueUsd: total, queueCount: count, utilization: total / c.threshold_usd };
}

export async function dispatchGrowthAlert(admin: any) {
  const report = await growthReport(admin);
  if (!report.control.frozen) return;
  const key = `growth-freeze:${report.control.updated_at}`;
  const { data: existing } = await admin.from('bix_notify_log').select('event_key').eq('event_key',key).maybeSingle();
  if (existing) return;
  const { tg } = await import('./telegram-bot.server');
  const chat = process.env['TELEGRAM_CHAT_ID'];
  if (!chat || !process.env['TELEGRAM_BOT_TOKEN']) return;
  const response = await tg('sendMessage', { chat_id: chat, text: `🛡 BIXLINK withdrawal pause\nQueue: $${report.queueUsd.toFixed(2)} · ${report.queueCount} requests\nWindow: ${report.control.window_minutes} minutes\nThreshold: $${report.control.threshold_usd}\nOwner 2 network excluded.\nReview in Admin → Growth & Safety.\n/freeze_withdraw off to reopen.`, disable_web_page_preview: true });
  const body = await response.json() as { ok?: boolean };
  if (response.ok && body.ok) await admin.from('bix_notify_log').upsert({event_key:key},{onConflict:'event_key',ignoreDuplicates:true});
}

export async function growthCommand(admin: any, cmd: string, arg: string) {
  if (cmd === '/growth_status') {
    const r = await growthReport(admin);
    return `🛡 GROWTH & SAFETY\nWithdraw: ${r.control.frozen ? 'PAUSED' : 'OPEN'}\nQueue: $${r.queueUsd.toFixed(2)} · ${r.queueCount} requests\nThreshold: $${r.control.threshold_usd} / ${r.control.window_minutes} minutes\nFlash: ${r.control.flash_enabled && Date.parse(r.control.flash_ends_at ?? '') > Date.now() ? r.control.flash_title + ' until ' + r.control.flash_ends_at : 'OFF'}\nReserve ratio: unavailable — no verified reserve feed.\nOwner 2 and descendants excluded.`;
  }
  if (cmd === '/freeze_withdraw') {
    if (!/^(on|off)$/.test(arg)) return 'Usage: /freeze_withdraw on|off';
    const { error } = await admin.from('bix_growth_control').upsert({id:1,frozen:arg==='on',freeze_reason:arg==='on'?'Owner 1 Telegram pause':null,updated_at:new Date().toISOString()});
    if (error) return 'Could not update withdrawal pause.';
    return `Withdraw ${arg==='on'?'PAUSED':'OPEN'}. Owner 2 network unchanged.`;
  }
  if (cmd === '/flash_event') {
    const match = /^on\s+(\d{1,3})h$/.exec(arg);
    if (arg !== 'off' && (!match || Number(match[1])<1 || Number(match[1])>168)) return 'Usage: /flash_event on 24h (1–168h) or /flash_event off';
    const end = match ? new Date(Date.now()+Number(match[1])*3600000).toISOString() : null;
    const { error } = await admin.from('bix_growth_control').upsert({id:1,flash_enabled:arg!=='off',flash_ends_at:end,updated_at:new Date().toISOString()});
    if (error) return 'Could not update flash event.';
    return `Flash event ${end ? 'ON until '+end : 'OFF'}. Presentation only; contract rates unchanged. Owner 2 network excluded.`;
  }
  return null;
}