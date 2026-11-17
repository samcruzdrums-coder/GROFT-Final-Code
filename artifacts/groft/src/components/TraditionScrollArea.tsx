import type { ReactNode } from 'react';
import * as ScrollArea from '@radix-ui/react-scroll-area';

/** Show a scrollbar only when content overflows, independent of OS overlay settings. */
export function TraditionScrollArea({ children, label }: { children: ReactNode; label: string }) {
  return (
    <ScrollArea.Root type="auto" className="tradition-scroll-area" data-testid="list-traditions">
      <ScrollArea.Viewport
        className="tradition-scroll-viewport"
        tabIndex={0}
        role="region"
        aria-label={label}
        data-testid="tradition-scroll-viewport"
      >
        {children}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="tradition-scroll-track">
        <ScrollArea.Thumb className="tradition-scroll-thumb" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}
