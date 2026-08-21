import { route, ok, parseJson } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { issueCertificateSchema, revokeCertificateSchema } from "@/server/validation";
import { issueCertificate, listCertificates, revokeCertificate } from "@/server/certificates";
import { verificationUrlFor } from "@/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req, { requestId }) => {
  await requireAdmin("certificates.read");
  return ok({ certificates: await listCertificates() }, { requestId });
});

export const POST = route(async (req, { requestId }) => {
  const { user } = await requireAdmin("certificates.issue");
  const input = await parseJson(req, issueCertificateSchema);
  const { certificate, duplicate } = await issueCertificate(input, { actor: user.email, requestId });
  return ok(
    { certificate, duplicate, verificationUrl: verificationUrlFor(certificate.certificateId) },
    { status: duplicate ? 200 : 201, requestId },
  );
});

export const DELETE = route(async (req, { requestId }) => {
  const { user } = await requireAdmin("certificates.revoke");
  const { certificateId } = await parseJson(req, revokeCertificateSchema);
  const certificate = await revokeCertificate(certificateId, { actor: user.email, requestId });
  return ok({ certificate }, { requestId });
});
