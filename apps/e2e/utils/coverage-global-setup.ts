import { createReport } from "./coverage";

/** Clear any stale raw coverage before the run accumulates fresh data. */
export default async function globalSetup(): Promise<void> {
  await createReport().cleanCache();
}
