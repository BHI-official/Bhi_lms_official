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

// ---------- Every form is filled in completely ----------
import { inputFields, schemaFor } from "../src/lib/forms/templates";
import { printedAnswers } from "../src/lib/pdf/forms/list";

test("every answer on every form is required, or required whenever it applies", () => {
  for (const t of TEMPLATES) {
    for (const f of inputFields(t)) {
      // A tick box left unticked is itself an answer (e.g. "Campaign Veteran": no).
      const ok = f.required || f.requiredIf || f.optionalComment || f.type === "checkbox";
      assert.ok(ok, `${t.key}.${f.name} can be left empty`);
    }
  }
});

const wf = TEMPLATES.find((t) => t.key === "workforce_registration")!;
/** Mahek's test registration (6 Nov 2026): the answers she gave, with everything else left empty. */
const mahek = {
  todaysDate: "2026-11-04", ssn: "123-45-6789", dateOfBirth: "2002-10-01", gender: "Female", lastName: "rizwan", firstName: "Mahek",
  street: "591 , Summit Ave", city: "Jersey city", state: "NJ", zip: "07306", phone: "201 370-7669", email: "bhimahek@gmail.com",
  usCitizen: "Yes", hispanic: "No", schoolStatus: "Not Attending School; H.S. Graduate", highestCompleted: "bach", employmentStatus: "Employed",
  jobBank: "No", confidential: "No", migrant: "No",
};
const errorsOf = (t: typeof wf, data: Record<string, unknown>) => {
  const r = schemaFor(t).safeParse(data);
  return r.success ? [] : [...new Set(r.error.issues.map((i) => String(i.path[0])))].sort();
};

test("the WorkForce registration that printed with blanks can no longer be completed that way", () => {
  const missing = errorsOf(wf, mahek);
  for (const f of ["county", "middleInitial", "altPhone", "fax", "race", "contactBy", "desire", "shift", "minPay", "minPayPer", "veteran", "severanceType", "jobObjective", "interestedTraining", "travel", "hasWorked", "additionalSkills", "license"])
    assert.ok(missing.includes(f), `${f} should be required`);
  // Questions that don't apply to her stay optional: she is a citizen, not a migrant worker.
  for (const f of ["alienReg", "alienExpiration", "migrantClass"]) assert.ok(!missing.includes(f), `${f} doesn't apply`);
});

test("WorkForce questions that only apply sometimes are required exactly when they apply", () => {
  const full = {
    ...mahek, middleInitial: "N/A", county: "Hudson", altPhone: "N/A", fax: "N/A", race: ["I choose not to respond"], contactBy: ["Email"],
    desire: ["Full-time"], shift: ["Any"], minPay: "20", minPayPer: "hour", veteran: "No", severanceType: "No information at this time",
    jobObjective: "Medical assistant", interestedTraining: "Yes", travel: "10 Miles", hasWorked: "No", additionalSkills: "Spanish", license: ["None"],
  };
  assert.deepEqual(errorsOf(wf, full), []);
  assert.deepEqual(errorsOf(wf, { ...full, usCitizen: "No" }), ["alienExpiration", "alienReg"]);
  assert.deepEqual(errorsOf(wf, { ...full, migrant: "Yes" }), ["migrantClass"]);
  assert.deepEqual(errorsOf(wf, { ...full, veteran: "Yes" }), ["activeFrom", "activeTo", "militaryBranch", "serviceDisability"]);
  assert.deepEqual(errorsOf(wf, { ...full, severanceType: "Lump Sum pay" }), ["lumpSumDate", "severanceAmount"]);
  assert.deepEqual(errorsOf(wf, { ...full, license: ["Car"] }), ["licenseState"]);
  // Still employed there: no end date or reason for leaving.
  assert.deepEqual(errorsOf(wf, { ...full, hasWorked: "Yes" }), ["employer", "jobDuties", "jobTitle", "wage", "wagePer", "workCity", "workStart", "workState", "workStreet"]);
  assert.deepEqual(errorsOf(wf, { ...full, hasWorked: "Yes", employmentStatus: "Not Employed" }).filter((f) => f === "workEnd" || f === "leaveReason"), ["leaveReason", "workEnd"]);
});

test("explanations are required after a Yes on the Background Check and Emergency Medical forms", () => {
  const bc = TEMPLATES.find((t) => t.key === "background_check")!;
  assert.ok(errorsOf(bc, { arrested: "Yes" }).includes("explain"));
  assert.ok(!errorsOf(bc, { arrested: "No", abuse: "No", lifestyle: "No" }).includes("explain"));
  const em = TEMPLATES.find((t) => t.key === "emergency_medical")!;
  assert.ok(errorsOf(em, { asthma: "Yes" }).includes("conditionsExplain"));
  assert.ok(errorsOf(em, { medicines: "Yes" }).includes("medicinesExplain"));
});

test("a completed form prints N/A for questions that don't apply; a draft prints as it is", () => {
  const done = printedAnswers(wf, { usCitizen: "Yes", hasWorked: "Yes", employmentStatus: "Employed", questionsComments: "" }, true);
  assert.equal(done.alienReg, "N/A");
  assert.equal(done.activeFrom, "N/A");
  assert.equal(done.workEnd, "Present");
  const draft = printedAnswers(wf, { usCitizen: "Yes" }, false);
  assert.equal(draft.alienReg, undefined);
  const sd = TEMPLATES.find((t) => t.key === "student_data")!;
  assert.equal(printedAnswers(sd, {}, true).questionsComments, undefined, "an empty comments box isn't filled with N/A");
});
