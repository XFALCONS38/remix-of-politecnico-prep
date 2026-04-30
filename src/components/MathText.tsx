import katex from "katex";
import "katex/dist/katex.min.css";
import { useMemo } from "react";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with LaTeX math delimiters:
 * - $$...$$ for block (display) math
 * - $...$ for inline math
 * Non-delimited text is rendered as-is.
 */
const MathText = ({ text, className }: MathTextProps) => {
  const html = useMemo(() => {
    if (!text) return "";
    // Split on $$...$$ (block) and $...$ (inline)
    // We process block first to avoid conflicts
    const parts: { type: "text" | "inline" | "block"; content: string }[] = [];
    // Supported delimiters (in order):
    //   $$...$$        block
    //   \[...\]        block
    //   \(...\)        inline
    //   $...$          inline (allows newlines; non-greedy, no nested $)
    const regex = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|\$([^$]+?)\$/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      if (match[1] !== undefined) {
        parts.push({ type: "block", content: match[1] });
      } else if (match[2] !== undefined) {
        parts.push({ type: "block", content: match[2] });
      } else if (match[3] !== undefined) {
        parts.push({ type: "inline", content: match[3] });
      } else if (match[4] !== undefined) {
        parts.push({ type: "inline", content: match[4] });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts
      .map((p) => {
        if (p.type === "text") {
          // Escape HTML
          return p.content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        }
        try {
          return katex.renderToString(p.content, {
            displayMode: p.type === "block",
            throwOnError: false,
            trust: true,
          });
        } catch {
          return p.content;
        }
      })
      .join("");
  }, [text]);

  if (!text) return null;

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MathText;
