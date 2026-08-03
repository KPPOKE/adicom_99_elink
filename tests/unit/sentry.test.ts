import { describe, expect, it } from "vitest";
import type { Event } from "@sentry/nextjs";
import { stripSensitiveSentryData } from "@/lib/sentry";

describe("stripSensitiveSentryData", () => {
  it("removes identity and request payload data", () => {
    const event = {
      user: { email: "private@example.com" },
      request: {
        url: "https://example.com/login",
        cookies: { session: "secret" },
        data: { password: "secret" },
        headers: { authorization: "secret" },
        query_string: "token=secret"
      }
    } as Event;

    expect(stripSensitiveSentryData(event)).toEqual({
      request: { url: "https://example.com/login" }
    });
  });
});
