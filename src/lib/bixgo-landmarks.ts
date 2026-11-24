/** Default pickup shortcuts per BIXGO launch city. Curated cities get well-known places;
 *  every other city gets its own city-center pin, so no city ever shows another city's landmarks. */
import { REGION_CITIES } from './bixgo-regions';

export type Landmark = { name: string; detail: string; lat: number; lng: number };

const CURATED: Record<string, Landmark[]> = {
  mataram: [
    { name: 'Lombok Epicentrum Mall', detail: 'Jl. Sriwijaya, Mataram', lat: -8.5913, lng: 116.1063 },
    { name: 'Mataram Mall', detail: 'Cakranegara, Mataram', lat: -8.5853, lng: 116.1176 },
    { name: 'Kuliner Rembiga', detail: 'Rembiga, Mataram', lat: -8.5617, lng: 116.0985 },
    { name: 'Kota Tua Ampenan', detail: 'Ampenan, Mataram', lat: -8.57, lng: 116.073 },
    { name: 'Pantai Senggigi', detail: 'Batu Layar, Lombok Barat', lat: -8.4897, lng: 116.0424 },
    { name: 'Bandara Lombok (LOP)', detail: 'Praya, Lombok Tengah', lat: -8.7573, lng: 116.2766 },
  ],
  'jakarta-pusat': [
    { name: 'Monas', detail: 'Gambir, Jakarta Pusat', lat: -6.1754, lng: 106.8272 },
    { name: 'Grand Indonesia', detail: 'Thamrin, Jakarta Pusat', lat: -6.1951, lng: 106.8209 },
    { name: 'Stasiun Gambir', detail: 'Gambir, Jakarta Pusat', lat: -6.1767, lng: 106.8306 },
  ],
  'jakarta-selatan': [
    { name: 'Blok M Plaza', detail: 'Kebayoran Baru', lat: -6.2441, lng: 106.7993 },
    { name: 'Pondok Indah Mall', detail: 'Pondok Indah', lat: -6.2655, lng: 106.7838 },
    { name: 'SCBD', detail: 'Senayan', lat: -6.2253, lng: 106.8093 },
  ],
  bandung: [
    { name: 'Gedung Sate', detail: 'Citarum, Bandung', lat: -6.9025, lng: 107.6188 },
    { name: 'Paris Van Java', detail: 'Sukajadi, Bandung', lat: -6.8893, lng: 107.5962 },
    { name: 'Stasiun Bandung', detail: 'Kebon Jeruk, Bandung', lat: -6.9147, lng: 107.6022 },
  ],
  surabaya: [
    { name: 'Tunjungan Plaza', detail: 'Tegalsari, Surabaya', lat: -7.2622, lng: 112.7387 },
    { name: 'Stasiun Gubeng', detail: 'Gubeng, Surabaya', lat: -7.2653, lng: 112.7522 },
    { name: 'Pakuwon Mall', detail: 'Sambikerep, Surabaya', lat: -7.2894, lng: 112.6758 },
  ],
  yogyakarta: [
    { name: 'Malioboro', detail: 'Gedongtengen, Yogyakarta', lat: -7.7926, lng: 110.3658 },
    { name: 'Stasiun Tugu', detail: 'Gedongtengen, Yogyakarta', lat: -7.7891, lng: 110.3633 },
    { name: 'Kraton Yogyakarta', detail: 'Kraton, Yogyakarta', lat: -7.8053, lng: 110.3642 },
  ],
  denpasar: [
    { name: 'Lapangan Renon', detail: 'Renon, Denpasar', lat: -8.6726, lng: 115.2337 },
    { name: 'Level 21 Mall', detail: 'Dangin Puri, Denpasar', lat: -8.6596, lng: 115.2189 },
    { name: 'Bandara Ngurah Rai (DPS)', detail: 'Tuban, Badung', lat: -8.7482, lng: 115.1672 },
  ],
  makassar: [
    { name: 'Pantai Losari', detail: 'Ujung Pandang, Makassar', lat: -5.1436, lng: 119.4075 },
    { name: 'Mall Panakkukang', detail: 'Panakkukang, Makassar', lat: -5.1567, lng: 119.4466 },
    { name: 'Fort Rotterdam', detail: 'Ujung Pandang, Makassar', lat: -5.1342, lng: 119.405 },
  ],
  medan: [
    { name: 'Istana Maimun', detail: 'Medan Maimun', lat: 3.5752, lng: 98.6837 },
    { name: 'Sun Plaza', detail: 'Medan Polonia', lat: 3.5833, lng: 98.6719 },
    { name: 'Stasiun Medan', detail: 'Medan Barat', lat: 3.5911, lng: 98.6794 },
  ],
  'my-kuala-lumpur': [
    { name: 'KLCC / Petronas Towers', detail: 'Kuala Lumpur City Centre', lat: 3.1579, lng: 101.7116 },
    { name: 'Pavilion KL', detail: 'Bukit Bintang', lat: 3.149, lng: 101.7134 },
    { name: 'KL Sentral', detail: 'Brickfields', lat: 3.134, lng: 101.6865 },
  ],
};

/** Pickup shortcuts for a city id; unknown or uncurated cities get their own center pin. */
export function landmarksFor(cityId: string): Landmark[] {
  const curated = CURATED[cityId];
  if (curated) return curated;
  const c = REGION_CITIES.find(x => x.id === cityId);
  return c ? [{ name: `Pusat Kota ${c.city}`, detail: `${c.city}, ${c.province}`, lat: c.lat, lng: c.lng }] : [];
}
