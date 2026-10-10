import { config } from "dotenv";
import { cleanupTestData } from "../cleanup";

export default async function teardown() {
  config({ path: ".env.local", quiet: true });
  try {
    const removed = await cleanupTestData();
    console.log(`[db tests] cleaned up ${removed.users} test users`);
  } catch (err) {
    console.warn(`[db tests] cleanup skipped: ${(err as Error).message}`);
  }
}
