import { createFileRoute } from '@tanstack/react-router';

// Telegram webhook: verified by secret header; only the owner chat (TELEGRAM_CHAT_ID) can run commands.
export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    const token = process.env['TELEGRAM_BOT_TOKEN'];
    if (!token) return new Response('Not configured', { status: 503 });
    const { webhookSecret, handleUpdate } = await import('@/lib/telegram-bot.server');
    const expected = await webhookSecret(token);
    if ((request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '') !== expected) return new Response('Unauthorized', { status: 401 });
    const update = await request.json().catch(() => null);
    if (!update || typeof update.update_id !== 'number') return Response.json({ ok: true });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    try { await handleUpdate(supabaseAdmin, update); } catch (e) { console.error('tg webhook', e); }
    return Response.json({ ok: true });
  } } },
});
