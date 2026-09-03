import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import changelogRaw from '../../../CHANGELOG.md?raw';

const PR_BASE_URL = 'https://github.com/4less4ndr0/budgeting-matrimoni/pull/';
const PR_SUFFIX_RE = /^(.*)\s\(#(\d+)\)$/;

type ChangelogNode =
  | { kind: 'date'; text: string }
  | { kind: 'topic'; text: string }
  | { kind: 'item'; text: string; prNumber?: string };

/** Parser minimo su misura per il nostro CHANGELOG.md: `## data` -> data, `### argomento` -> argomento, `- voce` -> voce. */
function parseChangelog(raw: string): ChangelogNode[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('## ') || line.startsWith('### ') || line.startsWith('- '))
    .map((line): ChangelogNode => {
      if (line.startsWith('## ')) return { kind: 'date', text: line.slice(3) };
      if (line.startsWith('### ')) return { kind: 'topic', text: line.slice(4) };
      const text = line.slice(2);
      const match = text.match(PR_SUFFIX_RE);
      return match ? { kind: 'item', text: match[1], prNumber: match[2] } : { kind: 'item', text };
    });
}

export default function ChangelogButton() {
  const [open, setOpen] = useState(false);
  const nodes = useMemo(() => parseChangelog(changelogRaw), []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Info />
          Changelog
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Changelog
          </DialogTitle>
          <DialogDescription>Storico delle modifiche pubblicate su main, raggruppate per argomento e per data.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1">
          {nodes.map((node, i) => {
            if (node.kind === 'date') {
              return (
                <h2 key={i} className="mb-2 mt-6 text-base font-bold first:mt-0">
                  {node.text}
                </h2>
              );
            }
            if (node.kind === 'topic') {
              return (
                <h3 key={i} className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                  {node.text}
                </h3>
              );
            }
            return (
              <p key={i} className="flex items-baseline justify-between gap-3 py-0.5 text-sm">
                <span>{node.text}</span>
                {node.prNumber && (
                  <a
                    href={`${PR_BASE_URL}${node.prNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    #{node.prNumber}
                  </a>
                )}
              </p>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
