import { type PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { pdfSafe } from "../text";

/** Typed answers: dark navy, so filled-in text reads as "filled in" next to the form's black print. */
export const INK = rgb(0.06, 0.1, 0.3);

export type Fonts = { regular: PDFFont; bold: PDFFont };

/** A [x0, y0, x1, y1] box in PDF points (origin bottom-left), as read from the original form. */
export type Box = [number, number, number, number];

/**
 * Draws answers onto one page of an original BHI form. Every method skips empty values, so a form
 * with missing answers prints exactly like the blank paper form.
 */
export class FormPage {
  constructor(readonly page: PDFPage, readonly fonts: Fonts) {}

  /**
   * One line of typed text starting at (x, baseline y). Shrinks (down to 6 pt) to fit maxWidth, then
   * cuts with "..." rather than run over the form's printed text.
   */
  text(value: unknown, x: number, y: number, maxWidth: number, opts: { size?: number; bold?: boolean } = {}) {
    let s = pdfSafe(value).replace(/\s+/g, " ").trim();
    if (!s) return;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    let size = opts.size ?? 10;
    while (size > 6 && font.widthOfTextAtSize(s, size) > maxWidth) size -= 0.5;
    if (font.widthOfTextAtSize(s, size) > maxWidth) {
      while (s.length > 1 && font.widthOfTextAtSize(`${s}...`, size) > maxWidth) s = s.slice(0, -1);
      s = `${s.trimEnd()}...`;
    }
    this.page.drawText(s, { x, y, size, font, color: INK });
  }

  /** Text inside a box from the form (vertically centred). */
  inBox(value: unknown, b: Box, size = 9) {
    const h = b[3] - b[1];
    const s = Math.min(size, Math.max(6, h - 1));
    this.text(value, b[0] + 2, b[1] + (h - s * 0.72) / 2, b[2] - b[0] - 4, { size: s });
  }

  /** Wrapped text inside a box (e.g. "Job Duties"), shrinking until every line fits. */
  wrapped(value: unknown, b: Box, size = 9) {
    const s = pdfSafe(value).replace(/\r/g, "").trim();
    if (!s) return;
    const width = b[2] - b[0] - 4;
    const height = b[3] - b[1];
    for (let sz = size; sz >= 5.5; sz -= 0.5) {
      const lines = wrapLines(s, this.fonts.regular, sz, width);
      if (lines.length * (sz + 1.5) <= height + 1 || sz <= 5.5) {
        let y = b[3] - sz;
        for (const line of lines) {
          if (y < b[1] - 1) break;
          this.page.drawText(line, { x: b[0] + 2, y, size: sz, font: this.fonts.regular, color: INK });
          y -= sz + 1.5;
        }
        return;
      }
    }
  }

  /** A tick in a drawn check box (an "X" from corner to corner, inset a little). */
  checkBox(b: Box, on = true) {
    if (!on) return;
    const inset = 1.3;
    const [x0, y0, x1, y1] = [b[0] + inset, b[1] + inset, b[2] - inset, b[3] - inset];
    this.page.drawLine({ start: { x: x0, y: y0 }, end: { x: x1, y: y1 }, thickness: 1.1, color: INK });
    this.page.drawLine({ start: { x: x0, y: y1 }, end: { x: x1, y: y0 }, thickness: 1.1, color: INK });
  }

  /**
   * A tick in a printed "[ ]" (the HCDFS forms use bracket text, not drawn boxes). x is where "[" starts,
   * y its baseline, size the font size of the line.
   */
  bracket(x: number, y: number, size = 7.6, on = true) {
    if (!on) return;
    tickInBrackets(this.page, x, y, size);
  }

  /** The student's handwritten signature, scaled to fit the box and resting on its bottom edge. */
  signature(img: PDFImage | null, b: Box) {
    if (!img) return;
    const w = b[2] - b[0];
    const h = b[3] - b[1];
    const scale = Math.min(w / img.width, h / img.height);
    this.page.drawImage(img, { x: b[0], y: b[1], width: img.width * scale, height: img.height * scale });
  }
}

export function wrapLines(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of pdfSafe(text).split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) <= maxWidth) { line = test; continue; }
      if (line) out.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let cut = line.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > maxWidth) cut--;
        out.push(line.slice(0, cut));
        line = line.slice(cut);
      }
    }
    out.push(line);
  }
  return out;
}

/** Embeds a signature data URL (PNG from the signature pad; JPEG accepted too). Null if unreadable. */
export async function embedSignature(doc: PDFDocument, dataUrl: string | undefined | null): Promise<PDFImage | null> {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:image\/(png|jpe?g);base64,(.+)$/);
  if (!m) return null;
  try {
    const bytes = Buffer.from(m[2], "base64");
    return m[1] === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  } catch {
    return null;
  }
}

// ---------- Value formatting ----------

/** "2026-11-06" -> "11/06/2026" (US order, as on the paper forms). */
export function usDate(v: unknown): string {
  const m = typeof v === "string" ? v.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  return m ? `${m[2]}/${m[3]}/${m[1]}` : typeof v === "string" ? v : "";
}

/** "2026-11-06" -> "06/11/2026", for the HCDFS boxes labelled DD/MM/YYYY. */
export function dmyDate(v: unknown): string {
  const m = typeof v === "string" ? v.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** Date parts for forms with separate mm / dd / yyyy boxes. */
export function dateParts(v: unknown): [string, string, string] {
  const m = typeof v === "string" ? v.match(/^(\d{4})-(\d{2})-(\d{2})$/) : null;
  return m ? [m[2], m[3], m[1]] : ["", "", ""];
}

/** "(201) 555-0101" -> ["201", "555-0101"]; anything not a 10-digit US number goes in the number box as typed. */
export function phoneParts(v: unknown): [string, string] {
  const s = typeof v === "string" ? v : "";
  const d = s.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return d.length === 10 ? [d.slice(0, 3), `${d.slice(3, 6)}-${d.slice(6)}`] : ["", s];
}

export const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
export const has = (v: unknown, option: string) => (Array.isArray(v) ? v.includes(option) : v === option);

/** An "X" inside printed "[ ]" text that starts at x (baseline y, font size `size`). */
export function tickInBrackets(page: PDFPage, x: number, y: number, size: number) {
  const cx = x + size * 0.42;
  const cy = y + size * 0.34;
  const rx = size * 0.2;
  const ry = size * 0.3;
  page.drawLine({ start: { x: cx - rx, y: cy - ry }, end: { x: cx + rx, y: cy + ry }, thickness: 1, color: INK });
  page.drawLine({ start: { x: cx - rx, y: cy + ry }, end: { x: cx + rx, y: cy - ry }, thickness: 1, color: INK });
}
