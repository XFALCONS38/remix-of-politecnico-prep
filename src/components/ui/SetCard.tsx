import { cn } from "@/lib/utils";
import { Lock, CheckCircle2, Clock } from "lucide-react";

type Status = "not_started" | "in_progress" | "completed";

interface Props {
  setId: string;
  status?: Status;
  locked?: boolean;
  selected?: boolean;
  lastAttempted?: string | null;
  onClick?: () => void;
  className?: string;
}

const statusBadge: Record<Status, { label: string; classes: string; icon: any }> = {
  not_started: { label: "Not Started", classes: "bg-muted text-muted-foreground", icon: null },
  in_progress: { label: "In Progress", classes: "bg-warning/10 text-warning", icon: Clock },
  completed: { label: "Completed", classes: "bg-emerald/10 text-emerald", icon: CheckCircle2 },
};

export function SetCard({ setId, status = "not_started", locked, selected, lastAttempted, onClick, className }: Props) {
  const badge = statusBadge[status];
  const Icon = badge.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "relative text-left rounded-[10px] p-5 transition-all min-w-[180px]",
        "bg-card",
        selected && "ring-2 ring-accent ring-offset-2 ring-offset-background",
        locked ? "opacity-60 cursor-not-allowed" : "hover:bg-muted/50",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="font-['Poppins'] text-xl font-semibold text-foreground">{setId}</span>
        {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
      </div>
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium", badge.classes)}>
        {Icon && <Icon className="h-3 w-3" />} {badge.label}
      </span>
      {lastAttempted && (
        <p className="mt-3 text-[11px] text-muted-foreground">Last: {lastAttempted}</p>
      )}
    </button>
  );
}
