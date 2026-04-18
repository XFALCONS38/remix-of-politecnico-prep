import { cn } from "@/lib/utils";

export type QStatus = "answered" | "flagged" | "current" | "unvisited";

interface Item {
  index: number;
  status: QStatus;
}

interface Props {
  items: Item[];
  onSelect?: (index: number) => void;
  className?: string;
}

const styleFor = (s: QStatus) => {
  switch (s) {
    case "answered":
      return "bg-primary text-primary-foreground";
    case "flagged":
      return "bg-warning text-warning-foreground";
    case "current":
      return "bg-primary text-primary-foreground ring-2 ring-accent ring-offset-2 ring-offset-background";
    case "unvisited":
    default:
      return "bg-secondary text-foreground hover:bg-muted";
  }
};

export function QuestionNavigator({ items, onSelect, className }: Props) {
  return (
    <div className={className}>
      <div className="grid grid-cols-5 gap-2">
        {items.map((it) => (
          <button
            key={it.index}
            type="button"
            onClick={() => onSelect?.(it.index)}
            className={cn(
              "h-10 w-10 rounded-[10px] text-sm font-medium font-['Inter'] transition-colors",
              styleFor(it.status),
            )}
            aria-label={`Question ${it.index + 1}`}
          >
            {it.index + 1}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Legend color="bg-primary" label="Answered" />
        <Legend color="bg-warning" label="Flagged" />
        <Legend color="bg-secondary" label="Unvisited" />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", color)} />
      <span>{label}</span>
    </div>
  );
}
