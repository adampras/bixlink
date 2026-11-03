import * as React from 'react'
import { BrandCode, BrandFrame, BrandNote, BrandText } from './brand'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <BrandFrame preview="Your BIXLINK verification code" eyebrow="Identity check" title="Your verification code">
    <BrandText>Use the code below to confirm your identity:</BrandText>
    <BrandCode>{token}</BrandCode>
    <BrandNote>This code expires shortly. Never share it with anyone, including BIXLINK staff.</BrandNote>
  </BrandFrame>
)

export default ReauthenticationEmail
