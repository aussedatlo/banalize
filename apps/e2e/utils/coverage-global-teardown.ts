import { createReport } from "./coverage";

/** Combine the raw V8 coverage added by the workers into the final report. */
export default async function globalTeardown(): Promise<void> {
  const results = await createReport().generate();
  if (results?.summary) {
    const { bytes, lines } = results.summary;
    console.log(
      `\nUI coverage — bytes: ${bytes?.pct ?? "?"}% lines: ${lines?.pct ?? "?"}%`,
      `\nReport: apps/e2e/coverage/index.html`,
    );
  }
}
