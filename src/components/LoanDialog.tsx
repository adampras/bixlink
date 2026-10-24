import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

/** Portaled outside the transformed member shell; shared by all loan states. */
export function LoanDialog({ open, onClose, label, children, centered = false }: {
  open: boolean; onClose: () => void; label: string; children: ReactNode; centered?: boolean;
}) {
  return <DialogPrimitive.Root open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="loan-dialog-overlay" />
      <DialogPrimitive.Content aria-describedby={undefined} className={`loan-dialog-content${centered ? ' text-center' : ''}`}>
        <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}