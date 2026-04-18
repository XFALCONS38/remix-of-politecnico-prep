import { cn } from "@/lib/utils";

type Status = "strong" | "review" | "weak";

interface Props {
  status: Status;
  className?: string;
}

const labels: Record<Status, string> = { strong: "Strong", review: "Review", weak: "Weak" };

export function SectionStatusChip({ status, className }: Props) {
  const styles = {
    strong: "bg-emerald/10 text-emerald",
    review: "bg-warning/10 text-warning",
    weak: "bg-danger/10 text-danger",
  }[status];

  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium font-['Inter']", styles, className)}>
      {labels[status]}
    </span>
  );
}

export function statusFromAccuracy(accuracy: number): Status {
  if (accuracy >= 75) return "strong";
  if (accuracy >= 50) return "review";
  return "weak";
}
