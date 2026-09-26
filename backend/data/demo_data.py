"""
Built-in demo dataset for CodeContext AI hackathon demonstration.
This provides a realistic eCommerce platform repository simulation.
"""

DEMO_ANALYSIS_RESULT = {
    "project_name": "ShopFlow Platform",
    "languages": [
        {"name": "Python", "percentage": 45.2, "files": 38},
        {"name": "TypeScript", "percentage": 32.1, "files": 27},
        {"name": "SQL", "percentage": 10.3, "files": 8},
        {"name": "YAML", "percentage": 7.1, "files": 6},
        {"name": "Markdown", "percentage": 5.3, "files": 4},
    ],
    "frameworks": ["FastAPI", "React", "SQLAlchemy", "pytest", "Vite", "Redux"],
    "directories": [
        "src/api/routes",
        "src/api/middleware",
        "src/services",
        "src/repositories",
        "src/models",
        "src/frontend/components",
        "src/frontend/pages",
        "src/frontend/store",
        "src/auth",
        "tests/unit",
        "tests/integration",
        "migrations",
        "docs",
    ],
    "important_files": [
        "src/api/main.py",
        "src/api/routes/users.py",
        "src/api/routes/orders.py",
        "src/api/routes/products.py",
        "src/services/auth_service.py",
        "src/services/order_service.py",
        "src/services/payment_service.py",
        "src/repositories/user_repository.py",
        "src/repositories/order_repository.py",
        "src/models/user.py",
        "src/models/order.py",
        "src/auth/jwt_handler.py",
        "src/auth/middleware.py",
        "requirements.txt",
        "package.json",
        "docker-compose.yml",
        "alembic.ini",
    ],
    "dependencies": [
        {"name": "fastapi", "version": "0.104.0", "type": "runtime"},
        {"name": "sqlalchemy", "version": "2.0.23", "type": "runtime"},
        {"name": "alembic", "version": "1.12.1", "type": "runtime"},
        {"name": "pyjwt", "version": "2.8.0", "type": "runtime"},
        {"name": "bcrypt", "version": "4.0.1", "type": "runtime"},
        {"name": "stripe", "version": "7.3.0", "type": "runtime"},
        {"name": "celery", "version": "5.3.4", "type": "runtime"},
        {"name": "redis", "version": "5.0.1", "type": "runtime"},
        {"name": "react", "version": "18.2.0", "type": "runtime"},
        {"name": "redux", "version": "4.2.1", "type": "runtime"},
        {"name": "axios", "version": "1.6.0", "type": "runtime"},
        {"name": "pytest", "version": "7.4.3", "type": "dev"},
        {"name": "pytest-asyncio", "version": "0.21.1", "type": "dev"},
        {"name": "black", "version": "23.10.1", "type": "dev"},
        {"name": "mypy", "version": "1.6.1", "type": "dev"},
    ],
    "architecture_components": [
        {
            "name": "API Layer",
            "type": "api",
            "path": "src/api",
            "description": "FastAPI REST endpoints handling all HTTP requests",
            "files": [
                "src/api/main.py",
                "src/api/routes/users.py",
                "src/api/routes/orders.py",
                "src/api/routes/products.py",
                "src/api/routes/payments.py",
            ],
            "dependencies": ["Services Layer", "Auth Layer"],
        },
        {
            "name": "Services Layer",
            "type": "service",
            "path": "src/services",
            "description": "Business logic layer containing all domain operations",
            "files": [
                "src/services/auth_service.py",
                "src/services/order_service.py",
                "src/services/payment_service.py",
                "src/services/inventory_service.py",
                "src/services/notification_service.py",
            ],
            "dependencies": ["Repository Layer", "External APIs"],
        },
        {
            "name": "Repository Layer",
            "type": "backend",
            "path": "src/repositories",
            "description": "Data access layer encapsulating all database interactions",
            "files": [
                "src/repositories/user_repository.py",
                "src/repositories/order_repository.py",
                "src/repositories/product_repository.py",
            ],
            "dependencies": ["Database"],
        },
        {
            "name": "Auth Layer",
            "type": "service",
            "path": "src/auth",
            "description": "JWT authentication and authorization middleware",
            "files": [
                "src/auth/jwt_handler.py",
                "src/auth/middleware.py",
                "src/auth/permissions.py",
            ],
            "dependencies": ["Repository Layer"],
        },
        {
            "name": "Frontend SPA",
            "type": "frontend",
            "path": "src/frontend",
            "description": "React/Redux single page application",
            "files": [
                "src/frontend/App.tsx",
                "src/frontend/pages/Dashboard.tsx",
                "src/frontend/pages/Orders.tsx",
                "src/frontend/store/index.ts",
                "src/frontend/components/ProductCard.tsx",
            ],
            "dependencies": ["API Layer"],
        },
        {
            "name": "PostgreSQL Database",
            "type": "database",
            "path": "migrations",
            "description": "Primary relational database with Alembic migrations",
            "files": [
                "migrations/versions/001_initial.py",
                "migrations/versions/002_add_orders.py",
                "migrations/env.py",
            ],
            "dependencies": [],
        },
        {
            "name": "Redis Cache",
            "type": "external",
            "path": None,
            "description": "Session cache and Celery message broker",
            "files": [],
            "dependencies": [],
        },
        {
            "name": "Stripe Payment API",
            "type": "external",
            "path": None,
            "description": "Third-party payment processing integration",
            "files": ["src/services/payment_service.py"],
            "dependencies": [],
        },
        {
            "name": "Task Queue (Celery)",
            "type": "service",
            "path": "src/tasks",
            "description": "Async task processing for emails and background jobs",
            "files": [
                "src/tasks/email_tasks.py",
                "src/tasks/report_tasks.py",
            ],
            "dependencies": ["Redis Cache", "Services Layer"],
        },
    ],
    "detected_patterns": [
        {
            "name": "Repository Pattern",
            "description": "Data access abstracted behind repository interfaces",
            "confidence": 0.92,
            "files": ["src/repositories/user_repository.py", "src/repositories/order_repository.py"],
        },
        {
            "name": "Service Layer Pattern",
            "description": "Business logic encapsulated in dedicated service classes",
            "confidence": 0.88,
            "files": ["src/services/order_service.py", "src/services/auth_service.py"],
        },
        {
            "name": "JWT Authentication",
            "description": "Stateless token-based authentication using JWT",
            "confidence": 0.97,
            "files": ["src/auth/jwt_handler.py", "src/auth/middleware.py"],
        },
        {
            "name": "Event-Driven Async Tasks",
            "description": "Background task processing via Celery + Redis queue",
            "confidence": 0.84,
            "files": ["src/tasks/email_tasks.py"],
        },
        {
            "name": "RESTful API Design",
            "description": "Resource-oriented HTTP API following REST conventions",
            "confidence": 0.91,
            "files": ["src/api/routes/users.py", "src/api/routes/orders.py"],
        },
        {
            "name": "Database Migration Management",
            "description": "Versioned schema migrations via Alembic",
            "confidence": 0.95,
            "files": ["alembic.ini", "migrations/env.py"],
        },
    ],
    "potential_risks": [
        {
            "name": "Tight Database Coupling in API Routes",
            "description": "Some API routes bypass the service layer and access the database directly",
            "severity": "HIGH",
            "files": ["src/api/routes/users.py", "src/api/routes/orders.py"],
        },
        {
            "name": "Missing Input Validation",
            "description": "Several API endpoints lack proper request body validation",
            "severity": "HIGH",
            "files": ["src/api/routes/products.py"],
        },
        {
            "name": "Hardcoded Configuration Values",
            "description": "Database connection strings and secrets found in source files",
            "severity": "MEDIUM",
            "files": ["src/api/main.py", "src/services/payment_service.py"],
        },
        {
            "name": "No Rate Limiting",
            "description": "API endpoints have no rate limiting which could lead to abuse",
            "severity": "MEDIUM",
            "files": ["src/api/routes/users.py"],
        },
        {
            "name": "Outdated Dependency",
            "description": "stripe package is one major version behind latest",
            "severity": "LOW",
            "files": ["requirements.txt"],
        },
    ],
    "total_files": 83,
    "total_lines": 12847,
    "health_score": 71,
}

