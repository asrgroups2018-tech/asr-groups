'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const modalStack: HTMLDivElement[] = [];
let previousBodyOverflow = '';
let lockedPane: HTMLElement | null = null;
let previousPaneOverflow = '';

interface ModalFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose: () => void;
  dismissible?: boolean;
  placement?: 'center' | 'end' | 'bottom';
}

/** Shared viewport sizing, dismissal, and keyboard handling for app dialogs. */
export function ModalFrame({ children, onClose, dismissible = true, placement = 'center', className = '', ...props }: ModalFrameProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  useLayoutEffect(() => {
    closeRef.current = onClose;
    dismissibleRef.current = dismissible;
  }, [onClose, dismissible]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (modalStack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      lockedPane = document.querySelector<HTMLElement>('.app-shell main');
      previousPaneOverflow = lockedPane?.style.overflow || '';
      if (lockedPane) lockedPane.style.overflow = 'hidden';
    }
    const baseLayer = Number.parseInt(getComputedStyle(root).zIndex, 10) || 50;
    const parentLayer = Math.max(0, ...modalStack.map((modal) => Number.parseInt(modal.style.zIndex, 10) || 50));
    root.style.zIndex = String(Math.max(baseLayer, parentLayer + 1));
    modalStack.push(root);
    root.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== root || document.querySelector('[data-app-popover]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (dismissibleRef.current) closeRef.current();
      }
      if (event.key === 'Tab') {
        const controls = Array.from(root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]'))
          .filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); root.focus(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      const index = modalStack.indexOf(root);
      if (index !== -1) modalStack.splice(index, 1);
      if (modalStack.length === 0) {
        document.body.style.overflow = previousBodyOverflow;
        if (lockedPane) lockedPane.style.overflow = previousPaneOverflow;
        lockedPane = null;
      }
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div
      {...props}
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={props['aria-label'] || (props['aria-labelledby'] ? undefined : 'Application dialog')}
      data-app-modal=""
      data-placement={placement}
      className={`app-modal-frame ${className}`}
      onPointerDown={(event) => {
        props.onPointerDown?.(event);
        if (event.target === event.currentTarget && dismissibleRef.current) closeRef.current();
      }}
    >{children}</div>, document.body,
  );
}
