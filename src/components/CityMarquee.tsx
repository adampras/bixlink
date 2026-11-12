const CITIES: [string, string][] = [
  ['SURABAYA', 'Gerbang Jawa Timur & logistik'], ['MATARAM', 'Pilot perdana NTB'], ['BATAM', 'Hub lintas batas FTZ'],
  ['BANDUNG', 'Sentra industri kreatif'], ['MALANG', 'Kota edukasi & teknologi'], ['JAKARTA', 'Pusat konsorsium nasional'],
  ['MEDAN', 'Gateway Sumatera'], ['MAKASSAR', 'Gerbang Indonesia Timur'], ['DENPASAR', 'Hub pariwisata global'], ['BALIKPAPAN', 'Koridor IKN Nusantara'],
];

/** Header ribbon: national rollout cities (presentation only). */
export function CityMarquee() {
  const row = <>
    <span className="city-mq-lead">EKSPANSI 10 KOTA INDONESIA</span>
    {CITIES.map(([c, d], i) => <span key={c} className="city-mq-item"><b>{i + 1}. {c}</b><em>{d}</em></span>)}
    <span className="city-mq-lead">BIXGO · BIXCARE · BIXTOK · BIX CALL · BIX PAY</span>
  </>;
  return <div className="city-mq" data-no-translate aria-label="Kota ekspansi BIXLINK"><div className="city-mq-track">{row}<span aria-hidden className="contents">{row}</span></div></div>;
}
