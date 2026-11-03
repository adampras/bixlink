import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

// BIXLINK official luxury email frame: white body (email-safe), obsidian card,
// gold fox emblem header, gold action button and anti-phishing footer.
export const BRAND_URL = 'https://bixlink.com'
const LOGO = `${BRAND_URL}/favicon.png`
const GOLD = '#FFD700'
const GOLD_DEEP = '#C9A227'
const OBSIDIAN = '#0B0B10'
const PURPLE = '#A855F7'

interface FrameProps {
  preview: string
  eyebrow: string
  title: string
  children: React.ReactNode
}

export const BrandFrame = ({ preview, eyebrow, title, children }: FrameProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={card}>
        <Section style={header}>
          <Img src={LOGO} width="56" height="56" alt="BIXLINK" style={logo} />
          <Text style={wordmark}>BIXLINK</Text>
          <Text style={seal}>GENESIS ECOSYSTEM · OFFICIAL NOTICE</Text>
        </Section>
        <Hr style={goldRule} />
        <Section style={content}>
          <Text style={eyebrowStyle}>{eyebrow}</Text>
          <Text style={h1}>{title}</Text>
          {children}
        </Section>
        <Hr style={rule} />
        <Section style={footerWrap}>
          <Text style={security}>
            🔒 Security notice: BIXLINK will never ask for your password, seed
            phrase or private key. Only use links from noreply@bixlink.com.
          </Text>
          <Text style={copyright}>
            © {new Date().getFullYear()} BIXLINK · bixlink.com · All rights reserved.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const BrandButton = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Section style={{ textAlign: 'center' as const, margin: '8px 0 26px' }}>
    <Button className="bx-btn" style={button} href={href}>
      {children}
    </Button>
  </Section>
)

export const BrandText = ({ children }: { children: React.ReactNode }) => (
  <Text style={text}>{children}</Text>
)

export const BrandNote = ({ children }: { children: React.ReactNode }) => (
  <Text style={note}>{children}</Text>
)

export const BrandCode = ({ children }: { children: React.ReactNode }) => (
  <Text style={code}>{children}</Text>
)

export const highlight = { color: GOLD, fontWeight: 'bold' as const, textDecoration: 'none' }

const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  padding: '24px 0',
}
const card = {
  backgroundColor: OBSIDIAN,
  border: `1px solid ${GOLD_DEEP}`,
  borderRadius: '18px',
  maxWidth: '520px',
  margin: '0 auto',
  overflow: 'hidden' as const,
}
const header = { textAlign: 'center' as const, padding: '30px 24px 14px' }
const logo = {
  margin: '0 auto',
  borderRadius: '50%',
  border: `2px solid ${GOLD}`,
}
const wordmark = {
  color: GOLD,
  fontSize: '24px',
  fontWeight: 'bold' as const,
  letterSpacing: '6px',
  margin: '14px 0 2px',
}
const seal = {
  color: PURPLE,
  fontSize: '10px',
  letterSpacing: '3px',
  margin: 0,
}
const goldRule = { borderColor: GOLD_DEEP, margin: '0 32px' }
const rule = { borderColor: '#2a2a33', margin: '0 32px' }
const content = { padding: '26px 32px 8px' }
const eyebrowStyle = {
  color: GOLD_DEEP,
  fontSize: '11px',
  letterSpacing: '3px',
  margin: '0 0 6px',
  textTransform: 'uppercase' as const,
}
const h1 = {
  color: '#F5F5F7',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  margin: '0 0 18px',
}
const text = { color: '#C9CAD3', fontSize: '14px', lineHeight: '1.65', margin: '0 0 20px' }
const note = { color: '#8A8B96', fontSize: '12px', lineHeight: '1.6', margin: '0 0 22px' }
const button = {
  backgroundColor: GOLD,
  color: '#0B0B10',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
  borderRadius: '999px',
  padding: '14px 34px',
  textDecoration: 'none',
  border: `1px solid ${GOLD_DEEP}`,
}
const code = {
  color: GOLD,
  fontFamily: 'Courier, monospace',
  fontSize: '30px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  textAlign: 'center' as const,
  backgroundColor: '#15151c',
  border: `1px solid ${GOLD_DEEP}`,
  borderRadius: '12px',
  padding: '14px 0',
  margin: '4px 0 24px',
}
const footerWrap = { padding: '18px 32px 26px' }
const security = { color: '#8A8B96', fontSize: '11px', lineHeight: '1.6', margin: '0 0 10px' }
const copyright = { color: '#5c5d66', fontSize: '10px', letterSpacing: '1px', margin: 0 }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .bx-btn { background-color: #FFD700 !important; color: #0B0B10 !important; }
  }
  [data-ogsc] .bx-btn { background-color: #FFD700 !important; color: #0B0B10 !important; }
  [data-ogsb] .bx-btn { background-color: #FFD700 !important; color: #0B0B10 !important; }
`
