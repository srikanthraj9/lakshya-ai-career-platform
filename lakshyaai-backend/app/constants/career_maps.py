from __future__ import annotations


RESOURCE_MAP = {
    "aws": {
        "video": "https://docs.aws.amazon.com/getting-started/",
        "project": "Deploy a small FastAPI service on AWS with logging and environment configuration.",
        "time": "3 days",
    },
    "ci/cd": {
        "video": "https://docs.github.com/en/actions/quickstart",
        "project": "Create a GitHub Actions pipeline that runs tests, linting, and deploy checks.",
        "time": "2 days",
    },
    "docker": {
        "video": "https://docs.docker.com/get-started/",
        "project": "Containerize a FastAPI app with PostgreSQL and run it with Docker Compose.",
        "time": "2 days",
    },
    "fastapi": {
        "video": "https://fastapi.tiangolo.com/tutorial/",
        "project": "Build a FastAPI service with auth, CRUD APIs, validation, and database integration.",
        "time": "3 days",
    },
    "postgresql": {
        "video": "https://www.postgresql.org/docs/current/tutorial.html",
        "project": "Design a PostgreSQL schema for resumes, roles, and user progress, then optimize two key queries.",
        "time": "2 days",
    },
    "python": {
        "video": "https://docs.python.org/3/tutorial/",
        "project": "Ship a typed Python backend module with tests, linting, and clear package structure.",
        "time": "3 days",
    },
    "react": {
        "video": "https://react.dev/learn",
        "project": "Build a React dashboard that visualizes matched skills, gaps, and weekly progress.",
        "time": "3 days",
    },
    "sql": {
        "video": "https://www.postgresql.org/docs/current/tutorial-select.html",
        "project": "Write and benchmark joins, aggregations, and ranking queries on a realistic dataset.",
        "time": "2 days",
    },
    "typescript": {
        "video": "https://www.typescriptlang.org/docs/handbook/intro.html",
        "project": "Convert a React feature to strict TypeScript and eliminate implicit any usage.",
        "time": "2 days",
    },
    "machine learning": {
        "video": "https://developers.google.com/machine-learning/crash-course",
        "project": "Train, evaluate, and expose a small ML model behind an API with metrics tracking.",
        "time": "5 days",
    },
    "pytorch": {
        "video": "https://pytorch.org/tutorials/",
        "project": "Implement and explain one end-to-end PyTorch model with training and inference scripts.",
        "time": "4 days",
    },
}


ROLE_CAREER_PATHS = {
    "backend engineer": [
        "Backend Intern",
        "Junior Backend Engineer",
        "Backend Engineer",
    ],
    "frontend engineer": [
        "Frontend Intern",
        "Junior Frontend Engineer",
        "Frontend Engineer",
    ],
    "full stack engineer": [
        "Full Stack Intern",
        "Junior Full Stack Engineer",
        "Full Stack Engineer",
    ],
    "software engineer": [
        "Software Engineering Intern",
        "Junior Software Engineer",
        "Software Engineer",
    ],
    "machine learning engineer": [
        "ML Intern",
        "Junior ML Engineer",
        "Machine Learning Engineer",
    ],
    "data analytics engineer": [
        "Data Analyst Intern",
        "Junior Data Analyst",
        "Data Analytics Engineer",
    ],
}


DEFAULT_ROLE_LIBRARY = [
    {
        "title": "Backend Engineer",
        "category": "Software Engineering",
        "demand_level": "High",
        "description": "Build APIs, backend services, and database-driven systems.",
        "average_salary": 180000,
        "core_skills": ["Python", "FastAPI", "PostgreSQL", "SQL", "REST API"],
        "advanced_skills": ["Docker", "CI/CD", "AWS", "Git"],
    },
    {
        "title": "Frontend Engineer",
        "category": "Software Engineering",
        "demand_level": "High",
        "description": "Build performant user interfaces and production web experiences.",
        "average_salary": 165000,
        "core_skills": ["React", "JavaScript", "TypeScript", "HTML", "CSS"],
        "advanced_skills": ["Tailwind CSS", "Redux", "REST API", "Git"],
    },
    {
        "title": "Full Stack Engineer",
        "category": "Software Engineering",
        "demand_level": "High",
        "description": "Own frontend, backend, APIs, and data flows across the stack.",
        "average_salary": 175000,
        "core_skills": ["Python", "React", "FastAPI", "PostgreSQL", "REST API"],
        "advanced_skills": ["Docker", "TypeScript", "AWS", "Git"],
    },
    {
        "title": "Software Engineer",
        "category": "Software Engineering",
        "demand_level": "High",
        "description": "Design, build, and maintain production-grade software systems.",
        "average_salary": 170000,
        "core_skills": ["Python", "Git", "SQL", "REST API"],
        "advanced_skills": ["Docker", "React", "PostgreSQL", "CI/CD"],
    },
    {
        "title": "Data Analytics Engineer",
        "category": "Data",
        "demand_level": "Medium",
        "description": "Analyze data, build dashboards, and translate data into product insights.",
        "average_salary": 155000,
        "core_skills": ["Python", "SQL", "PostgreSQL", "Pandas"],
        "advanced_skills": ["NumPy", "Data Analysis", "Matplotlib", "Git"],
    },
    {
        "title": "Machine Learning Engineer",
        "category": "AI",
        "demand_level": "High",
        "description": "Train, evaluate, and deploy machine learning systems in production.",
        "average_salary": 190000,
        "core_skills": ["Python", "Machine Learning", "SQL"],
        "advanced_skills": ["PyTorch", "Docker", "AWS", "PostgreSQL"],
    },
]
