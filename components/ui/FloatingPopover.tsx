'use client';

import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const OPEN_EVENT = 'asr:popover-open';

interface FloatingPopoverProps extends React.HTMLAttributes<HTMLDivElement> {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  align?: 'start' | 'end';
  width?: number;
  preferredSide?: 'top' | 'bottom';
}

/** Render outside cards/tables so overflow and stacking contexts cannot clip a menu. */
export function FloatingPopover({ anchorRef, open, onClose, align = 'start', width, preferredSide = 'bottom', children, className = '', style, ...props }: FloatingPopoverProps) {
  const instanceId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const [position, setPosition] = useState<React.CSSProperties | null>(null);

  useLayoutEffect(() => { closeRef.current = onClose; }, [onClose]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current || !panelRef.current) return;
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    const viewport = window.visualViewport;
    const margin = 8;
    const gap = 6;

    const place = () => {
      const rect = anchor.getBoundingClientRect();
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const availableWidth = Math.max(0, viewportWidth - margin * 2);
      const menuWidth = Math.min(Math.max(width ?? rect.width, 140), availableWidth);
      const below = Math.max(0, viewportTop + viewportHeight - rect.bottom - gap - margin);
      const above = Math.max(0, rect.top - viewportTop - gap - margin);
      const desiredHeight = Math.min(panel.scrollHeight, 360);
      const topSide = preferredSide === 'top'
        ? above >= desiredHeight || above > below
        : below < desiredHeight && above > below;
      const maxHeight = Math.max(0, Math.min(topSide ? above : below, 360));
      const height = Math.min(panel.scrollHeight, maxHeight);
      const left = Math.max(viewportLeft + margin, Math.min(
        align === 'end' ? rect.right - menuWidth : rect.left,
        viewportLeft + viewportWidth - menuWidth - margin,
      ));
      const next = { left, top: topSide ? rect.top - gap - height : rect.bottom + gap, width: menuWidth, maxHeight };
      setPosition((current) => current && current.left === next.left && current.top === next.top && current.width === next.width && current.maxHeight === next.maxHeight ? current : next);
    };

    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: instanceId }));
    place();
    const resizeObserver = new ResizeObserver(place);
    resizeObserver.observe(anchor);
    resizeObserver.observe(panel);
    const outside = (event: Event) => {
      if (event.target instanceof Node && !anchor.contains(event.target) && !panel.contains(event.target)) closeRef.current();
    };
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !panel.contains(event.target)) closeRef.current();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        anchor.querySelector<HTMLElement>('button, input')?.focus({ preventScroll: true });
        if (anchor.matches('button, input')) anchor.focus({ preventScroll: true });
        closeRef.current();
      }
    };
    const anotherOpened = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) closeRef.current();
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    document.addEventListener('scroll', scroll, true);
    document.addEventListener('keydown', keydown, true);
    window.addEventListener('resize', place);
    viewport?.addEventListener('resize', place);
    viewport?.addEventListener('scroll', place);
    window.addEventListener(OPEN_EVENT, anotherOpened);
    return () => {
      resizeObserver.disconnect();
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('scroll', scroll, true);
      document.removeEventListener('keydown', keydown, true);
      window.removeEventListener('resize', place);
      viewport?.removeEventListener('resize', place);
      viewport?.removeEventListener('scroll', place);
      window.removeEventListener(OPEN_EVENT, anotherOpened);
    };
  }, [open, anchorRef, align, width, preferredSide, instanceId]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      {...props}
      ref={panelRef}
      data-app-popover=""
      className={`app-popover ${className}`}
      style={{ ...style, ...position, position: 'fixed', zIndex: 1200, minWidth: 0, maxWidth: 'calc(100vw - 16px)', visibility: position ? 'visible' : 'hidden', overflowY: 'auto', overscrollBehavior: 'contain' }}
      onClick={(event) => { event.stopPropagation(); props.onClick?.(event); }}
    >{children}</div>,
    document.body,
  );
}
