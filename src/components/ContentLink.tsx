import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { hasPage, sizeSpan, type ContentGroup, type ContentItem } from '@/lib/landing-content';

export function ContentLink({ group, index, item, children, className = '' }: { group: ContentGroup; index: number; item: ContentItem; children: ReactNode; className?: string }) {
  const cls = `${sizeSpan(item)} ${className} block min-w-0`;
  if (!hasPage(item)) return <div className={cls}>{children}</div>;
  return <Link to="/content/$group/$index" params={{ group, index: String(index) }} className={`${cls} rounded-lg transition-transform focus-visible:ring-2 focus-visible:ring-primary motion-safe:active:scale-[0.98]`} aria-label={`Open ${item.title}`}>{children}</Link>;
}
