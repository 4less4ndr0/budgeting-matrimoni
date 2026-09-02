import { useEffect, useRef, useState } from 'react';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exportStateSnapshot } from '@/lib/export/exportSnapshot';
import { exportWorkbook } from '@/lib/export/exportWorkbook';
import type { AppState } from '@/types/domain';

export default function ExportMenu({ state }: { state: AppState }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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
        <Download />
        Esporta
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-72 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <button
            type="button"
            className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              exportWorkbook(state);
              setOpen(false);
            }}
          >
            <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block font-medium">Excel (.xlsx)</span>
              <span className="block text-xs text-muted-foreground">
                Costi, fondi, assunzioni e proiezioni — per Google Sheets/Excel
              </span>
            </span>
          </button>
          <button
            type="button"
            className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              exportStateSnapshot(state);
              setOpen(false);
            }}
          >
            <FileJson className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="block font-medium">Salva stato (.json)</span>
              <span className="block text-xs text-muted-foreground">
                Sposta il file scaricato in <code>csv-imports/</code> per ricaricare questa
                identica situazione (override compresi) anche da un altro dispositivo
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
