import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
import { Headset, MessageCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupportDesk } from '@/components/AdminSupportDesk';
import { foxChatVisible } from '@/lib/support-desk';
import { useI18n } from '@/lib/i18n';

type Op = { id: string; code: string | null; name: string; active: boolean };
type Copy = { title: string; hello: string; chat: string; signIn: string; none: string; official: string };
const T: Record<string, Copy> = {
  en: { title: '24/7 Support · Chat only', hello: 'Hi! Our official team is here to help around the clock.', chat: 'Chat', signIn: 'Sign in to chat with support', none: 'All operators are busy. Please try again shortly.', official: 'OFFICIAL CS' },
  id: { title: 'Layanan 24 Jam · Chat saja', hello: 'Halo! Tim resmi kami siap membantu 24 jam.', chat: 'Chat', signIn: 'Masuk untuk chat dengan CS', none: 'Semua operator sedang sibuk. Coba lagi sebentar.', official: 'CS RESMI' },
  ms: { title: 'Sokongan 24 Jam · Chat sahaja', hello: 'Hai! Pasukan rasmi kami sedia membantu 24 jam.', chat: 'Chat', signIn: 'Log masuk untuk chat', none: 'Semua operator sibuk. Cuba sebentar lagi.', official: 'CS RASMI' },
  zh: { title: '24小时客服 · 仅聊天', hello: '您好！官方团队全天候为您服务。', chat: '聊天', signIn: '登录后与客服聊天', none: '客服繁忙，请稍后再试。', official: '官方客服' },
  ar: { title: 'دعم 24/7 · دردشة فقط', hello: 'مرحباً! فريقنا الرسمي جاهز لمساعدتك على مدار الساعة.', chat: 'دردشة', signIn: 'سجّل الدخول للدردشة', none: 'جميع المشغلين مشغولون، حاول لاحقاً.', official: 'دعم رسمي' },
  vi: { title: 'Hỗ trợ 24/7 · Chỉ chat', hello: 'Xin chào! Đội ngũ chính thức luôn sẵn sàng hỗ trợ.', chat: 'Chat', signIn: 'Đăng nhập để chat', none: 'Nhân viên đang bận, vui lòng thử lại.', official: 'CS CHÍNH THỨC' },
  th: { title: 'ซัพพอร์ต 24 ชม. · แชทเท่านั้น', hello: 'สวัสดี! ทีมงานพร้อมช่วยเหลือตลอด 24 ชั่วโมง', chat: 'แชท', signIn: 'เข้าสู่ระบบเพื่อแชท', none: 'เจ้าหน้าที่ไม่ว่าง กรุณาลองใหม่', official: 'CS ทางการ' },
  ja: { title: '24時間サポート · チャットのみ', hello: 'こんにちは！公式チームが24時間対応します。', chat: 'チャット', signIn: 'ログインしてチャット', none: '担当者が対応中です。しばらくお待ちください。', official: '公式CS' },
  ko: { title: '24시간 지원 · 채팅 전용', hello: '안녕하세요! 공식 팀이 24시간 도와드립니다.', chat: '채팅', signIn: '로그인 후 채팅', none: '상담원이 모두 바쁩니다. 잠시 후 다시 시도하세요.', official: '공식 CS' },
  hi: { title: '24/7 सहायता · केवल चैट', hello: 'नमस्ते! हमारी आधिकारिक टीम 24 घंटे मदद के लिए है।', chat: 'चैट', signIn: 'चैट के लिए साइन इन करें', none: 'सभी ऑपरेटर व्यस्त हैं।', official: 'आधिकारिक CS' },
  es: { title: 'Soporte 24/7 · Solo chat', hello: '¡Hola! Nuestro equipo oficial te ayuda a toda hora.', chat: 'Chat', signIn: 'Inicia sesión para chatear', none: 'Operadores ocupados, intenta en breve.', official: 'CS OFICIAL' },
  pt: { title: 'Suporte 24/7 · Só chat', hello: 'Olá! Nossa equipe oficial ajuda 24 horas.', chat: 'Chat', signIn: 'Entre para conversar', none: 'Operadores ocupados, tente em breve.', official: 'CS OFICIAL' },
  ru: { title: 'Поддержка 24/7 · Только чат', hello: 'Здравствуйте! Официальная команда поможет круглосуточно.', chat: 'Чат', signIn: 'Войдите, чтобы написать', none: 'Операторы заняты, попробуйте позже.', official: 'ОФИЦ. CS' },
  tr: { title: '7/24 Destek · Sadece sohbet', hello: 'Merhaba! Resmi ekibimiz 7/24 yardıma hazır.', chat: 'Sohbet', signIn: 'Sohbet için giriş yapın', none: 'Operatörler meşgul, birazdan deneyin.', official: 'RESMİ CS' },
  tl: { title: '24/7 Suporta · Chat lang', hello: 'Hi! Handa ang opisyal na team namin 24 oras.', chat: 'Chat', signIn: 'Mag-sign in para mag-chat', none: 'Abala ang lahat ng operator.', official: 'OPISYAL NA CS' },
};
const POS_KEY = 'bixlink-cs24-pos';
const clamp = (x: number, y: number) => ({ x: Math.min(Math.max(8, x), window.innerWidth - 120), y: Math.min(Math.max(60, y), window.innerHeight - 70) });

