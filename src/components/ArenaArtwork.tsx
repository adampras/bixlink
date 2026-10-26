import welcome from '@/assets/arena-welcome.jpg';
import checkin from '@/assets/arena-checkin.jpg';
import quiz from '@/assets/arena-quiz.jpg';
import streak from '@/assets/arena-streak.jpg';
import referral from '@/assets/arena-referral.jpg';
import stake7 from '@/assets/arena-stake7.jpg';
import followX from '@/assets/arena-follow_x.jpg';
import telegram from '@/assets/arena-join_telegram.jpg';
import youtube from '@/assets/arena-sub_youtube.jpg';
import type { QuestKey } from '@/lib/arena';

const artwork: Record<QuestKey, string> = { welcome, checkin, quiz, streak, referral, stake7, follow_x: followX, join_telegram: telegram, sub_youtube: youtube };

export function ArenaArtwork({ mission, className = '' }: { mission: QuestKey; className?: string }) {
  return <img src={artwork[mission]} alt="" width={512} height={512} loading="lazy" className={`arena-artwork ${className}`}/>;
}