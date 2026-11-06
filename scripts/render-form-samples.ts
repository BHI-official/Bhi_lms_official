/**
 * Renders every enrollment form with sample answers to ./form-samples/ (no database needed), so the
 * print layout can be checked against BHI's paper forms after any change to a form or its position.
 *
 *   npm run forms:samples
 */
import { mkdir, writeFile } from "node:fs/promises";
import type { Application, Category } from "../src/db/types";
import { schemaFor, templatesFor } from "../src/lib/forms/templates";
import { addForm, startDoc, printableForms } from "../src/lib/pdf/forms";

const now = new Date("2026-11-06T15:00:00Z");
const sample: Record<string, Record<string, unknown>> = {
  student_data: { orientation: true, legalName: "Maria del Carmen Lopez", dateOfBirth: "1994-03-17", ssn: "123-45-6789", street: "125 Montgomery St, Apt 4B", city: "Jersey City", state: "NJ", zip: "07302", cellPhone: "(201) 555-0142", homePhone: "N/A", workPhone: "201-555-0199", email: "maria.lopez@gmail.com", gender: "Female", ethnicity: "Hispanic", facebook: "facebook.com/maria.lopez", twitter: "N/A", linkedin: "linkedin.com/in/marialopez", questionsComments: "Is there parking near the Bergen Ave campus? I may need to leave early on Fridays for childcare." },
  educational_background: { highSchoolName: "Snyder High School", highSchoolAddress: "239 Bergen Ave, Jersey City, NJ 07305", highSchoolYear: "2012", hsDiploma: "Yes", hasGed: "No", seekingGed: "No", tabeReading: "11", tabeMath: "9", attendedCollege: "Yes", collegeName: "Hudson County Community College", degree: "Certificate of Completion", collegeAddress: "70 Sip Ave, Jersey City, NJ 07306", collegeYear: "2015", fundingPlan: "Workforce (One-Stop) training grant.", workforceFunding: "YES", metCounselor: "YES", tour: "NO" },
  background_check: { firstName: "Maria", middleName: "del Carmen", lastName: "Lopez", street: "125 Montgomery St, Apt 4B", city: "Jersey City", state: "NJ", zip: "07302", otherNames: "Maria Rivera", dateOfBirth: "1994-03-17", ssn: "123-45-6789", arrested: "No", abuse: "No", lifestyle: "No", explain: "", expungement: "Not applicable." },
  emergency_medical: { contact1Name: "Luis Lopez", contact1Relationship: "Brother", contact1Phone: "201-555-0101", contact2Name: "Ana Rivera", contact2Relationship: "Mother", contact2Phone: "201-555-0177", physicianName: "Dr. Patel", physicianPhone: "201-555-0123", vision: "Yes", bloodPressure: "No", hearing: "No", diabetes: "No", dizziness: "No", epilepsy: "No", learning: "No", asthma: "No", conditionsExplain: "Wears glasses.", reaction: "Yes", reactionExplain: "Penicillin (rash).", medicines: "No", infections: "No", otherCondition: "None" },
  workforce_registration: { todaysDate: "2026-11-06", ssn: "123-45-6789", dateOfBirth: "1994-03-17", gender: "Female", lastName: "Lopez", firstName: "Maria", middleInitial: "C", street: "125 Montgomery St, Apt 4B", city: "Jersey City", state: "NJ", zip: "07302", county: "Hudson", phone: "(201) 555-0142", altPhone: "201-555-0199", fax: "N/A", email: "maria.lopez@gmail.com", usCitizen: "Yes", hispanic: "Yes", race: ["White"], schoolStatus: "Not Attending School; H.S. Graduate", highestCompleted: "12 / HS Diploma", employmentStatus: "Not Employed", jobBank: "Yes", confidential: "No", migrant: "No", contactBy: ["Primary Phone", "Email"], desire: ["Full-time", "Permanent"], shift: ["1st", "2nd"], minPay: "18.00", minPayPer: "hour", veteran: "No", campaignVeteran: false, severanceType: "No information at this time", jobObjective: "Certified Medical Assistant in a clinic or hospital", interestedTraining: "Yes", travel: "25 Miles", hasWorked: "Yes", jobTitle: "Cashier", employer: "ShopRite of Jersey City", workStreet: "150 Route 440", workCity: "Jersey City", workState: "NJ", workStart: "2019-06-01", workEnd: "2026-08-15", wage: "15.50", wagePer: "hour", leaveReason: "Lack of Work/Lay Off", jobDuties: "Operated register, handled cash and card payments, helped customers, restocked shelves and trained new cashiers on the POS system.", additionalSkills: "Bilingual English/Spanish; Microsoft Word and Excel; CPR certified.", license: ["Car"], licenseState: "NJ" },
  grievance_policy: { studentName: "Maria del Carmen Lopez" },
  photo_release: { studentName: "Maria del Carmen Lopez", photoRelease: "I give permission" },
  photo_release_dfs: { photoRelease: "I give permission", signerRole: "Student (18 or older)", signerName: "Maria del Carmen Lopez" },
  personal_information: { firstName: "Maria", lastName: "Lopez", ssn: "123-45-6789", dateOfBirth: "1994-03-17", gender: "Female", address1: "125 Montgomery St", address2: "Apt 4B", city: "Jersey City", state: "NJ", zip: "07302", county: "Hudson", stateId: "L1234 56789 01234", ethnicity: "Hispanic", race: "White", exhaustedTanf: "No", disability: "Participant Did Not Self-Identify", englishLearner: "No", wioa: "Yes", unhoused: "No", fosterCare: "No", formerlyIncarcerated: "No" },
  private_agreement_1: { studentName: "Maria del Carmen Lopez" },
  private_agreement_2: {},
  refund_schedule: {},
  nonprivate_agreement: { studentName: "Maria del Carmen Lopez" },
};

