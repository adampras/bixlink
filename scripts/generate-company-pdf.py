"""Generate the dated, English-only company overview and page previews."""
from pathlib import Path
import subprocess, math
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/downloads/bixlink-company-2026-10-29'
OUT.mkdir(parents=True,exist_ok=True)
for name,face in [('Body','DejaVu Sans'),('Bold','DejaVu Sans:bold')]:
 p=subprocess.check_output(['fc-match','-f','%{file}',face],text=True).strip();pdfmetrics.registerFont(TTFont(name,p))
W,H=1120,790
BG=HexColor('#080D12');SURFACE=HexColor('#101A20');GREEN=HexColor('#A6EE35');GOLD=HexColor('#EACB7A');WHITE=HexColor('#F4F7F3');MUTED=HexColor('#B6C4C8');BLUE=HexColor('#61C8F7')
c=canvas.Canvas(str(OUT/'BIXLINK-Company-Overview-English.pdf'),pagesize=(W,H))
c.setTitle('BIXLINK | Company & Ecosystem Overview | 29 October 2026');c.setAuthor('BIXLINK')
fox=Path('/tmp/bix-pdf/fox.png');wallet=ROOT/'src/assets/bix-lux-wallet.png'
styles={k:ParagraphStyle(k,fontName='Bold' if k=='label' else 'Body',fontSize=s,leading=l,textColor=WHITE) for k,s,l in [('body',17,27),('small',12,19),('label',20,27)]}
page=0

def text(s,x,y,width=900,kind='body',color=None):
 st=styles[kind].clone('local');st.textColor=color or st.textColor
 p=Paragraph(s,st);_,h=p.wrap(width,1000);p.drawOn(c,x,y-h);return y-h

def base(section,title,subtitle):
 global page;page+=1
 c.setFillColor(BG);c.rect(0,0,W,H,fill=1,stroke=0)
 c.setStrokeColor(HexColor('#283D28'));c.setLineWidth(1)
 for i in range(7):
  x=W-270+i*28;c.line(x,70,x,H-60);c.line(x,H-60,x-38,H-22)
 c.setStrokeColor(GREEN);c.line(40,H-91,W-40,H-91)
 c.setFont('Bold',18);c.setFillColor(WHITE);c.drawString(45,H-50,'BIXLINK')
 c.setFont('Body',10);c.setFillColor(GREEN);c.drawRightString(W-45,H-48,section.upper())
 c.setFont('Bold',39);c.setFillColor(WHITE);c.drawString(45,H-151,title)
 text(subtitle,48,H-171,990,'small',MUTED)
 c.setStrokeColor(HexColor('#314535'));c.line(45,59,W-45,59)
 c.setFont('Body',9);c.setFillColor(MUTED);c.drawString(45,36,'© 2026 BIXLINK  |  English overview  |  Settings snapshot: 29 Oct 2026  |  Not financial advice')
 c.setFillColor(GREEN);c.drawRightString(W-45,36,f'{page:02d} / 10')

def panel(x,y,w,h,title,body,num=None):
 c.setFillColor(SURFACE);c.setStrokeColor(HexColor('#354F31'));c.roundRect(x,y-h,w,h,8,fill=1,stroke=1)
 if num:
  c.setFillColor(GREEN);c.setFont('Bold',13);c.drawString(x+20,y-29,num)
 top=y-48 if num else y-23
 end=text(title,x+20,top,w-40,'label',GOLD)
 available=end-13-(y-h+18)
 st=styles['body'].clone('fitted')
 for size in (17,16,15,14):
  st.fontSize=size;st.leading=size*1.45
  p=Paragraph(body,st);_,height=p.wrap(w-40,1000)
  if height<=available:break
 p.drawOn(c,x+20,end-13-height);end=end-13-height
 assert end>=y-h+18,(page,title,end,y-h)

def finish():c.showPage()

base('Company profile','BIXLINK','A connected digital ecosystem. A clearer way to participate.')
c.drawImage(ImageReader(str(fox)),730,280,width=300,height=300,mask='auto')
c.setFont('Bold',48);c.setFillColor(GREEN);c.drawString(48,492,'BUILD. CONNECT.')
c.setFillColor(WHITE);c.drawString(48,425,'GROW TOGETHER.')
text('BIXLINK brings account-ledger utility, community participation and a separate Web3 wallet experience into one premium, installable application.',50,380,635)
text('Company / project profile<br/>A product and ecosystem overview, not evidence of incorporation, licensing, audited reserves or guaranteed income.',50,250,615,'small',MUTED)
for x,t in [(48,'ACCOUNT'),(275,'WEB3 WALLET'),(502,'COMMUNITY')]:
 c.setStrokeColor(GREEN);c.roundRect(x,117,210,48,6);c.setFillColor(GOLD);c.setFont('Bold',13);c.drawCentredString(x+105,136,t)
