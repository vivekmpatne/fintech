# CreditBridge AI — SME Financial Risk Scoring System

An AI-powered fintech platform that helps evaluate financial risk for Small and Medium Enterprises (SMEs) using Machine Learning and Explainable AI.

Built during the Code Forge 2.0 — 8 Hour Hackathon at RNS Institute of Technology.

---

## Problem Statement

Many SMEs struggle to obtain fair loan approvals due to:
- Limited credit history
- Manual risk assessment
- Lack of transparent decision-making
- Traditional scoring systems relying heavily on collateral

CreditBridge AI provides a faster, explainable, and data-driven lending assessment system.

---

## Features

### AI-Based Risk Prediction
Predicts SME financial risk as:
- Low Risk
- Medium Risk
- High Risk

Using:
- Random Forest Classifier
- Financial + behavioural indicators

---

### Explainable AI (SHAP)
Provides transparent reasoning behind predictions using:
- SHAP feature importance
- Positive & negative risk factors

---

### Loan Recommendation Engine
Generates:
- Loan approval status
- Suggested loan amount
- Interest rate recommendation
- Confidence score

---

### EMI Breakdown
Calculates:
- Monthly EMI
- Total interest payable
- Total repayment amount

---

### Modern Fintech Dashboard
Clean banking-style institutional UI built using:
- HTML
- CSS
- JavaScript

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | FastAPI |
| Machine Learning | Scikit-learn |
| Explainability | SHAP |
| Model Storage | Joblib |
| Environment | Conda + Jupyter |
| Deployment Ready | Uvicorn |

---

## ML Features Used

The model evaluates:
- Business Age
- Industry Type
- Number of Employees
- City Tier
- Annual Revenue
- GST Filing Consistency
- Existing Debt
- UPI Transaction Volume
- Utility Bill Payment History
- Loan Amount Requested
- Loan Duration

---

## Project Structure

```bash
project/
│
├── backend/
│   ├── main.py
│   ├── model.py
│
├── frontend/
│   ├── index.html
│   ├── result.html
│   ├── style.css
│   ├── script.js
│
├── models/
│   └── model.pkl
│
├── notebooks/
│   └── starter.ipynb
│
├── requirements.txt
└── environment.yml
```

---

## Getting Started

### Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/fintech.git
cd fintech
```

### Create Conda Environment

```bash
conda create -n hackathon python=3.11
conda activate hackathon
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Backend

```bash
uvicorn backend.main:app --reload
```

Backend:
```text
http://127.0.0.1:8000
```

Swagger Docs:
```text
http://127.0.0.1:8000/docs
```

### Run Frontend

Open:
```text
frontend/index.html
```

---

## Sample Outputs

- Risk Score Dashboard
- EMI Analysis
- SHAP Risk Explanation
- Loan Approval Recommendation

---

## Future Improvements

- Real banking API integrations
- GST verification APIs
- Fraud detection system
- OCR document verification
- Multilingual support
- Cloud deployment

---

## Team

Built by Team CreditBridge AI during Code Forge 2.0 Hackathon.

- Vivek Patne
- Prem Kumar
- Vishwas K
- Shiva R

---

## Acknowledgements

Special thanks to:
- RNS Institute of Technology
- Department of CSE (Data Science)
- IEEE Bangalore Section

---

## License

MIT License