async function signaturePng(): Promise<string> {
  // Draw a simple cursive-like stroke into a PNG using a canvas-free approach: an SVG rasterised by sharp is
  // not available here, so build the PNG with zlib directly (transparent background, dark strokes).
  const zlib = await import("node:zlib");
  const w = 300, h = 80;
  const px = new Uint8Array(w * h * 4);
  const dot = (x: number, y: number) => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const xx = Math.round(x + dx), yy = Math.round(y + dy);
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const i = (yy * w + xx) * 4; px[i] = 20; px[i + 1] = 30; px[i + 2] = 90; px[i + 3] = 255;
    }
  };
  for (let t = 0; t <= 1; t += 0.0005) {
    const x = 15 + t * 270;
    const y = 45 + Math.sin(t * 26) * 18 * (1 - t * 0.6) + Math.cos(t * 7) * 6;
    dot(x, y);
  }
  for (let t = 0; t <= 1; t += 0.002) dot(40 + t * 200, 66 - t * 4);
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(px.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  const crc = (buf: Buffer) => { let c = ~0; for (const b of buf) { c ^= b; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1)); } return ~c >>> 0; };
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function main() {
  const sig = await signaturePng();
  await mkdir("form-samples", { recursive: true });
  const ctx = { studentName: "Maria del Carmen Lopez", course: { name: "Certified Medical Assistant (CMA)", fees: { tuitionCents: 450000, feesCents: 12500, booksCents: 30000, toolsCents: 15000, otherCents: 0 } } };
  const official = { program: "Certified Medical Assistant (CMA)", credential: "CCMA (NHA)", enrollmentDate: "2026-11-09", completionDate: "", exitDate: "" };
  // The samples must be complete forms, as students now have to submit them.
  for (const t of templatesFor("PRIVATE").concat(templatesFor("DFS"))) {
    const r = schemaFor(t).safeParse(sample[t.key] ?? {});
    if (!r.success) throw new Error(`Sample answers for ${t.key} are incomplete: ${r.error.issues.map((i) => i.path.join(".")).join(", ")}`);
  }
  for (const category of ["PRIVATE", "EQISS", "DFS"] as Category[]) {
    const keys = templatesFor(category).map((t) => t.key);
    const app = {
      _id: "00000000-0000-4000-8000-000000000000", studentId: "s", category, status: "SUBMITTED",
      forms: Object.fromEntries(keys.map((k) => [k, { templateVersion: 2, data: sample[k] ?? {}, completedAt: now, updatedAt: now }])),
      signatures: Object.fromEntries(keys.map((k) => [k, { imageDataUrl: sig, signerName: "Maria del Carmen Lopez", dataHash: "", ip: "203.0.113.5", userAgent: "", signedAt: now }])),
      documents: [], corrections: [],
    } as unknown as Application;
    const out = await startDoc(`Sample ${category}`);
    for (const t of printableForms(app)) await addForm(out, t, { app, student: null }, { ctx, official });
    await writeFile(`form-samples/${category.toLowerCase()}-forms.pdf`, await out.doc.save());
    // Blank versions too: every form must print exactly like the paper form when nothing is filled in.
    const blank = await startDoc(`Blank ${category}`);
    const empty = { ...app, forms: {}, signatures: {} } as unknown as Application;
    for (const t of printableForms(empty)) await addForm(blank, t, { app: empty, student: null }, { ctx: { studentName: "", course: null } });
    await writeFile(`form-samples/${category.toLowerCase()}-blank.pdf`, await blank.doc.save());
    console.log(category, printableForms(app).map((t) => t.key).join(", "));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
