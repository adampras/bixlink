import * as React from 'react'
import { Link } from '@react-email/components'
import { BrandButton, BrandFrame, BrandNote, BrandText, highlight } from './brand'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <BrandFrame preview={`You're invited to ${siteName}`} eyebrow="Official invitation" title="You have been invited">
    <BrandText>
      You have been invited to join{' '}
      <Link href={siteUrl} style={highlight}>{siteName}</Link>. Press the button
      below to accept the invitation and create your account.
    </BrandText>
    <BrandButton href={confirmationUrl}>ACCEPT INVITATION</BrandButton>
    <BrandNote>If you were not expecting this invitation, you can safely ignore this email.</BrandNote>
  </BrandFrame>
)

export default InviteEmail
