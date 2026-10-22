import generatedPhrases from '@/lib/i18n-phrases.json';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', flag: 'gb', label: 'English' },
  { code: 'id', flag: 'id', label: 'Indonesia' },
  { code: 'ms', flag: 'my', label: 'Bahasa Melayu' },
  { code: 'vi', flag: 'vn', label: 'Tiếng Việt' },
  { code: 'th', flag: 'th', label: 'ภาษาไทย' },
  { code: 'zh', flag: 'cn', label: '中文' },
  { code: 'ja', flag: 'jp', label: '日本語' },
  { code: 'ko', flag: 'kr', label: '한국어' },
  { code: 'hi', flag: 'in', label: 'हिन्दी' },
  { code: 'es', flag: 'es', label: 'Español' },
  { code: 'pt', flag: 'br', label: 'Português (BR)' },
  { code: 'ru', flag: 'ru', label: 'Русский' },
  { code: 'tr', flag: 'tr', label: 'Türkçe' },
  { code: 'ar', flag: 'ae', label: 'العربية' },
  { code: 'tl', flag: 'ph', label: 'Filipino' },
] as const;

export const FLAG_CODE: Record<string, string> = { gb: 'ENG', id: 'INA', my: 'MAS', vn: 'VIE', th: 'THA', cn: 'CHN', jp: 'JPN', kr: 'KOR', in: 'HIN', es: 'ESP', br: 'POR', ru: 'RUS', tr: 'TUR', ae: 'UAE', ph: 'PHI' };
export type Language = (typeof LANGUAGES)[number]['code'];

