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
