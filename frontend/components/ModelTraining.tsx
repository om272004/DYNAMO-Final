"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Cpu, Target, SlidersHorizontal, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ModelTrainingProps {
  numericColumns: string[];
  onTrainSuccess: (metrics: any) => void;
}

export default function ModelTraining({ numericColumns, onTrainSuccess }: ModelTrainingProps) {
  const [featureCols, setFeatureCols] = useState<string[]>([]);
  const [targetCol, setTargetCol] = useState<string>("");
  const [testSize, setTestSize] = useState<number>(0.2);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (numericColumns.length > 1) {
      setFeatureCols(numericColumns.slice(0, -1));
      setTargetCol(numericColumns[numericColumns.length - 1]);
    }
  }, [numericColumns]);

  const toggleFeature = (col: string) => {
    if (col === targetCol) return; 
    setFeatureCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleTrain = async () => {
    if (featureCols.length === 0) {
      setError("Please select at least one feature parameter.");
      return;
    }
    
    setIsTraining(true);
    setError(null);

    try {
      const response = await axios.post("http://localhost:8000/api/train", {
        feature_cols: featureCols,
        target_col: targetCol,
        test_size: testSize
      });
      
      onTrainSuccess(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Training sequence failed.");
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="bg-[#160a0a] border border-red-500/20 p-6 rounded-md shadow-lg">
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-red-500/20">
        <div className="flex items-center gap-2">
          <span className="bg-red-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm tracking-widest">S05</span>
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase">Fault Detector Configuration</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <label className="flex items-center gap-2 text-[10px] text-gray-400 tracking-widest uppercase mb-3">
            <Cpu className="w-3 h-3 text-red-500" /> Motor Feature Parameters
          </label>
          <div className="flex flex-wrap gap-2">
            {numericColumns.map(col => {
              const isSelected = featureCols.includes(col);
              const isTarget = col === targetCol;
              return (
                <button
                  key={col}
                  disabled={isTarget}
                  onClick={() => toggleFeature(col)}
                  className={`text-[10px] font-mono px-3 py-1.5 rounded transition-all ${
                    isTarget ? "opacity-30 cursor-not-allowed bg-gray-800 border-gray-700" :
                    isSelected 
                      ? "bg-red-500/20 border border-red-500 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.2)]" 
                      : "bg-[#1e0f0f] border border-red-500/20 text-gray-400 hover:border-red-500/50"
                  }`}
                >
                  {col}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-[10px] text-gray-400 tracking-widest uppercase mb-3">
              <Target className="w-3 h-3 text-red-500" /> Fault Label (Target)
            </label>
            <select 
              value={targetCol}
              onChange={(e) => {
                const newTarget = e.target.value;
                setTargetCol(newTarget);
                setFeatureCols(prev => prev.filter(c => c !== newTarget));
              }}
              className="w-full bg-[#1e0f0f] border border-red-500/30 text-red-400 text-sm font-mono p-2 rounded outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              {numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center justify-between text-[10px] text-gray-400 tracking-widest uppercase mb-3">
              <span className="flex items-center gap-2"><SlidersHorizontal className="w-3 h-3 text-red-500" /> Holdout Test Ratio</span>
              <span className="text-red-400 font-bold">{Math.round(testSize * 100)}%</span>
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="0.4" 
              step="0.05" 
              value={testSize} 
              onChange={(e) => setTestSize(parseFloat(e.target.value))}
              className="w-full accent-red-600 h-1 bg-red-950 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 text-red-400 text-xs font-mono bg-red-500/10 p-3 rounded border border-red-500/20 mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      <div className="pt-4 border-t border-red-500/20">
        <button
          onClick={handleTrain}
          disabled={isTraining || featureCols.length === 0}
          className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-red-700 to-red-600 hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[12px] tracking-[0.3em] uppercase rounded transition-all shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3"
        >
          {isTraining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Cpu className="w-5 h-5" />}
          {isTraining ? "Charging Armature..." : "Fire Training Sequence"}
        </button>
      </div>
    </div>
  );
}