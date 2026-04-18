import { cn } from "@/lib/utils";

export function scoreColor(score: number): "emerald" | "amber" | "danger" {
  if (score >= 80) return "emerald";
  if (score >= 60) return "amber";
  return "danger";
}

interface Props {
  score: number;
  className?: string;
  showSuffix?: boolean;
}

export function ScoreColorBand({ score, className, showSuffix = true }: Props) {
  const color = scoreColor(score);
  const styles = {
    emerald: "bg-emerald/10 text-emerald",
    amber: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  }[color];

  return (
    <span className={cn("inline-flex items-center rounded-[10px] px-2.5 py-1 text-sm font-semibold font-['Inter']", styles, className)}>
      {Math.round(score)}{showSuffix ? "%" : ""}
    </span>
  );
}