finish()
base('Vision & mission','Purpose with transparency','Utility first. Clear records. Responsible community growth.')
panel(45,550,500,210,'Our vision','Build an accessible digital ecosystem where members can understand their account activity, connect a Web3 wallet and follow project development transparently.','01')
panel(575,550,500,210,'Our mission','Deliver useful member tools, readable financial records and a refined mobile experience while preserving the distinction between internal records and blockchain assets.','02')
panel(45,306,1030,205,'Guiding principles','Clarity over hype. Real records over fabricated balances. Private keys stay with the wallet holder. Published terms and review status take priority over promotional projections.','03')
finish()
base('Tokenomics','21,000,000 BIX','Published allocation blueprint — allocations and schedules are plans, not proof of distribution or liquidity.')
alloc=[('Staking rewards',35,'7,350,000'),('Presale',15,'3,150,000'),('Liquidity pool',15,'3,150,000'),('Treasury / DAO',10,'2,100,000'),('Network & leaders',10,'2,100,000'),('Team & founders',10,'2,100,000'),('Marketing & community',5,'1,050,000')]
colors=[GREEN,GOLD,BLUE,HexColor('#9D83DB'),HexColor('#56C6AA'),HexColor('#ED9473'),HexColor('#DD75B0')]
start=90
for (_,pct,_),col in zip(alloc,colors):
 c.setFillColor(col);c.wedge(65,218,435,588,start,-pct*3.6,fill=1,stroke=0);start-=pct*3.6
c.setFillColor(BG);c.circle(250,403,110,fill=1,stroke=0);c.setFillColor(WHITE);c.setFont('Bold',31);c.drawCentredString(250,414,'21M');c.setFont('Body',12);c.drawCentredString(250,383,'BIX SUPPLY PLAN')
y=558
for (name,pct,amt),col in zip(alloc,colors):
 c.setFillColor(col);c.rect(490,y-17,6,22,fill=1,stroke=0);c.setFont('Bold',15);c.setFillColor(WHITE);c.drawString(512,y,name);c.drawRightString(1055,y,f'{pct}%  |  {amt}');y-=46
