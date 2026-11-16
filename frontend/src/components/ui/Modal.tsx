import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/format';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Prevent closing via backdrop / Escape (e.g. while saving). */
  locked?: boolean;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', locked }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !locked) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    // Focus the first field for keyboard-driven use.
    requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), select, textarea, button[type=submit]');
      target?.focus();
    });

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [open, locked, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/45 backdrop-blur-[2px]" onClick={() => !locked && onClose()} />
      <div
        ref={panelRef}
        className={cn(
          'relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-pop sm:rounded-3xl dark:bg-ink-900 dark:ring-1 dark:ring-ink-800',
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <h2 className="text-[17px] font-bold text-ink-900 dark:text-white">{title}</h2>
            {description && <p className="mt-1 text-[13.5px] text-ink-500 dark:text-ink-400">{description}</p>}
          </div>
          <button onClick={onClose} disabled={locked} className="-mt-1 -mr-2 rounded-xl p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        {children && <div className="scrollbar-thin overflow-y-auto px-6 pb-5">{children}</div>}
        {footer && <div className="flex flex-col-reverse gap-2 border-t border-ink-100 bg-ink-50/60 px-6 py-4 sm:flex-row sm:justify-end dark:border-ink-800 dark:bg-ink-950/40">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  children?: ReactNode;
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose, children }: ConfirmProps) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      locked={busy}
      size="sm"
      title={
        <span className="flex items-center gap-3">
          <span className={cn('grid size-10 place-items-center rounded-xl', tone === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10')}>
            <AlertTriangle className="size-5" />
          </span>
          {title}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={run} loading={busy} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-ink-600 dark:text-ink-300">{message}</div>
      {children && <div className="mt-4">{children}</div>}
    </Modal>
  );
}
