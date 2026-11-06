import { type PDFDocument, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { SIGN_DATE_NOTE, type Field } from "@/lib/forms/templates";
import { pdfSafe } from "../text";
import { type Fonts, INK, has, str, tickInBrackets, usDate, wrapLines } from "./draw";

/**
 * BHI's form design (from the October 2026 HCDFS packet), for forms BHI has not sent a scan of yet
 * (Educational Background, Background Check, Emergency Medical Statement, the Private Enrollment
 * Agreement and the Tuition Refund Schedule): logo, green title bar, bold labels over ruled lines,
 * "[X]" choices, signature and date lines, office/campus footer. Sizes and colours are measured
 * from that packet, so these print in the same style as the scanned forms around them.
 */

const GREEN = rgb(0.129, 0.294, 0.165);
const TEXT = rgb(0.125, 0.157, 0.125);
const RULE = rgb(0.835, 0.871, 0.835);
const BAR = rgb(0.933, 0.953, 0.933);
const LEFT = 54;
const RIGHT = 558;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 62; // above the footer

export class BhiLayout {
  page!: PDFPage;
  y = 0;
  private pageNo = 0;

  constructor(readonly doc: PDFDocument, readonly fonts: Fonts, readonly logo: PDFImage | null, readonly title: string) {}

  /** Starts a page: logo and title bar on the first, a small running title on the rest. */
  newPage() {
    this.page = this.doc.addPage([612, 792]);
    this.pageNo++;
    this.footer();
    if (this.pageNo === 1) {
      if (this.logo) this.page.drawImage(this.logo, { x: 273.6, y: 696.7, width: 64.8, height: 64.8 });
      this.page.drawRectangle({ x: 50.4, y: 659.7, width: 511.2, height: 32, color: BAR, borderColor: RULE, borderWidth: 0.6 });
      this.page.drawRectangle({ x: 48, y: 657.5, width: 4.5, height: 36.5, color: GREEN });
      this.page.drawText(pdfSafe(this.title.toUpperCase()), { x: 62, y: 665.4, size: 16, font: this.fonts.bold, color: GREEN });
      this.y = 640;
    } else {
      this.page.drawText(pdfSafe(`${this.title} (continued)`), { x: LEFT, y: 750, size: 10, font: this.fonts.bold, color: GREEN });
      this.y = 730;
    }
  }

  private footer() {
    const p = this.page;
    p.drawLine({ start: { x: 49, y: 38.2 }, end: { x: 563, y: 38.2 }, thickness: 0.7, color: RULE });
    p.drawText("OFFICE", { x: 52, y: 26.6, size: 7.1, font: this.fonts.bold, color: GREEN });
    p.drawText("591 Summit Ave, Suite 400, Jersey City, NJ 07306", { x: 83, y: 26.6, size: 7, font: this.fonts.regular, color: TEXT });
    p.drawText("CAMPUS", { x: 292, y: 26.6, size: 7.1, font: this.fonts.bold, color: GREEN });
    p.drawText("910 Bergen Ave, Floor 3, Jersey City, NJ 07306", { x: 325, y: 26.6, size: 7, font: this.fonts.regular, color: TEXT });
  }

  private room(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }

  /** A printed paragraph of the form (short lines without a full stop print as green sub-headings). */
  paragraph(text: string) {
    const heading = text.length < 60 && !text.includes("\n") && !/[.:]$/.test(text.trim()) && !text.includes("·");
    if (heading) return this.heading(text);
    const size = 8.6;
    for (const line of wrapLines(text, this.fonts.regular, size, WIDTH)) {
      this.room(size + 3);
      this.page.drawText(line, { x: LEFT, y: this.y - size, size, font: this.fonts.regular, color: TEXT });
      this.y -= size + 3.4;
    }
    this.y -= 5;
  }

  heading(text: string) {
    this.room(28);
    this.y -= 4;
    this.page.drawText(pdfSafe(text), { x: LEFT, y: this.y - 9.3, size: 9.3, font: this.fonts.bold, color: GREEN });
    this.y -= 18;
  }

  /** Label and answer over a ruled line, like "First Name ______". Answers wrap onto extra ruled lines. */
  line(label: string, value: string, x = LEFT, width = WIDTH, advance = true) {
    const labelLines = wrapLines(label, this.fonts.bold, 7.8, width);
    const valueLines = value ? wrapLines(value, this.fonts.regular, 10, width - 4) : [""];
    const h = labelLines.length * 10 + valueLines.length * 14 + 6;
    if (advance) this.room(h);
    let y = this.y;
    for (const l of labelLines) {
      this.page.drawText(l, { x, y: y - 7.8, size: 7.8, font: this.fonts.bold, color: TEXT });
      y -= 10;
    }
    for (const v of valueLines) {
      y -= 14;
      if (v) this.page.drawText(v, { x: x + 2, y: y + 3.5, size: 10, font: this.fonts.regular, color: INK });
      this.page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.6, color: RULE });
    }
    if (advance) this.y = y - 6;
    return y - 6;
  }

  /** Short answers side by side (two or three to a row), each with its own label and line. */
  row(cells: [string, string][]) {
    const gap = 16;
    const w = (WIDTH - gap * (cells.length - 1)) / cells.length;
    this.room(44);
    const ys = cells.map(([label, value], i) => this.line(label, value, LEFT + i * (w + gap), w, false));
    this.y = Math.min(...ys);
  }

  /** Kept for callers that think in pairs. */
  pair(a: [string, string], b: [string, string]) {
    this.row([a, b]);
  }

  /** "Label: [X] Yes [ ] No" — every printed option, with the chosen ones ticked. */
  choices(label: string, options: string[], chosen: unknown) {
    const size = 8.2;
    const parts = options.map((o) => ({ o, w: this.fonts.regular.widthOfTextAtSize(`[ ] ${pdfSafe(o)}`, size) + 10 }));
    const labelText = `${pdfSafe(label)}  `;
    const lw = this.fonts.bold.widthOfTextAtSize(labelText, size);
    // Long labels get a line of their own; options then flow and wrap under it.
    const labelLines = lw > WIDTH * 0.55 ? wrapLines(label, this.fonts.bold, size, WIDTH) : [labelText];
    this.room(labelLines.length * 11 + 14);
    let x: number;
    if (labelLines.length === 1 && lw <= WIDTH * 0.55) {
      this.page.drawText(labelLines[0], { x: LEFT, y: this.y - size, size, font: this.fonts.bold, color: TEXT });
      x = LEFT + lw;
    } else {
      for (const l of labelLines) {
        this.page.drawText(l, { x: LEFT, y: this.y - size, size, font: this.fonts.bold, color: TEXT });
        this.y -= 11;
      }
      x = LEFT + 10;
    }
    for (const { o, w } of parts) {
      if (x + w > RIGHT) { this.y -= 11; x = LEFT + 10; this.room(12); }
      const by = this.y - size;
      this.page.drawText(`[ ] ${pdfSafe(o)}`, { x, y: by, size, font: this.fonts.regular, color: TEXT });
      if (has(chosen, o)) tickInBrackets(this.page, x, by, size);
      x += w;
    }
    this.y -= 15;
  }

  /**
   * Every field of an LMS form template, in order. Fields listed together in `rows` share a line
   * (e.g. City / State / Zip), the way the paper forms group them; everything else gets a full line.
   */
  fields(fields: Field[], data: Record<string, unknown>, rows: string[][] = []) {
    const value = (f: Field) => (f.type === "date" ? usDate(data[f.name]) : str(data[f.name]));
    const byName = new Map(fields.map((f) => [f.name, f]));
    const done = new Set<string>();
    for (const f of fields) {
      if (done.has(f.name)) continue;
      if (f.type === "heading") { this.heading(f.label); continue; }
      if (f.type === "note") {
        // On-screen hints ("Your signature ... recorded when you sign below") aren't on the paper form.
        const printed = f.label.replace(SIGN_DATE_NOTE, "").replace(/:\s*$/, "").trim();
        if (printed && printed !== "Applicant Signature and Date") this.paragraph(printed);
        continue;
      }
      if (f.type === "checkbox") { this.choices("", [f.label], data[f.name] === true ? f.label : null); continue; }
      if (f.type === "radio" || f.type === "multi" || f.type === "select") { this.choices(f.label, f.options ?? [], data[f.name]); continue; }
      const group = rows.find((r) => r[0] === f.name)?.map((n) => byName.get(n)).filter((x): x is Field => !!x);
      if (group && group.length > 1) {
        group.forEach((g) => done.add(g.name));
        this.row(group.map((g) => [g.label, value(g)]));
        continue;
      }
      this.line(f.label, value(f));
    }
  }

  /** Signature (the student's own, as drawn) and date lines, as on the packet's forms. */
  signature(img: PDFImage | null, date: string, label = "Signature") {
    this.room(70);
    this.y -= 14;
    const lineY = this.y - 34;
    this.page.drawText(label, { x: LEFT + 20, y: lineY + 2, size: 7.8, font: this.fonts.bold, color: TEXT });
    this.page.drawLine({ start: { x: LEFT + 20, y: lineY }, end: { x: LEFT + 320, y: lineY }, thickness: 0.6, color: TEXT });
    if (img) {
      const s = Math.min(240 / img.width, 32 / img.height);
      this.page.drawImage(img, { x: LEFT + 70, y: lineY + 0.5, width: img.width * s, height: img.height * s });
    }
    this.page.drawText("Date", { x: LEFT + 345, y: lineY + 2, size: 7.8, font: this.fonts.bold, color: TEXT });
    this.page.drawLine({ start: { x: LEFT + 345, y: lineY }, end: { x: RIGHT, y: lineY }, thickness: 0.6, color: TEXT });
    if (date) this.page.drawText(date, { x: LEFT + 372, y: lineY + 3, size: 10, font: this.fonts.regular, color: INK });
    this.y = lineY - 16;
  }
}

/** Which answers share a line on each form drawn in this layout (first field name starts the row). */
export const ROWS: Record<string, string[][]> = {
  educational_background: [["tabeReading", "tabeMath"]],
  background_check: [["firstName", "middleName", "lastName"], ["city", "state", "zip"], ["otherNames", "dateOfBirth", "ssn"]],
  emergency_medical: [
    ["contact1Name", "contact1Relationship", "contact1Phone"],
    ["contact2Name", "contact2Relationship", "contact2Phone"],
    ["physicianName", "physicianPhone"],
  ],
};
