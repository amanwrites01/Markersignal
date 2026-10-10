import { config } from "dotenv";
import { cleanupTestData } from "../cleanup";

export default async function globalTeardown() {
  config({ path: ".env.local", quiet: true });
  const removed = await cleanupTestData();
  console.log(`[e2e] cleaned up ${removed.users} test users and ${removed.campaigns} test campaigns`);
}
