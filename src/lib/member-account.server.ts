// Server-only helpers for owner-created accounts. Ensures the new member exists in the network immediately.
export async function provisionMember(admin: any, userId: string, fullName: string, username: string, sponsorId: string | null) {
  await admin.from('profiles').upsert({ user_id: userId, full_name: fullName, username }, { onConflict: 'user_id', ignoreDuplicates: true });
  const { data: existing } = await admin.from('referral_codes').select('user_id,referred_by').eq('user_id', userId).maybeSingle();
  if (existing) {
    if (sponsorId && !existing.referred_by) await admin.from('referral_codes').update({ referred_by: sponsorId }).eq('user_id', userId);
    return;
  }
  for (let i = 0; i < 6; i++) {
    const code = 'BIX-' + (100000 + Math.floor(Math.random() * 900000));
    const { error } = await admin.from('referral_codes').insert({ user_id: userId, code, referred_by: sponsorId });
    if (!error) return;
  }
  throw new Error('Gagal membuat kode member');
}

/** True when target is inside root's downline (cycle-safe walk up sponsors). */
export async function inDownline(admin: any, root: string, target: string) {
  let cur: string | null = target; const seen = new Set<string>();
  while (cur && !seen.has(cur) && seen.size < 500) {
    if (cur === root) return true;
    seen.add(cur);
    const { data } = await admin.from('referral_codes').select('referred_by').eq('user_id', cur).maybeSingle();
    cur = data?.referred_by ?? null;
  }
  return false;
}
