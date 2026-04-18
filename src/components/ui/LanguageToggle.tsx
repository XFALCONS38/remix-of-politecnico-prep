import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useTheme();
  return (
    <div className={cn("inline-flex items-center rounded-full bg-secondary p-0.5", className)}>
      {(["en", "it"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            "px-3 py-1 text-xs font-medium font-['Inter'] rounded-full transition-colors uppercase",
            lang === l ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
          )}
          aria-pressed={lang === l}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
