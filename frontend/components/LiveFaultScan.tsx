"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Zap, AlertTriangle, CheckCircle, Loader2, Gauge } from "lucide-react";
import { motion } from "framer-motion";

interface LiveFaultScanProps {
  featureCols: string[];
  onScanComplete: (result: any) => void;
}

export default function LiveFaultScan({ featureCols, onScanComplete }: LiveFaultScanProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInputs(featureCols.reduce((acc, col) => ({ ...acc, [col]: "" }), {}));
    setResult(null);
  }, [featureCols.join(",")]);

  const handleInputChange = (col: string, value: string) => {
    setInputs((prev) => ({ ...prev, [col]: value }));
  };

  const handleScan = async () => {
    for (const col of featureCols) {
      if (inputs[col] === "" || isNaN(Number(inputs[col]))) {
        setError(`Please enter a valid number for ${col}`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    const numericFeatures = featureCols.reduce((acc, col) => {
      acc[col] = parseFloat(inputs[col]);
      return acc;
    }, {} as Record<string, number>);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await axios.post(`${API_BASE_URL}/api/predict`, {
        features: numericFeatures,
      });
      setResult(response.data);
      onScanComplete(response.data);
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        const errorMessages = detail.map((e: any) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(" | ");
        setError(`Validation Error: ${errorMessages}`);
      } else if (typeof detail === "string") {
        setError(detail);
      } else {
        setError("Prediction sequence failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    ok: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-500", icon: <CheckCircle className="w-12 h-12 text-green-500 mb-2" /> },
    warn: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", icon: <AlertTriangle className="w-12 h-12 text-orange-500 mb-2" /> },
    fault: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", icon: <AlertTriangle className="w-12 h-12 text-red-500 mb-2 animate-pulse" /> },
  };

  const currentStatus = result ? statusColors[result.state as keyof typeof statusColors] : null;

  return (
    <div className="bg-[#160a0a] border border-red-500/20 p-6 rounded-md shadow-lg">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <span className="bg-red-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm tracking-widest">S11</span>
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase">Live Fault Prediction Scan</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {featureCols.map((col) => (
              <div key={col}>
                <label className="block text-[10px] text-gray-400 tracking-widest uppercase mb-1">
                  {col}
                </label>
                <input
                  type="number"
                  step="any"
                  value={inputs[col] || ""}
                  onChange={(e) => handleInputChange(col, e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#1e0f0f] border border-red-500/30 text-red-400 font-mono text-lg p-2 rounded outline-none focus:border-red-500 focus:shadow-[0_0_10px_rgba(220,38,38,0.2)] transition-all"
                />
              </div>
            ))}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 text-red-400 text-xs font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            onClick={handleScan}
            disabled={loading}
            className="w-full py-3 mt-2 bg-gradient-to-r from-red-700 to-red-600 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[12px] tracking-[0.3em] uppercase rounded transition-all shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? "Scanning..." : "Fire — Execute Fault Scan"}
          </button>
        </div>

        <div className="flex flex-col justify-center min-h-[250px]">
          {result ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`p-6 rounded-md border text-center flex flex-col items-center justify-center h-full ${currentStatus?.bg} ${currentStatus?.border}`}
            >
              {currentStatus?.icon}
              <h3 className={`text-3xl font-bold font-sans tracking-wide drop-shadow-[0_0_12px_currentColor] mb-1 ${currentStatus?.text}`}>
                {result.risk_percentage.toFixed(1)}% RISK
              </h3>
              <p className={`text-xs font-bold tracking-widest uppercase mb-4 ${currentStatus?.text}`}>
                {result.prediction === 1 ? "FAULT DETECTED" : "HEALTHY"}
              </p>

              <div className="w-full bg-[#1e0f0f] p-3 rounded border border-red-500/10">
                <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase leading-relaxed">
                  {result.label}
                </p>
                <div className="w-full h-1 bg-[#341c1c] rounded-full mt-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${result.risk_percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full ${result.state === 'ok' ? 'bg-green-500' : result.state === 'warn' ? 'bg-orange-500' : 'bg-red-500'}`}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full border border-dashed border-red-500/20 rounded-md flex flex-col items-center justify-center text-gray-500 p-6">
              <Gauge className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-xs font-mono tracking-widest uppercase text-center">
                Dial in motor parameters and fire scan to return fault probability
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}