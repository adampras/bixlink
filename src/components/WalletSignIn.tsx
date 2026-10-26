import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from '@tanstack/react-router';
import { Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { supabase } from '@/integrations/supabase/client';
import { createWalletLoginChallenge, signInWithVerifiedWallet } from '@/lib/wallet-login.functions';
import { bnbWalletAddress, injectedWallet, signWalletProof } from '@/lib/wallet-provider';

export function WalletSignIn() {
  const { data: cfg } = usePublicConfig();
  const [detected, setDetected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const create = useServerFn(createWalletLoginChallenge);
  const login = useServerFn(signInWithVerifiedWallet);
  const navigate = useNavigate();
  useEffect(() => { setDetected(Boolean(injectedWallet())); }, []);
  if (!cfg?.readiness.web3WalletEnabled) return null;
  const run = async () => {
    setBusy(true); setError('');
    try {
      const provider = injectedWallet();
      if (!provider) throw new Error('Open BIXLINK in TokenPocket, MetaMask, Trust Wallet or Bitget Wallet to sign in.');
      const address = await bnbWalletAddress(provider);
      const challenge = await create({ data: { address } });
      const signature = await signWalletProof(provider, challenge.message, address);
      const session = await login({ data: { id: challenge.id, signature } });
      const { error: sessionError } = await supabase.auth.setSession(session);
      if (sessionError) throw new Error('Could not open your account. Please try again.');
      const target = localStorage.getItem('bixlink-target'); localStorage.removeItem('bixlink-target');
      void navigate({ to: target === 'presale' ? '/presale' : '/' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Wallet sign-in cancelled.'); }
    finally { setBusy(false); }
  };
  return <div className="mt-3"><Button variant="outline" className="h-12 w-full rounded-full border-chart-3/60 text-chart-3" disabled={busy} onClick={run}><Wallet size={16}/>{busy ? 'Verifying wallet…' : detected ? 'Sign in · BNB wallet detected' : 'Sign in with BNB wallet'}</Button>{error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}</div>;
}