"use client";

import { useState } from "react";
import { Activity, Settings, Zap } from "lucide-react";
import { motion } from "framer-motion";
import FileUpload from "@/components/FileUpload";
import ModelTraining from "@/components/ModelTraining";
import ModelDiagnostics from "@/components/ModelDiagnostics";
import LiveFaultScan from "@/components/LiveFaultScan";
import MonteCarloSimulation from "@/components/MonteCarloSimulation";
import MachineHealthReport from "@/components/MachineHealthReport";
import DiagnosticAssistant from "@/components/DiagnosticAssistant";

export default function Dashboard() {
  const [datasetStats, setDatasetStats] = useState<any>(null);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  const [liveResult, setLiveResult] = useState<any>(null);

  return (
    <main className="min-h-screen p-6 max-w-[1600px] mx-auto font-mono">
      <header className="flex items-center justify-between border-b-2 border-red-600 bg-[#0e0606] p-4 mb-8 shadow-[0_0_30px_rgba(220,38,38,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent animate-[bg_vscn_11s_linear_infinite]" />
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full border-2 border-red-500/50 flex items-center justify-center bg-gradient-to-tr from-red-600 to-orange-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
            <Zap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-[0.2em] text-white drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
              DYNAMO
            </h1>
            <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-1">
              Motor Intelligence Platform · IEC 60034
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        <div className="xl:col-span-1 space-y-6">
          <div className="bg-[#160a0a] border border-red-500/20 p-4 rounded-md shadow-lg">
            <h2 className="text-sm font-bold tracking-widest text-white mb-4 border-b border-red-500/20 pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-red-500" />
              OPERATOR PANEL
            </h2>
            <FileUpload onUploadSuccess={setDatasetStats} />
          </div>
        </div>

        <div className="xl:col-span-3 space-y-6">

          {datasetStats ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              <MetricTile label="OPERATING CYCLES" value={datasetStats.rows.toLocaleString()} color="text-red-500" barColor="bg-red-500" />
              <MetricTile label="SENSOR CHANNELS" value={datasetStats.columns} color="text-cyan-400" barColor="bg-cyan-400" />
              <MetricTile label="MISSING READINGS" value={datasetStats.missing_readings} color={datasetStats.missing_readings > 0 ? "text-orange-500" : "text-green-500"} barColor={datasetStats.missing_readings > 0 ? "bg-orange-500" : "bg-green-500"} />
              <MetricTile label="STATUS" value="READY" color="text-green-500" barColor="bg-green-500" />
            </motion.div>
          ) : (
            <div className="bg-[#160a0a] border border-red-500/20 p-6 rounded-md min-h-[300px] flex items-center justify-center shadow-lg">
              <div className="text-center">
                <Activity className="w-12 h-12 text-red-500/50 mx-auto mb-4 animate-pulse" />
                <p className="text-sm text-gray-400 tracking-widest">ARMATURE STANDBY — AWAITING DATA INGESTION</p>
              </div>
            </div>
          )}

          {datasetStats && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <ModelTraining
                numericColumns={datasetStats.numeric_columns}
                onTrainSuccess={(data) => setModelMetrics(data)}
              />
            </motion.div>
          )}

          {modelMetrics && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <ModelDiagnostics data={modelMetrics} />
            </motion.div>
          )}

          {modelMetrics && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="mt-6 border-t-2 border-dashed border-red-500/20 pt-6">
              <MonteCarloSimulation />
            </motion.div>
          )}

          {modelMetrics && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-6 border-t-2 border-dashed border-red-500/20 pt-6">
              <LiveFaultScan
                featureCols={modelMetrics.feature_importance.map((f: any) => f.parameter)}
                onScanComplete={(result) => setLiveResult(result)} // <--- MUST PASS THIS
              />
            </motion.div>
          )}

          {modelMetrics && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-6 border-t-2 border-dashed border-red-500/20 pt-6">
              <MachineHealthReport liveData={liveResult} /> {/* <--- MUST PASS liveResult HERE */}
            </motion.div>
          )}
        </div>
      </div>
      {modelMetrics && <DiagnosticAssistant liveData={liveResult} />}
    </main>
  );
}

function MetricTile({ label, value, color, barColor }: { label: string, value: string | number, color: string, barColor: string }) {
  return (
    <div className="bg-[#1e0f0f] border border-red-500/20 p-4 rounded-md relative overflow-hidden group hover:border-red-500/50 transition-colors">
      <div className="text-[9px] text-gray-400 tracking-[0.2em] uppercase mb-2">{label}</div>
      <div className={`text-3xl font-bold font-sans tracking-wide ${color} drop-shadow-[0_0_12px_currentColor]`}>{value}</div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-[#341c1c]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 1, delay: 0.3 }}
          className={`h-full ${barColor} opacity-70`}
        />
      </div>
    </div>
  );
}