DEMO_GUARDRAIL_VIOLATIONS = [
    {
        "rule": "API routes must not directly access the database",
        "severity": "HIGH",
        "file_path": "src/api/routes/users.py",
        "line_number": 47,
        "explanation": (
            "The /users/profile endpoint directly instantiates a SQLAlchemy session and runs "
            "a query, bypassing the established repository and service layers. This violates "
            "the architectural separation of concerns defined in this codebase."
        ),
        "suggested_fix": (
            "Move the database query to UserRepository.get_by_id() and call it through "
            "UserService.get_profile(). The route should only call the service method and "
            "return the response."
        ),
    },
    {
        "rule": "API routes must not directly access the database",
        "severity": "HIGH",
        "file_path": "src/api/routes/orders.py",
        "line_number": 112,
        "explanation": (
            "The POST /orders endpoint creates an Order ORM object directly in the route "
            "handler and commits it to the session. Payment processing logic is also embedded "
            "inline. This creates tight coupling and makes the code untestable."
        ),
        "suggested_fix": (
            "Extract order creation into OrderService.create_order() and delegate payment "
            "processing to PaymentService.process(). The route handler should orchestrate "
            "service calls, not contain business logic."
        ),
    },
    {
        "rule": "API routes must validate all input using Pydantic schemas",
        "severity": "HIGH",
        "file_path": "src/api/routes/products.py",
        "line_number": 23,
        "explanation": (
            "The POST /products endpoint accepts a raw dict from request.json() without "
            "validating against a Pydantic schema. This means malformed payloads reach the "
            "service layer and could cause runtime exceptions or data corruption."
        ),
        "suggested_fix": (
            "Create a ProductCreateRequest Pydantic model with field validations and use it "
            "as the route's request body type. FastAPI will automatically validate incoming "
            "requests and return 422 errors for invalid data."
        ),
    },
    {
        "rule": "Secrets must not be hardcoded in source files",
        "severity": "MEDIUM",
        "file_path": "src/api/main.py",
        "line_number": 8,
        "explanation": (
            "DATABASE_URL contains a connection string with credentials hardcoded as a string "
            "literal. This secret will be committed to version control and exposed to everyone "
            "with repository access."
        ),
        "suggested_fix": (
            "Use os.getenv('DATABASE_URL') or python-dotenv to load this from environment "
            "variables. Add DATABASE_URL to .env.example (without values) and ensure .env "
            "is in .gitignore."
        ),
    },
    {
        "rule": "Services must not bypass other services to access external APIs",
        "severity": "MEDIUM",
        "file_path": "src/services/order_service.py",
        "line_number": 89,
        "explanation": (
            "OrderService directly imports and calls the Stripe SDK instead of delegating "
            "to PaymentService. This duplicates payment logic and means order tests must "
            "mock Stripe directly."
        ),
        "suggested_fix": (
            "Inject PaymentService as a dependency into OrderService and call "
            "payment_service.charge_customer(). This keeps Stripe integration isolated "
            "in one place."
        ),
    },
]

