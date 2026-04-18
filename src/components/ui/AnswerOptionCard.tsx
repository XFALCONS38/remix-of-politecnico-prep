import { cn } from "@/lib/utils";
import MathText from "@/components/MathText";

interface Props {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AnswerOptionCard({ letter, text, selected, onClick, disabled, className }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-[10px] px-4 py-4 transition-colors flex gap-4 items-start",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground hover:bg-muted",
        disabled && "opacity-60 cursor-not-allowed",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] font-['Poppins'] font-semibold text-sm",
          selected ? "bg-primary-foreground/15 text-primary-foreground" : "bg-background text-foreground",
        )}
      >
        {letter}
      </span>
      <div className="flex-1 min-w-0 leading-relaxed">
        <MathText text={text} />
      </div>
    </button>
  );
}
