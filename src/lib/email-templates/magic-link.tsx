import * as React from 'react'
import { BrandButton, BrandFrame, BrandNote, BrandText } from './brand'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <BrandFrame preview={`Your ${siteName} sign-in link`} eyebrow="Secure sign-in" title="Your sign-in link">
    <BrandText>
      Press the button below to sign in to {siteName}. This link expires
      shortly and can be used only once.
    </BrandText>
    <BrandButton href={confirmationUrl}>SIGN IN</BrandButton>
    <BrandNote>If you did not request this link, you can safely ignore this email.</BrandNote>
  </BrandFrame>
)

export default MagicLinkEmail