DEMO_DECISIONS = [
    {
        "title": "Use JWT for Stateless Authentication",
        "context": (
            "The ShopFlow platform needs to support multiple frontend clients (web, mobile) "
            "and potentially third-party integrations. Session-based auth would require "
            "sticky sessions or a shared session store."
        ),
        "problem": (
            "How to authenticate API requests across multiple clients without requiring "
            "server-side session storage that creates operational complexity."
        ),
        "chosen_approach": (
            "Implement JWT (JSON Web Tokens) with access tokens (15 min TTL) and refresh "
            "tokens (7 day TTL) stored in HttpOnly cookies. Token validation happens in "
            "FastAPI middleware."
        ),
        "alternatives": [
            "Session-based auth with Redis store",
            "OAuth2 via third-party provider (Auth0)",
            "API key authentication",
        ],
        "reasoning": (
            "JWT allows stateless validation without a database lookup on every request. "
            "The short access token TTL limits exposure if compromised. HttpOnly cookies "
            "prevent XSS token theft. This pattern is well-understood by the team."
        ),
        "affected_components": [
            "src/auth/jwt_handler.py",
            "src/auth/middleware.py",
            "src/api/routes/users.py",
            "src/frontend/store/auth.ts",
        ],
        "status": "active",
    },
    {
        "title": "Celery + Redis for Background Task Processing",
        "context": (
            "Order confirmation emails, invoice generation, and inventory restock alerts "
            "must not block the HTTP response. Initial implementation processed these "
            "synchronously causing request timeouts."
        ),
        "problem": (
            "Long-running operations (email sending, PDF generation, 3rd party API calls) "
            "were blocking API responses for 3-8 seconds."
        ),
        "chosen_approach": (
            "Introduce Celery as the task queue with Redis as the message broker. Tasks are "
            "dispatched asynchronously after the HTTP response is returned. Worker processes "
            "run in separate Docker containers."
        ),
        "alternatives": [
            "FastAPI BackgroundTasks (lightweight, but no retry/monitoring)",
            "AWS SQS + Lambda (adds cloud vendor dependency)",
            "Database polling pattern (simple but inefficient)",
        ],
        "reasoning": (
            "Celery provides retry logic, task monitoring via Flower, and horizontal scaling. "
            "Redis was already in the stack as a cache layer. The team had prior Celery "
            "experience reducing ramp-up time. AWS SQS was rejected to avoid cloud lock-in "
            "at this stage."
        ),
        "affected_components": [
            "src/tasks/email_tasks.py",
            "src/tasks/report_tasks.py",
            "src/services/notification_service.py",
            "docker-compose.yml",
        ],
        "status": "active",
    },
    {
        "title": "Repository Pattern for Database Abstraction",
        "context": (
            "Early development had SQLAlchemy queries scattered across API routes and service "
            "files. This made testing difficult and created multiple places where the same "
            "query logic was duplicated."
        ),
        "problem": (
            "Database queries were coupled to business logic making unit testing impossible "
            "without a live database. Query changes required updates in multiple files."
        ),
        "chosen_approach": (
            "Introduce a dedicated repository layer (UserRepository, OrderRepository, etc.) "
            "that encapsulates all database interactions. Services receive repository instances "
            "via dependency injection."
        ),
        "alternatives": [
            "Active Record pattern (ORM objects contain query logic)",
            "Direct ORM queries in services (simpler, less abstraction)",
            "CQRS with separate read/write models",
        ],
        "reasoning": (
            "Repository pattern enables unit testing services with mock repositories. "
            "Centralizes query optimization. Makes a future database swap (e.g., to async "
            "driver) a contained change. CQRS was rejected as over-engineering for current scale."
        ),
        "affected_components": [
            "src/repositories/user_repository.py",
            "src/repositories/order_repository.py",
            "src/repositories/product_repository.py",
            "src/services/",
        ],
        "status": "active",
    },
]

