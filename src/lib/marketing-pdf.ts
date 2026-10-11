import font from '@/assets/bix-marketing-font.otf.asset.json';
import cover from '@/assets/bixlink-marketing-cover.png.asset.json';
import type { Language } from './i18n';
import { marketingCopy, type MarketingPlan } from './marketing';
export type MarketingExport = { language: Language; plan: MarketingPlan; tables: { title: string; rows: string[] }[] };
export async function exportMarketingPdf(input: MarketingExport) {
  const { PDFDocument } = await import('pdf-lib');
  const face = new FontFace('MarketingExport', `url(${font.url})`); await face.load(); document.fonts.add(face);
  const c = marketingCopy(input.language); const locale = input.plan.locales[input.language];
  const css = getComputedStyle(document.querySelector('.site-shell') ?? document.documentElement);
  const bg = css.getPropertyValue('--background').trim(); const fg = css.getPropertyValue('--foreground').trim(); const accent = css.getPropertyValue('--chart-3').trim(); const muted = css.getPropertyValue('--muted-foreground').trim();
  const pdf = await PDFDocument.create(); pdf.setTitle(`BIXLINK — ${c[0]}`); pdf.setAuthor('BIXLINK');
  const coverImage = new Image(); coverImage.src = cover.url; await coverImage.decode();
  const pages = [{title: 'BIXLINK', body: `${c[0]}\n${locale.intro}\n${c[23]}`}, ...locale.sections, ...input.tables.map(t => ({title:t.title,body:t.rows.join('\n')})), {title:c[10] ?? 'Risk',body:c[11] ?? ''}];
  let pageNumber=0;
  for (const page of pages) {
    const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1100; const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PDF canvas unavailable');
    const start=()=>{ctx.fillStyle=bg;ctx.fillRect(0,0,1600,1100);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(40,40,1520,1020);ctx.fillStyle=accent;ctx.font='22px MarketingExport';ctx.fillText(`BIXLINK / ${c[0]} / ${new Date().toISOString().slice(0,10)}`,85,100);};start();
    if(pageNumber===0){ctx.drawImage(coverImage,744,0,536,720,900,130,620,830);}
    const wrap = (text:string, x:number, y:number, width:number, line:number) => { let current=''; for (const char of text) { if (char==='\n') { ctx.fillText(current,x,y);current='';y+=line;continue; } if (ctx.measureText(current+char).width>width) { ctx.fillText(current,x,y);current=char;y+=line; } else current+=char; } ctx.fillText(current,x,y); return y+line; };
    ctx.fillStyle=fg;ctx.font='54px MarketingExport';let y=wrap(page.title,85,205,1400,70)+38;ctx.font='29px MarketingExport';
    const lines:string[]=[]; const segmenter = new Intl.Segmenter(input.language, { granularity:'word' });
    for(const paragraph of page.body.split('\n')) {let line='';for(const {segment} of segmenter.segment(paragraph)){if(ctx.measureText(line+segment).width>1400&&line){lines.push(line.trimEnd());line=segment.trimStart();}else line+=segment;}lines.push(line);}
    const finish=async()=>{ctx.fillStyle=muted;ctx.font='20px MarketingExport';ctx.fillText(`© 2026 BIXLINK · ${c[23]}`,85,1020);ctx.fillText(`${++pageNumber}`,1480,1020);const image=await pdf.embedPng(canvas.toDataURL('image/png'));pdf.addPage([800,550]).drawImage(image,{x:0,y:0,width:800,height:550});};
    for(const line of lines){if(y>940){await finish();start();ctx.fillStyle=fg;ctx.font='28px MarketingExport';ctx.fillText(page.title,85,160);y=230;}ctx.fillStyle=fg;ctx.font='29px MarketingExport';ctx.fillText(line,85,y);y+=48;}
    await finish();
  }
  const bytes=await pdf.save();const blob=new Blob([new Uint8Array(bytes)],{type:'application/pdf'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`BIXLINK-Marketing-${input.language}-${new Date().toISOString().slice(0,10)}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