const ui = {
  en: { home: 'HOME', wallet: 'WALLET', stake: 'STAKE', boost: 'BOOST APY', network: 'NETWORK', profile: 'Profile', settings: 'Settings', notifications: 'Notifications', markRead: 'Mark all read', noUpdates: 'No new updates', signIn: 'Sign in', language: 'Language', updatePrefs: 'Update notifications', updatePrefsHelp: 'Show product and service announcements in the header.', enabled: 'Enabled', disabled: 'Disabled', preferences: 'PREFERENCES', accountSettings: 'ACCOUNT SETTINGS', savedHere: 'Preferences are saved on this device.', latestUpdates: 'LATEST UPDATES' },
  id: { home: 'BERANDA', wallet: 'DOMPET', stake: 'STAKING', boost: 'BOOST APY', network: 'JARINGAN', profile: 'Profil', settings: 'Pengaturan', notifications: 'Notifikasi', markRead: 'Tandai semua dibaca', noUpdates: 'Tidak ada pembaruan baru', signIn: 'Masuk', language: 'Bahasa', updatePrefs: 'Notifikasi pembaruan', updatePrefsHelp: 'Tampilkan pengumuman produk dan layanan di bagian atas.', enabled: 'Aktif', disabled: 'Nonaktif', preferences: 'PREFERENSI', accountSettings: 'PENGATURAN AKUN', savedHere: 'Preferensi tersimpan di perangkat ini.', latestUpdates: 'PEMBARUAN TERBARU' },
  ms: { home: 'UTAMA', wallet: 'DOMPET', stake: 'STAKING', boost: 'BOOST APY', network: 'RANGKAIAN', profile: 'Profil', settings: 'Tetapan', notifications: 'Notifikasi', markRead: 'Tanda semua dibaca', noUpdates: 'Tiada kemas kini baharu', signIn: 'Log masuk', language: 'Bahasa', updatePrefs: 'Notifikasi kemas kini', updatePrefsHelp: 'Paparkan pengumuman produk dan perkhidmatan di bahagian atas.', enabled: 'Aktif', disabled: 'Tidak aktif', preferences: 'KEUTAMAAN', accountSettings: 'TETAPAN AKAUN', savedHere: 'Keutamaan disimpan pada peranti ini.', latestUpdates: 'KEMAS KINI TERKINI' },
  vi: { home: 'TRANG CHỦ', wallet: 'VÍ', stake: 'STAKING', boost: 'TĂNG APY', network: 'MẠNG LƯỚI', profile: 'Hồ sơ', settings: 'Cài đặt', notifications: 'Thông báo', markRead: 'Đánh dấu đã đọc', noUpdates: 'Không có cập nhật mới', signIn: 'Đăng nhập', language: 'Ngôn ngữ', updatePrefs: 'Thông báo cập nhật', updatePrefsHelp: 'Hiển thị thông báo sản phẩm và dịch vụ ở phía trên.', enabled: 'Bật', disabled: 'Tắt', preferences: 'TÙY CHỌN', accountSettings: 'CÀI ĐẶT TÀI KHOẢN', savedHere: 'Tùy chọn được lưu trên thiết bị này.', latestUpdates: 'CẬP NHẬT MỚI' },
  th: { home: 'หน้าหลัก', wallet: 'กระเป๋า', stake: 'สเตก', boost: 'เพิ่ม APY', network: 'เครือข่าย', profile: 'โปรไฟล์', settings: 'การตั้งค่า', notifications: 'การแจ้งเตือน', markRead: 'ทำเครื่องหมายว่าอ่านแล้ว', noUpdates: 'ไม่มีอัปเดตใหม่', signIn: 'เข้าสู่ระบบ', language: 'ภาษา', updatePrefs: 'การแจ้งเตือนอัปเดต', updatePrefsHelp: 'แสดงประกาศผลิตภัณฑ์และบริการที่ด้านบน', enabled: 'เปิด', disabled: 'ปิด', preferences: 'การกำหนดค่า', accountSettings: 'การตั้งค่าบัญชี', savedHere: 'บันทึกการตั้งค่าไว้ในอุปกรณ์นี้', latestUpdates: 'อัปเดตล่าสุด' },
  zh: { home: '首页', wallet: '钱包', stake: '质押', boost: '收益加速', network: '网络', profile: '个人资料', settings: '设置', notifications: '通知', markRead: '全部标为已读', noUpdates: '暂无新动态', signIn: '登录', language: '语言', updatePrefs: '更新通知', updatePrefsHelp: '在顶部显示产品和服务公告。', enabled: '已开启', disabled: '已关闭', preferences: '偏好设置', accountSettings: '账户设置', savedHere: '偏好设置保存在此设备上。', latestUpdates: '最新动态' },
  ja: { home: 'ホーム', wallet: 'ウォレット', stake: 'ステーク', boost: 'APYブースト', network: 'ネットワーク', profile: 'プロフィール', settings: '設定', notifications: '通知', markRead: 'すべて既読にする', noUpdates: '新しい更新はありません', signIn: 'ログイン', language: '言語', updatePrefs: '更新通知', updatePrefsHelp: '製品とサービスのお知らせを上部に表示します。', enabled: 'オン', disabled: 'オフ', preferences: '環境設定', accountSettings: 'アカウント設定', savedHere: '設定はこの端末に保存されます。', latestUpdates: '最新情報' },
  ko: { home: '홈', wallet: '지갑', stake: '스테이킹', boost: 'APY 부스트', network: '네트워크', profile: '프로필', settings: '설정', notifications: '알림', markRead: '모두 읽음', noUpdates: '새 업데이트 없음', signIn: '로그인', language: '언어', updatePrefs: '업데이트 알림', updatePrefsHelp: '제품 및 서비스 공지를 상단에 표시합니다.', enabled: '켜짐', disabled: '꺼짐', preferences: '환경설정', accountSettings: '계정 설정', savedHere: '설정은 이 기기에 저장됩니다.', latestUpdates: '최신 업데이트' },
  hi: { home: 'होम', wallet: 'वॉलेट', stake: 'स्टेक', boost: 'APY बूस्ट', network: 'नेटवर्क', profile: 'प्रोफ़ाइल', settings: 'सेटिंग्स', notifications: 'सूचनाएँ', markRead: 'सभी पढ़े गए', noUpdates: 'कोई नया अपडेट नहीं', signIn: 'साइन इन', language: 'भाषा', updatePrefs: 'अपडेट सूचनाएँ', updatePrefsHelp: 'ऊपर उत्पाद और सेवा घोषणाएँ दिखाएँ।', enabled: 'चालू', disabled: 'बंद', preferences: 'प्राथमिकताएँ', accountSettings: 'खाता सेटिंग्स', savedHere: 'प्राथमिकताएँ इस डिवाइस पर सहेजी गई हैं।', latestUpdates: 'नवीनतम अपडेट' },
  es: { home: 'INICIO', wallet: 'BILLETERA', stake: 'STAKING', boost: 'BOOST APY', network: 'RED', profile: 'Perfil', settings: 'Ajustes', notifications: 'Notificaciones', markRead: 'Marcar todo como leído', noUpdates: 'Sin novedades', signIn: 'Iniciar sesión', language: 'Idioma', updatePrefs: 'Avisos de novedades', updatePrefsHelp: 'Mostrar anuncios de productos y servicios arriba.', enabled: 'Activado', disabled: 'Desactivado', preferences: 'PREFERENCIAS', accountSettings: 'AJUSTES DE CUENTA', savedHere: 'Las preferencias se guardan en este dispositivo.', latestUpdates: 'ÚLTIMAS NOVEDADES' },
  pt: { home: 'INÍCIO', wallet: 'CARTEIRA', stake: 'STAKING', boost: 'BOOST APY', network: 'REDE', profile: 'Perfil', settings: 'Configurações', notifications: 'Notificações', markRead: 'Marcar tudo como lido', noUpdates: 'Sem novidades', signIn: 'Entrar', language: 'Idioma', updatePrefs: 'Avisos de novidades', updatePrefsHelp: 'Mostrar anúncios de produtos e serviços no topo.', enabled: 'Ativado', disabled: 'Desativado', preferences: 'PREFERÊNCIAS', accountSettings: 'CONFIGURAÇÕES DA CONTA', savedHere: 'As preferências ficam salvas neste dispositivo.', latestUpdates: 'ÚLTIMAS NOVIDADES' },
  ru: { home: 'ГЛАВНАЯ', wallet: 'КОШЕЛЁК', stake: 'СТЕЙКИНГ', boost: 'BOOST APY', network: 'СЕТЬ', profile: 'Профиль', settings: 'Настройки', notifications: 'Уведомления', markRead: 'Прочитать все', noUpdates: 'Нет новых обновлений', signIn: 'Войти', language: 'Язык', updatePrefs: 'Уведомления об обновлениях', updatePrefsHelp: 'Показывать объявления о продуктах вверху.', enabled: 'Вкл', disabled: 'Выкл', preferences: 'ПАРАМЕТРЫ', accountSettings: 'НАСТРОЙКИ АККАУНТА', savedHere: 'Настройки сохранены на этом устройстве.', latestUpdates: 'ПОСЛЕДНИЕ НОВОСТИ' },
  tr: { home: 'ANA SAYFA', wallet: 'CÜZDAN', stake: 'STAKING', boost: 'BOOST APY', network: 'AĞ', profile: 'Profil', settings: 'Ayarlar', notifications: 'Bildirimler', markRead: 'Tümünü okundu say', noUpdates: 'Yeni güncelleme yok', signIn: 'Giriş yap', language: 'Dil', updatePrefs: 'Güncelleme bildirimleri', updatePrefsHelp: 'Ürün ve hizmet duyurularını üstte göster.', enabled: 'Açık', disabled: 'Kapalı', preferences: 'TERCİHLER', accountSettings: 'HESAP AYARLARI', savedHere: 'Tercihler bu cihazda kaydedilir.', latestUpdates: 'SON GÜNCELLEMELER' },
  ar: { home: 'الرئيسية', wallet: 'المحفظة', stake: 'التخزين', boost: 'BOOST APY', network: 'الشبكة', profile: 'الملف الشخصي', settings: 'الإعدادات', notifications: 'الإشعارات', markRead: 'تعليم الكل كمقروء', noUpdates: 'لا توجد تحديثات جديدة', signIn: 'تسجيل الدخول', language: 'اللغة', updatePrefs: 'إشعارات التحديث', updatePrefsHelp: 'عرض إعلانات المنتجات والخدمات في الأعلى.', enabled: 'مفعّل', disabled: 'متوقف', preferences: 'التفضيلات', accountSettings: 'إعدادات الحساب', savedHere: 'تُحفظ التفضيلات على هذا الجهاز.', latestUpdates: 'آخر التحديثات' },
  tl: { home: 'HOME', wallet: 'WALLET', stake: 'STAKE', boost: 'BOOST APY', network: 'NETWORK', profile: 'Profile', settings: 'Mga Setting', notifications: 'Mga Abiso', markRead: 'Markahan lahat na nabasa', noUpdates: 'Walang bagong update', signIn: 'Mag-sign in', language: 'Wika', updatePrefs: 'Mga abiso ng update', updatePrefsHelp: 'Ipakita ang mga anunsyo sa itaas.', enabled: 'Naka-on', disabled: 'Naka-off', preferences: 'MGA KAGUSTUHAN', accountSettings: 'SETTING NG ACCOUNT', savedHere: 'Naka-save ang mga kagustuhan sa device na ito.', latestUpdates: 'PINAKABAGONG UPDATE' },
} as const;