DEMO_PR_DIFF = """diff --git a/src/api/routes/orders.py b/src/api/routes/orders.py
index a3f2c1d..b8e4f22 100644
--- a/src/api/routes/orders.py
+++ b/src/api/routes/orders.py
@@ -1,8 +1,12 @@
 from fastapi import APIRouter, Depends, HTTPException
-from sqlalchemy.orm import Session
-from backend.database import get_db
+from sqlalchemy.orm import Session
+from backend.database import get_db
+import stripe
+import os
 from typing import Optional
 
 router = APIRouter(prefix="/orders", tags=["orders"])
 
+STRIPE_KEY = "DEMO_STRIPE_KEY_REDACTED"  # TODO: move to env
+
@@ -45,6 +49,28 @@ def get_order(order_id: str, db: Session = Depends(get_db)):
     return db.query(Order).filter(Order.id == order_id).first()
 
+
+@router.post("/checkout")
+async def checkout(request: dict, db: Session = Depends(get_db)):
+    # Get cart items directly from DB
+    user_id = request.get("user_id")
+    items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
+    
+    if not items:
+        raise HTTPException(status_code=400, detail="Cart empty")
+    
+    total = sum(item.price * item.quantity for item in items)
+    
+    # Process payment inline
+    stripe.api_key = STRIPE_KEY
+    payment = stripe.PaymentIntent.create(
+        amount=int(total * 100),
+        currency="usd",
+    )
+    
+    # Create order directly
+    order = Order(user_id=user_id, total=total, status="pending")
+    db.add(order)
+    db.commit()
+    
+    return {"order_id": order.id, "payment_intent": payment.id}
"""

