// SPDX-License-Identifier: GPL-2.0-or-later
import { describe, expect, it } from "vitest";
import { DEFAULT_LINK_PORT, LINK_HOST, PROTOCOL_VERSION, TARGETS } from "../src/shared/protocol";

describe("Phase 0 skeleton", () => {
  it("pins protocol version 1 (R-INT-1)", () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it("defaults the link to loopback port 48150 (R-LNK-1)", () => {
    expect(LINK_HOST).toBe("127.0.0.1");
    expect(DEFAULT_LINK_PORT).toBe(48150);
    expect(DEFAULT_LINK_PORT).toBeGreaterThan(1023);
    expect(DEFAULT_LINK_PORT).toBeLessThan(65536);
  });

  it("knows exactly the two targets (R-INT-1)", () => {
    expect([...TARGETS].sort()).toEqual(["browser", "obs"]);
  });
});
