"use client";
import React, { useEffect, useState } from "react";
import { CostBasisMethod } from "@shared/types";
import useSandboxSocket from "./useSandboxSocket";

const methods: CostBasisMethod[] = ["FIFO", "LIFO", "HIFO", "SPEC_ID"];

const WhatIfPanel: React.FC = () => {
  const [method, setMethod] = useState<CostBasisMethod>("FIFO");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { summary, error } = useSandboxSocket(sessionId);
  const [status, setStatus] = useState<'idle' | 'queued' | 'ready' | 'failed'>(
    'idle'
  );

  // Toast helper (simple alert for proto)
  const toast = (msg: string) => alert(msg);

  // create session handler
  const createSession = async () => {
    setStatus('queued');
    try {
      const resp = await fetch(`/api/what-if/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await resp.json();
      setSessionId(data.id);
    } catch (e) {
      toast('Failed to start calculation');
      setStatus('failed');
    }
  };

  // poll status until ready
  useEffect(() => {
    if (!sessionId) return;
    let interval: any;
    const poll = async () => {
      const r = await fetch(`/api/what-if/sessions/${sessionId}/status`);
      const d = await r.json();
      if (d.status === 'ready') {
        setStatus('ready');
        clearInterval(interval);
      }
    };
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // watch socket errors
  useEffect(() => {
    if (error) {
      toast(error);
      setStatus('failed');
    }
  }, [error]);

  return (
    <aside className="p-4 border-l w-96 bg-white shadow-lg">
      <h2 className="font-semibold mb-4 text-lg">What-If Sandbox</h2>

      <div className="space-y-2">
        {methods.map((m) => (
          <label key={m} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="costBasis"
              value={m}
              checked={method === m}
              onChange={() => setMethod(m)}
              className="accent-blue-600"
            />
            {m}
          </label>
        ))}
      </div>

      {summary && status === 'ready' && (
        <div className="mt-6 text-sm bg-gray-50 rounded p-3">
          <p>Short-Term Gain: ${" "}{summary.shortTermGain.toFixed(2)}</p>
          <p>Long-Term Gain: ${" "}{summary.longTermGain.toFixed(2)}</p>
          <p className="font-medium">Total Gain: ${" "}{summary.totalGain.toFixed(2)}</p>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          className="px-3 py-1 rounded border border-gray-300 text-sm"
          onClick={createSession}
        >
          Calculate
        </button>
        {status === 'queued' && (
          <span className="text-xs text-yellow-600">Calculating…</span>
        )}
        {status === 'ready' && (
          <span className="text-xs text-green-600">Ready</span>
        )}
        {status === 'failed' && (
          <span className="text-xs text-red-600">Failed</span>
        )}
      </div>
    </aside>
  );
};

export default WhatIfPanel;