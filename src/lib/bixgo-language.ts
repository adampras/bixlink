import { bixgoExtraPhrases } from './bixgo-phrases';
/** BIXGO's two-language surface shares the existing account language preference. */
export const BIXGO_LANGUAGES = ['id', 'en'] as const;
export type BixgoLanguage = typeof BIXGO_LANGUAGES[number];
export function bixgoLanguage(language: string): BixgoLanguage { return language === 'id' ? 'id' : 'en'; }

/** Presentation aliases only: service IDs, recorded vehicle names and payments remain canonical. */
export const BIXGO_PHRASES: Record<string, string> = {
  ...bixgoExtraPhrases,
  'Trip chat': 'Chat perjalanan', 'Call': 'Telepon', 'Video call': 'Panggilan video', 'Message': 'Pesan', 'Send message': 'Kirim pesan', 'Write a message…': 'Tulis pesan…', 'No messages yet.': 'Belum ada pesan.', 'Retry': 'Coba lagi',
  'I am on my way.': 'Saya sedang menuju lokasi.', 'I have arrived at the pickup point.': 'Saya sudah tiba di titik jemput.', 'Where should I wait?': 'Saya menunggu di mana?', 'I am waiting at the entrance.': 'Saya menunggu di pintu masuk.', 'Please wait a moment.': 'Mohon tunggu sebentar.', 'I am at the pickup point.': 'Saya sudah di titik jemput.',
  'Trip ended · chat is read-only.': 'Perjalanan selesai · chat hanya dapat dibaca.', 'Trip chat is closed': 'Chat perjalanan sudah ditutup', 'Only assigned trip participants can chat': 'Chat hanya untuk penumpang dan pengemudi perjalanan ini',
  'Wait a moment before sending another message': 'Tunggu sebentar sebelum mengirim pesan berikutnya', 'Messages unavailable. Retry.': 'Pesan belum tersedia. Coba lagi.', 'Message not sent. Check connection and retry.': 'Pesan belum terkirim. Periksa koneksi dan coba lagi.',
  'Register as driver': 'Daftar sebagai pengemudi', 'Complete your driver details and safety declaration': 'Lengkapi data pengemudi dan pernyataan keselamatan', 'Verify your real email first': 'Verifikasi email asli Anda terlebih dahulu',
  'Registration active. You can go online.': 'Pendaftaran aktif. Anda dapat mulai online.', 'Application submitted for review.': 'Pendaftaran dikirim untuk ditinjau.', 'Registration failed. Please retry.': 'Pendaftaran gagal. Silakan coba lagi.',
  'Complete details and verified email: self-driver registration activates automatically.': 'Data lengkap dan email terverifikasi: pendaftaran pengemudi mandiri aktif otomatis.', 'Your application will be reviewed by the owner.': 'Pendaftaran Anda akan ditinjau oleh pemilik.',
  'I hold a valid driving licence and vehicle registration, the vehicle is safe, and my details are accurate.': 'Saya memiliki SIM dan STNK yang berlaku, kendaraan aman digunakan, dan data saya benar.',
  'You keep 85% of completed fares. Payment follows the passenger’s selected method; no starter balance is granted.': 'Anda menerima 85% tarif perjalanan selesai. Pembayaran mengikuti pilihan penumpang; tidak ada saldo awal gratis.',
  'Order sound on': 'Suara order aktif', 'Enable order sound': 'Aktifkan suara order', 'Tap again to enable order sound.': 'Ketuk lagi untuk mengaktifkan suara order.', 'Tap to enable sound. Background alerts depend on your phone and browser.': 'Ketuk untuk mengaktifkan suara. Notifikasi latar belakang bergantung pada HP dan browser.',
  'Active BIXGO partner': 'Mitra BIXGO aktif', 'Searching nearby drivers across city borders': 'Mencari pengemudi terdekat lintas kota', 'Trip chat stays in BIXGO. Voice and video calls use BIX CALL.': 'Chat perjalanan tetap di BIXGO. Telepon dan video melalui BIX CALL.',
  'Go online to receive nearby orders across city borders.': 'Aktifkan online untuk menerima pesanan terdekat lintas kota.',
  'GPS active · nearby orders across city borders': 'GPS aktif · pesanan terdekat lintas kota',
  'GPS unavailable. Enable location to find nearby orders.': 'GPS tidak tersedia. Aktifkan lokasi untuk mencari pesanan terdekat.',
  'GPS is not accurate yet. Retry near an open area.': 'GPS belum akurat. Coba lagi di area terbuka.',
  'Location update failed. Check connection and retry.': 'Lokasi gagal diperbarui. Periksa koneksi dan coba lagi.',
  'Location permission denied. Enable location and retry.': 'Izin lokasi ditolak. Aktifkan lokasi dan coba lagi.',
  'Retry GPS': 'Coba GPS lagi', 'Distance to pickup': 'Jarak ke titik jemput',
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