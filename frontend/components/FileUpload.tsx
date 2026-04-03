"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { UploadCloud, CheckCircle, AlertTriangle, Loader2, Database } from "lucide-react";
import { motion } from "framer-motion";

interface FileUploadProps {
  onUploadSuccess: (stats: any) => void;
}

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      onUploadSuccess(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to upload dataset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#160a0a] border border-red-500/20 p-5 rounded-md shadow-lg">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-red-500/20">
        <span className="bg-red-600 text-black font-bold text-[10px] px-2 py-0.5 rounded-sm tracking-widest">S01</span>
        <h2 className="text-sm font-bold tracking-[0.2em] text-gray-200 uppercase">Motor Data Ingestion</h2>
      </div>

      {!success ? (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-md p-6 text-center transition-all ${file ? "border-orange-500 bg-orange-500/5" : "border-red-500/30 hover:border-red-500/60 hover:bg-red-500/5"
              }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
              }
            }}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${file ? "text-orange-500" : "text-gray-500"}`} />

            {file ? (
              <div className="text-sm text-orange-400 font-mono break-all">{file.name}</div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 font-mono mb-2">Drag & Drop motor CSV here</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[10px] tracking-widest uppercase bg-[#1e0f0f] border border-red-500/30 text-red-400 px-4 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"
                >
                  Browse Files
                </button>
              </div>
            )}
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 text-red-400 text-xs font-mono bg-red-500/10 p-2 rounded border border-red-500/20">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-[#1e0f0f] disabled:text-gray-500 disabled:border-red-500/20 disabled:cursor-not-allowed text-white font-bold text-[11px] tracking-[0.2em] uppercase py-3 rounded transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] disabled:shadow-none"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {loading ? "Ingesting..." : "Load Motor Dataset"}
          </button>
        </div>
      ) : (
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-green-500/10 border border-green-500/30 p-4 rounded text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-green-400 text-xs font-mono mb-1 tracking-wider">FLUX CONNECTED</p>
          <p className="text-gray-400 text-[10px] font-mono">Dataset loaded into DYNAMO memory bank.</p>
          <button
            onClick={() => { setFile(null); setSuccess(false); }}
            className="mt-4 text-[10px] tracking-widest uppercase text-gray-500 hover:text-white transition-colors border-b border-dashed border-gray-600"
          >
            Load Different File
          </button>
        </motion.div>
      )}
    </div>
  );
}