text('Schedules: staking-reward halving planned every 2 years; liquidity lock planned for 12 months; team cliff 12 months + vesting 24 months. DAO governance is a future direction, not active voting.',65,173,990,'small',MUTED)
finish()
base('Roadmap','A staged ecosystem roadmap','Published roadmap direction — calendar labels are targets, not certification that a milestone is complete.')
road=[('Q1 2026','Launch','Identity, access and the initial BIXLINK account experience.'),('Q2 2026','Staking app beta','Test staking workflows and readable internal records.'),('Q3 2026','RWA framework','Design asset-verification and reporting requirements; external assets remain subject to verification.'),('Q4 2026','Ecosystem utility','Develop wallet tools, BIX PAY and community experiences.'),('Q1 2027','DAO direction','Explore community governance with formal eligibility and controls.'),('Q2 2027','21M milestone','Review supply-plan progress, utility and reporting — not a price target.')]
for i,(date,title,body) in enumerate(road):
 x=45+(i%3)*350;y=550-(i//3)*235
 panel(x,y,330,214,title,f'<font color="#A6EE35">{date}</font><br/>{body}',f'{i+1:02d}')
finish()
base('Current app strengths','One experience. Two asset worlds.','Premium mobile presentation with function-led navigation, not a promise of institutional scale.')
c.drawImage(ImageReader(str(wallet)),785,305,width=270,height=270,mask='auto')
panel(45,550,700,182,'BIXLINK Account','Email / member-ID access, recorded BIX activity, BIX PAY transfers, account history, referral-network views and owner-reviewed requests. Internal balances are not blockchain balances.')
panel(45,344,700,182,'Sovereign Web3 Wallet','Connect an external wallet; read BNB Chain balances; send with wallet approval; receive by QR; inspect Explorer records. No private key is requested or stored.')
text('Also available by owner settings: public market charts and depth, watchlist, language selection, NFT certificates, merchandise catalog, Fox Arena and marketing downloads. Installation uses PWA, not an APK.',48,135,1000,'small',MUTED)
finish()
base('Passive participation','Understand the terms before joining','Configured rates and projections are not guarantees, spendable funds or evidence of investment returns.')
panel(45,550,500,265,'Staking & display projections','Compare the active package, selected duration and saved annual APY. Daily display projection = principal × annual APY / 100 / 365. Current duration choices include 30, 60, 90, 180 and 360 days. Running records preserve their accepted terms.','01')
panel(575,550,500,265,'Presale & release strategies','Where enabled, Standard, Hybrid, Dividend and Founder selections snapshot their allocation and release rules. The published presale blueprint uses $0.50 / BIX with a 3.15M BIX pool cap; always check the live purchase confirmation.','02')
text('Reward records / constraints',48,252,980,'label',GOLD)
text('Claims and withdrawals follow their separate settlement and review rules. Pending or projected amounts are not automatically available. Leader / conditional-loan qualification, lock periods and completion conditions must be met. No automatic payout rail or guaranteed liquidity is represented.',48,208,980)
finish()
base('Active community plan','Participation with accountable rules','Saved referral settings as of 29 Oct 2026 — future settings can change; accepted records retain applicable terms.')
panel(45,550,500,217,'Direct sponsorship','Current direct rate: 10%, with 50% USDT / 50% BIX split for the USDT network rule. Native-BIX direct reward: enabled at 10%, subject to source-stake records and applicable owner review.','01')
panel(575,550,500,217,'Daily matching','Current levels: 5%, 3%, 2%, 1%, 0.5%. Levels require the corresponding qualifying active directs; the saved USDT/BIX split is 50:50. Only eligible source records count.','02')
panel(45,309,500,210,'RewardPlus & VIP','RewardPlus setting: 5%; minimum directs: 3. Turnover and qualification rules apply. VIP tiers use qualifying active team sales, exclude clones and require one-time owner-reviewed rewards.','03')
panel(575,309,500,210,'Leader & community','Leader / conditional-loan targets and lock rules remain enforced. Community claims, mining conversions and Arena rewards follow account caps, promo budgets and owner-controlled availability — never unlimited rewards.','04')
finish()
base('System security','Security through boundaries','Controls are not a substitute for an independent audit or a guarantee against loss.')
for i,(title,body) in enumerate([
 ('Verified authorization','Sensitive actions validate the signed-in identity and permitted owner role. Member interfaces alone do not grant financial privileges.'),
 ('Ledger integrity','Transactions retain source, status and audit records. Virtual USDT sending is Owner 1 only. Developer buyback minimum: 500 BIX; approval remains restricted to authorized owners.'),
 ('Wallet separation','Internal BIX, account USDT, virtual USDT and on-chain assets have separate meanings. Connecting a wallet does not bridge or automatically reconcile balances.'),
 ('User protection','Never share a recovery phrase or private key. Confirm network, contract and recipient. Web3 sends require your wallet signature and network gas; settings and availability may change.')]):
 panel(45+(i%2)*530,550-(i//2)*233,500,213,title,body,f'{i+1:02d}')
finish()
base('Risk & informed choice','Know what is not promised','A responsible ecosystem communicates limits as clearly as possibilities.')
panel(45,550,1030,194,'No fabricated market claims','Internal BIX reference price is owner-managed; it is not an exchange price. A token contract or explorer link does not prove liquidity, broad holder distribution, audited reserves or an exchange listing. Public charts describe external markets, not executed BIX trades.')
panel(45,330,1030,192,'Review, availability and financial risk','Staking projections, promotional rewards and roadmap targets can differ from actual outcomes. Liquidity, volatility, counterparty, smart-contract and operational risks remain. Withdrawals and developer buybacks require applicable verification and review; external transfer execution is a separate action.')
text('Legal clarity: this document is a product overview, not legal incorporation evidence, a securities offer, personalized investment advice, an audit report or a guarantee of capital protection.',48,112,1000,'small',MUTED)
finish()
base('Invitation & closing','Join with clarity. Build with purpose.','Start with understanding — participation is a choice, not an income promise.')
for i,(title,body) in enumerate([('Create or access your account','Use the official BIXLINK application and review your member ID and account details.'),('Explore before committing','Read package terms, current availability, reward qualification and essential risk disclosures.'),('Choose your wallet mode','Account activity stays internal; Web3 connects your external wallet. Install the PWA in a supported browser.'),('Participate responsibly','Follow official announcements, support the community and verify every financial action before confirmation.')]):
 panel(45+(i%2)*530,550-(i//2)*207,500,187,title,body,f'{i+1:02d}')
text('BIXLINK  ·  Utility. Community. Transparent progress.',48,102,1000,'label',GREEN)
finish();c.save()
subprocess.run(['pdftoppm','-jpeg','-scale-to','1400',str(OUT/'BIXLINK-Company-Overview-English.pdf'),str(OUT/'page')],check=True)
print(OUT)
