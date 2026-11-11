/** BIXGO launch regions: every Indonesian province (38) and every Malaysian state / federal territory (16).
 *  Each city carries a cost-of-living fare multiplier (display pricing only). */
type C = [name: string, lat: number, lng: number, mult?: number];
type P = { p: string; cc: 'ID' | 'MY'; c: C[] };

const R: P[] = [
  // ── Indonesia ──
  { p: 'Aceh', cc: 'ID', c: [['Banda Aceh', 5.5483, 95.3238], ['Lhokseumawe', 5.1801, 97.1507]] },
  { p: 'Sumatera Utara', cc: 'ID', c: [['Medan', 3.5952, 98.6722, 1.05], ['Binjai', 3.6001, 98.4854], ['Pematangsiantar', 2.9595, 99.0687]] },
  { p: 'Sumatera Barat', cc: 'ID', c: [['Padang', -0.9471, 100.4172], ['Bukittinggi', -0.3056, 100.3692]] },
  { p: 'Riau', cc: 'ID', c: [['Pekanbaru', 0.5071, 101.4478, 1.05], ['Dumai', 1.6666, 101.4001]] },
  { p: 'Kepulauan Riau', cc: 'ID', c: [['Batam', 1.0456, 104.0305, 1.1], ['Tanjung Pinang', 0.9186, 104.4554]] },
  { p: 'Jambi', cc: 'ID', c: [['Jambi', -1.6101, 103.6131]] },
  { p: 'Bengkulu', cc: 'ID', c: [['Bengkulu', -3.7928, 102.2608]] },
  { p: 'Sumatera Selatan', cc: 'ID', c: [['Palembang', -2.9761, 104.7754, 1.05]] },
  { p: 'Kepulauan Bangka Belitung', cc: 'ID', c: [['Pangkal Pinang', -2.1291, 106.1090], ['Tanjung Pandan', -2.7499, 107.6500]] },
  { p: 'Lampung', cc: 'ID', c: [['Bandar Lampung', -5.3971, 105.2668]] },
  { p: 'DKI Jakarta', cc: 'ID', c: [['Jakarta Pusat', -6.1865, 106.8341, 1.15], ['Jakarta Selatan', -6.2615, 106.8106, 1.15], ['Jakarta Barat', -6.1683, 106.7589, 1.15], ['Jakarta Timur', -6.2250, 106.9004, 1.15], ['Jakarta Utara', -6.1384, 106.8640, 1.15]] },
  { p: 'Banten', cc: 'ID', c: [['Tangerang', -6.1783, 106.6319, 1.15], ['Tangerang Selatan', -6.2886, 106.7179, 1.15], ['Serang', -6.1149, 106.1503], ['Cilegon', -6.0025, 106.0111]] },
  { p: 'Jawa Barat', cc: 'ID', c: [['Bandung', -6.9175, 107.6191, 1.1], ['Bekasi', -6.2383, 106.9756, 1.15], ['Bogor', -6.5971, 106.8060, 1.1], ['Depok', -6.4025, 106.7942, 1.15], ['Cirebon', -6.7320, 108.5523], ['Tasikmalaya', -7.3274, 108.2207]] },
  { p: 'Jawa Tengah', cc: 'ID', c: [['Semarang', -6.9667, 110.4167, 1.05], ['Surakarta (Solo)', -7.5755, 110.8243], ['Magelang', -7.4797, 110.2177], ['Tegal', -6.8694, 109.1402]] },
  { p: 'DI Yogyakarta', cc: 'ID', c: [['Yogyakarta', -7.7956, 110.3695, 1.05], ['Sleman', -7.7167, 110.3550]] },
  { p: 'Jawa Timur', cc: 'ID', c: [['Surabaya', -7.2575, 112.7521, 1.1], ['Malang', -7.9666, 112.6326], ['Sidoarjo', -7.4478, 112.7183], ['Kediri', -7.8480, 112.0178], ['Banyuwangi', -8.2192, 114.3691]] },
  { p: 'Bali', cc: 'ID', c: [['Denpasar', -8.6705, 115.2126, 1.1], ['Badung (Kuta)', -8.7180, 115.1686, 1.2], ['Gianyar (Ubud)', -8.5069, 115.2625, 1.15]] },
  { p: 'Nusa Tenggara Barat', cc: 'ID', c: [['Mataram', -8.5833, 116.1167], ['Lombok Tengah (Mandalika)', -8.8955, 116.2913, 1.1], ['Bima', -8.4600, 118.7270]] },
  { p: 'Nusa Tenggara Timur', cc: 'ID', c: [['Kupang', -10.1772, 123.6070], ['Labuan Bajo', -8.4964, 119.8877, 1.15]] },
  { p: 'Kalimantan Barat', cc: 'ID', c: [['Pontianak', -0.0263, 109.3425], ['Singkawang', 0.9060, 108.9846]] },
  { p: 'Kalimantan Tengah', cc: 'ID', c: [['Palangka Raya', -2.2161, 113.9135]] },
  { p: 'Kalimantan Selatan', cc: 'ID', c: [['Banjarmasin', -3.3186, 114.5944], ['Banjarbaru', -3.4572, 114.8103]] },
  { p: 'Kalimantan Timur', cc: 'ID', c: [['Samarinda', -0.5022, 117.1536, 1.05], ['Balikpapan', -1.2379, 116.8529, 1.1]] },
  { p: 'Kalimantan Utara', cc: 'ID', c: [['Tanjung Selor', 2.8375, 117.3653], ['Tarakan', 3.3000, 117.6333]] },
  { p: 'Sulawesi Utara', cc: 'ID', c: [['Manado', 1.4748, 124.8421], ['Bitung', 1.4404, 125.1217]] },
  { p: 'Gorontalo', cc: 'ID', c: [['Gorontalo', 0.5435, 123.0568]] },
  { p: 'Sulawesi Tengah', cc: 'ID', c: [['Palu', -0.8917, 119.8707]] },
  { p: 'Sulawesi Barat', cc: 'ID', c: [['Mamuju', -2.6748, 118.8886]] },
  { p: 'Sulawesi Selatan', cc: 'ID', c: [['Makassar', -5.1477, 119.4327], ['Gowa', -5.3166, 119.7426], ['Maros', -5.0055, 119.5736], ['Parepare', -4.0135, 119.6255], ['Palopo', -2.9925, 120.1969]] },
  { p: 'Sulawesi Tenggara', cc: 'ID', c: [['Kendari', -3.9985, 122.5129], ['Baubau', -5.4667, 122.6333]] },
  { p: 'Maluku', cc: 'ID', c: [['Ambon', -3.6954, 128.1814]] },
  { p: 'Maluku Utara', cc: 'ID', c: [['Ternate', 0.7900, 127.3800], ['Sofifi', 0.7372, 127.5588]] },
  { p: 'Papua', cc: 'ID', c: [['Jayapura', -2.5337, 140.7181, 1.2]] },
  { p: 'Papua Barat', cc: 'ID', c: [['Manokwari', -0.8615, 134.0620, 1.2]] },
  { p: 'Papua Barat Daya', cc: 'ID', c: [['Sorong', -0.8762, 131.2558, 1.2]] },
  { p: 'Papua Tengah', cc: 'ID', c: [['Nabire', -3.3667, 135.4833, 1.25], ['Timika', -4.5467, 136.8883, 1.25]] },
  { p: 'Papua Pegunungan', cc: 'ID', c: [['Wamena', -4.0956, 138.9481, 1.3]] },
  { p: 'Papua Selatan', cc: 'ID', c: [['Merauke', -8.4932, 140.4018, 1.25]] },
  // ── Malaysia ──
  { p: 'W.P. Kuala Lumpur', cc: 'MY', c: [['Kuala Lumpur', 3.1390, 101.6869, 1.35], ['Bukit Bintang', 3.1466, 101.7108, 1.4], ['KL Sentral', 3.1340, 101.6865, 1.35]] },
  { p: 'W.P. Putrajaya', cc: 'MY', c: [['Putrajaya', 2.9264, 101.6964, 1.3]] },
  { p: 'W.P. Labuan', cc: 'MY', c: [['Labuan', 5.2831, 115.2308, 1.2]] },
  { p: 'Selangor', cc: 'MY', c: [['Petaling Jaya', 3.1073, 101.6067, 1.35], ['Shah Alam', 3.0733, 101.5185, 1.3], ['Subang Jaya', 3.0567, 101.5851, 1.3], ['Klang', 3.0449, 101.4456, 1.25], ['Sepang (KLIA)', 2.7456, 101.7072, 1.4]] },
  { p: 'Johor', cc: 'MY', c: [['Johor Bahru', 1.4927, 103.7414, 1.25], ['Iskandar Puteri', 1.4250, 103.6330, 1.25], ['Batu Pahat', 1.8548, 102.9325, 1.15]] },
  { p: 'Pulau Pinang', cc: 'MY', c: [['George Town', 5.4141, 100.3288, 1.25], ['Butterworth', 5.3991, 100.3638, 1.2], ['Bayan Lepas', 5.2945, 100.2593, 1.25]] },
  { p: 'Perak', cc: 'MY', c: [['Ipoh', 4.5975, 101.0901, 1.15], ['Taiping', 4.8500, 100.7333, 1.1]] },
  { p: 'Kedah', cc: 'MY', c: [['Alor Setar', 6.1248, 100.3678, 1.1], ['Langkawi', 6.3500, 99.8000, 1.3]] },
  { p: 'Perlis', cc: 'MY', c: [['Kangar', 6.4414, 100.1986, 1.1]] },
  { p: 'Kelantan', cc: 'MY', c: [['Kota Bharu', 6.1254, 102.2381, 1.1]] },
  { p: 'Terengganu', cc: 'MY', c: [['Kuala Terengganu', 5.3302, 103.1408, 1.1]] },
  { p: 'Pahang', cc: 'MY', c: [['Kuantan', 3.8077, 103.3260, 1.15], ['Genting Highlands', 3.4236, 101.7932, 1.35]] },
  { p: 'Negeri Sembilan', cc: 'MY', c: [['Seremban', 2.7297, 101.9381, 1.15], ['Port Dickson', 2.5225, 101.7963, 1.15]] },
  { p: 'Melaka', cc: 'MY', c: [['Melaka', 2.1896, 102.2501, 1.2]] },
  { p: 'Sabah', cc: 'MY', c: [['Kota Kinabalu', 5.9804, 116.0735, 1.2], ['Sandakan', 5.8402, 118.1179, 1.15], ['Tawau', 4.2448, 117.8912, 1.15]] },
  { p: 'Sarawak', cc: 'MY', c: [['Kuching', 1.5535, 110.3593, 1.2], ['Miri', 4.3995, 113.9914, 1.15], ['Sibu', 2.2870, 111.8305, 1.1]] },
];

