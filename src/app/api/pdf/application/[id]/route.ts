import { assertCanViewApplication } from "@/lib/authz";
import { audit } from "@/lib/audit";
import { buildPacketPdf } from "@/lib/pdf/forms";
import { apiUser, deny, fileResponse, isUuid, wantsDownload } from "@/lib/http";

/** The whole enrollment packet in BHI's form format. Students get their own; admins any. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await apiUser();
  if (!user) return deny(401);
  const { id } = await params;
  if (!isUuid(id)) return deny();
  try {
    await assertCanViewApplication(user, id);
  } catch {
    return deny();
  }
  const pdf = await buildPacketPdf(id);
  const download = wantsDownload(req);
  await audit(user._id, download ? "application.download_pdf" : "application.print_pdf", "application", id);
  return fileResponse(pdf, "application/pdf", `enrollment-packet-${id.slice(0, 8)}.pdf`, !download, { generatedPdf: true });
}
