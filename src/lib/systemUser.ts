import { User, IUser } from "@/models/User";

// Content created directly through the admin dashboard (e.g. a community or
// event an admin sets up on the platform's behalf) still needs a `createdBy`
// User reference, since that's what the main app's schema expects and
// displays. Rather than misusing an Admin's _id (which lives in a different
// collection and would break population on the main app), we attribute it
// to a real, dedicated "DoonMeet Team" user account. This account has no
// password and no Google ID, so it can never be logged into directly.
const SYSTEM_USER_EMAIL = "team@doonmeet.in";

let cachedId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (cachedId) return cachedId;

  let user = await User.findOne({ email: SYSTEM_USER_EMAIL }).lean<IUser & { _id: string }>();

  if (!user) {
    const created = await User.create({
      name: "DoonMeet Team",
      email: SYSTEM_USER_EMAIL,
      isVerified: true,
      isActive: true,
      bio: "Official DoonMeet account.",
    });
    user = created.toObject();
  }

  cachedId = String((user as IUser & { _id: string })._id);
  return cachedId;
}
