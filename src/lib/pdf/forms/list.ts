import type { Application } from "@/db";
import { TEMPLATES, templatesFor, type FormTemplate } from "@/lib/forms/templates";

/**
 * The forms to print for an application, in packet order. A DFS student who signed BHI's Photo
 * Release before DFS students got the HCDFS one keeps their signed BHI form in its place.
 */
export function printableForms(app: Pick<Application, "category" | "forms" | "signatures">): FormTemplate[] {
  return templatesFor(app.category).map((t) => {
    if (t.key === "photo_release_dfs" && !app.forms?.photo_release_dfs && (app.forms?.photo_release || app.signatures?.photo_release))
      return TEMPLATES.find((x) => x.key === "photo_release")!;
    return t;
  });
}

const WRITTEN = new Set(["text", "tel", "email", "textarea", "date", "ssn"]);

/**
 * The answers as they go on paper. Once a form is completed every question has an answer, except
 * ones that don't apply to this student (Alien Reg. # for a citizen, military dates for a
 * non-veteran); those print "N/A" so no blank is left on the form. A current job's end date prints
 * "Present". Unfinished forms print as they are, so a blank form stays blank.
 */
export function printedAnswers(t: FormTemplate, data: Record<string, unknown>, completed: boolean): Record<string, unknown> {
  const out = { ...data };
  if (t.key === "workforce_registration" && out.hasWorked === "Yes" && out.employmentStatus === "Employed" && !String(out.workEnd ?? "").trim()) out.workEnd = "Present";
  if (!completed) return out;
  for (const f of t.fields) {
    if (!WRITTEN.has(f.type) || f.optionalComment) continue;
    const v = out[f.name];
    if (v == null || (typeof v === "string" && !v.trim())) out[f.name] = "N/A";
  }
  return out;
}
