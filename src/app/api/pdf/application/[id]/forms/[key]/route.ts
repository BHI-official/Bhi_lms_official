import { assertCanViewApplication } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { buildFormPdf } from "@/lib/pdf/forms";
import { apiUser, deny, fileResponse, isUuid, wantsDownload } from "@/lib/http";

/** One enrollment form, filled in, on BHI's original form. Students get their own; admins any. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; key: string }> }) {
  const user = await apiUser();
  if (!user) return deny(401);
  const { id, key } = await params;
  if (!isUuid(id) || !/^[a-z0-9_]{1,60}$/.test(key)) return deny();
  try {
    await assertCanViewApplication(user, id);
  } catch {
    return deny();
  }
  // Only forms of this student's packet (so a funded student can never print a fee form).
  const pdf = await buildFormPdf(id, key);
  if (!pdf) return deny();
  const download = wantsDownload(req);
  await audit(user._id, download ? "application.download_form_pdf" : "application.print_form_pdf", "application", id, { form: key });
  const name = pdf.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return fileResponse(pdf.bytes, "application/pdf", `${name}-${id.slice(0, 8)}.pdf`, !download, { generatedPdf: true });
}
