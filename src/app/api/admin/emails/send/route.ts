import { NextResponse } from "next/server";
import { Resend } from "resend";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { EmailLog } from "@/models/EmailLog";
import { withAdminAuth, AuthenticatedAdminRequest } from "@/middleware/withAdminAuth";
import { adminApiLimiter } from "@/lib/rateLimit";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "DoonMeet <ravish@doonmeet.in>";

// Resend's free tier is capped at 100 emails/day *total*, shared with every
// other automated email the main app sends (verification, password reset,
// DM notifications, inactivity reminders). Capping a single manual send
// here keeps one admin action from accidentally exhausting the whole
// day's quota and blocking real signups.
const MAX_RECIPIENTS_PER_SEND = 60;

export const POST = withAdminAuth(async (req: AuthenticatedAdminRequest) => {
  const limited = adminApiLimiter(req);
  if (limited) return limited;

  try {
    const body = await req.json();
    const userIds: string[] = Array.isArray(body?.userIds) ? body.userIds : [];
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();

    if (userIds.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one recipient." },
        { status: 400 }
      );
    }
    if (userIds.length > MAX_RECIPIENTS_PER_SEND) {
      return NextResponse.json(
        {
          success: false,
          message: `Max ${MAX_RECIPIENTS_PER_SEND} recipients per send — Resend's free tier is capped at 100 emails/day total. Send in smaller batches.`,
        },
        { status: 400 }
      );
    }
    if (!subject || subject.length > 150) {
      return NextResponse.json(
        { success: false, message: "Subject is required (max 150 characters)." },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json({ success: false, message: "Message is required." }, { status: 400 });
    }

    await connectDB();

    const users = await User.find({ _id: { $in: userIds }, email: { $ne: null } })
      .select("_id name email")
      .lean();

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, message: "None of the selected users have an email on file." },
        { status: 400 }
      );
    }

    // Plain text -> simple HTML. Preserves line breaks; no rich formatting
    // needed for a quick admin message.
    const htmlBody = message
      .split("\n")
      .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
      .join("");

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      const html = `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <p>Hi ${user.name},</p>
          ${htmlBody}
          <p style="color:#888;margin-top:24px;font-size:13px">— The DoonMeet Team</p>
        </div>
      `;

      try {
        await resend.emails.send({ from: FROM, to: user.email!, subject, html });
        await EmailLog.create({
          recipient: user._id,
          recipientEmail: user.email,
          type: "admin_manual",
          subject,
          status: "sent",
        });
        sent++;
      } catch (err) {
        await EmailLog.create({
          recipient: user._id,
          recipientEmail: user.email,
          type: "admin_manual",
          subject,
          status: "failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        }).catch(() => {});
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed, total: users.length });
  } catch (error) {
    console.error("[POST /admin/emails/send] Error:", error);
    return NextResponse.json({ success: false, message: "Failed to send emails." }, { status: 500 });
  }
});
