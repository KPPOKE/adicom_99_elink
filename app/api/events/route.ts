import { getNotifications } from "@/app/actions/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status": "ok"}\n\n`));
      
      let lastState = "";

      const checkState = async () => {
        try {
          const notifications = await getNotifications();
          const currentState = JSON.stringify(notifications);
          
          if (currentState !== lastState) {
            // Kirim state baru ke client
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "SYNC", data: notifications })}\n\n`));
            lastState = currentState;
          }
        } catch (e) {
          console.error("SSE Poll Error:", e);
        }
      };

      await checkState();

      // Poll database tiap 3 detik (hanya 1 query ringan dari server ke DB, tidak membebani network client)
      const interval = setInterval(checkState, 3000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
      });
    }
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
