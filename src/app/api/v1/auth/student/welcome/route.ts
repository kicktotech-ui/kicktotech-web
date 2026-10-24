import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedStudent } from "@/server/auth/guard";
import { getStore } from "@/server/data";
import { sendBrevoTemplateEmail } from "@/server/email/brevo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/student/welcome
 * Sends the welcome email after student registration using Brevo.
 */
export async function POST(req: NextRequest) {
  try {
    const student = await requireAuthenticatedStudent(req);
    const store = getStore();
    const user = await store.getUserById(student.id);

    if (!user) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    const templateId = Number(
      process.env.BREVO_WELCOME_TEMPLATE_ID ?? process.env.BREVO_TEMPLATE_ID ?? 1,
    );

    const recipientName = user.name || "Student";
    const email = user.email;

    const result = await sendBrevoTemplateEmail({
      to: { email, name: recipientName },
      templateId,
      params: {
        name: recipientName,
        email,
      },
    });

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("[welcome-email] Error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
