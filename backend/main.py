"""
main.py — FastAPI application for SME Financial Risk Scoring System
Run: uvicorn backend.main:app --reload  (from project root)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import Optional
import sys, os

sys.path.append(os.path.dirname(__file__))
from model import predict, calculate_emi

app = FastAPI(
    title="SME Financial Risk Scoring API",
    description="Risk assessment and loan decision engine for Indian SMEs",
    version="1.0.0",
)

# ── CORS (allow frontend on any localhost port during hackathon) ───────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response Schemas ────────────────────────────────────────────────

class PredictRequest(BaseModel):
    # Business Profile
    business_age:    float = Field(..., ge=0,   le=100,  description="Years in operation")
    industry_type:   int   = Field(..., ge=0,   le=4,    description="0=Retail,1=Mfg,2=Services,3=Food,4=Textile")
    num_employees:   int   = Field(..., ge=1,   le=5000, description="Headcount")
    city_tier:       int   = Field(..., ge=1,   le=3,    description="1=Metro,2=Tier2,3=Tier3")

    # Financials
    annual_revenue:  float = Field(..., ge=0,            description="Annual revenue in INR")
    gst_consistency: float = Field(..., ge=0,   le=100,  description="GST filing % (0-100)")
    existing_debt:   float = Field(..., ge=0,            description="Current outstanding debt in INR")
    upi_volume:      float = Field(..., ge=0,            description="Monthly UPI transaction volume in INR")
    utility_payment: int   = Field(..., ge=0,   le=2,    description="0=Poor,1=Average,2=Good")

    # Loan Request
    loan_amount:     float = Field(..., gt=0,            description="Requested loan amount in INR")
    loan_duration:   int   = Field(..., ge=3,   le=120,  description="Repayment period in months")


class EMIRequest(BaseModel):
    principal:    float = Field(..., gt=0,          description="Loan principal in INR")
    annual_rate:  float = Field(..., ge=0, le=40,   description="Annual interest rate %")
    months:       int   = Field(..., ge=1, le=360,  description="Tenure in months")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "SME Risk Scoring API is running 🚀"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


@app.post("/predict", tags=["Prediction"])
def predict_risk(req: PredictRequest):
    """
    Full risk assessment pipeline.

    Returns risk label, confidence, loan decision, EMI breakdown,
    and SHAP-based risk explanation.
    """
    try:
        result = predict(req.dict())
        return {"success": True, "data": result}
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="Model file not found. Run notebooks/train.ipynb first.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/emi-calculate", tags=["EMI"])
def emi_calculate(principal: float, annual_rate: float, months: int):
    """
    Standalone EMI calculator.
    GET /emi-calculate?principal=1000000&annual_rate=10.5&months=24
    """
    if principal <= 0 or months <= 0:
        raise HTTPException(status_code=400, detail="principal and months must be positive")
    if not (0 <= annual_rate <= 40):
        raise HTTPException(status_code=400, detail="annual_rate must be between 0 and 40")

    result = calculate_emi(principal=principal, annual_rate=annual_rate, months=months)
    return {"success": True, "data": result}


@app.get("/model-info", tags=["Meta"])
def model_info():
    """Returns feature list and encoding guide."""
    return {
        "features": [
            {"name": "business_age",    "type": "numeric",      "unit": "years"},
            {"name": "industry_type",   "type": "encoded int",  "mapping": {"Retail":0,"Manufacturing":1,"Services":2,"Food":3,"Textile":4}},
            {"name": "num_employees",   "type": "numeric",      "unit": "count"},
            {"name": "city_tier",       "type": "encoded int",  "mapping": {"Tier1":1,"Tier2":2,"Tier3":3}},
            {"name": "annual_revenue",  "type": "numeric",      "unit": "INR"},
            {"name": "gst_consistency", "type": "numeric",      "unit": "percent"},
            {"name": "existing_debt",   "type": "numeric",      "unit": "INR"},
            {"name": "upi_volume",      "type": "numeric",      "unit": "INR/month"},
            {"name": "utility_payment", "type": "encoded int",  "mapping": {"Poor":0,"Average":1,"Good":2}},
            {"name": "loan_amount",     "type": "numeric",      "unit": "INR"},
            {"name": "loan_duration",   "type": "numeric",      "unit": "months"},
        ],
        "risk_labels":     {"0":"Low","1":"Medium","2":"High"},
        "approval_logic":  {
            "Low":    "Approved — 90-100% of requested, 8-10% interest",
            "Medium": "Partial — 50-70% of requested, 12-15% interest",
            "High":   "Rejected — 0-30% max, 18-20% interest",
        }
    }
