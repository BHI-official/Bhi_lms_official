import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { cols, type Application, type User } from "@/db";
import { getFile } from "@/lib/storage";
import { localDateOf } from "@/lib/dates";
import { answersHash } from "@/lib/enrollment";
import { templateContext } from "@/lib/forms/context";
import { bodyOf, describeEnrollment, documentsFor, templatesFor, type FormTemplate } from "@/lib/forms/templates";
import { BhiLayout, ROWS } from "./bhi-layout";
import { FormPage, embedSignature, usDate, type Fonts } from "./draw";
import { ORIGINALS, type FormInput, type OfficialUse } from "./originals";
import { printableForms, printedAnswers } from "./list";

export { printableForms, printedAnswers };

/**
 * Print-ready enrollment forms. Each form the student filled in online comes out on BHI's own
 * paper form (assets/forms/), with the answers typed in and the student's drawn signature in the
 * signature box. Forms BHI hasn't sent a scan of are drawn in BHI's form design (bhi-layout.ts).
 *
 * Used for "Download" and "Print" on one form, and for the whole packet (every form, then a
 * signature record for the office, then the uploaded documents). Fee forms never reach a funded
 * student's PDF: the list comes from templatesFor(category), which drops them.
 */

const ASSET_DIR = path.join(process.cwd(), "assets", "forms");
const assetCache = new Map<string, Promise<Uint8Array>>();
function asset(name: string): Promise<Uint8Array> {
  let p = assetCache.get(name);
  if (!p) {
    p = readFile(path.join(ASSET_DIR, name)).then((b) => new Uint8Array(b));
    p.catch(() => assetCache.delete(name));
    assetCache.set(name, p);
  }
  return p;
}

/** Personal Information's "Official Use Only" box, from the student's enrollment in their course. */
async function officialUse(app: Application): Promise<OfficialUse> {
  const { courses, enrollments } = await cols();
  const course = app.courseId ? await courses.findOne({ _id: app.courseId }) : null;
  const rows = await enrollments.find({ studentId: app.studentId, ...(app.courseId ? { courseId: app.courseId } : {}) }).sort({ assignedAt: 1 }).toArray();
  const completed = rows.filter((e) => e.status === "COMPLETED" && e.endedAt).at(-1);
  // A section move ends one enrollment (TRANSFERRED) and starts another, so it isn't an exit.
  const left = rows.some((e) => e.status === "ACTIVE") ? null : rows.filter((e) => e.status !== "TRANSFERRED" && e.endedAt).at(-1);
  return {
    program: course?.name ?? "",
    credential: completed ? course?.certification ?? "" : "",
    enrollmentDate: rows[0] ? localDateOf(rows[0].assignedAt) : "",
    completionDate: completed?.endedAt ? localDateOf(completed.endedAt) : "",
    exitDate: left?.endedAt ? localDateOf(left.endedAt) : "",
  };
}

export type Loaded = { app: Application; student: User | null };

async function load(applicationId: string): Promise<Loaded> {
  const { applications, users } = await cols();
  const app = await applications.findOne({ _id: applicationId });
  if (!app) throw new Error("Application not found");
  return { app, student: await users.findOne({ _id: app.studentId }) };
}

export async function startDoc(title: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setCreator("BHI LMS");
  const fonts: Fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  const logo = await doc.embedPng(await asset("bhi-logo.png")).catch(() => null);
  return { doc, fonts, logo };
}

/** Adds one form (one or more pages) to the document. */
export async function addForm(out: Awaited<ReturnType<typeof startDoc>>, t: FormTemplate, l: Loaded, extra: { ctx: FormInput["ctx"]; official?: OfficialUse }) {
  const { doc, fonts, logo } = out;
  const saved = l.app.forms?.[t.key];
  const data = printedAnswers(t, (saved?.data ?? {}) as Record<string, unknown>, !!saved?.completedAt);
  const sig = t.requiresSignature ? l.app.signatures?.[t.key] : undefined;
  const input: FormInput = {
    key: t.key,
    data,
    signature: await embedSignature(doc, sig?.imageDataUrl),
    signedDate: sig ? usDate(localDateOf(sig.signedAt)) : "",
    ctx: extra.ctx,
    official: t.key === "personal_information" ? extra.official : undefined,
  };

  const original = ORIGINALS[t.key];
  if (original) {
    const src = await PDFDocument.load(await asset(original.file));
    const [page] = await doc.copyPages(src, [0]);
    doc.addPage(page);
    original.draw(new FormPage(page, fonts), input);
    const more = original.overflow?.(input);
    if (more) {
      const cont = new BhiLayout(doc, fonts, logo, t.title);
      cont.newPage();
      cont.line(more.heading, more.text);
    }
    return;
  }

  const layout = new BhiLayout(doc, fonts, logo, t.title);
  layout.newPage();
  for (const para of bodyOf(t, extra.ctx)) layout.paragraph(para);
  layout.fields(t.fields, data, ROWS[t.key]);
  if (t.requiresSignature) layout.signature(input.signature, input.signedDate);
}

