// SPDX-License-Identifier: GPL-2.0-or-later
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Tests that import @elgato/streamdeck (Phase 1 step 5 onward) share the
    // SDK's file logger, and parallel workers race on its log rotation. One
    // file at a time keeps that deterministic; PLAN.md 5 keeps the suite under 30 s.
    fileParallelism: false
  }
});
