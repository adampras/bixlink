import { bixgoExtraPhrases } from './bixgo-phrases';
/** BIXGO's two-language surface shares the existing account language preference. */
export const BIXGO_LANGUAGES = ['id', 'en'] as const;
export type BixgoLanguage = typeof BIXGO_LANGUAGES[number];
export function bixgoLanguage(language: string): BixgoLanguage { return language === 'id' ? 'id' : 'en'; }

/** Presentation aliases only: service IDs, recorded vehicle names and payments remain canonical. */
export const BIXGO_PHRASES: Record<string, string> = {
  ...bixgoExtraPhrases,
  'BIX Bike': 'BIX Motor', 'BIX Car': 'BIX Mobil', 'BIX Delivery': 'BIX Kirim', 'BIX Food': 'BIX Kuliner', 'BIX Mart': 'BIX Belanja', 'BIX Personal Shopper': 'BIX Titip',
  'Rider': 'Penumpang', 'Driver': 'Pengemudi', 'Merchant': 'Mitra Toko',
  'Home': 'Beranda', 'Services': 'Layanan', 'Activity': 'Aktivitas', 'Wallet': 'Dompet', 'Account': 'Akun', 'Notifications': 'Notifikasi', 'Inbox': 'Pesan', 'Settings': 'Pengaturan',
  'Where to today?': 'Mau pergi ke mana?', 'Pickup Location': 'Titik Jemput', 'Destination': 'Tujuan Antar', 'Fare Estimate': 'Estimasi Tarif', 'Distance': 'Jarak', 'Travel time': 'Waktu perjalanan',
  'Service catalog': 'Katalog Layanan', 'Demo trip': 'Demo perjalanan', 'Example fare · 1.2 km. Final estimate after choosing your route.': 'Tarif contoh · 1,2 km. Estimasi akhir setelah memilih rute.',
  'Cash': 'Tunai', 'Direct payment': 'Bayar langsung', 'Wallet balance': 'Saldo dompet', 'Bank transfer': 'Transfer bank', 'Payment method': 'Metode pembayaran',
  'Cash on arrival. QRIS/bank details appear after the driver accepts. BIX/USDT is held on acceptance and settled on completion.': 'Tunai saat tiba. QRIS/rekening tampil setelah pengemudi menerima. BIX/USDT ditahan saat diterima dan diselesaikan saat perjalanan selesai.',
  'Pickup notes for driver': 'Catatan patokan untuk pengemudi', 'e.g. West lobby, beside the ATM': 'Contoh: Lobi barat, di samping ATM',
  'New orders': 'Pesanan Baru', 'Preparing': 'Sedang Disiapkan', 'History': 'Riwayat', 'No orders in this queue.': 'Belum ada pesanan di antrean ini.',
  'Orders': 'Pesanan', 'Menu & stock': 'Menu & Stok', 'Store profile': 'Profil Toko', 'Available': 'Tersedia', 'Out of stock': 'Habis',
  'People': 'Penumpang', 'Food pickup': 'Ambil Makanan', 'Goods': 'Barang', 'Incoming orders': 'Pesanan Masuk', 'Incoming order': 'Pesanan Masuk', 'Slide to accept': 'Geser untuk menerima', 'Accepting…': 'Menerima…',
  'Pickup': 'Jemput', 'Delivery address': 'Alamat antar', 'Pickup location': 'Titik Jemput', 'Price est.': 'Estimasi Tarif',
  'Searching for a driver…': 'Mencari pengemudi…', 'Driver is on the way': 'Pengemudi menuju lokasi jemput', 'On the trip': 'Dalam perjalanan', 'Trip completed': 'Perjalanan selesai', 'Cancelled': 'Dibatalkan',
  'Active trip': 'Perjalanan aktif', 'Ride complete': 'Perjalanan selesai', 'Thank you for riding with us': 'Terima kasih telah menggunakan BIXGO',
  'Call driver': 'Telepon pengemudi', 'Chat driver': 'Chat pengemudi', 'Call passenger': 'Telepon penumpang', 'Cancel trip': 'Batalkan perjalanan',
  'Go to pickup': 'Menuju titik jemput', 'On trip': 'Dalam perjalanan', 'Voice navigation': 'Navigasi suara', 'Start trip': 'Mulai perjalanan', 'Release': 'Batalkan', 'Confirm completed': 'Konfirmasi selesai',
  'Accept order': 'Terima pesanan', 'Completed': 'Selesai', "Today's trips": 'Perjalanan hari ini', 'Earned today': 'Pendapatan hari ini', 'Payout (est.)': 'Pendapatan (estimasi)', 'Note:': 'Catatan:',
  'USDT received': 'USDT diterima', 'BIX received': 'BIX diterima', 'Go online to receive orders in your city.': 'Aktifkan online untuk menerima pesanan di kota Anda.', 'No open orders right now. This list refreshes every 10 seconds.': 'Belum ada pesanan masuk. Daftar diperbarui setiap 10 detik.',
  'Back': 'Kembali', 'Search': 'Cari', 'My location': 'Lokasi saya', 'Loading map…': 'Memuat peta…', 'Search pickup point…': 'Cari titik jemput…', 'Where to?': 'Mau pergi ke mana?', 'Detecting GPS…': 'Mendeteksi GPS…', 'Search an address or tap the map': 'Cari alamat atau ketuk peta',
  'Continue to select vehicle': 'Lanjut pilih kendaraan', 'Calculating route…': 'Menghitung rute…', 'Select Your Ride': 'Pilih kendaraan', 'Back to Home': 'Kembali ke Beranda',
  'Menu': 'Menu', 'Store': 'Toko', 'Open': 'Buka', 'Closed': 'Tutup', 'Ready for pickup': 'Siap diambil', 'Accept & prepare': 'Terima & siapkan', 'Reject': 'Tolak', 'Complete': 'Selesai',
  'Member stores open now': 'Toko member buka sekarang', 'No open stores in this category yet.': 'Belum ada toko buka di kategori ini.', 'Back to map': 'Kembali ke Peta',
  'BIXGO Driver ID': 'Identitas pengemudi BIXGO', 'View driver ID': 'Lihat identitas pengemudi', 'Verified BIXGO partner': 'Mitra BIXGO terverifikasi', 'Assigned driver': 'Pengemudi ditugaskan', 'Approved partner': 'Mitra disetujui', 'Assigned partner': 'Mitra ditugaskan',
  'Trip progress': 'Progres perjalanan', 'Total paid': 'Total dibayar', 'Fare breakdown': 'Rincian tarif', 'Total fare': 'Total tarif', 'Platform commission': 'Komisi platform', 'Paid to driver': 'Dibayar ke pengemudi', 'Cash to driver': 'Tunai ke pengemudi', 'Amounts as recorded for this trip.': 'Nominal sesuai catatan perjalanan ini.',
  'Send rating': 'Kirim penilaian', 'Rating sent': 'Penilaian dikirim', 'Short feedback (optional)': 'Ulasan singkat (opsional)', 'Leave a tip (optional)': 'Beri tip (opsional)', 'Show your appreciation': 'Apresiasi pengemudi', '+ Add BIX tip': '+ Beri tip BIX',
};

