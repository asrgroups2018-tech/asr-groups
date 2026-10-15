'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { numberToWordsINR } from '@/lib/utils/formatCurrency';

interface HoveredAmount {
  words: string;
  top: number;
  left: number;
}

const AMOUNT_PATTERN = /^(?:₹|INR)\s*([+-]?(?:\d[\d,]*)(?:\.\d+)?)$/i;

function pointIsInsideText(element: HTMLElement, clientX: number, clientY: number): boolean {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();

  while (textNode) {
    if (textNode.textContent?.trim()) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      const isInside = Array.from(range.getClientRects()).some((rect) => (
        clientX >= rect.left
        && clientX <= rect.right
        && clientY >= rect.top
        && clientY <= rect.bottom
      ));
      range.detach();
      if (isInside) return true;
    }
    textNode = walker.nextNode();
  }

  return false;
}

function pointIsInsideElement(element: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function findAmountElement(
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): { element: HTMLElement; amount: number } | null {
  let element = target instanceof HTMLElement ? target : null;
  if (!element) return null;

  const markedAmount = element.closest<HTMLElement>('[data-amount-words="true"]');
  if (markedAmount) {
    const amount = Number(markedAmount.dataset.amountWordsValue);
    const hasText = Boolean(markedAmount.textContent?.trim());
    const isOverAmount = hasText
      ? pointIsInsideText(markedAmount, clientX, clientY)
      : pointIsInsideElement(markedAmount, clientX, clientY);
    return Number.isFinite(amount) && isOverAmount ? { element: markedAmount, amount } : null;
  }

  if (element.closest('[data-amount-words="false"]')) return null;

  while (element && element !== document.body) {
    const text = element.textContent?.trim() || '';
    const match = AMOUNT_PATTERN.exec(text);
    if (match && pointIsInsideText(element, clientX, clientY)) {
      const amount = Number(match[1].replace(/,/g, ''));
      if (Number.isFinite(amount)) return { element, amount };
    }
    element = element.parentElement as HTMLElement | null;
  }

  return null;
}

export function AmountWordsHover() {
  const [hovered, setHovered] = useState<HoveredAmount | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const hoveredAmountRef = useRef<{ element: HTMLElement; amount: number } | null>(null);

  const updatePosition = useCallback(() => {
    const element = hoveredElementRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const tooltipWidth = Math.min(320, Math.max(220, window.innerWidth - 24));
    const tooltipHeight = 68;
    const margin = 12;
    const left = Math.min(
      Math.max(margin, rect.left + (rect.width - tooltipWidth) / 2),
      Math.max(margin, window.innerWidth - tooltipWidth - margin),
    );
    const top = rect.top >= tooltipHeight + margin
      ? rect.top - tooltipHeight - 10
      : Math.min(window.innerHeight - tooltipHeight - margin, rect.bottom + 10);

    setHovered((current) => current ? { ...current, top, left } : current);
  }, []);

  useEffect(() => {
    const clearHoveredAmount = () => {
      hoveredElementRef.current = null;
      hoveredAmountRef.current = null;
      setHovered(null);
    };

    const syncAtPoint = (target: EventTarget | null, clientX: number, clientY: number) => {
      const found = findAmountElement(target, clientX, clientY);
      if (!found) {
        if (hoveredAmountRef.current) clearHoveredAmount();
        return;
      }

      hoveredElementRef.current = found.element;
      const current = hoveredAmountRef.current;
      if (current?.element === found.element && current.amount === found.amount) return;

      hoveredAmountRef.current = found;
      setHovered({
        words: numberToWordsINR(found.amount),
        top: 0,
        left: 0,
      });
      requestAnimationFrame(updatePosition);
    };

    const handlePointerOver = (event: PointerEvent) => {
      syncAtPoint(event.target, event.clientX, event.clientY);
    };

    let pointerMoveFrame = 0;
    let latestPointerEvent: PointerEvent | null = null;
    const handlePointerMove = (event: PointerEvent) => {
      latestPointerEvent = event;
      if (pointerMoveFrame) return;
      pointerMoveFrame = requestAnimationFrame(() => {
        pointerMoveFrame = 0;
        if (latestPointerEvent) {
          syncAtPoint(latestPointerEvent.target, latestPointerEvent.clientX, latestPointerEvent.clientY);
        }
      });
    };

    const handlePointerOut = (event: PointerEvent) => {
      const current = hoveredElementRef.current;
      const nextTarget = event.relatedTarget;
      if (current && nextTarget instanceof Node && current.contains(nextTarget)) return;
      clearHoveredAmount();
    };

    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerout', handlePointerOut);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      cancelAnimationFrame(pointerMoveFrame);
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  if (!hovered || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[2000] hidden max-w-[min(320px,calc(100vw-24px))] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left shadow-xl sm:block"
      style={{ top: hovered.top, left: hovered.left, visibility: hovered.top ? 'visible' : 'hidden' }}
    >
      <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        Amount in words
      </span>
      <span className="mt-1 block text-xs font-semibold leading-snug text-white break-words">
        {hovered.words}
      </span>
    </div>,
    document.body,
  );
}