type UiKey = keyof typeof ui.en;

const updates = {
  en: [
    { id: 'languages', title: '15 languages are now available', body: 'Pick your language from the flag selector.' },
    { id: 'transfer', title: 'Virtual USDT transfer', body: 'Testing access is controlled by the owner.' },
    { id: 'stake-confirm', title: 'Clearer staking confirmation', body: 'Every staking request now includes agreement and confirmation.' },
  ],
  id: [
    { id: 'languages', title: 'Kini tersedia 15 bahasa', body: 'Pilih bahasa melalui simbol bendera.' },
    { id: 'transfer', title: 'Transfer USDT virtual', body: 'Akses pengujian dikontrol oleh owner.' },
    { id: 'stake-confirm', title: 'Konfirmasi staking lebih jelas', body: 'Setiap permintaan staking kini dilengkapi persetujuan dan konfirmasi.' },
  ],
  ms: [
    { id: 'languages', title: 'Kini tersedia 15 bahasa', body: 'Pilih bahasa pilihan anda melalui simbol bendera.' },
    { id: 'transfer', title: 'Pemindahan USDT maya', body: 'Akses ujian dikawal oleh pemilik.' },
    { id: 'stake-confirm', title: 'Pengesahan staking lebih jelas', body: 'Setiap permintaan kini termasuk persetujuan dan pengesahan.' },
  ],
  vi: [
    { id: 'languages', title: 'Hiện có 15 ngôn ngữ', body: 'Chọn ngôn ngữ bằng biểu tượng lá cờ.' },
    { id: 'transfer', title: 'Chuyển USDT ảo', body: 'Quyền truy cập thử nghiệm do chủ sở hữu kiểm soát.' },
    { id: 'stake-confirm', title: 'Xác nhận staking rõ ràng hơn', body: 'Mỗi yêu cầu hiện có bước đồng ý và xác nhận.' },
  ],
  th: [
    { id: 'languages', title: 'รองรับ 15 ภาษาแล้ว', body: 'เลือกภาษาที่ต้องการผ่านสัญลักษณ์ธง' },
    { id: 'transfer', title: 'โอน USDT เสมือน', body: 'เจ้าของควบคุมการเข้าถึงการทดสอบ' },
    { id: 'stake-confirm', title: 'ยืนยันการสเตกชัดเจนขึ้น', body: 'ทุกคำขอมีขั้นตอนยอมรับและยืนยัน' },
  ],
  zh: [
    { id: 'languages', title: '现已支持 15 种语言', body: '通过国旗图标选择语言。' },
    { id: 'transfer', title: '虚拟 USDT 转账', body: '测试权限由所有者控制。' },
    { id: 'stake-confirm', title: '更清晰的质押确认', body: '每个质押请求现在都包含同意和确认步骤。' },
  ],
  ja: [
    { id: 'languages', title: '15言語に対応しました', body: '国旗アイコンから言語を選べます。' },
    { id: 'transfer', title: '仮想USDT送金', body: 'テスト利用はオーナーが管理します。' },
    { id: 'stake-confirm', title: '明確なステーキング確認', body: '各リクエストに同意と確認が追加されました。' },
  ],
  ko: [
    { id: 'languages', title: '15개 언어 지원', body: '국기 아이콘으로 언어를 선택하세요.' },
    { id: 'transfer', title: '가상 USDT 송금', body: '테스트 사용은 소유자가 관리합니다.' },
    { id: 'stake-confirm', title: '명확한 스테이킹 확인', body: '모든 요청에 동의 및 확인 단계가 포함됩니다.' },
  ],
  hi: [
    { id: 'languages', title: 'अब 15 भाषाएँ उपलब्ध', body: 'झंडे के प्रतीक से अपनी भाषा चुनें।' },
    { id: 'transfer', title: 'वर्चुअल USDT ट्रांसफ़र', body: 'परीक्षण पहुँच मालिक द्वारा नियंत्रित है।' },
    { id: 'stake-confirm', title: 'स्पष्ट स्टेकिंग पुष्टि', body: 'हर अनुरोध में सहमति और पुष्टि शामिल है।' },
  ],
  es: [
    { id: 'languages', title: 'Ya hay 15 idiomas', body: 'Elige tu idioma con el símbolo de la bandera.' },
    { id: 'transfer', title: 'Transferencia USDT virtual', body: 'El acceso de prueba lo controla el propietario.' },
    { id: 'stake-confirm', title: 'Confirmación de staking más clara', body: 'Cada solicitud incluye aceptación y confirmación.' },
  ],
  pt: [
    { id: 'languages', title: 'Agora com 15 idiomas', body: 'Escolha seu idioma pelo símbolo da bandeira.' },
    { id: 'transfer', title: 'Transferência USDT virtual', body: 'O acesso de teste é controlado pelo proprietário.' },
    { id: 'stake-confirm', title: 'Confirmação de staking mais clara', body: 'Cada pedido inclui aceite e confirmação.' },
  ],
  ru: [
    { id: 'languages', title: 'Доступно 15 языков', body: 'Выберите язык с помощью флага.' },
    { id: 'transfer', title: 'Виртуальный перевод USDT', body: 'Тестовый доступ контролирует владелец.' },
    { id: 'stake-confirm', title: 'Понятное подтверждение стейкинга', body: 'Каждый запрос включает согласие и подтверждение.' },
  ],
  tr: [
    { id: 'languages', title: 'Artık 15 dil mevcut', body: 'Dilinizi bayrak simgesinden seçin.' },
    { id: 'transfer', title: 'Sanal USDT transferi', body: 'Test erişimi sahip tarafından yönetilir.' },
    { id: 'stake-confirm', title: 'Daha net staking onayı', body: 'Her talep onay ve kabul adımı içerir.' },
  ],
  ar: [
    { id: 'languages', title: 'أصبحت 15 لغة متاحة', body: 'اختر لغتك من رمز العلم.' },
    { id: 'transfer', title: 'تحويل USDT افتراضي', body: 'يتحكم المالك في وصول الاختبار.' },
    { id: 'stake-confirm', title: 'تأكيد تخزين أوضح', body: 'كل طلب يتضمن الموافقة والتأكيد.' },
  ],
  tl: [
    { id: 'languages', title: '15 wika na ang available', body: 'Piliin ang wika gamit ang bandila.' },
    { id: 'transfer', title: 'Virtual na USDT transfer', body: 'Ang owner ang kumokontrol sa test access.' },
    { id: 'stake-confirm', title: 'Mas malinaw na kumpirmasyon ng staking', body: 'Bawat request ay may pagsang-ayon at kumpirmasyon.' },
  ],
} as const;