export const BIXGO_ALIASES: Record<string, string> = {
  BIXRide: 'BIX Bike', BIXCar: 'BIX Car', BIXFood: 'BIX Food', BIXSend: 'BIX Delivery', BIXMart: 'BIX Mart',
  Bike: 'BIX Bike', Ride: 'BIX Bike', Car: 'BIX Car', Food: 'BIX Food', Delivery: 'BIX Delivery', Express: 'BIX Delivery', Mart: 'BIX Mart', Jastip: 'BIX Personal Shopper',
  'BIX Moto': 'BIX Bike', 'BIX Moto Saver': 'BIX Bike Saver', 'BIX Urban': 'BIX Car Economy', 'BIX Executive': 'BIX Car Executive', 'BIX Black': 'BIX Car VIP', 'BIX Jastip': 'BIX Personal Shopper',
  Penumpang: 'Rider', Disiapkan: 'Preparing', Menunggu: 'Pending', Siap: 'Ready for pickup', Selesai: 'Completed', Dibatalkan: 'Cancelled', Ditolak: 'Rejected', Aktif: 'Approved',
};

export function bixgoText(source: string, language: string): string {
  const english = BIXGO_ALIASES[source] ?? source;
  return bixgoLanguage(language) === 'id' ? BIXGO_PHRASES[english] ?? english : english;
}

export function orderQueue(status: string): 'new' | 'preparing' | 'history' {
  return status === 'pending' ? 'new' : status === 'accepted' || status === 'ready' ? 'preparing' : 'history';
}
export function orderCategory(service: string): 'people' | 'food' | 'goods' {
  return service === 'ride' || service === 'car' ? 'people' : service === 'food' ? 'food' : 'goods';
}