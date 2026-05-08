"""
model.py — Risk prediction, loan decision, SHAP explanation
Financial Risk Scoring System for Indian SMEs
"""

import joblib
import shap
import numpy as np
import os
import warnings

warnings.filterwarnings("ignore")

# ── Constants ──────────────────────────────────────────────────────────────────

FEATURES = [
    "business_age",
    "industry_type",
    "num_employees",
    "city_tier",
    "annual_revenue",
    "gst_consistency",
    "existing_debt",
    "upi_volume",
    "utility_payment",
    "loan_amount",
    "loan_duration",
]

FEATURE_DISPLAY_NAMES = {
    "business_age":     "Business Age",
    "industry_type":    "Industry Type",
    "num_employees":    "Number of Employees",
    "city_tier":        "City Tier",
    "annual_revenue":   "Annual Revenue",
    "gst_consistency":  "GST Filing Consistency",
    "existing_debt":    "Existing Debt",
    "upi_volume":       "UPI Transaction Volume",
    "utility_payment":  "Utility Bill Payment",
    "loan_amount":      "Loan Amount Requested",
    "loan_duration":    "Loan Duration",
}

RISK_LABELS = {0: "Low", 1: "Medium", 2: "High"}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "model.pkl")

# ── Model Loading ──────────────────────────────────────────────────────────────

_model = None
_explainer = None


def _load_model():
    global _model, _explainer
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        _explainer = shap.TreeExplainer(_model)
    return _model, _explainer


# ── Loan Decision Logic ────────────────────────────────────────────────────────

def _loan_decision(risk_label: str, requested_amount: float) -> dict:
    """
    Returns approval status, suggested loan amount, and interest rate range
    based on the predicted risk label.
    """
    if risk_label == "Low":
        pct = np.random.uniform(0.90, 1.00)
        interest_min, interest_max = 8.0, 10.0
        status = "Approved"
    elif risk_label == "Medium":
        pct = np.random.uniform(0.50, 0.70)
        interest_min, interest_max = 12.0, 15.0
        status = "Partial"
    else:  # High
        pct = np.random.uniform(0.00, 0.30)
        interest_min, interest_max = 18.0, 20.0
        status = "Rejected"

    suggested_amount = round(requested_amount * pct, -3)   # round to nearest 1000
    interest_rate = round(np.random.uniform(interest_min, interest_max), 2)

    return {
        "approval_status": status,
        "suggested_loan_amount": suggested_amount,
        "suggested_loan_pct": round(pct * 100, 1),
        "interest_rate": interest_rate,
        "interest_range": f"{interest_min:.0f}–{interest_max:.0f}%",
    }


# ── SHAP Explanation ───────────────────────────────────────────────────────────

def _shap_explanation(explainer, input_array: np.ndarray, predicted_class: int) -> list:
    """
    Returns top-5 SHAP feature contributions for the predicted risk class.

    Each item: {"feature": str, "impact": "positive"|"negative", "strength": "high"|"medium"|"low"}
    """
    # shap_values shape: (n_samples, n_features, n_classes)
    shap_values = explainer.shap_values(input_array)          # (1, 11, 3)
    class_shap = shap_values[0, :, predicted_class]           # (11,)

    # Rank by absolute magnitude, take top 5
    top_indices = np.argsort(np.abs(class_shap))[::-1][:5]

    max_abs = np.abs(class_shap).max() or 1.0

    explanation = []
    for idx in top_indices:
        raw = float(class_shap[idx])
        relative = abs(raw) / max_abs

        strength = "high" if relative > 0.6 else ("medium" if relative > 0.3 else "low")
        impact   = "positive" if raw > 0 else "negative"

        explanation.append({
            "feature":  FEATURE_DISPLAY_NAMES[FEATURES[idx]],
            "impact":   impact,
            "strength": strength,
            "shap_value": round(raw, 4),
        })

    return explanation


# ── EMI Calculator ─────────────────────────────────────────────────────────────

def calculate_emi(principal: float, annual_rate: float, months: int) -> dict:
    """
    Standard reducing-balance EMI formula.
    Returns monthly EMI, total payment, and total interest.
    """
    if annual_rate == 0:
        emi = principal / months
    else:
        r = annual_rate / (12 * 100)
        emi = principal * r * (1 + r) ** months / ((1 + r) ** months - 1)

    total_payment  = round(emi * months, 2)
    total_interest = round(total_payment - principal, 2)

    return {
        "emi":            round(emi, 2),
        "total_payment":  total_payment,
        "total_interest": total_interest,
        "principal":      principal,
        "months":         months,
        "annual_rate":    annual_rate,
    }


# ── Main Predict Function ──────────────────────────────────────────────────────

def predict(input_data: dict) -> dict:
    """
    Full prediction pipeline.

    Parameters
    ----------
    input_data : dict with keys matching FEATURES (11 features)

    Returns
    -------
    dict with keys:
        risk_label, risk_score (0-100), confidence,
        approval_status, suggested_loan_amount, suggested_loan_pct,
        interest_rate, interest_range,
        emi_details, explanation
    """
    model, explainer = _load_model()

    # Build ordered feature array
    input_array = np.array([[float(input_data[f]) for f in FEATURES]])

    # ── Prediction ──────────────────────────────────────────────────
    risk_class  = int(model.predict(input_array)[0])
    risk_label  = RISK_LABELS[risk_class]
    proba       = model.predict_proba(input_array)[0]           # shape (3,)
    confidence  = round(float(proba[risk_class]) * 100, 2)

    # Risk score: weighted sum — Low→0-33, Medium→34-66, High→67-100
    # Anchored to the probability distribution for a nuanced score
    risk_score = round(
        (proba[0] * 0 + proba[1] * 50 + proba[2] * 100), 1
    )

    # ── Loan Decision ────────────────────────────────────────────────
    loan_info = _loan_decision(risk_label, float(input_data["loan_amount"]))

    # ── EMI ──────────────────────────────────────────────────────────
    emi_details = calculate_emi(
        principal   = loan_info["suggested_loan_amount"],
        annual_rate = loan_info["interest_rate"],
        months      = int(input_data["loan_duration"]),
    )

    # ── SHAP Explanation ─────────────────────────────────────────────
    explanation = _shap_explanation(explainer, input_array, risk_class)

    return {
        "risk_label":            risk_label,
        "risk_score":            risk_score,
        "confidence":            confidence,
        "class_probabilities": {
            "Low":    round(float(proba[0]) * 100, 2),
            "Medium": round(float(proba[1]) * 100, 2),
            "High":   round(float(proba[2]) * 100, 2),
        },
        "approval_status":       loan_info["approval_status"],
        "suggested_loan_amount": loan_info["suggested_loan_amount"],
        "suggested_loan_pct":    loan_info["suggested_loan_pct"],
        "interest_rate":         loan_info["interest_rate"],
        "interest_range":        loan_info["interest_range"],
        "emi_details":           emi_details,
        "explanation":           explanation,
    }
