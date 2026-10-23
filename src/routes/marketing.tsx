import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Film, ShieldCheck } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MarketingPosters } from '@/components/MarketingPosters';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { LANGUAGES, useI18n, type Language } from '@/lib/i18n';
import { marketingCopy } from '@/lib/marketing';
import { getPresaleStatus } from '@/lib/presale.functions';
import video from '@/assets/bixlink-marketing-2026.mp4.asset.json';
import cover from '@/assets/bixlink-marketing-cover.png.asset.json';
import webVideo from '@/assets/bixlink-marketing-2026.webm.asset.json';
export const Route = createFileRoute('/marketing')({ head: () => ({ meta: [{title:'Marketing materials — BIXLINK'},{name:'description',content:'BIXLINK multilingual marketing plan, current package terms and downloadable explanatory video.'},{property:'og:title',content:'Marketing materials — BIXLINK'},{property:'og:description',content:'Explore BIXLINK package terms, community rules and transparent risk disclosures.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}] }), component: MarketingPage });
function MarketingPage(){
  const {user,ready}=useMember();const {data:cfg}=usePublicConfig();const {language}=useI18n();const [lang,setLang]=useState<Language>(language);useEffect(()=>setLang(language),[language]);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const load=useServerFn(getPresaleStatus);
  const presale=useQuery({queryKey:['presale',user?.id],queryFn:()=>load(),enabled:!!user});const c=marketingCopy(lang);const plan=cfg?.marketingPlan;const content=(plan ? (plan.locales[lang as keyof typeof plan.locales] ?? plan.locales.en) : undefined);
  const tables=()=>{if(!cfg||!presale.data)throw new Error('Current settings are not available yet.');const p=presale.data.config;return [
    {title:c[13]??'',rows:cfg.packages.map(v=>`${v.id} / $${v.price_usd} / ${Object.entries(v.duration_apys??{[v.lock_days]:v.apy}).map(([days,apy])=>`${days} ${c[18]}: ${apy}% ${c[17]}`).join(' · ')}`)},
    {title:c[14]??'',rows:[...p.packages,...(p.sovereign?.enabled?[p.sovereign]:[])].map(v=>`$${v.usd.toLocaleString('en-US')} / ${v.bix.toLocaleString('en-US')} BIX / ${v.releaseDays} ${c[18]}`).concat([`${c[20]}: ${p.poolCap} BIX`,`${c[19]}: ${p.sponsorPct}%`])},
    {title:c[15]??'',rows:[`${c[16]}: $${cfg.bixMarket.priceUsd.toFixed(6)} / BIX`,`${c[19]}: ${cfg.referrals.direct}%`, `USDT ${cfg.referrals.splitUsdt}% / BIX ${cfg.referrals.splitBix}%`, `L1–L5: ${cfg.referrals.levels.join('% / ')}%`,`${c[11]}`]}
  ];};
  return <BixShell><main data-no-translate className="mx-auto min-h-[75vh] max-w-5xl px-5 py-8 md:px-8"><MemberGate ready={ready} signedIn={!!user} title={c[0]??''}>{plan?.enabled===false?<p className="py-10 text-muted-foreground">Marketing materials are currently closed by the owner.</p>:<><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow"><FileText size={14}/> BIXLINK</div><h1 className="mt-3 font-display text-3xl font-bold">{c[0]}</h1><p className="mt-2 text-sm text-muted-foreground">{content?.intro}</p></div><select aria-label="Document language" className="form-input w-auto" value={lang} onChange={e=>setLang(e.target.value as Language)}>{LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}</select></div>
    <div className="my-6 flex flex-wrap gap-3"><Button disabled={busy||!cfg||!presale.data} onClick={async()=>{setBusy(true);setError('');try{if(!plan)return;const {exportMarketingPdf}=await import('@/lib/marketing-pdf');await exportMarketingPdf({language:lang,plan,tables:tables()});}catch(e){setError(e instanceof Error?e.message:'PDF export failed');}finally{setBusy(false);}}}><Download size={16}/>{busy?'…':c[21]}</Button><Button variant="outline" onClick={async()=>{setError('');try{const r=await fetch(video.url);if(!r.ok)throw new Error('Video download unavailable');const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download='BIXLINK-Marketing-2026.mp4';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){setError(e instanceof Error?e.message:'Video download failed');}}}><Film size={16}/>{c[22]}</Button></div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <video className="aspect-video w-full rounded-lg border border-border bg-card" poster={cover.url} controls playsInline preload="metadata" aria-label="BIXLINK marketing overview"><source src={webVideo.url} type="video/webm"/><source src={video.url} type="video/mp4"/></video>
    <p className="mt-2 text-xs text-muted-foreground">© 2026 BIXLINK · 28 seconds · English / Indonesia · 11 Oct 2026 · Silent overview. PDF reflects current settings; video is a dated presentation.</p>
    <MarketingPosters/>
    <div className="mt-8 grid gap-x-8 md:grid-cols-2">{content?.sections.map((s,i)=><section key={i} className="border-t border-border py-6"><span className="numeric text-xs text-chart-3">0{i+1}</span><h2 className="mt-2 font-display text-lg font-bold">{s.title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{s.body}</p></section>)}</div>
    <p className="mt-6 flex items-start gap-2 border-t border-border py-6 text-xs leading-6 text-muted-foreground"><ShieldCheck className="shrink-0" size={16}/>{c[11]}</p></>}</MemberGate></main></BixShell>;
}
