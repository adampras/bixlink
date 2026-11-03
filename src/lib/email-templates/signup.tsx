import * as React from 'react'
import { Link } from '@react-email/components'
import { BrandButton, BrandFrame, BrandNote, BrandText, highlight } from './brand'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <BrandFrame
    preview={`Activate your ${siteName} account`}
    eyebrow="Account activation"
    title="Welcome to BIXLINK"
  >
    <BrandText>
      Thank you for registering with{' '}
      <Link href={siteUrl} style={highlight}>{siteName}</Link>. To protect our
      community from fake accounts, please confirm that{' '}
      <span style={highlight}>{recipient}</span> belongs to you.
    </BrandText>
    <BrandButton href={confirmationUrl}>ACTIVATE MY ACCOUNT</BrandButton>
    <BrandNote>
      After activation, return to BIXLINK and sign in with your email and
      password. If you did not create this account, simply ignore this email —
      no account will be activated.
    </BrandNote>
  </BrandFrame>
)

export default SignupEmail
