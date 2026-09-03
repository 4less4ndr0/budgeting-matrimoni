import { useEffect, useMemo, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import changelogRaw from '../../../CHANGELOG.md?raw';

type ChangelogEntry = { date: string } | { text: string };

/** Parser minimo su misura per il nostro CHANGELOG.md: `## data` -> intestazione, `- voce` -> voce. */
function parseChangelog(raw: string): ChangelogEntry[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('## ') || line.startsWith('- '))
    .map((line) => (line.startsWith('## ') ? { date: line.slice(3) } : { text: line.slice(2) }));
}

export default function ChangelogButton() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const entries = useMemo(() => parseChangelog(changelogRaw), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative self-start" ref={rootRef}>
      <Button variant="secondary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Info />
        Changelog
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 max-h-80 w-80 overflow-y-auto rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md">
          {entries.map((entry, i) =>
            'date' in entry ? (
              <p key={i} className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                {entry.date}
              </p>
            ) : (
              <p key={i} className="py-0.5 text-sm">
                {entry.text}
              </p>
            ),
          )}
        </div>
      )}
    </div>
  );
}
