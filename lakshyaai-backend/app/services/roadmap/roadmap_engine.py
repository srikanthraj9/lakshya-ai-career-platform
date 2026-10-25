from __future__ import annotations

import logging
from typing import Any
from app.services.llm.client import llm_client

logger = logging.getLogger("lakshyaai.roadmap_engine")

ROLE_ROADMAPS: dict[str, dict[str, list[dict[str, Any]]]] = {
    "fullstack": {
        "beginner": [
            {
                "step": "Master Modern Web Foundations (HTML5, Modern CSS, Responsive Design)",
                "title": "Web Foundations & Responsive UI",
                "duration": "2 weeks",
                "stage": "Phase 1: Foundations",
                "skills": ["HTML5", "CSS3", "Flexbox/Grid", "Responsive Design", "Git"],
                "why_it_matters": "Every modern application interface relies on semantic structure and responsive layouts to ensure cross-device accessibility.",
                "prerequisites": ["Basic computer literacy", "Terminal fundamentals"],
                "beginner_friendly_explanation": "Think of HTML as the skeleton of a building, CSS as the interior design and paint, and responsive design as making sure it looks great on any screen size.",
                "practical_project": "Build and deploy a responsive personal developer portfolio with mobile-first CSS Grid and dark mode toggle.",
                "checklist": [
                    "Construct semantic HTML5 structure with proper headings and ARIA landmarks",
                    "Build responsive layouts using CSS Flexbox and Grid without UI frameworks",
                    "Implement CSS variables for dark/light theme switching",
                    "Version control your code with Git and deploy to GitHub Pages or Vercel",
                ],
                "resources": [
                    {"name": "MDN Web Development Tutorial", "url": "https://developer.mozilla.org/en-US/docs/Learn"},
                    {"name": "CSS Tricks Guide to Flexbox", "url": "https://css-tricks.com/snippets/css/a-guide-to-flexbox/"},
                    {"name": "Git & GitHub Crash Course", "url": "https://docs.github.com/en/get-started"},
                ],
            },
            {
                "step": "JavaScript Deep Dive & DOM Manipulation",
                "title": "JavaScript ES6+ & Dynamic UI",
                "duration": "3 weeks",
                "stage": "Phase 2: Core Programming",
                "skills": ["JavaScript (ES6+)", "Async/Await", "Fetch API", "DOM Events", "JSON"],
                "why_it_matters": "JavaScript brings web pages to life and forms the universal language for both client-side and server-side full stack development.",
                "prerequisites": ["HTML5 & CSS3 basics"],
                "beginner_friendly_explanation": "JavaScript is the engine of the web. It handles button clicks, communicates with servers in the background, and dynamically updates what users see.",
                "practical_project": "Build an interactive Recipe & Meal Planner app that searches public REST APIs, filters results, and persists favorites in localStorage.",
                "checklist": [
                    "Master ES6+ arrow functions, destructuring, spread/rest, and modules",
                    "Handle asynchronous operations cleanly using Promises and async/await",
                    "Fetch and render dynamic data from external REST APIs with error handling",
                    "Implement client-side search, filtering, and local data persistence",
                ],
                "resources": [
                    {"name": "JavaScript.info Comprehensive Tutorial", "url": "https://javascript.info/"},
                    {"name": "MDN Asynchronous JavaScript", "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous"},
                ],
            },
            {
                "step": "Frontend Framework Engineering with React & Tailwind CSS",
                "title": "React Component Architecture",
                "duration": "3 weeks",
                "stage": "Phase 3: Frontend Mastery",
                "skills": ["React 18", "Hooks (useState, useEffect, useMemo)", "Tailwind CSS", "Vite"],
                "why_it_matters": "React powers over 60% of modern web frontend codebases, allowing developers to build modular, maintainable, state-driven user interfaces.",
                "prerequisites": ["ES6+ JavaScript", "DOM & Event handling"],
                "beginner_friendly_explanation": "Instead of re-writing HTML, React lets you build reusable Lego bricks (components) that automatically update whenever their data changes.",
                "practical_project": "Create a Kanban Task Management Board with drag-and-drop, category tags, modal dialogs, and custom state hooks.",
                "checklist": [
                    "Scaffold modern React projects rapidly using Vite and Tailwind CSS",
                    "Break complex UI screens into reusable, single-responsibility components",
                    "Manage local component state and side effects with custom hooks",
                    "Integrate form validation and optimistic UI loading feedback",
                ],
                "resources": [
                    {"name": "React Official Learn Documentation", "url": "https://react.dev/learn"},
                    {"name": "Tailwind CSS Official Guide", "url": "https://tailwindcss.com/docs/installation"},
                ],
            },
            {
                "step": "Backend Development with Python FastAPI & PostgreSQL",
                "title": "Backend APIs & Database Systems",
                "duration": "3 weeks",
                "stage": "Phase 4: Backend Engineering",
                "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy ORM", "REST API Design"],
                "why_it_matters": "A full stack engineer must be able to design reliable server architectures, securely validate data, and model relational database schemas.",
                "prerequisites": ["Basic programming fundamentals", "HTTP status codes"],
                "beginner_friendly_explanation": "The backend is the kitchen of a restaurant: it prepares data, checks security permissions, and communicates with the database vault.",
                "practical_project": "Build an enterprise-ready E-commerce REST API with JWT authentication, product catalog, cart checkout, and PostgreSQL persistence.",
                "checklist": [
                    "Design clean RESTful endpoints adhering to HTTP verb and status standards",
                    "Validate request payloads and serialize responses using Pydantic models",
                    "Design normalized relational database schemas with foreign key relationships",
                    "Perform database migrations and indexing using SQLAlchemy and Alembic",
                ],
                "resources": [
                    {"name": "FastAPI Official Documentation", "url": "https://fastapi.tiangolo.com/tutorial/"},
                    {"name": "PostgreSQL Interactive Tutorial (SQLBolt)", "url": "https://sqlbolt.com/"},
                ],
            },
            {
                "step": "Full Stack Integration, Authentication & Cloud Deployment",
                "title": "Full Stack Assembly & CI/CD Deployment",
                "duration": "2 weeks",
                "stage": "Phase 5: Job-Ready Production",
                "skills": ["JWT Auth", "Docker", "CI/CD (GitHub Actions)", "Cloud Deployment (Render/Vercel)"],
                "why_it_matters": "Shipping working software to live users in a repeatable automated pipeline separates hobbyists from professional software engineers.",
                "prerequisites": ["React Frontend", "FastAPI Backend"],
                "beginner_friendly_explanation": "Connecting the pieces: the frontend talks to your secure backend, Docker packages it into a container, and GitHub Actions automatically ships it to the cloud.",
                "practical_project": "Deploy your complete Full Stack application to production with automated tests, Docker containers, and SSL certificate.",
                "checklist": [
                    "Implement secure JWT authentication flow with refresh tokens and HTTP-only cookies",
                    "Containerize both frontend and backend services using multi-stage Dockerfiles",
                    "Write an automated GitHub Actions workflow to run linting and unit tests on push",
                    "Deploy frontend to Vercel/Netlify and backend to Render/Fly.io with database connection",
                ],
                "resources": [
                    {"name": "Docker Getting Started Guide", "url": "https://docs.docker.com/get-started/"},
                    {"name": "GitHub Actions CI/CD Quickstart", "url": "https://docs.github.com/en/actions/quickstart"},
                ],
            },
        ],
        "intermediate": [
            {
                "step": "Type-Safe Full Stack Architecture with TypeScript & Next.js",
                "title": "TypeScript & Server-Side Rendering (Next.js)",
                "duration": "3 weeks",
                "stage": "Phase 1: Advanced Frontend",
                "skills": ["TypeScript", "Next.js (App Router)", "Server Components", "Tailwind CSS"],
                "why_it_matters": "TypeScript prevents 38% of production bugs through compile-time type verification, while Server Components maximize SEO and speed.",
                "prerequisites": ["React fundamentals", "JavaScript ES6+"],
                "beginner_friendly_explanation": "TypeScript adds guardrails to JavaScript so errors are caught as you type rather than crashing in the user's browser.",
                "practical_project": "Build an SEO-optimized SaaS Knowledge Base with Next.js App Router, Markdown rendering, and server actions.",
                "checklist": [
                    "Convert untyped codebases to strict TypeScript interfaces and generics",
                    "Leverage React Server Components and Server Actions for low-latency data fetching",
                    "Optimize Core Web Vitals (LCP, FID, CLS) and image delivery pipelines",
                    "Implement client and server caching strategies with revalidation tags",
                ],
                "resources": [
                    {"name": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/handbook/intro.html"},
                    {"name": "Next.js Documentation", "url": "https://nextjs.org/docs"},
                ],
            },
            {
                "step": "Scalable Backend Architecture & Relational Optimization",
                "title": "Scalable Backend & Query Optimization",
                "duration": "3 weeks",
                "stage": "Phase 2: Advanced Backend",
                "skills": ["Async FastAPI", "PostgreSQL Indexing", "Redis Caching", "Data Integrity"],
                "why_it_matters": "High-traffic systems degrade quickly without query indexing, connection pooling, and in-memory caching layers.",
                "prerequisites": ["FastAPI basics", "Basic SQL queries"],
                "beginner_friendly_explanation": "When thousands of users query the database at once, Redis acts as a high-speed memory desk and indexes act as an instant book index.",
                "practical_project": "Engineer a High-Concurrency Ticketing API with Redis locks, PostgreSQL transaction isolation, and sub-100ms response times.",
                "checklist": [
                    "Profile slow queries using EXPLAIN ANALYZE and apply composite B-tree indexes",
                    "Implement Redis caching with TTL for high-frequency database read operations",
                    "Protect critical financial/inventory operations with ACID database transactions",
                    "Implement rate limiting, CORS policies, and input sanitization middlewares",
                ],
                "resources": [
                    {"name": "Use The Index, Luke (SQL Indexing)", "url": "https://use-the-index-luke.com/"},
                    {"name": "Redis Documentation", "url": "https://redis.io/docs/latest/"},
                ],
            },
            {
                "step": "Asynchronous Background Processing & Event-Driven Workflows",
                "title": "Message Queues & Background Workers",
                "duration": "2 weeks",
                "stage": "Phase 3: Distributed Systems",
                "skills": ["Celery / BullMQ", "Redis / RabbitMQ", "WebSockets", "Task Scheduling"],
                "why_it_matters": "Heavy tasks (email delivery, PDF generation, AI processing) must be offloaded from request threads to avoid blocking users.",
                "prerequisites": ["Python / Node.js async concepts", "Redis basics"],
                "beginner_friendly_explanation": "Rather than making users stare at a loading spinner for 30 seconds while an invoice generates, a background worker handles it silently in the background.",
                "practical_project": "Build an Automated Document Processing Pipeline that accepts uploaded files, runs background OCR/AI extraction, and updates the client via WebSockets.",
                "checklist": [
                    "Configure distributed worker queues with Celery/RabbitMQ",
                    "Implement retry policies, dead-letter queues, and task deduplication",
                    "Stream real-time background task progress to the browser via WebSockets",
                    "Schedule recurring cron maintenance jobs and database backups",
                ],
                "resources": [
                    {"name": "Celery Distributed Task Queue", "url": "https://docs.celeryq.dev/en/stable/"},
                    {"name": "WebSocket API Guide", "url": "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API"},
                ],
            },
            {
                "step": "Automated Testing, Production CI/CD & Observability",
                "title": "Automated Testing, CI/CD & Monitoring",
                "duration": "2 weeks",
                "stage": "Phase 4: Reliability & Quality",
                "skills": ["Pytest / Jest", "Playwright E2E", "GitHub Actions", "Prometheus / Sentry"],
                "why_it_matters": "Industry leaders mandate >80% test coverage and automated rollback pipelines before shipping to production environments.",
                "prerequisites": ["Git", "Full stack application basics"],
                "beginner_friendly_explanation": "Automated tests act as 24/7 robotic inspectors verifying every feature works whenever you change code.",
                "practical_project": "Implement comprehensive test suites (unit, integration, E2E) with automatic GitHub Actions deployment checks and Sentry error alerting.",
                "checklist": [
                    "Write isolated unit tests for business logic and data transformers",
                    "Develop integration tests with ephemeral database containers using testcontainers",
                    "Build headless end-to-end browser tests with Playwright simulating user checkout",
                    "Integrate Sentry error monitoring and performance tracing into production build",
                ],
                "resources": [
                    {"name": "Playwright Testing Guide", "url": "https://playwright.dev/docs/intro"},
                    {"name": "Sentry Full Stack Tracing", "url": "https://docs.sentry.io/"},
                ],
            },
        ],
        "advanced": [
            {
                "step": "Distributed Systems Architecture & Microservices Boundaries",
                "title": "Enterprise System Architecture & Microservices",
                "duration": "3 weeks",
                "stage": "Phase 1: Architecture",
                "skills": ["Microservices", "Event-Driven Architecture", "Kafka / EventBridge", "Domain-Driven Design"],
                "why_it_matters": "Senior architects must design decoupled systems that scale horizontally across independent engineering teams and regions.",
                "prerequisites": ["Intermediate full stack architecture", "Advanced SQL"],
                "beginner_friendly_explanation": "Breaking a massive monolithic codebase into coordinated, autonomous services that communicate through immutable events.",
                "practical_project": "Architect an Event-Driven Order & Fulfillment Microservice system using Kafka event streaming and CQRS patterns.",
                "checklist": [
                    "Decompose monolithic domains into bounded contexts using Domain-Driven Design (DDD)",
                    "Design schema-validated event streams with Apache Kafka or AWS EventBridge",
                    "Handle distributed data consistency using Saga patterns and compensation transactions",
                    "Implement API Gateway pattern with token routing and rate-limiting",
                ],
                "resources": [
                    {"name": "Martin Fowler on Microservices", "url": "https://martinfowler.com/microservices/"},
                    {"name": "Azure Architecture Center Cloud Patterns", "url": "https://learn.microsoft.com/en-us/azure/architecture/patterns/"},
                ],
            },
            {
                "step": "Cloud Infrastructure as Code (Terraform) & Kubernetes Orchestration",
                "title": "Cloud Infrastructure (Terraform & Kubernetes)",
                "duration": "3 weeks",
                "stage": "Phase 2: Cloud Infrastructure",
                "skills": ["Terraform", "Kubernetes (K8s)", "AWS / GCP", "Zero-Downtime Deployments"],
                "why_it_matters": "Elite engineers automate their entire infrastructure using declarative code and zero-downtime rolling container deployments.",
                "prerequisites": ["Docker containerization", "Linux terminal mastery"],
                "beginner_friendly_explanation": "Instead of clicking buttons in AWS console, Terraform defines your entire cloud fleet in code files that can be spun up in minutes.",
                "practical_project": "Provision a complete multi-tier AWS infrastructure with Terraform and deploy an autoscaling Kubernetes cluster with Ingress controller.",
                "checklist": [
                    "Author reproducible infrastructure configurations using Terraform modules",
                    "Configure Kubernetes Deployments, Services, ConfigMaps, and Secrets",
                    "Implement Horizontal Pod Autoscaling (HPA) and rolling zero-downtime updates",
                    "Establish least-privilege IAM security policies and VPC network segmentation",
                ],
                "resources": [
                    {"name": "Terraform AWS Documentation", "url": "https://developer.hashicorp.com/terraform/tutorials"},
                    {"name": "Kubernetes Official Tutorials", "url": "https://kubernetes.io/docs/tutorials/"},
                ],
            },
            {
                "step": "High-Throughput Optimization & Site Reliability Engineering (SRE)",
                "title": "High-Throughput Performance & SRE",
                "duration": "2 weeks",
                "stage": "Phase 3: SRE & Reliability",
                "skills": ["OpenTelemetry", "Prometheus & Grafana", "Chaos Engineering", "SLIs/SLOs/SLAs"],
                "why_it_matters": "Ensures systems maintain 99.99% availability under massive traffic spikes with comprehensive observability and fast MTTR.",
                "prerequisites": ["Kubernetes basics", "Networking fundamentals"],
                "beginner_friendly_explanation": "SRE is the science of keeping mission-critical systems running through continuous monitoring, alerting, and stress-testing.",
                "practical_project": "Build an end-to-end Observability Dashboard with Prometheus metrics, OpenTelemetry distributed tracing, and automated alert paging.",
                "checklist": [
                    "Instrument distributed tracing across frontend and backend services with OpenTelemetry",
                    "Define Service Level Objectives (SLOs) and error budget alerts in Prometheus",
                    "Conduct load and stress testing using k6 to identify memory leaks and concurrency bottlenecks",
                    "Formulate disaster recovery, runbook automation, and incident post-mortem workflows",
                ],
                "resources": [
                    {"name": "Google Site Reliability Engineering Books", "url": "https://sre.google/books/"},
                    {"name": "OpenTelemetry Official Docs", "url": "https://opentelemetry.io/docs/"},
                ],
            },
        ],
    },
    "frontend": {
        "beginner": [
            {
                "step": "Master Modern Semantic HTML5, CSS3 & Responsive Layouts",
                "title": "HTML5, CSS3 & Responsive Design",
                "duration": "2 weeks",
                "stage": "Phase 1: Foundations",
                "skills": ["HTML5", "CSS3", "Flexbox", "Grid", "Web Accessibility (a11y)"],
                "why_it_matters": "Frontend engineers must build clean, accessible, standards-compliant user interfaces that render flawlessly across all devices.",
                "prerequisites": ["Computer basics"],
                "beginner_friendly_explanation": "HTML defines the content, CSS defines the presentation, and responsive design ensures it adapts to smartphones, tablets, and desktops.",
                "practical_project": "Design and build a responsive landing page with custom CSS Grid layout, dark mode toggle, and WCAG AA accessibility compliance.",
                "checklist": [
                    "Structure content using semantic HTML5 tags (header, nav, main, article, section)",
                    "Create responsive grid layouts with CSS Grid template areas and media queries",
                    "Ensure color contrast and keyboard navigation meet WCAG standards",
                    "Deploy the site via GitHub Pages or Netlify with automated preview builds",
                ],
                "resources": [
                    {"name": "MDN Learn Web Development", "url": "https://developer.mozilla.org/en-US/docs/Learn"},
                    {"name": "WebAIM Accessibility Checklist", "url": "https://webaim.org/standards/wcag/checklist"},
                ],
            },
            {
                "step": "JavaScript Deep Dive & Dynamic DOM Manipulation",
                "title": "Modern JavaScript ES6+ Fundamentals",
                "duration": "3 weeks",
                "stage": "Phase 2: JavaScript Mastery",
                "skills": ["JavaScript (ES6+)", "DOM Manipulation", "Event Bubbling", "Async/Await", "REST APIs"],
                "why_it_matters": "A deep understanding of raw JavaScript separates exceptional engineers from those who only know frameworks.",
                "prerequisites": ["HTML & CSS"],
                "beginner_friendly_explanation": "JavaScript allows your web pages to react to user actions, load new data in real time without refreshing, and animate UI elements.",
                "practical_project": "Build an interactive Weather & City Explorer app with live API data, autocomplete search, and local storage caching.",
                "checklist": [
                    "Master JavaScript data structures (Arrays, Sets, Maps, Objects) and array methods",
                    "Understand execution context, closures, and the JavaScript Event Loop",
                    "Fetch external REST API data with try/catch error handling and loading indicators",
                    "Handle debounced user input and keyboard shortcuts",
                ],
                "resources": [
                    {"name": "JavaScript.info Guide", "url": "https://javascript.info/"},
                    {"name": "MDN Asynchronous Programming", "url": "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous"},
                ],
            },
            {
                "step": "Component-Driven Architecture with React & Tailwind CSS",
                "title": "React Component Engineering",
                "duration": "3 weeks",
                "stage": "Phase 3: React Engineering",
                "skills": ["React 18", "Component State", "Hooks", "Tailwind CSS", "Vite"],
                "why_it_matters": "React is the standard for modern client applications, enabling modular code reuse and dynamic client-side rendering.",
                "prerequisites": ["JavaScript ES6+"],
                "beginner_friendly_explanation": "React allows you to package HTML, styling, and logic together into self-contained components like Cards, Buttons, and Modals.",
                "practical_project": "Create an E-Commerce Product Catalog with filterable categories, shopping cart state, and animated checkout modals.",
                "checklist": [
                    "Build reusable atomic components styled with Tailwind CSS utility classes",
                    "Manage state flow using useState, useEffect, and custom custom hooks",
                    "Optimize rendering performance and prevent unnecessary component re-renders",
                    "Implement client-side routing using React Router v6",
                ],
                "resources": [
                    {"name": "React Official Learn Guide", "url": "https://react.dev/learn"},
                    {"name": "Tailwind CSS Docs", "url": "https://tailwindcss.com/docs"},
                ],
            },
        ],
        "intermediate": [
            {
                "step": "Strict TypeScript Adoption & Type-Safe State Management",
                "title": "TypeScript & Robust State Architecture",
                "duration": "3 weeks",
                "stage": "Phase 1: Type Safety & State",
                "skills": ["TypeScript", "Zustand / Redux Toolkit", "TanStack Query", "Form Validation (Zod)"],
                "why_it_matters": "TypeScript and server state caching libraries ensure data integrity, instant cache invalidation, and zero runtime type crashes.",
                "prerequisites": ["React fundamentals"],
                "beginner_friendly_explanation": "TypeScript acts as a spell-checker for your code, and TanStack Query automatically caches and synchronizes server data in the background.",
                "practical_project": "Refactor a complex web app to TypeScript with TanStack Query caching, optimistic updates, and schema-validated forms.",
                "checklist": [
                    "Enforce strict TypeScript compiler rules across all components and API layers",
                    "Implement server-state synchronization with TanStack Query (caching, retries, optimistic UI)",
                    "Build complex multi-step forms validated with React Hook Form and Zod schemas",
                    "Manage global UI state cleanly with lightweight Zustand stores",
                ],
                "resources": [
                    {"name": "TypeScript Handbook", "url": "https://www.typescriptlang.org/docs/handbook/intro.html"},
                    {"name": "TanStack Query Docs", "url": "https://tanstack.com/query/latest/docs/framework/react/overview"},
                ],
            },
            {
                "step": "Frontend Performance Optimization & Core Web Vitals",
                "title": "Performance Optimization & Web Vitals",
                "duration": "2 weeks",
                "stage": "Phase 2: Performance Engineering",
                "skills": ["Core Web Vitals", "Code Splitting", "Lazy Loading", "Bundle Optimization", "Lighthouse"],
                "why_it_matters": "Every 100ms improvement in page speed increases conversion rates by 8%. Google directly ranks sites based on Core Web Vitals.",
                "prerequisites": ["React & TypeScript"],
                "beginner_friendly_explanation": "Optimizing how fast your app downloads, renders, and reacts when users tap or click on screen.",
                "practical_project": "Audit a sluggish web application with Chrome DevTools, eliminate layout shifts, and boost Lighthouse score from 50 to 95+.",
                "checklist": [
                    "Analyze bundle sizes with rollup-plugin-visualizer and apply dynamic imports",
                    "Optimize Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS)",
                    "Implement virtualization for massive data lists (TanStack Virtual)",
                    "Leverage modern image formats (AVIF/WebP) with responsive srcset attributes",
                ],
                "resources": [
                    {"name": "Web.dev Core Web Vitals Guide", "url": "https://web.dev/vitals/"},
                    {"name": "React Lazy & Code Splitting", "url": "https://react.dev/reference/react/lazy"},
                ],
            },
            {
                "step": "Automated Testing, Accessibility Auditing & Production CI/CD",
                "title": "Testing, Accessibility & Production Delivery",
                "duration": "2 weeks",
                "stage": "Phase 3: Quality & Delivery",
                "skills": ["Vitest", "React Testing Library", "Playwright E2E", "GitHub Actions CI"],
                "why_it_matters": "Top tech companies require automated test pipelines to prevent regressions and guarantee accessibility across all browsers.",
                "prerequisites": ["React & TypeScript"],
                "beginner_friendly_explanation": "Automated tests act as your safety net so you can ship new features rapidly with complete confidence.",
                "practical_project": "Build an end-to-end automated test suite with Vitest unit tests, Playwright visual regression tests, and CI/CD automation.",
                "checklist": [
                    "Write unit tests verifying user interaction and state updates with React Testing Library",
                    "Automate cross-browser end-to-end user journeys using Playwright",
                    "Automate accessibility testing in CI with axe-core",
                    "Set up automated preview deployments on pull requests with GitHub Actions",
                ],
                "resources": [
                    {"name": "React Testing Library Tutorial", "url": "https://testing-library.com/docs/react-testing-library/intro/"},
                    {"name": "Playwright Testing Framework", "url": "https://playwright.dev/"},
                ],
            },
        ],
        "advanced": [
            {
                "step": "Design System Architecture & Micro-Frontends",
                "title": "Enterprise Design Systems & Micro-Frontends",
                "duration": "3 weeks",
                "stage": "Phase 1: Architecture",
                "skills": ["Design Systems", "Storybook", "Figma Tokens", "Micro-Frontends", "Module Federation"],
                "why_it_matters": "Senior frontend architects define the design system tokens and component libraries consumed by dozens of product squads.",
                "prerequisites": ["Intermediate React & TypeScript"],
                "beginner_friendly_explanation": "Creating a unified UI operating system that all teams in an enterprise use to build cohesive applications.",
                "practical_project": "Architect an enterprise-grade component library documented in Storybook with automated visual regression tests.",
                "checklist": [
                    "Build token-driven accessible design system components in Storybook",
                    "Publish reusable npm packages with automated semantic versioning",
                    "Implement Webpack Module Federation or Vite micro-frontends for independent team deployments",
                    "Standardize linting, formatting, and commit standards across organizational repos",
                ],
                "resources": [
                    {"name": "Storybook Component Documentation", "url": "https://storybook.js.org/"},
                    {"name": "Atomic Design Principles", "url": "https://atomicdesign.bradfrost.com/"},
                ],
            },
            {
                "step": "Advanced App Observability & Client-Side Resilience",
                "title": "Client-Side Observability & Edge Rendering",
                "duration": "3 weeks",
                "stage": "Phase 2: Resilience & Scale",
                "skills": ["Real User Monitoring (RUM)", "Sentry Error Tracing", "Edge Functions", "Offline-First / PWA"],
                "why_it_matters": "Production applications must gracefully handle spotty mobile connections, offline scenarios, and provide instant error telemetry.",
                "prerequisites": ["Advanced TypeScript", "Service Workers"],
                "beginner_friendly_explanation": "Building bulletproof web apps that never show blank white screens and continue working seamlessly even when the network drops.",
                "practical_project": "Build an Offline-First Progressive Web App (PWA) with background sync, Service Worker caching, and Sentry session replay.",
                "checklist": [
                    "Configure Real User Monitoring (RUM) dashboards tracking user latency percentiles",
                    "Implement Sentry error grouping, source maps, and user session replay",
                    "Build Service Worker caching strategies with Workbox for complete offline functionality",
                    "Deploy edge middleware for geolocation routing and A/B test experiments",
                ],
                "resources": [
                    {"name": "MDN Progressive Web Apps", "url": "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps"},
                    {"name": "Sentry JavaScript Telemetry", "url": "https://docs.sentry.io/platforms/javascript/"},
                ],
            },
        ],
    },
    "backend": {
        "beginner": [
            {
                "step": "Learn Python Basics, Data Structures & REST API Fundamentals",
                "title": "Python & API Fundamentals",
                "duration": "2 weeks",
                "stage": "Phase 1: Foundations",
                "skills": ["Python 3", "Data Structures", "HTTP Methods", "REST API Design", "Git"],
                "why_it_matters": "Backend systems rely on clean algorithmic logic, type-safe models, and predictable HTTP REST contracts.",
                "prerequisites": ["Basic computer literacy"],
                "beginner_friendly_explanation": "Learning Python syntax and understanding how clients send HTTP requests (GET, POST, PUT, DELETE) to a server.",
                "practical_project": "Build a command-line expense tracker and simple REST API with Python that reads and writes structured JSON data.",
                "checklist": [
                    "Master Python functions, list comprehensions, dictionaries, and error handling",
                    "Understand HTTP status codes, headers, request bodies, and query parameters",
                    "Set up Python virtual environments and manage project dependencies with pip",
                    "Commit code to GitHub with clear semantic commits",
                ],
                "resources": [
                    {"name": "Official Python 3 Tutorial", "url": "https://docs.python.org/3/tutorial/"},
                    {"name": "REST API Architecture Tutorial", "url": "https://restfulapi.net/"},
                ],
            },
            {
                "step": "High-Performance API Development with FastAPI & Pydantic",
                "title": "FastAPI Web Framework",
                "duration": "2 weeks",
                "stage": "Phase 2: API Development",
                "skills": ["FastAPI", "Pydantic", "Async/Await", "OpenAPI / Swagger", "Dependency Injection"],
                "why_it_matters": "FastAPI is the leading modern Python web framework, offering automatic validation, async IO speed, and interactive docs.",
                "prerequisites": ["Python basics", "HTTP principles"],
                "beginner_friendly_explanation": "FastAPI makes building APIs effortless by automatically validating incoming data and generating interactive documentation.",
                "practical_project": "Develop a User Management & Task Tracking REST API with input validation, error handling, and Swagger documentation.",
                "checklist": [
                    "Define strict request/response data schemas using Pydantic BaseModel",
                    "Leverage FastAPI Dependency Injection for reusable authentication and database sessions",
                    "Write asynchronous route handlers using async/await syntax",
                    "Inspect and test API endpoints using automatic Swagger UI docs (/docs)",
                ],
                "resources": [
                    {"name": "FastAPI Official Tutorial", "url": "https://fastapi.tiangolo.com/tutorial/"},
                    {"name": "Pydantic Data Validation Guide", "url": "https://docs.pydantic.dev/latest/"},
                ],
            },
            {
                "step": "Relational Databases with PostgreSQL & SQLAlchemy ORM",
                "title": "PostgreSQL & Database Modeling",
                "duration": "3 weeks",
                "stage": "Phase 3: Database Engineering",
                "skills": ["PostgreSQL", "SQLAlchemy 2.0", "Alembic Migrations", "Database Normalization"],
                "why_it_matters": "PostgreSQL is the gold standard for transactional enterprise persistence. Knowing how to design schemas and migrations is essential.",
                "prerequisites": ["FastAPI basics"],
                "beginner_friendly_explanation": "SQL databases organize data into structured tables linked by foreign keys, ensuring data integrity and zero corruption.",
                "practical_project": "Design and implement a relational database for a Blogging & Commenting Platform with Alembic schema migrations.",
                "checklist": [
                    "Write relational SQL queries with JOINs, aggregations, and subqueries",
                    "Model database entities using SQLAlchemy ORM with foreign key relationships",
                    "Track and apply schema migrations safely with Alembic",
                    "Implement pagination, search filtering, and soft-delete capabilities",
                ],
                "resources": [
                    {"name": "PostgreSQL Official Tutorial", "url": "https://www.postgresql.org/docs/current/tutorial.html"},
                    {"name": "SQLBolt Interactive Lessons", "url": "https://sqlbolt.com/"},
                ],
            },
            {
                "step": "Containerization & Cloud Deployment with Docker",
                "title": "Docker Packaging & Cloud Hosting",
                "duration": "1 week",
                "stage": "Phase 4: Deployment",
                "skills": ["Docker", "Docker Compose", "Environment Configuration", "Cloud Deployment"],
                "why_it_matters": "Packaging your service into a container eliminates 'it works on my machine' bugs and enables instant cloud deployment.",
                "prerequisites": ["FastAPI and PostgreSQL"],
                "beginner_friendly_explanation": "Docker puts your application and its dependencies into a standard shipping container that runs identically everywhere.",
                "practical_project": "Containerize your FastAPI application and PostgreSQL database with Docker Compose and deploy to a cloud container host.",
                "checklist": [
                    "Write an efficient multi-stage Dockerfile for Python services",
                    "Orchestrate local web and database containers using Docker Compose",
                    "Securely manage secrets and environment variables via .env files",
                    "Deploy the containerized service to Render or Railway with database connectivity",
                ],
                "resources": [
                    {"name": "Docker Official Quickstart", "url": "https://docs.docker.com/get-started/"},
                    {"name": "FastAPI in Containers Guide", "url": "https://fastapi.tiangolo.com/deployment/docker/"},
                ],
            },
        ],
        "intermediate": [
            {
                "step": "Strengthen Async Architecture, Security & JWT Authentication",
                "title": "Advanced Async API Security & Auth",
                "duration": "2 weeks",
                "stage": "Phase 1: Security & Auth",
                "skills": ["OAuth2 / JWT", "Password Hashing (Argon2/bcrypt)", "Role-Based Access Control", "Rate Limiting"],
                "why_it_matters": "Security vulnerabilities and data breaches cost companies millions. Enterprise backend engineers must write airtight auth logic.",
                "prerequisites": ["FastAPI & PostgreSQL"],
                "beginner_friendly_explanation": "Issuing tamper-proof digital access badges (JWT tokens) and enforcing who can read, create, or delete sensitive data.",
                "practical_project": "Build a secure Multi-Tenant RBAC Authentication system with refresh tokens, password reset flows, and brute-force protection.",
                "checklist": [
                    "Implement OAuth2 password bearer flow with encrypted JWT access tokens",
                    "Hash passwords using bcrypt/Argon2 with high work factors",
                    "Enforce role-based permissions (admin, member, guest) across protected routes",
                    "Protect endpoints with IP-based and user-based rate-limiting middleware",
                ],
                "resources": [
                    {"name": "FastAPI Security & OAuth2", "url": "https://fastapi.tiangolo.com/tutorial/security/"},
                    {"name": "OWASP API Security Top 10", "url": "https://owasp.org/www-project-api-security/"},
                ],
            },
            {
                "step": "Optimize PostgreSQL Queries, Indexing & Connection Pooling",
                "title": "Database Optimization & Indexing",
                "duration": "2 weeks",
                "stage": "Phase 2: Database Performance",
                "skills": ["PostgreSQL Indexing", "EXPLAIN ANALYZE", "Connection Pooling", "Transactions"],
                "why_it_matters": "Poorly indexed queries can turn a 10ms request into a 5-second database freeze during high traffic.",
                "prerequisites": ["SQLAlchemy & SQL"],
                "beginner_friendly_explanation": "Learning how to inspect the database query planner, build composite indexes, and reuse database connections efficiently.",
                "practical_project": "Optimize a slow database with 500,000 synthetic records: reduce query latency from 800ms down to under 15ms.",
                "checklist": [
                    "Inspect execution plans using EXPLAIN (ANALYZE, BUFFERS)",
                    "Create B-tree, GiST, and partial indexes tailored to query filter patterns",
                    "Configure database connection pooling with asyncpg and pgbouncer",
                    "Eliminate N+1 query bottlenecks using joinedload and selectinload in SQLAlchemy",
                ],
                "resources": [
                    {"name": "Use The Index, Luke (SQL Indexing)", "url": "https://use-the-index-luke.com/"},
                    {"name": "PostgreSQL Performance Optimization", "url": "https://www.postgresql.org/docs/current/performance-tips.html"},
                ],
            },
            {
                "step": "In-Memory Caching with Redis & Background Worker Queues",
                "title": "Redis Caching & Asynchronous Queues",
                "duration": "2 weeks",
                "stage": "Phase 3: Caching & Workers",
                "skills": ["Redis", "Celery", "Distributed Locking", "Pub/Sub Messaging"],
                "why_it_matters": "In-memory caching and background job queues reduce server load by over 80% and allow async processing of heavy workloads.",
                "prerequisites": ["FastAPI", "Docker"],
                "beginner_friendly_explanation": "Keeping frequent answers in super-fast RAM memory so the database doesn't have to recalculate them every second.",
                "practical_project": "Implement an automated Email and PDF generation pipeline using Redis queues and Celery background workers.",
                "checklist": [
                    "Implement Cache-Aside pattern with Redis for high-frequency endpoints",
                    "Set up Celery worker queues with automatic retries and dead-letter handling",
                    "Use distributed Redis locks to prevent race conditions during inventory updates",
                    "Publish real-time system events with Redis Pub/Sub channels",
                ],
                "resources": [
                    {"name": "Redis Documentation", "url": "https://redis.io/docs/latest/"},
                    {"name": "Celery First Steps", "url": "https://docs.celeryq.dev/en/stable/getting-started/first-steps-with-celery.html"},
                ],
            },
        ],
        "advanced": [
            {
                "step": "Microservice Architecture, gRPC & Distributed Event Streams",
                "title": "Microservices & Distributed Systems",
                "duration": "3 weeks",
                "stage": "Phase 1: Architecture",
                "skills": ["Microservices", "gRPC / Protocol Buffers", "Apache Kafka", "CQRS / Event Sourcing"],
                "why_it_matters": "Large-scale backends communicate via low-latency binary protocols like gRPC and durable event logs like Kafka.",
                "prerequisites": ["Intermediate backend architecture"],
                "beginner_friendly_explanation": "Replacing slow JSON HTTP between internal services with ultra-fast binary communication and resilient event queues.",
                "practical_project": "Build an Event-Driven Payment & Notification Microservice cluster using gRPC communication and Kafka event streams.",
                "checklist": [
                    "Define type-safe binary RPC contracts using Google Protocol Buffers (Protobuf)",
                    "Build high-throughput event producer and consumer pipelines with Apache Kafka",
                    "Implement the Outbox Pattern to guarantee event delivery with relational transactions",
                    "Decompose monolithic services into resilient microservice boundaries",
                ],
                "resources": [
                    {"name": "gRPC Official Documentation", "url": "https://grpc.io/docs/"},
                    {"name": "Apache Kafka Quickstart", "url": "https://kafka.apache.org/quickstart"},
                ],
            },
            {
                "step": "Site Reliability Engineering (SRE), Observability & Chaos Engineering",
                "title": "SRE, Observability & Cloud Resiliency",
                "duration": "3 weeks",
                "stage": "Phase 2: SRE & Observability",
                "skills": ["OpenTelemetry", "Prometheus", "Grafana", "Distributed Tracing", "Zero-Downtime Releases"],
                "why_it_matters": "Ensures mission-critical enterprise backends achieve 99.99% uptime with instant root-cause diagnostic observability.",
                "prerequisites": ["Distributed systems fundamentals"],
                "beginner_friendly_explanation": "Giving yourself X-ray vision into running production servers to spot errors before customers even notice.",
                "practical_project": "Deploy an Observability Suite with OpenTelemetry distributed tracing, Prometheus alerts, and Grafana performance dashboards.",
                "checklist": [
                    "Implement OpenTelemetry distributed context propagation across microservices",
                    "Create Grafana monitoring dashboards for request rates, errors, and latency percentiles (p95/p99)",
                    "Conduct chaos experiments simulating database failovers and network partitions",
                    "Design automated blue/green and canary deployment rollback mechanisms",
                ],
                "resources": [
                    {"name": "Google SRE Book", "url": "https://sre.google/books/"},
                    {"name": "OpenTelemetry Instrumentation Guide", "url": "https://opentelemetry.io/docs/"},
                ],
            },
        ],
    },
    "devops": {
        "beginner": [
            {
                "step": "Linux Systems Administration, Shell Scripting & Git Mastery",
                "title": "Linux, Bash & Version Control",
                "duration": "2 weeks",
                "stage": "Phase 1: Foundations",
                "skills": ["Linux (Ubuntu/Debian)", "Bash Scripting", "SSH & Networking", "Git CLI"],
                "why_it_matters": "Over 95% of servers and cloud containers run on Linux. Fluency in Bash and system administration is non-negotiable.",
                "prerequisites": ["Basic computer literacy"],
                "beginner_friendly_explanation": "Learning how to navigate and manage Linux servers entirely through the command line without a mouse.",
                "practical_project": "Write an automated Bash system health monitoring and backup script that alerts on disk/memory spikes.",
                "checklist": [
                    "Master file permissions (chmod, chown), process management (ps, top, kill), and systemd",
                    "Write robust Bash scripts with error checking (set -euo pipefail) and argument parsing",
                    "Configure secure passwordless SSH key authentication and firewall rules (UFW)",
                    "Understand core networking concepts (DNS, TCP/IP, Ports, HTTP/HTTPS, SSL/TLS)",
                ],
                "resources": [
                    {"name": "Linux Journey Tutorial", "url": "https://linuxjourney.com/"},
                    {"name": "Bash Guide for Beginners", "url": "https://tldp.org/LDP/Bash-Beginners-Guide/html/"},
                ],
            },
            {
                "step": "Containerization with Docker & Multi-Container Networking",
                "title": "Docker & Container Architecture",
                "duration": "2 weeks",
                "stage": "Phase 2: Containers",
                "skills": ["Docker", "Dockerfile Optimization", "Docker Compose", "Container Networking"],
                "why_it_matters": "Containers package code and all system dependencies together, guaranteeing identical behavior across development and cloud servers.",
                "prerequisites": ["Linux basics"],
                "beginner_friendly_explanation": "Containers are like lightweight virtual machines that boot in milliseconds and consume minimal system resources.",
                "practical_project": "Containerize a complete 3-tier web application (React, Node/Python API, PostgreSQL) using Docker Compose networks and volumes.",
                "checklist": [
                    "Write minimal, secure multi-stage Dockerfiles utilizing Alpine or distroless base images",
                    "Manage persistent data storage using Docker volumes and bind mounts",
                    "Configure isolated container networks with internal DNS resolution",
                    "Scan container images for vulnerabilities using Trivy or Docker Scout",
                ],
                "resources": [
                    {"name": "Docker Official Documentation", "url": "https://docs.docker.com/"},
                    {"name": "Docker Best Practices Guide", "url": "https://docs.docker.com/develop/develop-images/dockerfile_best-practices/"},
                ],
            },
            {
                "step": "Continuous Integration & Automated Testing with GitHub Actions",
                "title": "CI/CD Pipeline Automation",
                "duration": "2 weeks",
                "stage": "Phase 3: CI Automation",
                "skills": ["CI/CD", "GitHub Actions", "Automated Linting & Testing", "Container Registry"],
                "why_it_matters": "CI pipelines automatically build, test, and package code on every push, catching bugs before they reach production.",
                "prerequisites": ["Git", "Docker basics"],
                "beginner_friendly_explanation": "A robotic assembly line that tests your code and builds Docker images every time you create a pull request.",
                "practical_project": "Build an automated GitHub Actions workflow that lints, runs unit tests in parallel, builds a Docker image, and pushes to Docker Hub.",
                "checklist": [
                    "Construct YAML pipeline definitions with triggers, jobs, steps, and matrices",
                    "Manage sensitive secrets and environment variables securely in GitHub Secrets",
                    "Publish versioned container images to GitHub Container Registry (GHCR) / Docker Hub",
                    "Implement status checks that block broken pull requests from merging",
                ],
                "resources": [
                    {"name": "GitHub Actions Official Docs", "url": "https://docs.github.com/en/actions"},
                ],
            },
        ],
        "intermediate": [
            {
                "step": "Cloud Infrastructure Provisioning with Terraform (IaC)",
                "title": "Infrastructure as Code (Terraform)",
                "duration": "3 weeks",
                "stage": "Phase 1: Infrastructure as Code",
                "skills": ["Terraform", "AWS / GCP", "VPC & Subnets", "IAM Security", "State Management"],
                "why_it_matters": "Infrastructure as Code allows teams to spin up, manage, and destroy complete cloud environments reproducibly from code.",
                "prerequisites": ["Cloud basics", "Bash scripting"],
                "beginner_friendly_explanation": "Writing code files that tell AWS or Google Cloud to build servers, firewalls, and databases automatically.",
                "practical_project": "Provision a secure AWS Virtual Private Cloud (VPC) with public/private subnets, NAT gateways, and an EC2 auto-scaling group using Terraform.",
                "checklist": [
                    "Author modular Terraform HCL configurations with variables and outputs",
                    "Manage remote Terraform state safely with AWS S3 and DynamoDB state locking",
                    "Implement least-privilege cloud IAM policies and security groups",
                    "Run automated Terraform drift detection and security scans with tfsec",
                ],
                "resources": [
                    {"name": "Terraform AWS Tutorial", "url": "https://developer.hashicorp.com/terraform/tutorials/aws-get-started"},
                ],
            },
            {
                "step": "Kubernetes Container Orchestration & Cluster Management",
                "title": "Kubernetes (K8s) Cluster Deployment",
                "duration": "3 weeks",
                "stage": "Phase 2: Kubernetes",
                "skills": ["Kubernetes", "Pods & Deployments", "Services & Ingress", "ConfigMaps & Secrets", "Helm"],
                "why_it_matters": "Kubernetes is the industry standard for managing containerized applications across clusters of servers with auto-healing and scaling.",
                "prerequisites": ["Docker", "Linux networking"],
                "beginner_friendly_explanation": "Kubernetes acts as the ship captain, automatically restarting crashed containers and distributing traffic across your server fleet.",
                "practical_project": "Deploy a multi-service web application onto a local minikube / cloud Kubernetes cluster using Helm charts and an NGINX Ingress controller.",
                "checklist": [
                    "Define declarative Kubernetes Deployments, Services, and Ingress routing rules",
                    "Package and version complex application deployments using Helm charts",
                    "Configure Horizontal Pod Autoscalers (HPA) responding to CPU/memory metrics",
                    "Implement liveness and readiness health probes for zero-downtime rolling updates",
                ],
                "resources": [
                    {"name": "Kubernetes Official Basics Tutorial", "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/"},
                    {"name": "Helm Package Manager Guide", "url": "https://helm.sh/docs/intro/quickstart/"},
                ],
            },
        ],
        "advanced": [
            {
                "step": "GitOps Continuous Delivery with ArgoCD & Progressive Canary Rollouts",
                "title": "GitOps (ArgoCD) & Progressive Delivery",
                "duration": "3 weeks",
                "stage": "Phase 1: GitOps & Delivery",
                "skills": ["GitOps", "ArgoCD", "Canary Deployments", "Flagger / Istio Service Mesh"],
                "why_it_matters": "GitOps uses Git as the single source of truth for cloud state, automatically synchronizing clusters and enabling instant one-click rollbacks.",
                "prerequisites": ["Kubernetes & Helm"],
                "beginner_friendly_explanation": "Any change pushed to your Git repository automatically gets applied to your live Kubernetes cluster with zero manual commands.",
                "practical_project": "Configure ArgoCD to manage multi-cluster Kubernetes deployments with automated canary releases and automated rollback on error spikes.",
                "checklist": [
                    "Install and configure ArgoCD with multi-environment Git repository synchronization",
                    "Implement automated canary deployment rollouts that test 10% of user traffic first",
                    "Configure automated rollback triggers based on Prometheus error rates",
                    "Secure cluster secrets with HashiCorp Vault or External Secrets Operator",
                ],
                "resources": [
                    {"name": "ArgoCD Official Documentation", "url": "https://argo-cd.readthedocs.io/"},
                    {"name": "GitOps Principles Guide", "url": "https://opengitops.dev/"},
                ],
            },
        ],
    },
}


