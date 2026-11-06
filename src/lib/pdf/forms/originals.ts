import type { PDFImage } from "pdf-lib";
import type { TemplateContext } from "@/lib/forms/templates";
import { RACES } from "@/lib/forms/templates";
import { type Box, type FormPage, dateParts, dmyDate, has, phoneParts, str, usDate } from "./draw";

/**
 * Where each answer goes on BHI's original forms. Positions are PDF points (origin bottom-left) read
 * from the files in assets/forms/, which are the forms exactly as BHI supplied them:
 *
 *   hcdfs-photo-release.pdf, hcdfs-personal-information.pdf, enrollment-agreement.pdf,
 *   student-data.pdf, grievance-policy.pdf   pages 1-5 of "HCDFS-Enrollment_Packet.pdf"
 *   workforce-nj-registration.pdf            "WorkForce NJ Customer Registration Form.pdf" (fill-in boxes removed)
 *   bhi-photo-release.pdf                    "BHI Photo Release Form.docx", saved as PDF
 *
 * Text answers sit just above the printed line. To replace a form with a new scan: drop the new PDF in
 * assets/forms/ under the same name and re-measure the positions below (pdfplumber prints them).
 */

export type OfficialUse = {
  program: string;
  credential: string;
  /** YYYY-MM-DD or "" */
  enrollmentDate: string;
  completionDate: string;
  exitDate: string;
};

export type FormInput = {
  key: string;
  data: Record<string, unknown>;
  /** The student's signature for this form, already embedded in the output document. */
  signature: PDFImage | null;
  /** When it was signed, MM/DD/YYYY in the office time zone ("" if not signed). */
  signedDate: string;
  ctx: TemplateContext;
  /** Personal Information's "Official Use Only" values, filled from the student's enrollment. */
  official?: OfficialUse;
};

export type OriginalLayout = {
  file: string;
  draw: (p: FormPage, f: FormInput) => void;
  /** Answers with no room on the original (they go on a continuation page, like the back of the sheet). */
  overflow?: (f: FormInput) => { heading: string; text: string } | null;
};

const d = (f: FormInput, k: string) => f.data[k];
const nameOf = (f: FormInput, k = "studentName") => str(d(f, k)) || f.ctx.studentName;

