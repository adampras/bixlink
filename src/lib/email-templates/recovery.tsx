import * as React from 'react'
import { BrandButton, BrandFrame, BrandNote, BrandText } from './brand'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <BrandFrame preview={`Reset your ${siteName} password`} eyebrow="Account security" title="Reset your password">
    <BrandText>
      We received a request to reset the password of your {siteName} account.
      Press the button below to choose a new password.
    </BrandText>
    <BrandButton href={confirmationUrl}>RESET PASSWORD</BrandButton>
    <BrandNote>
      If you did not request this, ignore this email — your password stays
      unchanged.
    </BrandNote>
  </BrandFrame>
)

export default RecoveryEmail
