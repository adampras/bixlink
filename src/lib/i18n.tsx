import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', short: '🇬🇧 EN', label: 'English' },
  { code: 'id', short: '🇮🇩 ID', label: 'Indonesia' },
  { code: 'zh', short: '🇨🇳 ZH', label: '中文' },
  { code: 'ja', short: '🇯🇵 JA', label: '日本語' },
  { code: 'ko', short: '🇰🇷 KO', label: '한국어' },
] as const;

export type Language = (typeof LANGUAGES)[number]['code'];

const ui = {
  en: { home: 'HOME', wallet: 'WALLET', stake: 'STAKE', boost: 'BOOST APY', network: 'NETWORK', profile: 'Profile', settings: 'Settings', notifications: 'Notifications', markRead: 'Mark all read', noUpdates: 'No new updates', signIn: 'Sign in', language: 'Language', updatePrefs: 'Update notifications', updatePrefsHelp: 'Show product and service announcements in the header.', enabled: 'Enabled', disabled: 'Disabled', preferences: 'PREFERENCES', accountSettings: 'ACCOUNT SETTINGS', savedHere: 'Preferences are saved on this device.', latestUpdates: 'LATEST UPDATES' },
  id: { home: 'BERANDA', wallet: 'DOMPET', stake: 'STAKING', boost: 'BOOST APY', network: 'JARINGAN', profile: 'Profil', settings: 'Pengaturan', notifications: 'Notifikasi', markRead: 'Tandai semua dibaca', noUpdates: 'Tidak ada pembaruan baru', signIn: 'Masuk', language: 'Bahasa', updatePrefs: 'Notifikasi pembaruan', updatePrefsHelp: 'Tampilkan pengumuman produk dan layanan di bagian atas.', enabled: 'Aktif', disabled: 'Nonaktif', preferences: 'PREFERENSI', accountSettings: 'PENGATURAN AKUN', savedHere: 'Preferensi tersimpan di perangkat ini.', latestUpdates: 'PEMBARUAN TERBARU' },
  zh: { home: '首页', wallet: '钱包', stake: '质押', boost: '收益加速', network: '网络', profile: '个人资料', settings: '设置', notifications: '通知', markRead: '全部标为已读', noUpdates: '暂无新动态', signIn: '登录', language: '语言', updatePrefs: '更新通知', updatePrefsHelp: '在顶部显示产品和服务公告。', enabled: '已开启', disabled: '已关闭', preferences: '偏好设置', accountSettings: '账户设置', savedHere: '偏好设置保存在此设备上。', latestUpdates: '最新动态' },
  ja: { home: 'ホーム', wallet: 'ウォレット', stake: 'ステーク', boost: 'APYブースト', network: 'ネットワーク', profile: 'プロフィール', settings: '設定', notifications: '通知', markRead: 'すべて既読にする', noUpdates: '新しい更新はありません', signIn: 'ログイン', language: '言語', updatePrefs: '更新通知', updatePrefsHelp: '製品とサービスのお知らせを上部に表示します。', enabled: 'オン', disabled: 'オフ', preferences: '環境設定', accountSettings: 'アカウント設定', savedHere: '設定はこの端末に保存されます。', latestUpdates: '最新情報' },
  ko: { home: '홈', wallet: '지갑', stake: '스테이킹', boost: 'APY 부스트', network: '네트워크', profile: '프로필', settings: '설정', notifications: '알림', markRead: '모두 읽음', noUpdates: '새 업데이트 없음', signIn: '로그인', language: '언어', updatePrefs: '업데이트 알림', updatePrefsHelp: '제품 및 서비스 공지를 상단에 표시합니다.', enabled: '켜짐', disabled: '꺼짐', preferences: '환경설정', accountSettings: '계정 설정', savedHere: '설정은 이 기기에 저장됩니다.', latestUpdates: '최신 업데이트' },
} as const;

type UiKey = keyof typeof ui.en;

const updates = {
  en: [
    { id: 'languages', title: 'Five languages are now available', body: 'Choose English, Indonesian, Chinese, Japanese, or Korean.' },
    { id: 'transfer', title: 'Virtual USDT transfer', body: 'Testing access is controlled by the owner.' },
    { id: 'stake-confirm', title: 'Clearer staking confirmation', body: 'Every staking request now includes agreement and confirmation.' },
  ],
  id: [
    { id: 'languages', title: 'Lima bahasa kini tersedia', body: 'Pilih Inggris, Indonesia, Mandarin, Jepang, atau Korea.' },
    { id: 'transfer', title: 'Transfer USDT virtual', body: 'Akses pengujian dikontrol oleh owner.' },
    { id: 'stake-confirm', title: 'Konfirmasi staking lebih jelas', body: 'Setiap permintaan staking kini dilengkapi persetujuan dan konfirmasi.' },
  ],
  zh: [
    { id: 'languages', title: '现已支持五种语言', body: '可选择英语、印尼语、中文、日语或韩语。' },
    { id: 'transfer', title: '虚拟 USDT 转账', body: '测试权限由所有者控制。' },
    { id: 'stake-confirm', title: '更清晰的质押确认', body: '每个质押请求现在都包含同意和确认步骤。' },
  ],
  ja: [
    { id: 'languages', title: '5言語に対応しました', body: '英語、インドネシア語、中国語、日本語、韓国語から選べます。' },
    { id: 'transfer', title: '仮想USDT送金', body: 'テスト利用はオーナーが管理します。' },
    { id: 'stake-confirm', title: '明確なステーキング確認', body: '各リクエストに同意と確認が追加されました。' },
  ],
  ko: [
    { id: 'languages', title: '5개 언어 지원', body: '영어, 인도네시아어, 중국어, 일본어, 한국어를 선택하세요.' },
    { id: 'transfer', title: '가상 USDT 송금', body: '테스트 사용은 소유자가 관리합니다.' },
    { id: 'stake-confirm', title: '명확한 스테이킹 확인', body: '모든 요청에 동의 및 확인 단계가 포함됩니다.' },
  ],
} as const;

