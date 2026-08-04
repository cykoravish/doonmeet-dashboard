// Creates (or updates the password of) an admin account.
// This is the ONLY way to create an admin — there is no HTTP route for it.
//
// Usage:
//   npm run create-admin -- --name "Ravish Bisht" --email ravish@doonmeet.in --password "a-strong-password"
//
// ============================================================
import "dotenv/config";
import mongoose from "mongoose";
import readline from "readline";
import { Admin } from "../src/models/Admin";

function parseArgs() {
  const args = process.argv.slice(2);
  const out: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      out[key] = args[i + 1];
      i++;
    }
  }
  return out;
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in your .env file");
    process.exit(1);
  }

  const args = parseArgs();
  const name = args.name ?? (await prompt("Admin name: "));
  const email = (args.email ?? (await prompt("Admin email: "))).trim().toLowerCase();
  const password = args.password ?? (await prompt("Admin password (min 12 chars): "));

  if (!name || !email || !password) {
    console.error("name, email and password are all required");
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("Password must be at least 12 characters for an admin account");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const existing = await Admin.findOne({ email });

  if (existing) {
    existing.name = name;
    existing.passwordHash = password; // pre-save hook hashes it
    existing.isActive = true;
    existing.failedLoginAttempts = 0;
    existing.lockedUntil = null;
    await existing.save();
    console.log(`Updated existing admin: ${email}`);
  } else {
    await Admin.create({ name, email, passwordHash: password });
    console.log(`Created new admin: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
