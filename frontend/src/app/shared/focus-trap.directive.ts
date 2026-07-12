import { Directive, ElementRef, inject, OnDestroy, OnInit } from '@angular/core';

/**
 * Keeps keyboard focus inside the host (a dialog/modal): focuses the first
 * focusable element on open, cycles Tab/Shift+Tab within the host, and restores
 * focus to the previously-focused element when destroyed. Reusable on any modal.
 */
@Directive({ selector: '[appFocusTrap]', standalone: true })
export class FocusTrapDirective implements OnInit, OnDestroy {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previouslyFocused: HTMLElement | null = null;

  private readonly onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const items = this.focusable();
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  ngOnInit(): void {
    this.previouslyFocused = document.activeElement as HTMLElement;
    this.host.nativeElement.addEventListener('keydown', this.onKeydown);
    queueMicrotask(() => this.focusable()[0]?.focus());
  }

  ngOnDestroy(): void {
    this.host.nativeElement.removeEventListener('keydown', this.onKeydown);
    this.previouslyFocused?.focus?.();
  }

  private focusable(): HTMLElement[] {
    const selector =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(selector)).filter(
      (el) => el.offsetParent !== null,
    );
  }
}
