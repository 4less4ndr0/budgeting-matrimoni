import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, forwardedRef) => {
  const localRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const list = localRef.current;
    if (!list) return;

    // iOS Safari can restore focus to the active trigger (roving tabindex) when the page
    // returns to the foreground after an app switch, and scroll it into view itself — with
    // a 'center' alignment rather than 'nearest', which visibly slides the bar even though
    // the active tab was already in view. Asserting 'nearest' ourselves first keeps it a
    // no-op whenever nothing actually needs to move.
    const keepActiveTabStable = () => {
      const active = list.querySelector<HTMLElement>('[data-state="active"]');
      active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'auto' });
    };

    document.addEventListener('visibilitychange', keepActiveTabStable);
    window.addEventListener('pageshow', keepActiveTabStable);
    return () => {
      document.removeEventListener('visibilitychange', keepActiveTabStable);
      window.removeEventListener('pageshow', keepActiveTabStable);
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      className={cn(
        // scroll-behavior/overflow-anchor: forces any scroll correction (ours above, or the
        // browser's own) to happen instantly rather than as a visible sliding animation.
        'flex h-9 w-full items-center justify-start gap-1 overflow-x-auto border-b border-border bg-transparent p-0 text-muted-foreground [-ms-overflow-style:none] [scroll-behavior:auto] [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary data-[state=active]:text-foreground hover:text-foreground focus-visible:outline-none',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('mt-4 focus-visible:outline-none', className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
