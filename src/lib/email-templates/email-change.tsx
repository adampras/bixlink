import * as React from 'react'
import { BrandButton, BrandFrame, BrandNote, BrandText, highlight } from './brand'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <BrandFrame preview={`Confirm your new ${siteName} email`} eyebrow="Account security" title="Confirm your email change">
    <BrandText>
      You requested to change your {siteName} email from{' '}
      <span style={highlight}>{oldEmail}</span> to{' '}
      <span style={highlight}>{newEmail}</span>.
    </BrandText>
    <BrandButton href={confirmationUrl}>CONFIRM CHANGE</BrandButton>
    <BrandNote>
      If you did not request this change, secure your account immediately by
      changing your password.
    </BrandNote>
  </BrandFrame>
)

export default EmailChangeEmail