const phrases: Record<Exclude<Language, 'en'>, Record<string, string>> = {
  id: {
    'Recorded staking value':'Nilai staking tercatat','Reference only':'Hanya referensi','Active stakes':'Staking aktif','Network members':'Anggota jaringan','Average APY':'Rata-rata APY','Deposit':'Deposit','Withdraw':'Penarikan','Swap':'Swap','Internal ledger reference':'Referensi ledger internal','REFERENCE PRICE':'HARGA REFERENSI','FIXED SUPPLY':'SUPLAI TETAP','IMPLIED VALUATION':'VALUASI TERSIRAT','ADMIN MANAGED':'DIKELOLA ADMIN','Open internal swap':'Buka swap internal','GLOBAL MARKET WATCH':'PANTAUAN PASAR GLOBAL','Major assets':'Aset utama','BIX TOKENOMICS':'TOKENOMIK BIX','RWA MODEL':'MODEL RWA','INCOME OVERVIEW':'RINGKASAN PENDAPATAN','FROM LAUNCH TO DAO':'DARI PELUNCURAN KE DAO','Available balance':'Saldo tersedia','Transaction history':'Riwayat transaksi','Swap history':'Riwayat swap','Coming soon':'Segera hadir','Choose a deposit wallet code':'Pilih kode wallet deposit','Copy wallet':'Salin wallet','Scan QR':'Pindai QR','Copy address':'Salin alamat','Submit withdraw':'Kirim penarikan','DEPOSIT SUCCESS':'DEPOSIT BERHASIL','Done':'Selesai','CHOOSE PACKAGE':'PILIH PAKET','Admin-reviewed':'Ditinjau admin','Annual yield':'Imbal hasil tahunan','Lock period':'Periode kunci','Stake Now':'Stake Sekarang','My requests':'Permintaan saya','No stake requests yet':'Belum ada permintaan stake','Disagree':'Tidak setuju','Agree & stake':'Setuju & stake','NETWORK':'JARINGAN','MY NETWORK':'JARINGAN SAYA','Direct referrals':'Referral langsung','Total network':'Total jaringan','Deepest generation':'Generasi terdalam','Network tree':'Pohon jaringan','Unlimited depth':'Kedalaman tanpa batas','Your network starts here':'Jaringan Anda dimulai di sini','Open referral link':'Buka link referral','Matching access':'Akses matching','Plan benefits':'Manfaat program','Referral code':'Kode referral','Personal link':'Link pribadi','Copy link':'Salin link','View my network':'Lihat jaringan saya','Change password':'Ubah kata sandi','Sign out':'Keluar','MEMBER ACCESS':'AKSES MEMBER','WELCOME BACK':'SELAMAT DATANG KEMBALI','RESET PASSWORD':'ATUR ULANG KATA SANDI','Create an account':'Buat akun','Forgot password?':'Lupa kata sandi?','CREATE YOUR ACCOUNT':'BUAT AKUN ANDA','FULL NAME':'NAMA LENGKAP','USERNAME':'NAMA PENGGUNA','PASSWORD':'KATA SANDI','REFERRAL CODE':'KODE REFERRAL','Create account':'Buat akun','Already a member? Sign in':'Sudah menjadi member? Masuk','BIX balance':'Saldo BIX','Pay':'Bayar','Receive':'Terima','Scan QR code':'Pindai kode QR','Review payment':'Tinjau pembayaran','Confirm payment':'Konfirmasi pembayaran','Cancel':'Batal','Pay now':'Bayar sekarang','History':'Riwayat','Send transfer':'Kirim transfer','No transfers yet.':'Belum ada transfer.','VIRTUAL USDT · TESTING':'USDT VIRTUAL · PENGUJIAN','Virtual USDT balance':'Saldo USDT virtual','RECIPIENT CODE':'KODE PENERIMA','AMOUNT (USDT)':'JUMLAH (USDT)','NOTE (OPTIONAL)':'CATATAN (OPSIONAL)','Staking packages':'Paket staking','Referral model':'Model referral','Roadmap & risk':'Roadmap & risiko','Back to BIXLINK':'Kembali ke BIXLINK'
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
};

type ProductUpdate = { id: string; title: string; body: string };
type I18nValue = { language: Language; setLanguage: (language: Language) => void; t: (key: UiKey) => string; updates: ProductUpdate[] };
const I18nContext = createContext<I18nValue | null>(null);

function translateDocument(language: Language) {
  if (typeof document === 'undefined') return;
  const dictionary = language === 'en' ? null : phrases[language];
  const translateNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      const trimmed = text.trim();
      const holder = node.parentElement;
      if (!trimmed || !holder || holder.closest('[data-no-translate]')) return;
      const original = holder.dataset['i18nOriginal'] ?? trimmed;
      holder.dataset['i18nOriginal'] = original;
      const translated = dictionary?.[original] ?? original;
      if (trimmed !== translated) node.textContent = text.replace(trimmed, translated);
    }
    if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
      const original = node.dataset['i18nPlaceholder'] ?? node.placeholder;
      if (original) { node.dataset['i18nPlaceholder'] = original; node.placeholder = dictionary?.[original] ?? original; }
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
    setLanguageState(next);
    window.localStorage.setItem('bixlink-language', next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    translateDocument(language);
    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t: (key: UiKey) => ui[language][key], updates: [...updates[language]] }), [language, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}