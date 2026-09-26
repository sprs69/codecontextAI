# CodeContext AI

**Intelligent Codebase Intelligence Platform for Distributed Software Teams**

> IBM BOB 2.0 Hackathon Project

CodeContext AI analyzes a software repository and creates persistent engineering context for architecture understanding, architectural guardrails, PR pre-review, technical decision summaries, and developer onboarding.

---

## Features

| Feature | Description |
|---------|-------------|
| **Repository Analyzer** | Upload ZIP or point to a local path — detects languages, frameworks, dependencies, patterns |
| **Architecture View** | Visual component map with layered diagram and detected design patterns |
| **Guardrails** | Automated detection of architectural violations with fix suggestions |
| **PR Intelligence** | Paste a diff, get risk score, violations, reviewer questions, and suggested tests |
| **Decision Memory** | Track technical decisions manually or extract them from text |
| **Onboarding** | Generate personalized day-by-day onboarding plans based on role and skill level |
| **Health Dashboard** | Architecture health, test coverage, dependency risk, technical debt indicators |

---

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Python + FastAPI
- **Database**: SQLite (via SQLAlchemy)
- **Analysis**: Custom Python analyzers

---

## Quick Start

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --port 8000
```

> Run from the project root directory (`bob 2.0/`):
> ```bash
> python -m uvicorn backend.main:app --reload --port 8000
> ```

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:5173** and the backend at **http://localhost:8000**.

### 3. Load Demo Data

Click **"Load Demo Repository"** on the Dashboard to populate the app with the ShopFlow Platform demo — no external repository needed.

---

## Demo Repository

The built-in demo simulates **ShopFlow Platform**, a realistic eCommerce application containing:

- FastAPI + React + SQLAlchemy + Redux stack
- Authentication service (JWT)
- Payment processing (Stripe)
- Background tasks (Celery + Redis)
- Repository pattern for data access
- 15 dependencies (runtime + dev)
- 6 detected architecture patterns
- 5 guardrail violations (3 HIGH, 2 MEDIUM)
- 3 technical decisions
- 1 intentionally problematic PR (`checkout endpoint`)

---

## API Documentation

FastAPI auto-generates API docs at:

- **Swagger UI**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

### Sample API Requests

#### Load Demo Repository
```bash
curl -X POST http://localhost:8000/api/repository/demo
```

#### Analyze a Local Repository
```bash
curl -X POST http://localhost:8000/api/repository/analyze \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/your/repo"}'
```

#### Get Architecture Components
```bash
curl http://localhost:8000/api/architecture/{repo_id}/components
```

#### Get Guardrail Violations
```bash
curl http://localhost:8000/api/guardrails/{repo_id}/violations
```

#### Analyze a PR Diff
```bash
curl -X POST http://localhost:8000/api/pr/analyze \
  -H "Content-Type: application/json" \
  -d '{"repository_id": "REPO_ID", "diff_content": "diff --git a/file.py..."}'
```

#### Get Demo PR Analysis
```bash
curl http://localhost:8000/api/pr/demo
```

#### Create a Technical Decision
```bash
curl -X POST http://localhost:8000/api/decisions/{repo_id} \
  -H "Content-Type: application/json" \
  -d '{"title": "Use JWT", "chosen_approach": "JWT tokens", "reasoning": "Stateless auth"}'
```

#### Extract Decision from Text
```bash
curl -X POST http://localhost:8000/api/decisions/{repo_id}/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Decision: Use JWT for auth. Reason: We need stateless auth."}'
```

#### Generate Onboarding Plan
```bash
curl -X POST http://localhost:8000/api/onboarding/generate \
  -H "Content-Type: application/json" \
  -d '{"repository_id": "REPO_ID", "developer_role": "backend", "skill_level": "mid", "known_technologies": ["Python"]}'
```

#### Get Repository Health
```bash
curl http://localhost:8000/api/health/{repo_id}
```

---

## Project Structure

```
bob 2.0/
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── api/                 # Route handlers
│   │   ├── repository.py
│   │   ├── architecture.py
│   │   ├── guardrails.py
│   │   ├── pr_intelligence.py
│   │   ├── decisions.py
│   │   ├── onboarding.py
│   │   └── health.py
│   ├── services/            # Business logic
│   │   ├── repository_service.py
│   │   ├── decision_service.py
│   │   └── onboarding_service.py
│   ├── analyzers/           # Code analysis engines
│   │   ├── repo_scanner.py
│   │   ├── guardrail_analyzer.py
│   │   └── pr_analyzer.py
│   ├── models/              # Data models
│   │   ├── db_models.py     # SQLAlchemy ORM
│   │   └── schemas.py       # Pydantic schemas
│   ├── database/            # DB connection
│   │   └── connection.py
│   └── data/                # Demo dataset
│       └── demo_data.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Root component + routing
│   │   ├── index.css        # Design system
│   │   ├── services/api.js  # API layer
│   │   └── pages/           # All page components
│   ├── index.html
│   └── package.json
└── README.md
```

---

## License

Hackathon project — IBM BOB 2.0
