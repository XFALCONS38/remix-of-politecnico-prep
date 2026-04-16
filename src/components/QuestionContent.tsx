import MathText from "./MathText";
import { Fragment } from "react";

interface QuestionContentProps {
  text: string;
  className?: string;
}

/**
 * Renders question text with embedded image markers.
 * Supported syntax:
 *   [Image_ID: <url-or-id>]   →  <img>
 *   ![alt](url)               →  <img>  (markdown style; legacy)
 *
 * Images are rendered exactly where the marker appears, preserving order
 * with the surrounding text/math content.
 */
const IMAGE_REGEX = /\[Image_ID:\s*([^\]]+)\]|!\[([^\]]*)\]\(([^)]+)\)/g;

const QuestionContent = ({ text, className }: QuestionContentProps) => {
  if (!text) return null;

  const parts: { type: "text" | "image"; content: string; alt?: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = IMAGE_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const url = match[1] ?? match[3];
    const alt = match[2] ?? "question image";
    parts.push({ type: "image", content: url.trim(), alt });
    lastIndex = IMAGE_REGEX.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return (
    <div className={className}>
      {parts.map((p, i) => {
        if (p.type === "image") {
          return (
            <div key={i} className="my-3 flex justify-center">
              <img
                src={p.content}
                alt={p.alt}
                loading="lazy"
                className="max-h-96 max-w-full rounded border"
              />
            </div>
          );
        }
        return <MathText key={i} text={p.content} />;
      })}
    </div>
  );
};

export default QuestionContent;
