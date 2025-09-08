"use client";
import { useEffect, useState } from "react";
import { CostBasisMethod, GainSummary } from "@shared/types";

export default function useSandboxSocket(method: CostBasisMethod) {
  const [summary, setSummary] = useState<GainSummary | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`/ws/sandbox?method=${method}`);

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.summary) setSummary(data.summary as GainSummary);
      } catch (_) {}
    };

    return () => {
      ws.close();
    };
  }, [method]);

  return { summary };
}