const manualPhrases: Record<Exclude<Language, 'en'>, Record<string, string>> = {
  id: {
    'Recorded staking value':'Nilai staking tercatat','Reference only':'Hanya referensi','Active stakes':'Staking aktif','Network members':'Anggota jaringan','Average APY':'Rata-rata APY','Deposit':'Deposit','Withdraw':'Penarikan','Swap':'Swap','Internal ledger reference':'Referensi ledger internal','REFERENCE PRICE':'HARGA REFERENSI','FIXED SUPPLY':'SUPLAI TETAP','IMPLIED VALUATION':'VALUASI TERSIRAT','ADMIN MANAGED':'DIKELOLA ADMIN','Open internal swap':'Buka swap internal','GLOBAL MARKET WATCH':'PANTAUAN PASAR GLOBAL','Major assets':'Aset utama','BIX TOKENOMICS':'TOKENOMIK BIX','RWA MODEL':'MODEL RWA','INCOME OVERVIEW':'RINGKASAN PENDAPATAN','FROM LAUNCH TO DAO':'DARI PELUNCURAN KE DAO','Available balance':'Saldo tersedia','Transaction history':'Riwayat transaksi','Swap history':'Riwayat swap','Coming soon':'Segera hadir','Choose a deposit wallet code':'Pilih kode wallet deposit','Copy wallet':'Salin wallet','Scan QR':'Pindai QR','Copy address':'Salin alamat','Submit withdraw':'Kirim penarikan','DEPOSIT SUCCESS':'DEPOSIT BERHASIL','Done':'Selesai','CHOOSE PACKAGE':'PILIH PAKET','Admin-reviewed':'Ditinjau admin','Annual yield':'Imbal hasil tahunan','Lock period':'Periode kunci','Stake Now':'Stake Sekarang','My requests':'Permintaan saya','No stake requests yet':'Belum ada permintaan stake','Disagree':'Tidak setuju','Agree & stake':'Setuju & stake','NETWORK':'JARINGAN','MY NETWORK':'JARINGAN SAYA','Direct referrals':'Referral langsung','Total network':'Total jaringan','Deepest generation':'Generasi terdalam','Network tree':'Pohon jaringan','Unlimited depth':'Kedalaman tanpa batas','Your network starts here':'Jaringan Anda dimulai di sini','Open referral link':'Buka link referral','Matching access':'Akses matching','Plan benefits':'Manfaat program','Referral code':'Kode referral','Personal link':'Link pribadi','Copy link':'Salin link','View my network':'Lihat jaringan saya','Change password':'Ubah kata sandi','Sign out':'Keluar','MEMBER ACCESS':'AKSES MEMBER','WELCOME BACK':'SELAMAT DATANG KEMBALI','RESET PASSWORD':'ATUR ULANG KATA SANDI','Create an account':'Buat akun','Forgot password?':'Lupa kata sandi?','CREATE YOUR ACCOUNT':'BUAT AKUN ANDA','FULL NAME':'NAMA LENGKAP','USERNAME':'NAMA PENGGUNA','PASSWORD':'KATA SANDI','REFERRAL CODE':'KODE REFERRAL','Create account':'Buat akun','Already a member? Sign in':'Sudah menjadi member? Masuk','BIX balance':'Saldo BIX','Pay':'Bayar','Receive':'Terima','Scan QR code':'Pindai kode QR','Review payment':'Tinjau pembayaran','Confirm payment':'Konfirmasi pembayaran','Cancel':'Batal','Pay now':'Bayar sekarang','History':'Riwayat','Send transfer':'Kirim transfer','No transfers yet.':'Belum ada transfer.','VIRTUAL USDT · TESTING':'USDT VIRTUAL · PENGUJIAN','Virtual USDT balance':'Saldo USDT virtual','RECIPIENT CODE':'KODE PENERIMA','AMOUNT (USDT)':'JUMLAH (USDT)','NOTE (OPTIONAL)':'CATATAN (OPSIONAL)','Staking packages':'Paket staking','Referral model':'Model referral','Roadmap & risk':'Roadmap & risiko','Back to BIXLINK':'Kembali ke BIXLINK','Admin-verified':'Diverifikasi admin','Every deposit, withdrawal and swap is reviewed manually.':'Setiap deposit, penarikan, dan swap ditinjau manual.','Non-custodial preview':'Pratinjau non-kustodial','No live funds are held or paid out automatically.':'Tidak ada dana nyata yang disimpan atau dibayar otomatis.','Internal reference':'Referensi internal','Owner-managed BIX ledger reference at':'Referensi ledger BIX yang dikelola owner di'
  },
  ms: {
    'Recorded staking value':'Nilai staking direkodkan','Active stakes':'Staking aktif','Network members':'Ahli rangkaian','Average APY':'Purata APY','Deposit':'Deposit','Withdraw':'Pengeluaran','Swap':'Swap','Available balance':'Baki tersedia','Transaction history':'Sejarah transaksi','Swap history':'Sejarah swap','Coming soon':'Akan datang','Done':'Selesai','CHOOSE PACKAGE':'PILIH PAKEJ','Annual yield':'Hasil tahunan','Lock period':'Tempoh kunci','Stake Now':'Stake Sekarang','My requests':'Permintaan saya','No stake requests yet':'Belum ada permintaan stake','Disagree':'Tidak setuju','Agree & stake':'Setuju & stake','MY NETWORK':'RANGKAIAN SAYA','Direct referrals':'Rujukan langsung','Total network':'Jumlah rangkaian','Network tree':'Pohon rangkaian','Referral code':'Kod rujukan','Personal link':'Pautan peribadi','Copy link':'Salin pautan','Change password':'Tukar kata laluan','Sign out':'Log keluar','MEMBER ACCESS':'AKSES AHLI','WELCOME BACK':'SELAMAT KEMBALI','Create an account':'Cipta akaun','FULL NAME':'NAMA PENUH','USERNAME':'NAMA PENGGUNA','PASSWORD':'KATA LALUAN','REFERRAL CODE':'KOD RUJUKAN','Create account':'Cipta akaun','Pay':'Bayar','Receive':'Terima','History':'Sejarah','Send transfer':'Hantar pindahan'
  },
  vi: {
    'Recorded staking value':'Giá trị staking đã ghi nhận','Active stakes':'Staking đang hoạt động','Network members':'Thành viên mạng lưới','Average APY':'APY trung bình','Deposit':'Nạp tiền','Withdraw':'Rút tiền','Swap':'Hoán đổi','Available balance':'Số dư khả dụng','Transaction history':'Lịch sử giao dịch','Swap history':'Lịch sử hoán đổi','Coming soon':'Sắp ra mắt','Done':'Xong','CHOOSE PACKAGE':'CHỌN GÓI','Annual yield':'Lợi suất năm','Lock period':'Thời gian khóa','Stake Now':'Staking ngay','My requests':'Yêu cầu của tôi','No stake requests yet':'Chưa có yêu cầu staking','Disagree':'Không đồng ý','Agree & stake':'Đồng ý và staking','MY NETWORK':'MẠNG LƯỚI CỦA TÔI','Direct referrals':'Giới thiệu trực tiếp','Total network':'Tổng mạng lưới','Network tree':'Cây mạng lưới','Referral code':'Mã giới thiệu','Personal link':'Liên kết cá nhân','Copy link':'Sao chép liên kết','Change password':'Đổi mật khẩu','Sign out':'Đăng xuất','MEMBER ACCESS':'TRUY CẬP THÀNH VIÊN','WELCOME BACK':'CHÀO MỪNG TRỞ LẠI','Create an account':'Tạo tài khoản','FULL NAME':'HỌ VÀ TÊN','USERNAME':'TÊN NGƯỜI DÙNG','PASSWORD':'MẬT KHẨU','REFERRAL CODE':'MÃ GIỚI THIỆU','Create account':'Tạo tài khoản','Pay':'Thanh toán','Receive':'Nhận','History':'Lịch sử','Send transfer':'Gửi chuyển khoản'
  },
  th: {
    'Recorded staking value':'มูลค่าสเตกที่บันทึก','Active stakes':'สเตกที่ใช้งาน','Network members':'สมาชิกเครือข่าย','Average APY':'APY เฉลี่ย','Deposit':'ฝาก','Withdraw':'ถอน','Swap':'แลกเปลี่ยน','Available balance':'ยอดคงเหลือ','Transaction history':'ประวัติธุรกรรม','Swap history':'ประวัติการแลกเปลี่ยน','Coming soon':'เร็ว ๆ นี้','Done':'เสร็จสิ้น','CHOOSE PACKAGE':'เลือกแพ็กเกจ','Annual yield':'ผลตอบแทนรายปี','Lock period':'ระยะเวลาล็อก','Stake Now':'สเตกตอนนี้','My requests':'คำขอของฉัน','No stake requests yet':'ยังไม่มีคำขอสเตก','Disagree':'ไม่ยอมรับ','Agree & stake':'ยอมรับและสเตก','MY NETWORK':'เครือข่ายของฉัน','Direct referrals':'ผู้แนะนำโดยตรง','Total network':'เครือข่ายทั้งหมด','Network tree':'ต้นไม้เครือข่าย','Referral code':'รหัสแนะนำ','Personal link':'ลิงก์ส่วนตัว','Copy link':'คัดลอกลิงก์','Change password':'เปลี่ยนรหัสผ่าน','Sign out':'ออกจากระบบ','MEMBER ACCESS':'เข้าสู่ระบบสมาชิก','WELCOME BACK':'ยินดีต้อนรับกลับ','Create an account':'สร้างบัญชี','FULL NAME':'ชื่อเต็ม','USERNAME':'ชื่อผู้ใช้','PASSWORD':'รหัสผ่าน','REFERRAL CODE':'รหัสแนะนำ','Create account':'สร้างบัญชี','Pay':'ชำระ','Receive':'รับ','History':'ประวัติ','Send transfer':'โอนเงิน'
  },
  zh: {
    'Recorded staking value':'已记录质押价值','Active stakes':'活跃质押','Network members':'网络成员','Average APY':'平均 APY','Deposit':'充值','Withdraw':'提现','Swap':'兑换','Available balance':'可用余额','Transaction history':'交易记录','Swap history':'兑换记录','Coming soon':'即将推出','Done':'完成','CHOOSE PACKAGE':'选择套餐','Annual yield':'年化收益','Lock period':'锁定期','Stake Now':'立即质押','My requests':'我的请求','No stake requests yet':'暂无质押请求','Disagree':'不同意','Agree & stake':'同意并质押','MY NETWORK':'我的网络','Direct referrals':'直接推荐','Total network':'网络总人数','Deepest generation':'最深层级','Network tree':'网络树','Unlimited depth':'无限层级','Your network starts here':'您的网络从这里开始','Plan benefits':'计划权益','Referral code':'推荐码','Personal link':'个人链接','Copy link':'复制链接','View my network':'查看我的网络','Change password':'修改密码','Sign out':'退出登录','MEMBER ACCESS':'会员入口','WELCOME BACK':'欢迎回来','RESET PASSWORD':'重置密码','Create an account':'创建账户','Forgot password?':'忘记密码？','CREATE YOUR ACCOUNT':'创建您的账户','FULL NAME':'姓名','USERNAME':'用户名','PASSWORD':'密码','REFERRAL CODE':'推荐码','Create account':'创建账户','Already a member? Sign in':'已有账户？登录','BIX balance':'BIX 余额','Pay':'付款','Receive':'收款','Scan QR code':'扫描二维码','Review payment':'检查付款','Confirm payment':'确认付款','Cancel':'取消','Pay now':'立即付款','History':'记录','Send transfer':'发送转账','No transfers yet.':'暂无转账。','Virtual USDT balance':'虚拟 USDT 余额','RECIPIENT CODE':'收款人代码','AMOUNT (USDT)':'金额 (USDT)','NOTE (OPTIONAL)':'备注（可选）','Staking packages':'质押套餐','Referral model':'推荐模式','Roadmap & risk':'路线图与风险','Back to BIXLINK':'返回 BIXLINK'
  },
  ja: {
    'Recorded staking value':'記録済みステーキング価値','Active stakes':'有効なステーク','Network members':'ネットワーク会員','Average APY':'平均APY','Deposit':'入金','Withdraw':'出金','Swap':'スワップ','Available balance':'利用可能残高','Transaction history':'取引履歴','Swap history':'スワップ履歴','Coming soon':'近日公開','Done':'完了','CHOOSE PACKAGE':'パッケージを選択','Annual yield':'年間利回り','Lock period':'ロック期間','Stake Now':'今すぐステーク','My requests':'マイリクエスト','No stake requests yet':'ステーク申請はありません','Disagree':'同意しない','Agree & stake':'同意してステーク','MY NETWORK':'マイネットワーク','Direct referrals':'直接紹介','Total network':'ネットワーク合計','Deepest generation':'最深世代','Network tree':'ネットワークツリー','Unlimited depth':'無制限の深さ','Your network starts here':'ここからネットワークが始まります','Plan benefits':'プラン特典','Referral code':'紹介コード','Personal link':'個人リンク','Copy link':'リンクをコピー','View my network':'ネットワークを見る','Change password':'パスワード変更','Sign out':'ログアウト','MEMBER ACCESS':'メンバーアクセス','WELCOME BACK':'おかえりなさい','RESET PASSWORD':'パスワード再設定','Create an account':'アカウント作成','Forgot password?':'パスワードを忘れた場合','CREATE YOUR ACCOUNT':'アカウントを作成','FULL NAME':'氏名','USERNAME':'ユーザー名','PASSWORD':'パスワード','REFERRAL CODE':'紹介コード','Create account':'アカウント作成','Already a member? Sign in':'登録済みですか？ログイン','BIX balance':'BIX残高','Pay':'支払う','Receive':'受け取る','Scan QR code':'QRコードをスキャン','Review payment':'支払いを確認','Confirm payment':'支払い確認','Cancel':'キャンセル','Pay now':'今すぐ支払う','History':'履歴','Send transfer':'送金する','No transfers yet.':'送金履歴はありません。','Virtual USDT balance':'仮想USDT残高','RECIPIENT CODE':'受取人コード','AMOUNT (USDT)':'金額 (USDT)','NOTE (OPTIONAL)':'メモ（任意）','Staking packages':'ステーキングパッケージ','Referral model':'紹介モデル','Roadmap & risk':'ロードマップとリスク','Back to BIXLINK':'BIXLINKに戻る'
  },
  ko: {
    'Recorded staking value':'기록된 스테이킹 가치','Active stakes':'활성 스테이킹','Network members':'네트워크 회원','Average APY':'평균 APY','Deposit':'입금','Withdraw':'출금','Swap':'스왑','Available balance':'사용 가능 잔액','Transaction history':'거래 내역','Swap history':'스왑 내역','Coming soon':'출시 예정','Done':'완료','CHOOSE PACKAGE':'패키지 선택','Annual yield':'연간 수익률','Lock period':'잠금 기간','Stake Now':'지금 스테이킹','My requests':'내 요청','No stake requests yet':'스테이킹 요청이 없습니다','Disagree':'동의 안 함','Agree & stake':'동의하고 스테이킹','MY NETWORK':'내 네트워크','Direct referrals':'직접 추천','Total network':'전체 네트워크','Deepest generation':'최대 세대','Network tree':'네트워크 트리','Unlimited depth':'무제한 깊이','Your network starts here':'여기서 네트워크가 시작됩니다','Plan benefits':'플랜 혜택','Referral code':'추천 코드','Personal link':'개인 링크','Copy link':'링크 복사','View my network':'내 네트워크 보기','Change password':'비밀번호 변경','Sign out':'로그아웃','MEMBER ACCESS':'회원 접속','WELCOME BACK':'다시 오신 것을 환영합니다','RESET PASSWORD':'비밀번호 재설정','Create an account':'계정 만들기','Forgot password?':'비밀번호를 잊으셨나요?','CREATE YOUR ACCOUNT':'계정 만들기','FULL NAME':'이름','USERNAME':'사용자 이름','PASSWORD':'비밀번호','REFERRAL CODE':'추천 코드','Create account':'계정 만들기','Already a member? Sign in':'이미 회원인가요? 로그인','BIX balance':'BIX 잔액','Pay':'결제','Receive':'받기','Scan QR code':'QR 코드 스캔','Review payment':'결제 검토','Confirm payment':'결제 확인','Cancel':'취소','Pay now':'지금 결제','History':'내역','Send transfer':'송금','No transfers yet.':'송금 내역이 없습니다.','Virtual USDT balance':'가상 USDT 잔액','RECIPIENT CODE':'수신자 코드','AMOUNT (USDT)':'금액 (USDT)','NOTE (OPTIONAL)':'메모 (선택)','Staking packages':'스테이킹 패키지','Referral model':'추천 모델','Roadmap & risk':'로드맵 및 위험','Back to BIXLINK':'BIXLINK로 돌아가기'
  },
  hi: {
    'Deposit':'जमा','Withdraw':'निकासी','Swap':'स्वैप','Available balance':'उपलब्ध शेष','Transaction history':'लेन-देन इतिहास','Coming soon':'जल्द आ रहा है','Done':'पूर्ण','CHOOSE PACKAGE':'पैकेज चुनें','Annual yield':'वार्षिक यील्ड','Lock period':'लॉक अवधि','Stake Now':'अभी स्टेक करें','Stake now':'अभी स्टेक करें','My requests':'मेरे अनुरोध','MY NETWORK':'मेरा नेटवर्क','Direct referrals':'प्रत्यक्ष रेफ़रल','Total network':'कुल नेटवर्क','Referral code':'रेफ़रल कोड','Copy link':'लिंक कॉपी करें','Change password':'पासवर्ड बदलें','Sign out':'साइन आउट','WELCOME BACK':'फिर से स्वागत है','Create an account':'खाता बनाएँ','Create account':'खाता बनाएँ','FULL NAME':'पूरा नाम','USERNAME':'उपयोगकर्ता नाम','PASSWORD':'पासवर्ड','REFERRAL CODE':'रेफ़रल कोड','Forgot password?':'पासवर्ड भूल गए?','Pay':'भुगतान','Receive':'प्राप्त करें','History':'इतिहास','Cancel':'रद्द करें','BIX balance':'BIX शेष'
  },
  es: {
    'Deposit':'Depositar','Withdraw':'Retirar','Swap':'Intercambiar','Available balance':'Saldo disponible','Transaction history':'Historial de transacciones','Swap history':'Historial de intercambios','Coming soon':'Próximamente','Done':'Listo','CHOOSE PACKAGE':'ELIGE UN PAQUETE','Annual yield':'Rendimiento anual','Lock period':'Periodo de bloqueo','Stake Now':'Hacer staking','Stake now':'Hacer staking','My requests':'Mis solicitudes','MY NETWORK':'MI RED','Direct referrals':'Referidos directos','Total network':'Red total','Network tree':'Árbol de red','Referral code':'Código de referido','Personal link':'Enlace personal','Copy link':'Copiar enlace','Change password':'Cambiar contraseña','Sign out':'Cerrar sesión','MEMBER ACCESS':'ACCESO DE MIEMBROS','WELCOME BACK':'BIENVENIDO DE NUEVO','Create an account':'Crear una cuenta','Create account':'Crear cuenta','FULL NAME':'NOMBRE COMPLETO','USERNAME':'USUARIO','PASSWORD':'CONTRASEÑA','REFERRAL CODE':'CÓDIGO DE REFERIDO','Forgot password?':'¿Olvidaste tu contraseña?','Pay':'Pagar','Receive':'Recibir','History':'Historial','Cancel':'Cancelar','Send transfer':'Enviar transferencia','BIX balance':'Saldo BIX','Back to BIXLINK':'Volver a BIXLINK'
  },
  pt: {
    'Deposit':'Depositar','Withdraw':'Sacar','Swap':'Trocar','Available balance':'Saldo disponível','Transaction history':'Histórico de transações','Swap history':'Histórico de trocas','Coming soon':'Em breve','Done':'Concluído','CHOOSE PACKAGE':'ESCOLHA O PACOTE','Annual yield':'Rendimento anual','Lock period':'Período de bloqueio','Stake Now':'Fazer staking','Stake now':'Fazer staking','My requests':'Meus pedidos','MY NETWORK':'MINHA REDE','Direct referrals':'Indicações diretas','Total network':'Rede total','Network tree':'Árvore da rede','Referral code':'Código de indicação','Personal link':'Link pessoal','Copy link':'Copiar link','Change password':'Alterar senha','Sign out':'Sair','MEMBER ACCESS':'ACESSO DE MEMBROS','WELCOME BACK':'BEM-VINDO DE VOLTA','Create an account':'Criar uma conta','Create account':'Criar conta','FULL NAME':'NOME COMPLETO','USERNAME':'USUÁRIO','PASSWORD':'SENHA','REFERRAL CODE':'CÓDIGO DE INDICAÇÃO','Forgot password?':'Esqueceu a senha?','Pay':'Pagar','Receive':'Receber','History':'Histórico','Cancel':'Cancelar','Send transfer':'Enviar transferência','BIX balance':'Saldo BIX','Back to BIXLINK':'Voltar ao BIXLINK'
  },
  ru: {
    'Deposit':'Пополнить','Withdraw':'Вывести','Swap':'Обмен','Available balance':'Доступный баланс','Transaction history':'История операций','Coming soon':'Скоро','Done':'Готово','CHOOSE PACKAGE':'ВЫБЕРИТЕ ПАКЕТ','Annual yield':'Годовая доходность','Lock period':'Срок блокировки','Stake Now':'Застейкать','My requests':'Мои заявки','MY NETWORK':'МОЯ СЕТЬ','Direct referrals':'Прямые рефералы','Total network':'Вся сеть','Referral code':'Реферальный код','Copy link':'Копировать ссылку','Change password':'Сменить пароль','Sign out':'Выйти','WELCOME BACK':'С ВОЗВРАЩЕНИЕМ','Create account':'Создать аккаунт','FULL NAME':'ПОЛНОЕ ИМЯ','USERNAME':'ИМЯ ПОЛЬЗОВАТЕЛЯ','PASSWORD':'ПАРОЛЬ','Forgot password?':'Забыли пароль?','Pay':'Оплатить','Receive':'Получить','History':'История','Cancel':'Отмена','BIX balance':'Баланс BIX'
  },
  tr: {
    'Deposit':'Yatır','Withdraw':'Çek','Swap':'Takas','Available balance':'Kullanılabilir bakiye','Transaction history':'İşlem geçmişi','Coming soon':'Yakında','Done':'Tamam','CHOOSE PACKAGE':'PAKET SEÇ','Annual yield':'Yıllık getiri','Lock period':'Kilit süresi','Stake Now':'Şimdi stake et','My requests':'Taleplerim','MY NETWORK':'AĞIM','Direct referrals':'Doğrudan referanslar','Total network':'Toplam ağ','Referral code':'Referans kodu','Copy link':'Bağlantıyı kopyala','Change password':'Şifre değiştir','Sign out':'Çıkış yap','WELCOME BACK':'TEKRAR HOŞ GELDİNİZ','Create account':'Hesap oluştur','FULL NAME':'AD SOYAD','USERNAME':'KULLANICI ADI','PASSWORD':'ŞİFRE','Forgot password?':'Şifremi unuttum?','Pay':'Öde','Receive':'Al','History':'Geçmiş','Cancel':'İptal','BIX balance':'BIX bakiyesi'
  },
  ar: {
    'Deposit':'إيداع','Withdraw':'سحب','Swap':'مبادلة','Available balance':'الرصيد المتاح','Transaction history':'سجل المعاملات','Coming soon':'قريباً','Done':'تم','CHOOSE PACKAGE':'اختر الباقة','Annual yield':'العائد السنوي','Lock period':'مدة القفل','Stake Now':'خزّن الآن','My requests':'طلباتي','MY NETWORK':'شبكتي','Direct referrals':'الإحالات المباشرة','Total network':'إجمالي الشبكة','Referral code':'رمز الإحالة','Copy link':'نسخ الرابط','Change password':'تغيير كلمة المرور','Sign out':'تسجيل الخروج','WELCOME BACK':'مرحباً بعودتك','Create account':'إنشاء حساب','FULL NAME':'الاسم الكامل','USERNAME':'اسم المستخدم','PASSWORD':'كلمة المرور','Forgot password?':'نسيت كلمة المرور؟','Pay':'ادفع','Receive':'استلام','History':'السجل','Cancel':'إلغاء','BIX balance':'رصيد BIX'
  },
  tl: {
    'Withdraw':'Mag-withdraw','Available balance':'Available na balanse','Transaction history':'Kasaysayan ng transaksyon','Coming soon':'Malapit na','Done':'Tapos','CHOOSE PACKAGE':'PUMILI NG PACKAGE','Annual yield':'Taunang kita','Lock period':'Panahon ng lock','My requests':'Aking mga request','MY NETWORK':'AKING NETWORK','Change password':'Palitan ang password','Sign out':'Mag-sign out','WELCOME BACK':'MALIGAYANG PAGBABALIK','Create account':'Gumawa ng account','FULL NAME':'BUONG PANGALAN','Forgot password?':'Nakalimutan ang password?','Pay':'Magbayad','Receive':'Tumanggap','History':'Kasaysayan','Cancel':'Kanselahin','BIX balance':'Balanse ng BIX'
  },
};

