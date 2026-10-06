import { createFileRoute } from '@tanstack/react-router';

// Runs every 5 minutes: matches pending exact-amount deposits against the owner wallets on chain.
// Idempotent and only credits a confirmed on-chain transfer to the member who requested that exact amount.
export const Route = createFileRoute('/api/public/hooks/scan-deposits')({
  server: { handlers: { POST: async ({ request }) => {
    if (!request.headers.get('authorization')?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { matchIntent } = await import('@/lib/deposit-match.server');
    const { data: intents } = await supabaseAdmin.from('deposit_intents').select('*').eq('status', 'pending').order('created_at').limit(100);
    const cache = new Map();
    let credited = 0;
    for (const i of intents ?? []) { const r = await matchIntent(supabaseAdmin, i, cache); if (r.status === 'credited') credited++; }
    return Response.json({ checked: intents?.length ?? 0, credited });
  } } },
});
