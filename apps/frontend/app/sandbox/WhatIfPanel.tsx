"use client";
import React, { useState } from "react";
import { CostBasisMethod, GainSummary } from "@shared/types";
import useSandboxSocket from "./useSandboxSocket";

const methods: CostBasisMethod[] = ["FIFO", "LIFO", "HIFO", "SPEC_ID"];

const WhatIfPanel: React.FC = () => {
  const [method, setMethod] = useState<CostBasisMethod>("FIFO");
  const { summary } = useSandboxSocket(method);

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

      {summary && (
        <div className="mt-6 text-sm bg-gray-50 rounded p-3">
          <p>Short-Term Gain: ${" "}{summary.shortTermGain.toFixed(2)}</p>
          <p>Long-Term Gain: ${" "}{summary.longTermGain.toFixed(2)}</p>
          <p className="font-medium">Total Gain: ${" "}{summary.totalGain.toFixed(2)}</p>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button className="px-3 py-1 rounded border border-gray-300 text-sm">Save Draft</button>
        <button className="px-3 py-1 rounded bg-blue-600 text-white text-sm">Commit</button>
      </div>
    </aside>
  );
};

export default WhatIfPanel;