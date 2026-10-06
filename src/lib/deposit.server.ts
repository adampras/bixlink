// Server-only on-chain verification of USDT deposits to owner wallets.
export type DepositNetwork = 'BEP20' | 'TRC20' | 'ERC20';

const EVM = {
  BEP20: { chainId: 56, contract: '0x55d398326f99059ff775485246999027b3197955', decimals: 18, minConf: 5 },
  ERC20: { chainId: 1, contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, minConf: 3 },
} as const;
const TRON_USDT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export type VerifyResult = { ok: true; amount: number } | { ok: false; reason: string };

function units(raw: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals);
  return Number(raw / base) + Number(raw % base) / Number(base);
}

async function verifyEvm(net: 'BEP20' | 'ERC20', hash: string, to: string): Promise<VerifyResult> {
  const key = process.env['ETHERSCAN_API_KEY'];
  if (!key) return { ok: false, reason: 'Automatic verification for this network is not configured yet.' };
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return { ok: false, reason: 'Invalid transaction hash format.' };
  const cfg = EVM[net];
  const call = async (action: string, extra = '') => {
    const r = await fetch(`https://api.etherscan.io/v2/api?chainid=${cfg.chainId}&module=proxy&action=${action}${extra}&apikey=${key}`);
    if (!r.ok) throw new Error('explorer');
    return (await r.json()) as { result: any };
  };
  const [rc, bn] = await Promise.all([call('eth_getTransactionReceipt', `&txhash=${hash}`), call('eth_blockNumber')]);
  const receipt = rc.result;
  if (!receipt || typeof receipt !== 'object') return { ok: false, reason: 'Transaction not found yet. Wait a minute and try again.' };
  if (receipt.status !== '0x1') return { ok: false, reason: 'This transaction failed on the blockchain.' };
  const conf = Number(BigInt(bn.result) - BigInt(receipt.blockNumber));
  if (conf < cfg.minConf) return { ok: false, reason: `Waiting for confirmations (${Math.max(conf, 0)}/${cfg.minConf}). Try again shortly.` };
  const target = to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  let total = 0n;
  for (const log of receipt.logs ?? []) {
    if (String(log.address).toLowerCase() !== cfg.contract) continue;
    if (log.topics?.[0] !== TRANSFER_TOPIC) continue;
    if (String(log.topics?.[2]).toLowerCase().replace(/^0x/, '') !== target) continue;
    total += BigInt(log.data);
  }
  if (total === 0n) return { ok: false, reason: 'No USDT transfer to this wallet was found in that transaction.' };
  return { ok: true, amount: units(total, cfg.decimals) };
}

async function verifyTron(hash: string, to: string): Promise<VerifyResult> {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) return { ok: false, reason: 'Invalid TRON transaction hash format.' };
  const r = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${hash}`);
  if (!r.ok) throw new Error('explorer');
  const tx = (await r.json()) as any;
  if (!tx || !tx.hash) return { ok: false, reason: 'Transaction not found yet. Wait a minute and try again.' };
  if (tx.contractRet && tx.contractRet !== 'SUCCESS') return { ok: false, reason: 'This transaction failed on the blockchain.' };
  if (!tx.confirmed) return { ok: false, reason: 'Waiting for confirmations. Try again shortly.' };
  let total = 0n;
  for (const t of tx.trc20TransferInfo ?? []) {
    if (t.contract_address !== TRON_USDT || t.to_address !== to) continue;
    total += BigInt(t.amount_str ?? '0');
  }
  if (total === 0n) return { ok: false, reason: 'No USDT transfer to this wallet was found in that transaction.' };
  return { ok: true, amount: units(total, 6) };
}

export async function verifyUsdtDeposit(net: DepositNetwork, hash: string, to: string): Promise<VerifyResult> {
  try {
    return net === 'TRC20' ? await verifyTron(hash, to) : await verifyEvm(net, hash, to);
  } catch (e) {
    console.error('deposit verify failed', e);
    return { ok: false, reason: 'Blockchain explorer is busy. Please try again in a moment.' };
  }
}

export type IncomingTransfer = { hash: string; amount: number; timestamp: number };

/** Recent confirmed USDT transfers into `to`, newest first. */
export async function listIncomingUsdt(net: DepositNetwork, to: string): Promise<IncomingTransfer[] | { error: string }> {
  try {
    if (net === 'TRC20') {
      const r = await fetch(`https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=50&start=0&toAddress=${to}&contract_address=${TRON_USDT}&confirm=true`);
      if (!r.ok) throw new Error('explorer');
      const j = (await r.json()) as any;
      return (j.token_transfers ?? []).filter((t: any) => t.to_address === to && t.confirmed !== false && (t.finalResult ?? 'SUCCESS') === 'SUCCESS')
        .map((t: any) => ({ hash: String(t.transaction_id), amount: units(BigInt(t.quant ?? '0'), 6), timestamp: Number(t.block_ts) }));
    }
    const key = process.env['ETHERSCAN_API_KEY'];
    if (!key) return { error: 'Automatic detection for this network is not configured yet.' };
    const cfg = EVM[net];
    const r = await fetch(`https://api.etherscan.io/v2/api?chainid=${cfg.chainId}&module=account&action=tokentx&contractaddress=${cfg.contract}&address=${to}&page=1&offset=50&sort=desc&apikey=${key}`);
    if (!r.ok) throw new Error('explorer');
    const j = (await r.json()) as any;
    if (!Array.isArray(j.result)) return [];
    return j.result.filter((t: any) => String(t.to).toLowerCase() === to.toLowerCase() && Number(t.confirmations) >= cfg.minConf)
      .map((t: any) => ({ hash: String(t.hash), amount: units(BigInt(t.value), cfg.decimals), timestamp: Number(t.timeStamp) * 1000 }));
  } catch (e) {
    console.error('deposit scan failed', e);
    return { error: 'Blockchain explorer is busy. Checking again shortly.' };
  }
}
