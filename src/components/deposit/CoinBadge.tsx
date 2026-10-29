// Stylised coin marks (brand colours of the stablecoins) and network labels for the deposit picker.
const NET: Record<string, { name: string; tone: string }> = {
  BEP20: { name: 'BNB Smart Chain', tone: 'bnb' },
  TRC20: { name: 'Tron Network', tone: 'trx' },
  ERC20: { name: 'Ethereum', tone: 'eth' },
};
export const networkName = (n: string) => NET[n]?.name ?? n;

export function CoinMark({ asset, network, size = 34 }: { asset: string; network: string; size?: number }) {
  const usdc = asset === 'USDC';
  return (
    <span className="dep-coin" style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 32 32" width={size} height={size}>
        <circle cx="16" cy="16" r="16" fill={usdc ? '#2775CA' : '#26A17B'} />
        {usdc ? <>
          <path d="M20.2 18.3c0-2.2-1.3-3-4-3.3-1.9-.3-2.3-.8-2.3-1.7s.7-1.5 1.9-1.5c1.1 0 1.8.4 2.1 1.3.1.2.2.3.4.3h1c.2 0 .4-.2.4-.4-.3-1.4-1.4-2.4-2.9-2.6V8.9c0-.2-.2-.4-.5-.4h-.9c-.2 0-.4.2-.5.4v1.5c-1.9.3-3.1 1.5-3.1 3.1 0 2.1 1.3 2.9 4 3.2 1.8.3 2.3.7 2.3 1.7s-.9 1.7-2.1 1.7c-1.6 0-2.2-.7-2.4-1.6-.1-.2-.2-.3-.4-.3h-1c-.2 0-.4.2-.4.4.3 1.6 1.3 2.7 3.2 3v1.5c0 .2.2.4.5.4h.9c.2 0 .4-.2.5-.4v-1.5c1.9-.3 3.2-1.6 3.2-3.3z" fill="#fff"/>
          <path d="M13 24.5c-4.7-1.7-7.1-6.9-5.4-11.6.9-2.5 2.9-4.5 5.4-5.4.2-.1.4-.3.4-.6v-.9c0-.2-.1-.4-.4-.4h-.1C7.3 7.4 4.3 13.2 6 18.8c1 3.3 3.6 5.9 6.9 6.9.2.1.5 0 .5-.2V24.6c0-.1-.2-.1-.4-.1zm6.1-18.9c-.2-.1-.5 0-.5.2v.9c0 .2.2.5.4.6 4.7 1.7 7.1 6.9 5.4 11.6-.9 2.5-2.9 4.5-5.4 5.4-.2.1-.4.3-.4.6v.9c0 .2.1.4.4.4h.1c5.6-1.8 8.6-7.6 6.9-13.2-1-3.3-3.6-5.9-6.9-6.9z" fill="#fff"/>
        </> : <path d="M17.9 17.1v0c-.1 0-.7.1-2 .1-1 0-1.8 0-2-.1v0c-4-.2-7-.9-7-1.7s3-1.5 7-1.7v2.7c.3 0 1 .1 2 .1 1.2 0 1.8-.1 2-.1v-2.7c4 .2 7 .9 7 1.7s-3 1.5-7 1.7zm0-3.7V11h5.6V7.3H8.3V11h5.6v2.4c-4.5.2-8 1.1-8 2.2s3.4 2 8 2.2v7.9h4v-7.9c4.5-.2 7.9-1.1 7.9-2.2s-3.4-2-7.9-2.2z" fill="#fff"/>}
      </svg>
      <i className={`dep-net dep-net--${NET[network]?.tone ?? 'eth'}`}>{network === 'BEP20' ? 'B' : network === 'TRC20' ? 'T' : 'E'}</i>
    </span>
  );
}