const generated = generatedPhrases as Partial<Record<Exclude<Language, 'en'>, Record<string, string>>>;
const phrases = Object.fromEntries((Object.keys(manualPhrases) as Exclude<Language, 'en'>[]).map(l => [l, { ...generated[l], ...manualPhrases[l] }])) as Record<Exclude<Language, 'en'>, Record<string, string>>;

type ProductUpdate = { id: string; title: string; body: string };
const locales: Record<Language, string> = { en: 'en-US', id: 'id-ID', ms: 'ms-MY', vi: 'vi-VN', th: 'th-TH', zh: 'zh-CN', ja: 'ja-JP', ko: 'ko-KR', hi: 'hi-IN', es: 'es-ES', pt: 'pt-BR', ru: 'ru-RU', tr: 'tr-TR', ar: 'ar-AE', tl: 'fil-PH' };
type I18nValue = { language: Language; setLanguage: (language: Language) => void; t: (key: UiKey) => string; updates: ProductUpdate[]; formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string; formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string; };
const fallbackI18n: I18nValue = {
  language: 'en',
  setLanguage: next => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('bixlink-language', next);
    document.documentElement.lang = next;
  },
  t: key => ui.en[key],
  updates: [...updates.en],
  formatNumber: (value, options) => new Intl.NumberFormat('en-US', options).format(value),
  formatDate: (value, options) => new Intl.DateTimeFormat('en-US', options ?? { dateStyle: 'medium' }).format(new Date(value)),
};
const I18nContext = createContext<I18nValue>(fallbackI18n);
const originalText = new WeakMap<Node, string>();
const renderedText = new WeakMap<Node, string>();
const originalPlaceholder = new WeakMap<HTMLInputElement | HTMLTextAreaElement, string>();
const renderedPlaceholder = new WeakMap<HTMLInputElement | HTMLTextAreaElement, string>();