class RoadmapEngine:
    @staticmethod
    def _normalize_experience_level(experience_level: str) -> str:
        normalized = (experience_level or "").strip().lower()
        if "adv" in normalized or "senior" in normalized or "5" in normalized:
            return "advanced"
        if "inter" in normalized or "mid" in normalized or "3" in normalized:
            return "intermediate"
        return "beginner"

    @staticmethod
    def _role_track(target_role: str) -> str:
        role = (target_role or "").strip().lower()
        if any(k in role for k in ["full", "stack", "mern", "mean", "web dev"]):
            return "fullstack"
        if any(k in role for k in ["front", "ui", "ux", "react", "vue", "angular", "client"]):
            return "frontend"
        if any(k in role for k in ["devops", "cloud", "sre", "platform", "infra", "kubernetes", "site rel"]):
            return "devops"
        if any(k in role for k in ["data", "ml", "ai", "machine", "deep", "analytics"]):
            return "fullstack"  # fallback or data
        return "backend"

    @classmethod
    def generate(
        cls,
        *,
        target_role: str,
        experience_level: str,
        current_skills: list[str] | None = None,
        missing_skills: list[str] | None = None,
    ) -> dict[str, Any]:
        role_track = cls._role_track(target_role)
        level = cls._normalize_experience_level(experience_level)
        normalized_role = target_role.strip() if target_role else "Software Engineer"

        current_skills = [s.strip() for s in (current_skills or []) if isinstance(s, str) and s.strip()]
        missing_skills = [s.strip() for s in (missing_skills or []) if isinstance(s, str) and s.strip()]

        # Try LLM generation if configured
        if llm_client.is_configured:
            try:
                llm_roadmap = cls._generate_via_llm(
                    target_role=normalized_role,
                    experience_level=level,
                    current_skills=current_skills,
                    missing_skills=missing_skills,
                )
                if llm_roadmap and len(llm_roadmap.get("roadmap", [])) >= 3:
                    logger.info("Successfully generated personalized roadmap via LLM for %s (%s)", normalized_role, level)
                    return {
                        "roadmap": llm_roadmap["roadmap"],
                        "track": role_track,
                        "is_personalized": True,
                        "role_supported": True,
                        "recommended_next_action": f"Begin Phase 1: {llm_roadmap['roadmap'][0].get('title', 'Foundations')}",
                        "estimated_total_duration": "8-12 weeks",
                    }
            except Exception as exc:
                logger.warning("LLM roadmap generation failed, falling back to structured curriculum: %s", exc)

        # Fallback to rich, production-grade curriculum matrix
        base_track = ROLE_ROADMAPS.get(role_track, ROLE_ROADMAPS["fullstack"])
        curriculum = [dict(step) for step in base_track.get(level, base_track["beginner"])]

        # If user has specific missing skills not already represented, inject a focused milestone
        if missing_skills:
            existing_skill_set = {
                skill.lower()
                for step in curriculum
                for skill in step.get("skills", [])
            }
            unmet_gaps = [g for g in missing_skills if g.lower() not in existing_skill_set]

            if unmet_gaps:
                top_gaps = unmet_gaps[:3]
                injected_milestone = {
                    "step": f"Targeted Skill Acceleration: Master {', '.join(top_gaps)}",
                    "title": f"Targeted Mastery: {top_gaps[0]}",
                    "duration": "2 weeks",
                    "stage": "Phase: Targeted Skill Gaps",
                    "skills": top_gaps,
                    "why_it_matters": f"These skills ({', '.join(top_gaps)}) are high-frequency requirements for {normalized_role} positions in current industry hiring benchmarks.",
                    "prerequisites": ["Core language proficiency", "Development environment setup"],
                    "beginner_friendly_explanation": f"Dedicated practical sprint to bridge your verified profile gaps in {', '.join(top_gaps)} through hands-on implementation.",
                    "practical_project": f"Build an integration module or production service featuring {top_gaps[0]} with comprehensive automated tests.",
                    "checklist": [
                        f"Study architectural core principles of {top_gaps[0]}",
                        f"Implement hands-on code examples and resolve edge cases",
                        f"Integrate {top_gaps[0]} into an end-to-end working project",
                        "Validate code quality and test coverage in CI pipeline",
                    ],
                    "resources": [
                        {"name": f"{top_gaps[0]} Official Documentation", "url": "https://devdocs.io/"},
                        {"name": "Architecture & Engineering Patterns", "url": "https://github.com/kamranahmedse/developer-roadmap"},
                    ],
                }
                # Insert at appropriate position (index 1 or append)
                if len(curriculum) > 1:
                    curriculum.insert(2, injected_milestone)
                else:
                    curriculum.append(injected_milestone)

        next_action = f"Start Milestone 1: {curriculum[0].get('title', curriculum[0].get('step', 'Getting Started'))}"

        return {
            "roadmap": curriculum,
            "track": role_track,
            "is_personalized": bool(missing_skills or current_skills),
            "role_supported": True,
            "recommended_next_action": next_action,
            "estimated_total_duration": f"{len(curriculum) * 2} weeks",
        }

    @classmethod
    def _generate_via_llm(
        cls,
        *,
        target_role: str,
        experience_level: str,
        current_skills: list[str],
        missing_skills: list[str],
    ) -> dict[str, Any]:
        prompt = f"""You are an elite Tech Career Architect and Senior Staff Engineer.
Generate a comprehensive, personalized, step-by-step career acceleration roadmap for a candidate targeting the role:
Target Role: {target_role}
Experience Level: {experience_level.title()}
Verified Current Skills: {', '.join(current_skills) if current_skills else 'None specified'}
Priority Missing Skills to Address: {', '.join(missing_skills) if missing_skills else 'Standard role curriculum'}

Requirements:
- Return exactly 4 logically sequenced milestones going from current gaps to advanced, job-ready production capabilities.
- Keep descriptions crisp and focused (1-2 clear sentences per field) to maintain high readability.
- Respond with ONLY valid JSON matching this exact structure:
{{
  "roadmap": [
    {{
      "step": "Full descriptive title of the milestone",
      "title": "Concise milestone title (3-5 words)",
      "duration": "e.g. 2 weeks",
      "stage": "e.g. Phase 1: Architecture & Foundations",
      "skills": ["Skill 1", "Skill 2", "Skill 3"],
      "why_it_matters": "Clear, compelling explanation of why this skill is required for {target_role}.",
      "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
      "beginner_friendly_explanation": "Intuitive, accessible conceptual explanation demystifying the topic.",
      "practical_project": "Concrete mini-project to build with measurable output.",
      "checklist": [
        "Actionable task 1",
        "Actionable task 2",
        "Actionable task 3",
        "Actionable task 4"
      ],
      "resources": [
        {{"name": "Resource Title", "url": "https://verified-documentation-link.org"}}
      ]
    }}
  ]
}}
Do not include any Markdown code fence outside the JSON. Return pure JSON only.
"""
        result = llm_client.chat_json(prompt, max_tokens=3200, timeout_seconds=30)
        if isinstance(result, dict) and "roadmap" in result and isinstance(result["roadmap"], list):
            # Validate each milestone has minimum required keys
            valid_milestones = []
            for item in result["roadmap"]:
                if isinstance(item, dict) and item.get("step"):
                    # Normalize resources to list of dicts
                    raw_res = item.get("resources", [])
                    norm_res = []
                    for r in raw_res:
                        if isinstance(r, dict) and r.get("name") and r.get("url"):
                            norm_res.append({"name": str(r["name"]), "url": str(r["url"])})
                        elif isinstance(r, str) and r.startswith("http"):
                            norm_res.append({"name": "Documentation & Tutorial", "url": r})
                    if not norm_res:
                        norm_res = [{"name": "Developer Roadmap Reference", "url": "https://roadmap.sh"}]
                    item["resources"] = norm_res

                    valid_milestones.append({
                        "step": str(item.get("step", "")),
                        "title": str(item.get("title", item.get("step", ""))),
                        "duration": str(item.get("duration", "2 weeks")),
                        "stage": str(item.get("stage", "Core Milestone")),
                        "skills": [str(s) for s in item.get("skills", []) if s],
                        "why_it_matters": str(item.get("why_it_matters", "")),
                        "prerequisites": [str(p) for p in item.get("prerequisites", []) if p],
                        "beginner_friendly_explanation": str(item.get("beginner_friendly_explanation", "")),
                        "practical_project": str(item.get("practical_project", "")),
                        "checklist": [str(c) for c in item.get("checklist", []) if c],
                        "resources": norm_res,
                    })

            if len(valid_milestones) >= 3:
                return {"roadmap": valid_milestones}

        return {}