export const ORIGINALS: Record<string, OriginalLayout> = {
  // ---------- HCDFS packet page 1 ----------
  photo_release_dfs: {
    file: "hcdfs-photo-release.pdf",
    draw(p, f) {
      if (d(f, "photoRelease") === "I do not give permission")
        p.text("Student's choice: I do NOT give permission to use my likeness.", 55, 474, 500, { size: 10, bold: true });
      const role = str(d(f, "signerRole"));
      p.text(role.startsWith("Student") ? "Self (student, 18 or older)" : role, 158, 388.4, 295);
      p.text(str(d(f, "signerName")) || f.ctx.studentName, 136, 351.6, 340);
      p.signature(f.signature, [122, 310, 368, 342]);
      p.text(f.signedDate, 400, 312.6, 130);
    },
  },

  // ---------- HCDFS packet page 2 ----------
  personal_information: {
    file: "hcdfs-personal-information.pdf",
    draw(p, f) {
      p.text(d(f, "firstName"), 55, 628.5, 245);
      p.text(d(f, "lastName"), 311, 628.5, 245);
      p.text(d(f, "ssn"), 55, 597.7, 500);
      p.text(usDate(d(f, "dateOfBirth")), 201, 567, 210);
      const g = d(f, "gender");
      p.bracket(108.7, 542.2, 8.2, g === "Male");
      p.bracket(147.5, 542.2, 8.2, g === "Female");
      p.bracket(199.9, 542.2, 8.2, g === "Non-Binary");
      p.text(d(f, "address1"), 55, 511.7, 330);
      p.text(d(f, "address2"), 394, 511.7, 165);
      p.text(d(f, "city"), 55, 481.1, 230);
      p.text(d(f, "state"), 293, 481.1, 100);
      p.text(d(f, "zip"), 401, 481.1, 155);
      p.text(d(f, "county"), 55, 450.4, 195);
      p.text(d(f, "stateId"), 257, 450.4, 300);

      const o = f.official;
      if (o) {
        p.text(o.program, 55, 378.8, 500);
        p.text(o.credential, 165, 349.2, 280);
        p.text(dmyDate(o.enrollmentDate), 55, 319.5, 240);
        p.text(dmyDate(o.completionDate), 311, 319.5, 240);
        p.text(dmyDate(o.exitDate), 181, 289.9, 250);
      }

      const eth = d(f, "ethnicity");
      p.bracket(155.9, 263.5, 7.8, eth === "Hispanic");
      p.bracket(213.6, 263.5, 7.8, eth === "Non-Hispanic");
      p.bracket(309.4, 263.5, 7.8, eth === "Do Not Want to Disclose");

      const raceAt: [number, number][] = [[169.4, 225.7], [199.4, 225.7], [229.0, 225.7], [327.0, 225.7], [398.4, 225.7], [195.6, 209.7], [279.2, 209.7]];
      RACES.forEach((r, i) => p.bracket(raceAt[i][0], raceAt[i][1], 7.6, d(f, "race") === r));

      const answer = (k: string, y: number, xs: number[], opts: string[]) => opts.forEach((o, i) => p.bracket(xs[i], y, 7.6, d(f, k) === o));
      answer("exhaustedTanf", 171.7, [129.7, 150.0, 209.5], ["Yes", "No", "Not Applicable"]);
      answer("disability", 171.7, [381.5, 401.8, 517.9], ["Yes", "No", "Participant Did Not Self-Identify"]);
      answer("englishLearner", 158.7, [161.0, 181.3], ["Yes", "No"]);
      answer("wioa", 158.7, [385.7, 406.0], ["Yes", "No"]);
      answer("unhoused", 145.7, [106.5, 126.8], ["Yes", "No"]);
      answer("fosterCare", 145.7, [389.5, 409.8], ["Yes", "No"]);
      answer("formerlyIncarcerated", 132.7, [146.2, 166.4], ["Yes", "No"]);
    },
  },

  // ---------- HCDFS packet page 3 (Equus and DFS) ----------
  nonprivate_agreement: {
    file: "enrollment-agreement.pdf",
    draw(p, f) {
      p.text(nameOf(f), 66, 585, 208);
      p.text(f.ctx.course?.name ?? "", 115, 566.8, 238);
      p.signature(f.signature, [175, 156.5, 430, 186]);
      p.text(f.signedDate, 260, 136, 115);
    },
  },

  // ---------- HCDFS packet page 4 (every student) ----------
  student_data: {
    file: "student-data.pdf",
    draw(p, f) {
      p.text(d(f, "legalName"), 55, 596, 205);
      p.text(usDate(d(f, "dateOfBirth")), 268, 596, 105);
      p.text(d(f, "ssn"), 379, 596, 180);
      p.text(d(f, "street"), 55, 557.5, 500);
      p.text(d(f, "city"), 55, 523, 260);
      p.text(d(f, "state"), 322, 523, 85);
      p.text(d(f, "zip"), 412, 523, 145);
      p.text(d(f, "cellPhone"), 55, 486.3, 165);
      p.text(d(f, "homePhone"), 225, 486.3, 160);
      p.text(d(f, "workPhone"), 394, 486.3, 165);
      p.text(d(f, "email"), 55, 449.6, 500);
      p.text(d(f, "gender"), 55, 415.1, 250);
      p.text(d(f, "ethnicity"), 311, 415.1, 250);
      p.text(d(f, "facebook"), 207, 345.6, 240, { size: 9 });
      p.text(d(f, "twitter"), 195, 326.3, 252, { size: 9 });
      p.text(d(f, "linkedin"), 202, 307, 245, { size: 9 });
      p.text(nameOf(f, "legalName"), 65, 275, 212, { size: 9 });
      p.signature(f.signature, [178, 204.5, 440, 232]);
      p.text(f.signedDate, 260, 185.6, 115);
    },
    overflow: (f) => (str(d(f, "questionsComments")).trim() ? { heading: "Questions or comments (back of the Student Data sheet)", text: str(d(f, "questionsComments")) } : null),
  },

  // ---------- HCDFS packet page 5 (every student) ----------
  grievance_policy: {
    file: "grievance-policy.pdf",
    draw(p, f) {
      p.signature(f.signature, [122, 380, 368, 410]);
      if (nameOf(f)) p.text(`Name of the Student: ${nameOf(f)}`, 120, 368, 255, { size: 8 });
      p.text(f.signedDate, 405, 382.6, 135);
    },
  },

  // ---------- "BHI Photo Release Form.docx" (Private and Equus) ----------
  photo_release: {
    file: "bhi-photo-release.pdf",
    draw(p, f) {
      p.text(nameOf(f), 84, 556.5, 146);
      const choice = d(f, "photoRelease");
      if (choice) {
        p.text("Student's choice:", 72, 270, 90, { size: 10, bold: true });
        const first = "[ ] I give permission";
        const second = "[ ] I do not give permission";
        const x2 = 162 + p.fonts.regular.widthOfTextAtSize(first, 10) + 24;
        p.text(first, 162, 270, 200);
        p.text(second, x2, 270, 230);
        p.bracket(162, 270, 10, choice === "I give permission");
        p.bracket(x2, 270, 10, choice === "I do not give permission");
      }
      p.text(nameOf(f), 154, 228, 148);
      p.signature(f.signature, [131, 186.5, 302, 214]);
      p.text(f.signedDate, 384, 188.6, 94);
    },
  },

  // ---------- WorkForce New Jersey Customer Registration Form ----------
  workforce_registration: {
    file: "workforce-nj-registration.pdf",
    draw(p, f) {
      const v = (k: string) => d(f, k);
      const box = (val: unknown, b: Box) => p.inBox(val, b);
      const tick = (b: Box, on: boolean) => p.checkBox(b, on);
      // mm / dd / yyyy boxes; "N/A" or "Present" goes in the first box.
      const parts = (val: unknown, boxes: [Box, Box, Box]) => {
        const [mm, dd, yyyy] = dateParts(val);
        if (!mm && str(val)) return p.text(str(val), boxes[0][0] + 1, boxes[0][1] + 1.5, boxes[2][2] - boxes[0][0], { size: 8 });
        [mm, dd, yyyy].forEach((x, i) => box(x, boxes[i]));
      };

      // Case # is filled in by the One-Stop office.
      parts(v("todaysDate"), [[436, 724, 468, 741], [478, 724, 518, 741], [529, 724, 561, 741]]);
      box(v("ssn"), [52, 696, 268, 710]);
      parts(v("dateOfBirth"), [[275, 696, 315, 710], [328, 696, 358, 710], [370, 696, 411, 710]]);
      tick([470, 699, 478, 707], v("gender") === "Male");
      tick([506, 699, 514, 707], v("gender") === "Female");
      box(v("lastName"), [52, 671, 280, 684]);
      box(v("firstName"), [284, 671, 480, 684]);
      box(v("middleInitial"), [483, 671, 562, 684]);
      box(v("street"), [52, 647, 212, 660]);
      box(v("city"), [217, 647, 334, 660]);
      box(v("state"), [336, 647, 377, 660]);
      box(v("zip"), [379, 647, 430, 660]);
      box(v("county"), [431, 647, 562, 660]);
      const phone = (val: unknown, area: Box, num: Box) => { const [a, n] = phoneParts(val); box(a, area); box(n, num); };
      phone(v("phone"), [65, 624, 90, 634], [100, 624, 210, 634]);
      phone(v("altPhone"), [236, 624, 261, 634], [271, 624, 381, 634]);
      phone(v("fax"), [403, 624, 428, 634], [438, 624, 548, 634]);
      box(v("email"), [110, 605, 562, 621]);

      tick([126, 594, 133, 602], v("usCitizen") === "Yes");
      tick([169, 594, 177, 602], v("usCitizen") === "No");
      box(v("alienReg"), [100, 574, 254, 584]);
      box(usDate(v("alienExpiration")), [110, 555, 256, 565]);
      tick([395, 583, 403, 591], v("hispanic") === "Yes");
      tick([449, 583, 457, 591], v("hispanic") === "No");
      const race = v("race");
      tick([268, 556, 276, 563], has(race, "White"));
      tick([321, 556, 329, 563], has(race, "Black or African American"));
      tick([438, 556, 446, 563], has(race, "Alaskan/American Indian"));
      tick([268, 545, 276, 552], has(race, "Asian"));
      tick([321, 545, 329, 552], has(race, "Hawaiian/Pacific Islander"));
      tick([440, 545, 448, 552], has(race, "I choose not to respond"));

      const school: [string, Box][] = [
        ["In-School, H.S. or Less", [56, 522, 63, 530]], ["In-School, Alternate School", [56, 512, 63, 519]], ["In-School Post H.S.", [56, 501, 63, 509]],
        ["Not Attending School; Did not finish High School", [56, 491, 63, 498]], ["Not Attending School; H.S. Graduate", [56, 480, 63, 488]],
      ];
      school.forEach(([o, b]) => tick(b, v("schoolStatus") === o));
      box(v("highestCompleted"), [220, 468, 317, 477]);
      const employment: [string, Box][] = [["Employed", [333, 513, 341, 521]], ["Employed but received notice of termination", [333, 498, 341, 506]], ["Not Employed", [333, 484, 341, 492]]];
      employment.forEach(([o, b]) => tick(b, v("employmentStatus") === o));

      tick([262, 441, 269, 448], v("jobBank") === "Yes");
      tick([289, 441, 296, 448], v("jobBank") === "No");
      tick([282, 429, 290, 436], v("confidential") === "Yes");
      tick([309, 429, 317, 436], v("confidential") === "No");
      tick([219, 415, 226, 423], v("migrant") === "Yes");
      tick([250, 415, 258, 423], v("migrant") === "No");
      tick([58, 404, 66, 412], v("migrantClass") === "Migrant Farm Worker");
      tick([184, 404, 192, 412], v("migrantClass") === "Migrant Food Proc. Worker");
      tick([58, 392, 66, 400], v("migrantClass") === "Seasonal Farm Worker");

      const contact = v("contactBy");
      tick([352, 404, 360, 412], has(contact, "US Mail"));
      tick([456, 404, 464, 412], has(contact, "Primary Phone"));
      tick([352, 392, 360, 400], has(contact, "Alternate Phone"));
      tick([456, 392, 464, 400], has(contact, "Fax"));
      tick([506, 392, 513, 400], has(contact, "Email"));

      const desire = v("desire");
      tick([89, 364, 97, 372], has(desire, "Full-time"));
      tick([154, 364, 161, 372], has(desire, "Part-time"));
      tick([89, 352, 97, 360], has(desire, "Permanent"));
      tick([154, 352, 161, 360], has(desire, "Temporary"));
      const shift = v("shift");
      ([["Any", 79, 86], ["1st", 104, 112], ["2nd", 129, 136], ["3rd", 154, 162], ["Split", 182, 189], ["Rotating", 215, 223]] as const)
        .forEach(([o, x0, x1]) => tick([x0, 341, x1, 348], has(shift, o)));
      box(v("minPay"), [149, 326, 197, 335]);
      box(v("minPayPer"), [218, 326, 256, 335]);

      box(v("militaryBranch"), [360, 366, 458, 374]);
      tick([479, 366, 487, 373], v("campaignVeteran") === true);
      parts(v("activeFrom"), [[347, 350, 373, 358], [384, 350, 402, 358], [412, 350, 449, 358]]);
      parts(v("activeTo"), [[468, 350, 494, 358], [502, 350, 521, 358], [530, 350, 561, 358]]);
      tick([338, 333, 345, 340], v("serviceDisability") === "Disabled");
      tick([400, 333, 407, 340], v("serviceDisability") === "Not Disabled");
      tick([473, 333, 481, 340], v("serviceDisability") === "Special");

      box(v("severanceAmount"), [170, 297, 259, 305]);
      tick([116, 282, 123, 290], v("severanceType") === "Lump Sum pay");
      box(usDate(v("lumpSumDate")), [190, 282, 228, 291]);
      tick([302, 282, 310, 290], v("severanceType") === "Installment Pay");
      box(usDate(v("installmentStart")), [359, 282, 397, 291]);
      tick([516, 282, 524, 290], v("severanceType") === "No information at this time");

      box(v("jobObjective"), [152, 260, 562, 274]);
      tick([219, 243, 226, 251], v("interestedTraining") === "Yes");
      tick([261, 243, 268, 251], v("interestedTraining") === "No");
      ([["5 Miles", 245, 253], ["10 Miles", 302, 310], ["25 Miles", 365, 372], ["50 Miles", 426, 434], ["100 miles", 492, 499]] as const)
        .forEach(([o, x0, x1]) => tick([x0, 225, x1, 232], v("travel") === o));

      box(v("jobTitle"), [93, 194, 290, 202]);
      box(v("employer"), [332, 194, 561, 202]);
      box(v("workStreet"), [83, 180, 279, 188]);
      box(v("workCity"), [299, 180, 471, 188]);
      box(v("workState"), [497, 182, 557, 191]);
      box(usDate(v("workStart")), [98, 166, 193, 174]);
      box(usDate(v("workEnd")), [234, 166, 322, 174]);
      box(v("wage"), [358, 166, 434, 174]);
      box(v("wagePer"), [455, 166, 524, 174]);
      tick([134, 152, 142, 159], v("leaveReason") === "Lack of Work/Lay Off");
      tick([236, 152, 244, 159], v("leaveReason") === "Plant/Dept. Closure");
      tick([328, 152, 336, 159], v("leaveReason") === "Other (Specify)");
      box(v("leaveOther"), [398, 152, 559, 160]);
      p.wrapped(v("jobDuties"), [108, 127, 559, 146], 8);
      p.wrapped(v("additionalSkills"), [141, 108, 562, 121], 8);

      const license = v("license");
      ([["None", 168, 176], ["Car", 211, 219], ["Motorcycle", 246, 254], ["CDL-A", 305, 313], ["CDL-B", 349, 357], ["CDL-C", 397, 404]] as const)
        .forEach(([o, x0, x1]) => tick([x0, 95, x1, 103], has(license, o)));
      box(v("licenseState"), [470, 95, 561, 104]);

      p.signature(f.signature, [112, 42, 384, 66]);
      box(f.signedDate, [436, 49, 561, 65]);
    },
  },
};
