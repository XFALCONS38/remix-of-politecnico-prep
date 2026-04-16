import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract all text from a PDF File using pdf.js (client-side).
 */
export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let full = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const pageText = tc.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ");
    full += `\n\n--- Page ${p} ---\n${pageText}`;
  }
  return full.trim();
}
