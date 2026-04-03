"use client";

import { useState } from "react";
import axios from "axios";
import { Dices, Loader2, ShieldCheck, AlertTriangle, Activity } from "lucide-react";
import { motion } from "framer-motion";

export default function MonteCarloSimulation() {
  const [simulationData, setSimulationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("http://localhost:8000/api/scenarios");
      setSimulationData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Simulation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#160a0a] border border-red-500/20 p-6 rounded-md shadow-lg">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <span className="bg-red-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm tracking-widest">S13</span>
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase">Monte Carlo Risk Simulation</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-red-500/5 border-l-2 border-red-500/50 p-4 rounded-r text-xs text-gray-400 font-mono leading-relaxed">
            Simulates <strong className="text-white">5,000 future operating scenarios</strong> by adding realistic Gaussian noise to current mean values (±1 std dev per parameter). Shows the probability distribution of fault occurrence.
          </div>
          
          <button
            onClick={runSimulation}
            disabled={loading}
            className="w-full py-3 bg-[#1e0f0f] border border-red-500/30 hover:border-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 font-bold text-[11px] tracking-[0.2em] uppercase rounded transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dices className="w-4 h-4" />}
            {loading ? "Running 5000 Simulations..." : "Run Monte Carlo Analysis"}
          </button>

          {error && <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>}
        </div>

        <div className="lg:col-span-2 min-h-[200px] flex flex-col justify-center">
          {simulationData ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
              
              <StatCard 
                label="HEALTHY RUNS" 
                value={`${simulationData.distribution.healthy_pct}%`} 
                color="text-green-500" 
                icon={<ShieldCheck className="w-5 h-5 text-green-500 opacity-50" />} 
              />
              <StatCard 
                label="CAUTION RUNS" 
                value={`${simulationData.distribution.caution_pct}%`} 
                color="text-orange-500" 
                icon={<AlertTriangle className="w-5 h-5 text-orange-500 opacity-50" />} 
              />
              <StatCard 
                label="CRITICAL RUNS" 
                value={`${simulationData.distribution.critical_pct}%`} 
                color="text-red-500" 
                icon={<Activity className="w-5 h-5 text-red-500 opacity-50" />} 
              />
              
              <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-4 mt-2">
                 <div className="bg-[#1e0f0f] border border-cyan-500/20 p-4 rounded text-center">
                    <p className="text-[10px] text-gray-400 tracking-widest mb-1">MEDIAN P(FAULT) - P50</p>
                    <p className="text-xl font-bold text-cyan-400">{simulationData.percentiles.p50}%</p>
                 </div>
                 <div className="bg-[#1e0f0f] border border-red-500/20 p-4 rounded text-center">
                    <p className="text-[10px] text-gray-400 tracking-widest mb-1">WORST CASE - P95</p>
                    <p className="text-xl font-bold text-red-500">{simulationData.percentiles.p95}%</p>
                 </div>
              </div>
            </motion.div>
          ) : (
             <div className="flex flex-col items-center justify-center text-gray-600 h-full border border-dashed border-red-500/10 rounded">
               <Dices className="w-10 h-10 mb-2 opacity-30" />
               <p className="text-[10px] tracking-widest uppercase font-mono">Awaiting Simulation Trigger</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string, value: string, color: string, icon: React.ReactNode }) {
  return (
    <div className="bg-[#1e0f0f] border border-red-500/10 p-4 rounded relative overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <p className="text-[9px] text-gray-400 tracking-[0.2em] uppercase">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}