import { ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export default function CategoryFilter({
  categories,
  selected,
  onChange,
}: {
  categories: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const sorted = [...categories].sort((a, b) => a.localeCompare(b, 'it'));

  function toggle(category: string, checked: boolean) {
    onChange(checked ? [...selected, category] : selected.filter((c) => c !== category));
  }

  if (sorted.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <ListFilter />
          {selected.length === 0 ? 'Tutte le categorie' : `${selected.length} categorie selezionate`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Filtra per categoria
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => onChange([])}
            >
              Azzera
            </button>
          )}
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {sorted.map((category) => {
            const id = `category-filter-${category}`;
            return (
              <div key={category} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.includes(category)}
                  onCheckedChange={(checked) => toggle(category, checked === true)}
                />
                <Label htmlFor={id} className="flex-1 truncate font-normal">
                  {category}
                </Label>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
