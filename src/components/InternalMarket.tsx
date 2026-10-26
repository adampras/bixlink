import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { money } from '@/lib/bixlink';
import { resolveMovement, simulatedQuote, simulationHistory } from '@/lib/internal-market';
import { CryptoIcon } from '@/components/CryptoIcon';

export function InternalMarket({ reference, movement, serverNow }: { reference: number; movement: unknown; serverNow: number }) {
  const config = resolveMovement(movement);
  const [now, setNow] = useState(serverNow);
  useEffect(() => { const anchor = Date.now(); setNow(serverNow); const timer = window.setInterval(() => setNow(serverNow + Date.now() - anchor), 1000); return () => clearInterval(timer); }, [serverNow]);
  const price = config ? simulatedQuote(config, now) : reference;
  const history = config ? simulationHistory(config, now) : [];
  const change = config ? (price / config.base - 1) * 100 : 0;
  const low = config?.lower ?? reference * .9;
  const high = config?.upper ?? reference * 1.1;
  const points = history.map((point, i) => `${20 + i / Math.max(history.length - 1, 1) * 440},${130 - (point.price - low) / (high - low) * 110}`).join(' ');
  return <div className="internal-market" data-no-translate>
    <div className="internal-market-head"><span className="internal-market-mark bix-mark-pulse"><CryptoIcon symbol="BIX" size={40}/></span><div><h2>BIX / USDT</h2><p>ADMIN-CONTROLLED INTERNAL REFERENCE</p></div></div>
    <div className="internal-market-price"><div><span>{config ? 'SIMULATED MOVEMENT' : 'FIXED REFERENCE'}</span><b className={change < 0 ? 'text-destructive' : 'text-chart-2'}>{config ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}% since start` : 'STATIC'}</b></div><strong className="numeric">${price.toFixed(6)}</strong><small className="numeric">1 BIX ≈ {price.toFixed(6)} USDT</small></div>
    <div className="internal-market-status"><i className={config?.enabled ? 'bg-chart-2' : 'bg-muted-foreground'}/>{config ? `${config.enabled ? 'RUNNING' : 'PAUSED'} · ${config.intervalSeconds}s steps` : 'MOVEMENT OFF'}</div>
    <div className="internal-market-chart"><svg viewBox="0 0 550 160" role="img" aria-label="Simulated internal reference history"><path d="M20 20H460 M20 75H460 M20 130H460" className="internal-chart-grid"/><text x="470" y="24">{high.toFixed(6)}</text><text x="470" y="79">{((high + low) / 2).toFixed(6)}</text><text x="470" y="134">{low.toFixed(6)}</text>{history.length > 1 ? <polyline points={points} className="internal-chart-line"/> : <path d="M20 75H460" className="internal-chart-line"/>}<text x="20" y="154">{history.length ? new Date(history[0]?.time ?? now).toISOString().slice(11,19) : 'No simulated history'}</text>{history.length > 1 && <text x="365" y="154">{new Date(history.at(-1)?.time ?? now).toISOString().slice(11,19)} UTC</text>}</svg></div>
    <div className="internal-market-stats"><div><span>FIXED SUPPLY</span><b>21.0M BIX</b></div><div><span>DEV BUYBACK · LOCKED</span><b>$0.250000</b></div><div><span>IMPLIED SIMULATED VALUE</span><b>{money(price * 21_000_000, { notation: 'compact' })}</b></div></div>
    <div className="internal-market-trade"><Link to="/p2p" className="is-buy">BUY BIX <ArrowUpRight size={15}/></Link><Link to="/p2p" className="is-sell">SELL BIX <ArrowUpRight size={15}/></Link></div>
  </div>;
}