/** Floating, draggable, dismissable 24/7 chat-only support pill on landing and Home; Owner 1 toggles it and appoints operators. */
export function SupportFloat() {
  const path = useRouterState({ select: s => s.location.pathname });
  const { data: desk } = useSupportDesk();
  const { language } = useI18n();
  const c = T[language] ?? T['en']!;
  const [signed, setSigned] = useState(false);
  const [closed, setClosed] = useState(true);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number; moved: boolean; sx: number; sy: number } | null>(null);
  useEffect(() => {
    setClosed(sessionStorage.getItem('bixlink-cs24-closed') === '1');
    try { const p = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null'); if (p && Number.isFinite(p.x)) setPos(clamp(p.x, p.y)); } catch { /* optional */ }
    void supabase.auth.getSession().then(({ data }) => setSigned(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSigned(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  const ops = useQuery({ queryKey: ['support-operators-live', desk?.bixcallUserId], enabled: signed && open, staleTime: 30_000, queryFn: async () => { const { data } = await supabase.rpc('bix_support_operators_list' as never); const list = ((data ?? []) as unknown as Op[]).filter(o => o.active);
    if (desk?.bixcallUserId && !list.some(o => o.id === desk.bixcallUserId)) list.unshift({ id: desk.bixcallUserId, code: desk.bixcallId || null, name: desk.bixcallName || 'BIXLINK Support', active: true });
    return list; } });
  const box = useRef<HTMLDivElement>(null); const live = useRef<{ x: number; y: number } | null>(null);

  if (!desk?.float24 || closed || !foxChatVisible(path)) return null;
  const style = pos ? { left: pos.x, top: pos.y } : { left: 12, bottom: 112 };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button[data-close]')) return;
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false, sx: e.clientX, sy: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
    d.moved = true; const p = clamp(e.clientX - d.dx, e.clientY - d.dy); live.current = p;
    const el = box.current; if (el) { el.style.left = `${p.x}px`; el.style.top = `${p.y}px`; el.style.bottom = 'auto'; }
  };
  const onUp = () => {
    const d = drag.current; drag.current = null;
    if (d?.moved) { const p = live.current; if (p) { setPos(p); try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* optional */ } } return; }
    setOpen(o => !o);
  };
  const close = () => { setClosed(true); setOpen(false); try { sessionStorage.setItem('bixlink-cs24-closed', '1'); } catch { /* optional */ } };

  return <div ref={box} className="cs24 fixed z-50 w-[min(18rem,calc(100vw-1rem))] select-none" style={style}>
    <div role="button" tabIndex={0} aria-label={c.title} aria-expanded={open} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => { drag.current = null; }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      className="flex cursor-grab touch-none will-change-[left,top] items-center gap-2 rounded-full border border-primary/50 bg-card/95 py-1.5 pl-1.5 pr-2 shadow-xl backdrop-blur active:cursor-grabbing">
      <span className="relative grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground"><Headset size={16} /><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-chart-2" /></span>
      <span className="min-w-0 flex-1 truncate text-xs font-bold">{c.title}</span>
      <button data-close type="button" aria-label="Close" onClick={close} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"><X size={14} /></button>
    </div>
    {open && <div className="mt-2 grid gap-2 rounded-2xl border border-primary/40 bg-card p-3 text-xs shadow-2xl">
      <p>{desk.greeting || c.hello}</p>
      {!signed ? <a href="/auth" className="rounded-full bg-primary py-2 text-center font-bold text-primary-foreground">{c.signIn}</a>
        : ops.isLoading ? <p className="text-muted-foreground">…</p>
        : (ops.data ?? []).length === 0 ? <p className="text-muted-foreground">{c.none}</p>
        : <div className="grid max-h-56 gap-1 overflow-y-auto">{(ops.data ?? []).map(o => <a key={o.id} href={`/call?chat=${o.id}&n=${encodeURIComponent(o.name)}`} className="flex items-center justify-between gap-2 rounded-xl border border-border px-2 py-1.5">
            <span className="min-w-0"><b className="block truncate">@{o.name}</b><small className="text-[10px] font-bold text-chart-2">{c.official}</small> <small className="text-muted-foreground">{o.code}</small></span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-1 font-bold text-primary-foreground"><MessageCircle size={12} />{c.chat}</span>
          </a>)}</div>}
    </div>}
  </div>;
}
