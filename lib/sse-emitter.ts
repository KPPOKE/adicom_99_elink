import { EventEmitter } from "events";

const globalForSse = globalThis as unknown as {
  sseEmitter: EventEmitter | undefined;
};

export const sseEmitter = globalForSse.sseEmitter ?? new EventEmitter();

if (process.env.NODE_ENV !== "production") globalForSse.sseEmitter = sseEmitter;

// Optional: Increase max listeners if many clients connect
sseEmitter.setMaxListeners(100);

export function triggerEvent(type: string, data: any) {
  sseEmitter.emit("notification", { type, data });
}
