import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { TEMPLATES, templatesFor } from "../src/lib/forms/templates";
import type { Category } from "../src/db/types";
import { printableForms } from "../src/lib/pdf/forms/list";
import { ORIGINALS } from "../src/lib/pdf/forms/originals";
import { dateParts, dmyDate, phoneParts, usDate } from "../src/lib/pdf/forms/draw";
import { readFile } from "node:fs/promises";

test("every original form file exists and is one US-letter page", async () => {
  for (const [key, o] of Object.entries(ORIGINALS)) {
    assert.ok(TEMPLATES.some((t) => t.key === key), `${key} is a real form`);
    const doc = await PDFDocument.load(await readFile(`assets/forms/${o.file}`));
    assert.equal(doc.getPageCount(), 1, o.file);
    const { width, height } = doc.getPage(0).getSize();
    assert.deepEqual([Math.round(width), Math.round(height)], [612, 792], o.file);
  }
});

test("the WorkForce NJ template has no fill-in boxes left (answers are drawn, so prints are flat)", async () => {
  const doc = await PDFDocument.load(await readFile("assets/forms/workforce-nj-registration.pdf"));
  assert.equal(doc.getForm().getFields().length, 0);
});

test("printed packets follow each track's forms; a DFS student's older signed BHI photo release is kept", () => {
  for (const c of ["PRIVATE", "EQISS", "DFS"] as Category[]) {
    const app = { category: c, forms: {}, signatures: {} };
    assert.deepEqual(printableForms(app).map((t) => t.key), templatesFor(c).map((t) => t.key));
    assert.ok(!printableForms(app).some((t) => t.containsFees && c !== "PRIVATE"), "no fee forms for funded students");
  }
  const old = { category: "DFS" as Category, forms: { photo_release: { templateVersion: 2, data: {}, completedAt: null, updatedAt: new Date() } }, signatures: {} };
  assert.ok(printableForms(old).some((t) => t.key === "photo_release"));
  assert.ok(!printableForms(old).some((t) => t.key === "photo_release_dfs"));
});

test("dates and phone numbers are split the way the paper forms ask", () => {
  assert.equal(usDate("2026-11-06"), "11/06/2026");
  assert.equal(dmyDate("2026-11-06"), "06/11/2026");
  assert.deepEqual(dateParts("1994-03-17"), ["03", "17", "1994"]);
  assert.deepEqual(phoneParts("(201) 555-0142"), ["201", "555-0142"]);
  assert.deepEqual(phoneParts("+1 201 555 0142"), ["201", "555-0142"]);
  assert.deepEqual(phoneParts("ext 12"), ["", "ext 12"]);
});