/** One form in BHI's original format. Null when the form isn't part of this student's packet. */
export async function buildFormPdf(applicationId: string, key: string): Promise<{ bytes: Uint8Array; title: string } | null> {
  const l = await load(applicationId);
  const t = printableForms(l.app).find((x) => x.key === key || (key === "photo_release_dfs" && x.key === "photo_release"));
  if (!t) return null;
  const out = await startDoc(`${t.title} - ${l.student?.name ?? ""}`);
  await addForm(out, t, l, { ctx: await templateContext(l.app, l.student), official: t.key === "personal_information" ? await officialUse(l.app) : undefined });
  return { bytes: await out.doc.save(), title: t.title };
}

/**
 * The whole packet: every form in BHI's format, then the signature record (who signed what, when,
 * from where, and whether the answers changed afterwards), then the uploaded documents.
 */
export async function buildPacketPdf(applicationId: string): Promise<Uint8Array> {
  const l = await load(applicationId);
  const { app, student } = l;
  const out = await startDoc(`Enrollment packet - ${student?.name ?? ""}`);
  const ctx = await templateContext(app, student);
  const forms = printableForms(app);
  const official = forms.some((t) => t.key === "personal_information") ? await officialUse(app) : undefined;
  for (const t of forms) await addForm(out, t, l, { ctx, official });

  // Signature record (for the office; the forms themselves stay clean like the paper ones).
  const rec = new BhiLayout(out.doc, out.fonts, out.logo, "Signature record");
  rec.newPage();
  const course = app.courseId ? await (await cols()).courses.findOne({ _id: app.courseId }, { projection: { name: 1 } }) : null;
  rec.pair(["Student", `${student?.name ?? ""} (${student?.email ?? ""})`], ["Enrollment", describeEnrollment(app)]);
  rec.pair(["Course", course?.name ?? "Not chosen"], ["Status", app.status.replace(/_/g, " ")]);
  rec.pair(["Submitted", app.submittedAt ? usDate(localDateOf(app.submittedAt)) : "Not submitted"], ["Packet printed", usDate(localDateOf(new Date()))]);
  rec.heading("Signatures");
  for (const t of forms.filter((x) => x.requiresSignature)) {
    const sig = app.signatures?.[t.key];
    const resp = app.forms?.[t.key];
    let line = "Not signed";
    if (sig) {
      line = `Signed by ${sig.signerName} on ${sig.signedAt.toISOString().replace("T", " ").slice(0, 16)} UTC from IP ${sig.ip}.`;
      if (resp?.adminEditedAt) line += ` Answers edited by BHI staff on ${usDate(localDateOf(resp.adminEditedAt))} after signing (see the application history).`;
      else if (sig.dataHash !== answersHash(t.key, (resp?.data ?? {}) as Record<string, unknown>)) line += " WARNING: answers changed after signing; this signature does not cover the answers shown.";
    }
    rec.line(t.title, line);
  }

  const allowed = new Set(documentsFor(app.category).map((d) => d.type));
  const docs = app.documents.filter((d) => allowed.has(d.type));
  rec.heading("Uploaded documents (attached after this page)");
  rec.line("Files", docs.length ? docs.map((d) => `${d.type.replace(/_/g, " ")}: ${d.fileName} (${Math.ceil(d.size / 1024)} KB)`).join("; ") : "None");

  for (const d of docs) {
    try {
      const bytes = await getFile(d.storageKey);
      if (d.mimeType === "application/pdf") {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        (await out.doc.copyPages(src, src.getPageIndices())).forEach((p) => out.doc.addPage(p));
      } else if (d.mimeType === "image/png" || d.mimeType === "image/jpeg") {
        const img = d.mimeType === "image/png" ? await out.doc.embedPng(bytes) : await out.doc.embedJpg(bytes);
        const page = out.doc.addPage([612, 792]);
        page.drawText(`${d.type.replace(/_/g, " ")}: ${d.fileName}`.replace(/[^\x20-\x7E]/g, "?"), { x: 54, y: 750, size: 11, font: out.fonts.bold });
        const s = Math.min(504 / img.width, 660 / img.height, 1);
        page.drawImage(img, { x: 54, y: 738 - img.height * s, width: img.width * s, height: img.height * s });
      }
    } catch {
      const page = out.doc.addPage([612, 792]);
      page.drawText(`Could not attach ${d.fileName}; download it from the application page.`.replace(/[^\x20-\x7E]/g, "?"), { x: 54, y: 740, size: 10, font: out.fonts.regular });
    }
  }
  return out.doc.save();
}
