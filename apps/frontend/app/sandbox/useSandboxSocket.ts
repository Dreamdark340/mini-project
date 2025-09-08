"use client";
import { useEffect, useState } from "react";
import { GainSummary } from "@shared/types";

interface SocketState {
  summary: GainSummary | null;
  error: string | null;
}

export default function useSandboxSocket(sessionId: string | null) {
  const [state, setState] = useState<SocketState>({ summary: null, error: null });

  useEffect(() => {
    if (!sessionId) return;
    const ws = new WebSocket(`/ws/sandbox?sessionId=${sessionId}`);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.error) {
          setState((s) => ({ ...s, error: data.message || "Unknown error" }));
        } else if (data.summary) {
          setState({ summary: data.summary as GainSummary, error: null });
        }
      } catch (_) {}
    };

    return () => {
      ws.close();
    };
  }, [sessionId]);

  return state;
}