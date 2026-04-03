"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Zap, AlertTriangle, CheckCircle, Loader2, Gauge, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";

interface LiveFaultScanProps {
  featureCols: string[];
  onScanComplete: (result: any) => void;
}

const parameterConfig: Record<string, { min: number; max: number; default: number; step: number; unit: string }> = {
  cycle_no: { min: 0, max: 5000, default: 100, step: 10, unit: "Cyc" },
  rpm: { min: 0, max: 4000, default: 1500, step: 10, unit: "RPM" },
  temperature_C: { min: 10, max: 200, default: 45, step: 1, unit: "°C" },
  current_A: { min: 0, max: 150, default: 15, step: 0.5, unit: "A" },
  torque_Nm: { min: 0, max: 600, default: 20, step: 1, unit: "Nm" },
  vibration_mm_s: { min: 0.0, max: 20.0, default: 1.5, step: 0.1, unit: "mm/s" },
  voltage_V: { min: 0, max: 480, default: 220, step: 1, unit: "V" },
  power_W: { min: 0, max: 20000, default: 3000, step: 50, unit: "W" },
};

const fallbackConfig = { min: 0, max: 1000, default: 50, step: 1, unit: "" };

export default function LiveFaultScan({ featureCols, onScanComplete }: LiveFaultScanProps) {
  const [inputs, setInputs] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialValues = featureCols.reduce((acc, col) => {
      const config = parameterConfig[col] || fallbackConfig;
      acc[col] = config.default;
      return acc;
    }, {} as Record<string, number>);
    
    setInputs(initialValues);
    setResult(null);
  }, [featureCols.join(",")]);

  const handleInputChange = (col: string, value: string) => {
    const config = parameterConfig[col] || fallbackConfig;
    
    if (value === "") {
      setInputs((prev) => ({ ...prev, [col]: "" }));
      return;
    }

    let numValue = parseFloat(value);
    
    if (numValue > config.max) numValue = config.max;
    
    setInputs((prev) => ({ ...prev, [col]: numValue }));
  };

  const handleInputBlur = (col: string) => {
    const config = parameterConfig[col] || fallbackConfig;
    const currentValue = inputs[col];
    
    if (currentValue === "" || isNaN(Number(currentValue)) || Number(currentValue) < config.min) {
      setInputs((prev) => ({ ...prev, [col]: config.min }));
    }
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
      acc[col] = Number(inputs[col]);
      return acc;
    }, {} as Record<string, number>);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/predict`, {
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
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-red-500" />
            Live Digital Twin Telemetry
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
            {featureCols.map((col) => {
              const config = parameterConfig[col] || fallbackConfig;
              
              return (
                <div key={col} className="bg-[#1e0f0f] border border-red-500/10 p-3 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-gray-400 tracking-widest uppercase">
                      {col.replace(/_/g, " ")}
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={config.step}
                        min={config.min}
                        max={config.max}
                        value={inputs[col] !== undefined ? inputs[col] : ""}
                        onChange={(e) => handleInputChange(col, e.target.value)}
                        onBlur={() => handleInputBlur(col)}
                        className="w-20 bg-[#2a1515] border border-red-500/30 text-red-400 font-mono text-sm p-1 rounded outline-none focus:border-red-500 text-right transition-all"
                      />
                      <span className="text-[9px] text-gray-500 font-mono w-6">{config.unit}</span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={inputs[col] !== undefined && inputs[col] !== "" ? inputs[col] : config.min}
                    onChange={(e) => handleInputChange(col, e.target.value)}
                    className="w-full h-1 bg-[#341c1c] rounded-lg appearance-none cursor-pointer accent-red-500 hover:accent-red-400 transition-all"
                  />
                  
                  <div className="flex justify-between text-[8px] text-gray-600 font-mono mt-1">
                    <span>{config.min}</span>
                    <span>{config.max}</span>
                  </div>
                </div>
              );
            })}
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
            className="w-full py-3 mt-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[12px] tracking-[0.3em] uppercase rounded transition-all shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
            {loading ? "Scanning Telemetry..." : "Fire — Execute Fault Scan"}
          </button>
        </div>

        <div className="flex flex-col justify-center min-h-[300px]">
          {result ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className={`p-6 rounded-md border text-center flex flex-col items-center justify-center h-full ${currentStatus?.bg} ${currentStatus?.border}`}
            >
              {currentStatus?.icon}
              <h3 className={`text-4xl font-bold font-sans tracking-wide drop-shadow-[0_0_12px_currentColor] mb-1 ${currentStatus?.text}`}>
                {result.risk_percentage.toFixed(1)}% RISK
              </h3>
              <p className={`text-sm font-bold tracking-widest uppercase mb-6 ${currentStatus?.text}`}>
                {result.prediction === 1 ? "FAULT DETECTED" : "HEALTHY"}
              </p>
              
              <div className="w-full bg-[#1e0f0f] p-4 rounded border border-red-500/10">
                <p className="text-xs text-gray-300 font-mono tracking-widest uppercase leading-relaxed mb-4">
                  {result.label}
                </p>
                <div className="w-full h-1.5 bg-[#341c1c] rounded-full overflow-hidden">
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
            <div className="h-full border border-dashed border-red-500/20 rounded-md flex flex-col items-center justify-center text-gray-500 p-6 bg-[#1e0f0f]/50">
              <Gauge className="w-16 h-16 mb-4 opacity-30 text-red-500" />
              <p className="text-xs font-mono tracking-widest uppercase text-center max-w-[250px] leading-relaxed">
                Adjust sliders to simulate motor telemetry and fire scan to generate live fault probability.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}