function translateDocument(language: Language) {
  if (typeof document === 'undefined') return;
  const dictionary = language === 'en' ? null : phrases[language];
  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const trimmed = text.trim();
      const holder = node.parentElement;
      if (!trimmed || !holder || holder.closest('[data-no-translate]')) return;
      const original = renderedText.get(node) === trimmed ? originalText.get(node) ?? trimmed : trimmed;
      originalText.set(node, original);
      const translated = dictionary?.[original] ?? original;
      renderedText.set(node, translated);
      if (trimmed !== translated) node.textContent = text.replace(trimmed, translated);
    }
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      const original = renderedPlaceholder.get(node) === node.placeholder ? originalPlaceholder.get(node) ?? node.placeholder : node.placeholder;
      if (original) { originalPlaceholder.set(node, original); node.placeholder = dictionary?.[original] ?? original; renderedPlaceholder.set(node, node.placeholder); }
    }
    node.childNodes.forEach(translateNode);
  };
  translateNode(document.body);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  useEffect(() => {
    const saved = window.localStorage.getItem('bixlink-language');
    const initial = LANGUAGES.some(item => item.code === saved) ? saved as Language : 'en';
    setLanguageState(initial);
  }, []);
  const setLanguage = useCallback((next: Language) => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.localStorage.setItem('bixlink-language', next);
    if (reduce) { setLanguageState(next); return; }
    root.classList.add('lang-out');
    window.setTimeout(() => { setLanguageState(next); root.classList.remove('lang-out'); root.classList.add('lang-in'); window.setTimeout(() => root.classList.remove('lang-in'), 420); }, 160);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    translateDocument(language);
    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: UiKey) => ui[language][key], updates: [...updates[language]], formatNumber: (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locales[language], options).format(value), formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locales[language], options ?? { dateStyle: 'medium' }).format(new Date(value)) }), [language, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}