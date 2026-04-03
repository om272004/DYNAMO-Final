"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Activity, BarChart3, Crosshair } from "lucide-react";

const Plot = dynamic(() => import("react-plotly.js"), { 
  ssr: false 
}) as React.ComponentType<any>;

interface DiagnosticsProps {
  data: any; 
}

export default function ModelDiagnostics({ data }: DiagnosticsProps) {
  if (!data) return null;

  const { metrics, confusion_matrix, roc_curve, feature_importance } = data;

  const layoutTheme = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(22,10,10,0.5)",
    font: { family: "monospace", color: "#8a7070", size: 10 },
    margin: { l: 40, r: 20, t: 40, b: 40 },
    xaxis: { gridcolor: "rgba(220,38,38,0.1)", zerolinecolor: "rgba(220,38,38,0.2)" },
    yaxis: { gridcolor: "rgba(220,38,38,0.1)", zerolinecolor: "rgba(220,38,38,0.2)" }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-red-500/20">
        <span className="bg-red-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm tracking-widest">S08</span>
        <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase">Diagnostic Performance Metrics</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="DETECTION ACCURACY" value={metrics.accuracy} color="text-red-500" barColor="bg-red-500" />
        <KPICard label="FAULT PRECISION" value={metrics.precision} color="text-orange-500" barColor="bg-orange-500" />
        <KPICard label="FAULT RECALL" value={metrics.recall} color="text-cyan-400" barColor="bg-cyan-400" />
        <KPICard label="F1 HARMONIC SCORE" value={metrics.f1_score} color="text-green-500" barColor="bg-green-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#160a0a] border border-red-500/20 p-4 rounded-md shadow-lg">
          <h3 className="text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
            <Crosshair className="w-3 h-3 text-red-500" /> Confusion Matrix
          </h3>
          <div className="h-[280px] w-full">
            <Plot
              data={[
                {
                  z: confusion_matrix,
                  x: ["Healthy (Pred)", "Fault (Pred)"],
                  y: ["Healthy (True)", "Fault (True)"],
                  type: "heatmap",
                  colorscale: [[0, "#0e0606"], [0.5, "rgba(220,38,38,0.38)"], [1, "#dc2626"]],
                  showscale: false,
                  text: confusion_matrix.map((row: any) => row.map(String)),
                  texttemplate: "%{text}",
                  hoverinfo: "z"
                }
              ]}
              layout={{ ...layoutTheme, margin: { l: 80, r: 20, t: 20, b: 40 } }}
              useResizeHandler={true}
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false }}
            />
          </div>
        </div>

        <div className="bg-[#160a0a] border border-red-500/20 p-4 rounded-md shadow-lg">
          <h3 className="text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
            <Activity className="w-3 h-3 text-red-500" /> ROC Curve (AUC: {metrics.auc.toFixed(3)})
          </h3>
          <div className="h-[280px] w-full">
            <Plot
              data={[
                {
                  x: roc_curve.fpr,
                  y: roc_curve.tpr,
                  type: "scatter",
                  mode: "lines",
                  name: "Model",
                  line: { color: "#dc2626", width: 2.5 },
                  fill: "tozeroy",
                  fillcolor: "rgba(220,38,38,0.05)"
                },
                {
                  x: [0, 1],
                  y: [0, 1],
                  type: "scatter",
                  mode: "lines",
                  name: "Random",
                  line: { color: "rgba(100,60,60,0.5)", width: 1, dash: "dot" }
                }
              ]}
              layout={{ ...layoutTheme, showlegend: false }}
              useResizeHandler={true}
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-red-500/20">
          <span className="bg-red-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm tracking-widest">S09</span>
          <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase">Parameter Fault Driver Ranking</h2>
        </div>
        
        <div className="bg-[#160a0a] border border-red-500/20 p-4 rounded-md shadow-lg">
           <h3 className="text-[10px] text-gray-400 tracking-[0.2em] uppercase mb-4 flex items-center gap-2">
            <BarChart3 className="w-3 h-3 text-red-500" /> Logistic Regression Coefficients
          </h3>
          <div className="h-[300px] w-full">
            <Plot
              data={[
                {
                  x: feature_importance.map((f: any) => f.weight).reverse(), // Reverse for bottom-to-top layout
                  y: feature_importance.map((f: any) => f.parameter).reverse(),
                  type: "bar",
                  orientation: "h",
                  marker: {
                    color: feature_importance.map((f: any) => f.role === "FAULT DRIVER" ? "#dc2626" : "#22c55e").reverse(),
                  },
                  text: feature_importance.map((f: any) => f.role).reverse(),
                  textposition: "inside",
                  insidetextanchor: "middle",
                  textfont: { color: "white", size: 10 }
                }
              ]}
              layout={{ 
                ...layoutTheme, 
                margin: { l: 120, r: 20, t: 20, b: 40 }, // Extra left margin for labels
                barmode: "group"
              }}
              useResizeHandler={true}
              style={{ width: "100%", height: "100%" }}
              config={{ displayModeBar: false }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function KPICard({ label, value, color, barColor }: { label: string, value: number, color: string, barColor: string }) {
  const percentage = (value * 100).toFixed(1);
  return (
    <div className="bg-[#1e0f0f] border border-red-500/20 p-4 rounded-md relative overflow-hidden group hover:border-red-500/50 transition-colors">
      <div className="text-[9px] text-gray-400 tracking-[0.2em] uppercase mb-2">{label}</div>
      <div className={`text-3xl font-bold font-sans tracking-wide ${color} drop-shadow-[0_0_12px_currentColor]`}>{percentage}%</div>
      <div className="h-1 bg-[#341c1c] rounded-full mt-3 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }} 
          animate={{ width: `${percentage}%` }} 
          transition={{ duration: 1, delay: 0.2 }}
          className={`h-full ${barColor}`} 
        />
      </div>
    </div>
  );
}