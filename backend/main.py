from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pandas as pd
import numpy as np
import io
from typing import Dict


from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, roc_curve, auc
)

import google.generativeai as genai
import json
import os
from dotenv import load_dotenv
from typing import List, Dict, Optional, Any

load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "YOUR_API_KEY_HERE"))

gemini_model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI(title="DYNAMO ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app_state = {
    "df": None,
    "model": None,
    "scaler": None,
    "feature_cols": [],
    "target_col": None
}

class TrainRequest(BaseModel):
    feature_cols: List[str]
    target_col: str
    test_size: float = 0.20


class PredictRequest(BaseModel):
    features: Dict[str, float]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    live_context: Optional[Dict[str, Any]] = None

@app.get("/")
def read_root():
    return {"status": "DYNAMO API is running"}

@app.post("/api/upload")
async def upload_dataset(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        if df.empty:
            raise HTTPException(status_code=400, detail="Dataset is empty")
            
        app_state["df"] = df
        
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        missing_readings = int(df.isnull().sum().sum())
        
        return {
            "message": "Dataset uploaded successfully",
            "rows": df.shape[0],
            "columns": df.shape[1],
            "numeric_columns": numeric_cols,
            "missing_readings": missing_readings
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/train")
def train_model(request: TrainRequest):
    df = app_state["df"]
    
    if df is None:
        raise HTTPException(status_code=400, detail="No dataset uploaded. Please upload a CSV first.")
    
    for col in request.feature_cols + [request.target_col]:
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found in dataset.")
            
    X = df[request.feature_cols].copy()
    y = df[request.target_col].copy()
    
    mask = X.notna().all(axis=1) & y.notna()
    X, y = X[mask], y[mask]
    
    if len(X) < 10:
        raise HTTPException(status_code=400, detail="Insufficient cycles — need 10+ clean records.")
        
    strat = y if y.nunique() == 2 else None
    
    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=request.test_size, random_state=42, stratify=strat
    )
    
    sc_obj = StandardScaler()
    X_tr_s = sc_obj.fit_transform(X_tr)
    X_te_s = sc_obj.transform(X_te)
    
    mdl = LogisticRegression(max_iter=1000, random_state=42)
    mdl.fit(X_tr_s, y_tr)
    
    yp = mdl.predict(X_te_s)
    ypr = mdl.predict_proba(X_te_s)[:, 1]
    
    app_state.update({
        "model": mdl,
        "scaler": sc_obj,
        "feature_cols": request.feature_cols,
        "target_col": request.target_col
    })
    
    acc = accuracy_score(y_te, yp)
    prec = precision_score(y_te, yp, zero_division=0)
    rec = recall_score(y_te, yp, zero_division=0)
    f1 = f1_score(y_te, yp, zero_division=0)
    
    cm = confusion_matrix(y_te, yp).tolist()
    fpr_v, tpr_v, _ = roc_curve(y_te, ypr)
    rocauc = auc(fpr_v, tpr_v)
    
    coefs = mdl.coef_[0].tolist()
    feature_importance = [
        {
            "parameter": f, 
            "weight": abs(c), 
            "role": "FAULT DRIVER" if c > 0 else "FAULT SUPPRESSOR", 
            "raw_coef": c
        }
        for f, c in zip(request.feature_cols, coefs)
    ]
    feature_importance = sorted(feature_importance, key=lambda x: x["weight"], reverse=True)
    mean_prob = float(np.mean(ypr))
    
    return {
        "message": "ARMATURE CHARGED — Logistic regression coefficients computed.",
        "metrics": {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1_score": f1,
            "auc": rocauc,
            "mean_prob": mean_prob
        },
        "confusion_matrix": cm,
        "roc_curve": {
            "fpr": fpr_v.tolist(),
            "tpr": tpr_v.tolist()
        },
        "feature_importance": feature_importance
    }

@app.post("/api/predict")
def predict_live(request: PredictRequest):
    if app_state["model"] is None:
        raise HTTPException(status_code=400, detail="Model is not trained yet. Please run /api/train first.")
        
    feature_cols = app_state["feature_cols"]
    
    missing = [col for col in feature_cols if col not in request.features]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing feature values: {missing}")
        
    input_df = pd.DataFrame([request.features], columns=feature_cols)
    
    sc_obj = app_state["scaler"]
    mdl = app_state["model"]
    
    X_scaled = sc_obj.transform(input_df)
    pred_class = int(mdl.predict(X_scaled)[0])
    pred_proba = float(mdl.predict_proba(X_scaled)[0][1])
    risk_pct = pred_proba * 100
    
    health_pct = max(0.0, 1.0 - pred_proba) * 100
    rul_cycles = int(max(0.0, 1.0 - pred_proba) * 9500 * (1 - pred_proba * 0.4))
    rul_days = round(rul_cycles * 0.25 / 24, 1)

    contributions = X_scaled[0] * mdl.coef_[0]
    top_feature_idx = int(np.argmax(contributions))
    top_driver = feature_cols[top_feature_idx]
    
    if risk_pct < 40:
        state = "ok"
        label = "HEALTHY — WINDING WITHIN RATED LIMITS"
    elif risk_pct < 70:
        state = "warn"
        label = "CAUTION — DEGRADATION DETECTED"
    else:
        state = "fault"
        label = "CRITICAL — IMMINENT FAILURE"

    prompt = f"""
    You are an expert industrial motor diagnostic AI. Analyze the following live sensor data and Machine Learning risk prediction to generate a highly technical, specific maintenance report.

    LIVE SENSOR DATA:
    {json.dumps(request.features, indent=2)}

    ML PREDICTION DATA:
    - Failure Risk: {risk_pct:.1f}%
    - Status: {state.upper()}
    - Estimated Remaining Useful Life (RUL): {rul_cycles} cycles ({rul_days} days)
    - Primary Anomaly Driver: {top_driver}

    Provide your response as a strict JSON object with exactly these three string keys. Do not use markdown blocks, just return raw JSON:
    "summary": A 2-sentence executive summary of the motor's health and exactly what the remaining life is.
    "cause": The specific engineering root cause for this risk level based on the sensor values provided.
    "remedies": Specific, actionable maintenance steps to take right now to resolve the issue.
    """

    try:
        response = gemini_model.generate_content(prompt)
        ai_text = response.text.strip()
        
        if ai_text.startswith("```json"):
            ai_text = ai_text[7:-3].strip()
        elif ai_text.startswith("```"):
            ai_text = ai_text[3:-3].strip()
            
        ai_data = json.loads(ai_text)
        cause = ai_data.get("cause", "Analysis unavailable.")
        remedies = ai_data.get("remedies", "Standard maintenance advised.")
        summary = ai_data.get("summary", f"Risk level at {risk_pct:.1f}%.")
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        cause = f"System flagged anomalous {top_driver.upper()} readings."
        remedies = "Inspect motor parameters manually. API generation failed."
        summary = f"Motor risk level at {risk_pct:.1f}% with {rul_days} days RUL."

    return {
        "inputs": request.features,
        "prediction": pred_class,
        "probability": pred_proba,
        "risk_percentage": risk_pct,
        "state": state,
        "label": label,
        "live_health": {
            "health_pct": health_pct,
            "rul_cycles": rul_cycles,
            "rul_days": rul_days,
            "top_driver": top_driver,
            "cause": cause,
            "remedies": remedies,
            "summary": summary
        }
    }

@app.get("/api/scenarios")
def generate_monte_carlo():
    if app_state["model"] is None:
        raise HTTPException(status_code=400, detail="Model is not trained yet.")
        
    df = app_state["df"]
    fcols = app_state["feature_cols"]
    sc_obj = app_state["scaler"]
    mdl = app_state["model"]
    
    mc_n = 5000
    np.random.seed(42)
    mc_samples = np.zeros((mc_n, len(fcols)))
    
    for j, col in enumerate(fcols):
        mu_c = float(df[col].mean())
        sig_c = float(df[col].std()) * 0.5
        mc_samples[:, j] = np.clip(
            np.random.normal(mu_c, sig_c, mc_n),
            float(df[col].min()), float(df[col].max())
        )
        
    mc_scaled = sc_obj.transform(mc_samples)
    mc_probs = mdl.predict_proba(mc_scaled)[:, 1]
    
    healthy_pct = round(float(np.mean(mc_probs < 0.40)) * 100, 1)
    caution_pct = round(float(np.mean((mc_probs >= 0.40) & (mc_probs < 0.70))) * 100, 1)
    critical_pct = round(float(np.mean(mc_probs >= 0.70)) * 100, 1)
    p50 = round(float(np.percentile(mc_probs, 50)) * 100, 1)
    p95 = round(float(np.percentile(mc_probs, 95)) * 100, 1)
    
    return {
        "runs": mc_n,
        "distribution": {
            "healthy_pct": healthy_pct,
            "caution_pct": caution_pct,
            "critical_pct": critical_pct
        },
        "percentiles": {
            "p50": p50,
            "p95": p95
        }
    }

@app.post("/api/chat")
def chat_assistant(request: ChatRequest):
    if app_state["model"] is None:
        raise HTTPException(status_code=400, detail="Please train the model first so the AI has context.")

    features = ", ".join(app_state["feature_cols"])
    
    system_prompt = f"""
    You are DYNAMO, an expert industrial AI assistant specializing in predictive maintenance for electric motors.
    You are analyzing a motor model trained on the following sensor parameters: {features}.
    Always answer in a highly technical, concise, engineering tone. Refer to IEC 60034 and NEMA MG-1 standards when applicable.
    """

    if request.live_context:
        system_prompt += f"""
        \n\nCURRENT LIVE MOTOR STATUS (The user just scanned this data):
        {json.dumps(request.live_context, indent=2)}
        
        Use this specific data to answer any questions about the current motor state, Remaining Useful Life (RUL), sensor inputs, or root causes. If the user asks "Why is my risk high?" or "What is my current RPM?", answer using this JSON.
        """

    formatted_messages = [
        {"role": "user", "parts": [system_prompt]},
        {"role": "model", "parts": ["Understood. DYNAMO AI online. I have ingested the current motor telemetry and am ready to assist."]}
    ]
    
    for msg in request.messages:
        role = "user" if msg.role == "user" else "model"
        formatted_messages.append({"role": role, "parts": [msg.content]})

    try:
        response = gemini_model.generate_content(formatted_messages)
        return {"reply": response.text}
    except Exception as e:
        print(f"Chat API Error: {e}")
        raise HTTPException(status_code=500, detail="AI communication offline. Check API key.")