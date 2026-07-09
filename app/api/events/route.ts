import { getNotifications } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stop = () => {
    closed = true;
    if (interval) clearInterval(interval);
  };

  const stream = new ReadableStream({
    async start(controller) {
      req.signal.addEventListener("abort", stop, { once: true });
      if (closed) return;
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status": "ok"}\n\n`));

      let lastState = "";
      const checkState = async () => {
        if (closed) return;
        try {
          const notifications = await getNotifications();
          const currentState = JSON.stringify(notifications);
          if (!closed && currentState !== lastState) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "SYNC", data: notifications })}\n\n`));
            lastState = currentState;
          }
        } catch (error) {
          if (!closed) console.error("SSE Poll Error:", error);
          stop();
        }
      };

      await checkState();
      if (!closed) interval = setInterval(checkState, 3000);
    },
    cancel: stop
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none"
    }
  });
}