DEMO_PR_ANALYSIS = {
    "pr_title": "feat: Add checkout endpoint with Stripe payment",
    "risk_score": 87,
    "risk_level": "CRITICAL",
    "changed_components": [
        "API Layer (src/api/routes/orders.py)",
        "Payment Processing",
        "Database Access Pattern",
    ],
    "violations": [
        {
            "file": "src/api/routes/orders.py",
            "line": 61,
            "rule": "API routes must not directly access the database",
            "severity": "HIGH",
            "description": "Checkout route queries CartItem and creates Order directly via SQLAlchemy session",
            "explanation": "Bypasses the repository/service layer by executing database queries and commits directly inside the route handler.",
            "suggested_fix": "Delegate queries to OrderRepository and coordinate persistence via OrderService."
        },
        {
            "file": "src/api/routes/orders.py",
            "line": 53,
            "rule": "Secrets must not be hardcoded in source files",
            "severity": "CRITICAL",
            "description": "Live Stripe secret key (sk_live_*) hardcoded as a string literal — this WILL be committed to version control",
            "explanation": "Stripe API credentials committed directly to source code expose payment infrastructure to unauthorized operations.",
            "suggested_fix": "Remove hardcoded secret; load from os.getenv('STRIPE_SECRET_KEY') and add to .env.example."
        },
        {
            "file": "src/api/routes/orders.py",
            "line": 65,
            "rule": "Payment processing must go through PaymentService",
            "severity": "HIGH",
            "description": "Stripe SDK called directly in route handler instead of delegating to PaymentService",
            "explanation": "Direct inline calls to external payment providers couple transport handlers to provider-specific SDKs.",
            "suggested_fix": "Move Stripe calls into PaymentService and inject it as a dependency."
        },
        {
            "file": "src/api/routes/orders.py",
            "line": 50,
            "rule": "API routes must validate all input using Pydantic schemas",
            "severity": "HIGH",
            "description": "Route accepts raw dict instead of a typed Pydantic model — no input validation",
            "explanation": "Untyped dict parameters bypass schema validation, allowing malformed or malicious payload injections.",
            "suggested_fix": "Create a CheckoutRequest Pydantic model with user_id and cart_id validation."
        },
    ],
    "reviewer_questions": [
        "Why is the Stripe live key hardcoded? Has this already been committed anywhere?",
        "Where is the order fulfillment / inventory deduction logic? Is that missing?",
        "What happens if the Stripe call succeeds but the DB commit fails? Is this idempotent?",
        "Are there any tests for the checkout flow?",
        "Why does this bypass OrderService and PaymentService?",
        "Is there any retry logic if the payment intent creation fails?",
        "How does the frontend know which order ID to poll for status?",
    ],
    "suggested_fixes": [
        "Move STRIPE_KEY to environment variable: os.getenv('STRIPE_SECRET_KEY')",
        "Create CheckoutRequest Pydantic model with user_id and cart_id validation",
        "Delegate DB queries to OrderRepository.get_cart_items(user_id)",
        "Delegate payment processing to PaymentService.create_payment_intent(amount)",
        "Delegate order creation to OrderService.create_from_cart(user_id, payment_intent_id)",
        "Wrap payment + order creation in a transaction with rollback on failure",
        "Add unit tests mocking PaymentService and OrderService",
    ],
    "tests_to_add": [
        "test_checkout_success: Mock PaymentService and OrderService, verify orchestration",
        "test_checkout_empty_cart: Verify 400 response for empty cart",
        "test_checkout_payment_failure: Verify order is not created if payment fails",
        "test_checkout_invalid_input: Verify 422 for missing required fields",
        "test_checkout_db_failure: Verify payment is not double-charged on retry",
    ],
}
