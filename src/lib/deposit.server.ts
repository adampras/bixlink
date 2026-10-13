// Server-only on-chain verification of USDT deposits to owner wallets.
export type DepositNetwork = 'BEP20' | 'TRC20' | 'ERC20';
export type DepositAsset = 'USDT' | 'USDC';
// Official stablecoin contracts per network (USDC added alongside USDT).
const TOKENS = {
  USDT: { BEP20: { contract: '0x55d398326f99059ff775485246999027b3197955', decimals: 18 }, ERC20: { contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 }, TRC20: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
  USDC: { BEP20: { contract: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', decimals: 18 }, ERC20: { contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 }, TRC20: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8' },
} as const;
const evmCfg = (net: 'BEP20' | 'ERC20', asset: DepositAsset) => ({ ...EVM[net], ...TOKENS[asset][net] });

const EVM = {
  BEP20: { chainId: 56, contract: '0x55d398326f99059ff775485246999027b3197955', decimals: 18, minConf: 5 },
  ERC20: { chainId: 1, contract: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6, minConf: 3 },
} as const;
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export type VerifyResult = { ok: true; amount: number } | { ok: false; reason: string };

function units(raw: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals);
  return Number(raw / base) + Number(raw % base) / Number(base);
}

async function verifyEvm(net: 'BEP20' | 'ERC20', hash: string, to: string, asset: DepositAsset): Promise<VerifyResult> {
  const key = process.env['ETHERSCAN_API_KEY'];
  if (!key) return { ok: false, reason: 'Automatic verification for this network is not configured yet.' };
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) return { ok: false, reason: 'Invalid transaction hash format.' };
  const cfg = evmCfg(net, asset);
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
  if (total === 0n) return { ok: false, reason: `No ${asset} transfer to this wallet was found in that transaction.` };
  return { ok: true, amount: units(total, cfg.decimals) };
}

async function verifyTron(hash: string, to: string, asset: DepositAsset): Promise<VerifyResult> {
  if (!/^[0-9a-fA-F]{64}$/.test(hash)) return { ok: false, reason: 'Invalid TRON transaction hash format.' };
  const r = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${hash}`);
  if (!r.ok) throw new Error('explorer');
  const tx = (await r.json()) as any;
  if (!tx || !tx.hash) return { ok: false, reason: 'Transaction not found yet. Wait a minute and try again.' };
  if (tx.contractRet && tx.contractRet !== 'SUCCESS') return { ok: false, reason: 'This transaction failed on the blockchain.' };
  if (!tx.confirmed) return { ok: false, reason: 'Waiting for confirmations. Try again shortly.' };
  let total = 0n;
  for (const t of tx.trc20TransferInfo ?? []) {
    if (t.contract_address !== TOKENS[asset].TRC20 || t.to_address !== to) continue;
    total += BigInt(t.amount_str ?? '0');
  }
  if (total === 0n) return { ok: false, reason: `No ${asset} transfer to this wallet was found in that transaction.` };
  return { ok: true, amount: units(total, 6) };
}

export async function verifyUsdtDeposit(net: DepositNetwork, hash: string, to: string, asset: DepositAsset = 'USDT'): Promise<VerifyResult> {
  try {
    return net === 'TRC20' ? await verifyTron(hash, to, asset) : await verifyEvm(net, hash, to, asset);
  } catch (e) {
    console.error('deposit verify failed', e);
    return { ok: false, reason: 'Blockchain explorer is busy. Please try again in a moment.' };
  }
}

export type IncomingTransfer = { hash: string; amount: number; timestamp: number };

/** Recent confirmed USDT transfers into `to`, newest first. */
export async function listIncomingUsdt(net: DepositNetwork, to: string, asset: DepositAsset = 'USDT'): Promise<IncomingTransfer[] | { error: string }> {
  try {
    if (net === 'TRC20') {
      const r = await fetch(`https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=50&start=0&toAddress=${to}&contract_address=${TOKENS[asset].TRC20}&confirm=true`);
      if (!r.ok) throw new Error('explorer');
      const j = (await r.json()) as any;
      return (j.token_transfers ?? []).filter((t: any) => t.to_address === to && t.confirmed !== false && (t.finalResult ?? 'SUCCESS') === 'SUCCESS')
        .map((t: any) => ({ hash: String(t.transaction_id), amount: units(BigInt(t.quant ?? '0'), 6), timestamp: Number(t.block_ts) }));
    }
    const key = process.env['ETHERSCAN_API_KEY'];
    if (net === 'BEP20' && !key) return await listBscViaRpc(to, asset);
    if (!key) return { error: 'Automatic detection for this network is not configured yet.' };
    const cfg = evmCfg(net, asset);
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

const BSC_RPC = ['https://bsc-rpc.publicnode.com', 'https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.defibit.io'];
async function rpc(url: string, method: string, params: unknown[]) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  if (!r.ok) throw new Error('rpc');
  const j = (await r.json()) as { result?: any; error?: { message: string } };
  if (j.error) throw new Error(j.error.message);
  return j.result;
}
/** Keyless BNB Chain scan of recent USDT Transfer logs into `to` (about the last 30 minutes). */
async function listBscViaRpc(to: string, asset: DepositAsset): Promise<IncomingTransfer[] | { error: string }> {
  const cfg = evmCfg('BEP20', asset);
  const topic = '0x' + to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  for (const url of BSC_RPC) {
    try {
      const latest = parseInt(await rpc(url, 'eth_blockNumber', []), 16);
      const span = url.includes('publicnode') ? 4000 : 900;
      const logs = await rpc(url, 'eth_getLogs', [{ address: cfg.contract, fromBlock: '0x' + (latest - span).toString(16), toBlock: '0x' + (latest - cfg.minConf).toString(16), topics: [TRANSFER_TOPIC, null, topic] }]) as any[];
      const out: IncomingTransfer[] = [];
      for (const l of logs.slice(-50)) {
        const block = await rpc(url, 'eth_getBlockByNumber', [l.blockNumber, false]);
        out.push({ hash: String(l.transactionHash), amount: units(BigInt(l.data), cfg.decimals), timestamp: parseInt(block.timestamp, 16) * 1000 });
      }
      return out.reverse();
    } catch (e) { console.error('bsc rpc failed', url, e); }
  }
  return { error: 'Blockchain network is busy. Checking again shortly.' };
}