const slug = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type RegionCity = { id: string; city: string; province: string; country: string; cc: 'ID' | 'MY'; cur: 'IDR' | 'MYR'; lat: number; lng: number; mult: number };

export const REGION_CITIES: RegionCity[] = R.flatMap(r => r.c.map(([city, lat, lng, mult]) => ({
  id: (r.cc === 'MY' ? 'my-' : '') + slug(city), city, province: r.p, cc: r.cc,
  country: r.cc === 'ID' ? 'Indonesia' : 'Malaysia', cur: r.cc === 'ID' ? 'IDR' as const : 'MYR' as const,
  lat, lng, mult: mult ?? (r.cc === 'MY' ? 1.15 : 1),
})));

export const REGION_PROVINCES = R.map(r => ({ province: r.p, cc: r.cc }));

/** Main airports with a BIXGO airport-transfer desk. */
export const REGION_AIRPORTS = [
  { code: 'CGK', name: 'Soekarno-Hatta', city: 'tangerang' }, { code: 'DPS', name: 'I Gusti Ngurah Rai', city: 'badung' },
  { code: 'UPG', name: 'Sultan Hasanuddin', city: 'maros' }, { code: 'SUB', name: 'Juanda', city: 'sidoarjo' },
  { code: 'KNO', name: 'Kualanamu', city: 'medan' }, { code: 'YIA', name: 'Yogyakarta Intl', city: 'yogyakarta' },
  { code: 'KUL', name: 'KLIA / KLIA2', city: 'my-sepang' }, { code: 'PEN', name: 'Penang Intl', city: 'my-bayan-lepas' },
  { code: 'BKI', name: 'Kota Kinabalu Intl', city: 'my-kota-kinabalu' }, { code: 'JHB', name: 'Senai', city: 'my-johor-bahru' },
] as const;

/** Featured launch cities shown as quick chips. */
export const FEATURED_CITY_IDS = ['mataram', 'lombok-tengah', 'jakarta-selatan', 'makassar', 'denpasar', 'surabaya', 'bandung', 'medan', 'my-kuala-lumpur', 'my-johor-bahru', 'my-george-town', 'my-kota-kinabalu'];
