import { describe, expect, it, vi } from "vitest";
import { postSse, RateLimitError } from "@/hooks/useSseFetch";

function streamFromString(text: string) {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

describe("postSse", () => {
  it("parses started/progress/complete events", async () => {
    const sse = [
      'event: started\ndata: {"message":"hi"}\n\n',
      'event: progress\ndata: {"message":"working"}\n\n',
      'event: complete\ndata: {"subject":"S","preheader":"P","mjml":"<mjml/>","html":"<html/>"}\n\n',
    ].join("");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: streamFromString(sse),
    });
    vi.stubGlobal("fetch", fetchMock);

    const events: Array<{ event: string; data: unknown }> = [];
    await postSse("/api/test", { a: 1 }, (ev) => events.push(ev));

    expect(fetchMock).toHaveBeenCalled();
    expect(events.map((e) => e.event)).toEqual(["started", "progress", "complete"]);
    expect((events[1].data as unknown as { message: string }).message).toBe("working");
    expect((events[2].data as unknown as { subject: string }).subject).toBe("S");
  });

  it("throws on non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "nope", message: "bad" }),
    }));

    await expect(postSse("/api/test", {}, () => {})).rejects.toThrow("bad");
  });

  it("handles non-JSON data and trailing buffer block", async () => {
    const sse = ['event: message\ndata: not-json\n\n', 'event: progress\ndata: {"message":"ok"}'].join("");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: streamFromString(sse),
      }),
    );

    const events: Array<{ event: string; data: unknown }> = [];
    await postSse("/api/test", {}, (ev) => events.push(ev));

    expect(events[0]).toEqual({ event: "message", data: "not-json" });
    expect((events[1].data as unknown as { message: string }).message).toBe("ok");
  });

  it("throws when response body is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      }),
    );
    await expect(postSse("/api/test", {}, () => {})).rejects.toThrow(/empty/i);
  });

  it("handles blocks without event line and empty blocks", async () => {
    const sse = ["\n\n", 'data: {"ok":true}\n\n'].join("");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: streamFromString(sse),
      }),
    );

    const events: Array<{ event: string; data: unknown }> = [];
    await postSse("/api/test", {}, (ev) => events.push(ev));
    expect(events[0].event).toBe("message");
    expect((events[0].data as unknown as { ok: boolean }).ok).toBe(true);
  });

  it("emits null data when no data lines exist", async () => {
    const sse = "event: ping\n\n";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        body: streamFromString(sse),
      }),
    );

    const events: Array<{ event: string; data: unknown }> = [];
    await postSse("/api/test", {}, (ev) => events.push(ev));
    expect(events[0]).toEqual({ event: "ping", data: null });
  });

  it("throws RateLimitError for event-stream 429 payload", async () => {
    const sse = 'event: error\ndata: {"error":"rate_limit_exceeded","message":"Rate limit exceeded.","type":"hourly","resetAt":"2026-01-01T01:00:00.000Z","usage":{"remaining":null}}\n\n';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "content-type": "text/event-stream; charset=utf-8" }),
        text: async () => sse,
      }),
    );

    await expect(postSse("/api/test", {}, () => {})).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws RateLimitError for JSON 429 payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          error: "rate_limit_exceeded",
          message: "Rate limit exceeded.",
          type: "daily",
          resetAt: "2026-01-02T00:00:00.000Z",
          usage: { remaining: null },
        }),
      }),
    );
    await expect(postSse("/api/test", {}, () => {})).rejects.toBeInstanceOf(RateLimitError);
  });

  it("throws generic error for event-stream failure without rate limit payload", async () => {
    const sse = 'event: error\ndata: {"error":"generation_failed","message":"nope"}\n\n';
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "text/event-stream; charset=utf-8" }),
        text: async () => sse,
      }),
    );
    await expect(postSse("/api/test", {}, () => {})).rejects.toThrow("nope");
  });

  it("throws request failed when JSON parsing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => {
          throw new Error("bad json");
        },
      }),
    );
    await expect(postSse("/api/test", {}, () => {})).rejects.toThrow(/request failed/i);
  });

  it("throws request failed when event-stream has no error payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "text/event-stream" }),
        text: async () => "",
      }),
    );
    await expect(postSse("/api/test", {}, () => {})).rejects.toThrow(/request failed/i);
  });
});

