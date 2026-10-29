import { z } from 'zod';
export const DEV_BUYBACK_MINIMUM_BIX = 500;
export const buybackAmountSchema = z.number().finite().min(DEV_BUYBACK_MINIMUM_BIX).max(1_000_000);
export const canSendVirtualUsdt = (verifiedOwner1: boolean) => verifiedOwner1 === true;