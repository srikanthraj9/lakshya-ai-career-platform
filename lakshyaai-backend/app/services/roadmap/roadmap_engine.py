from __future__ import annotations


ROLE_ROADMAPS = {
    "backend": {
        "beginner": [
            {
                "step": "Learn Python basics and API fundamentals",
                "resources": [
                    "https://docs.python.org/3/tutorial/",
                    "https://fastapi.tiangolo.com/tutorial/",
                ],
                "duration": "1 week",
            },
            {
                "step": "Build CRUD APIs with FastAPI and validation",
                "resources": [
                    "https://fastapi.tiangolo.com/tutorial/body/",
                    "https://fastapi.tiangolo.com/tutorial/sql-databases/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Learn PostgreSQL, SQL, and data modeling",
                "resources": [
                    "https://www.postgresql.org/docs/current/tutorial.html",
                    "https://sqlbolt.com/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Containerize and deploy a backend project",
                "resources": [
                    "https://docs.docker.com/get-started/",
                    "https://docs.github.com/en/actions/quickstart",
                ],
                "duration": "1 week",
            },
        ],
        "intermediate": [
            {
                "step": "Strengthen async FastAPI patterns, auth, and testing",
                "resources": [
                    "https://fastapi.tiangolo.com/async/",
                    "https://fastapi.tiangolo.com/tutorial/security/",
                ],
                "duration": "1 week",
            },
            {
                "step": "Optimize PostgreSQL queries and indexing",
                "resources": [
                    "https://www.postgresql.org/docs/current/indexes.html",
                    "https://use-the-index-luke.com/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Ship a production-style service with Docker and CI/CD",
                "resources": [
                    "https://docs.docker.com/get-started/",
                    "https://docs.github.com/en/actions/quickstart",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Deploy on AWS and add monitoring",
                "resources": [
                    "https://docs.aws.amazon.com/getting-started/",
                    "https://fastapi.tiangolo.com/deployment/",
                ],
                "duration": "2 weeks",
            },
        ],
        "advanced": [
            {
                "step": "Design scalable service boundaries and system architecture",
                "resources": [
                    "https://martinfowler.com/microservices/",
                    "https://learn.microsoft.com/en-us/azure/architecture/patterns/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Implement caching, queues, and observability",
                "resources": [
                    "https://redis.io/docs/latest/",
                    "https://opentelemetry.io/docs/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Harden deployment, rollback, and incident workflows",
                "resources": [
                    "https://sre.google/books/",
                    "https://docs.github.com/en/actions/deployment/",
                ],
                "duration": "2 weeks",
            },
        ],
    },
    "frontend": {
        "beginner": [
            {
                "step": "Learn HTML, CSS, JavaScript, and React fundamentals",
                "resources": [
                    "https://developer.mozilla.org/en-US/docs/Learn",
                    "https://react.dev/learn",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Build reusable UI components and forms",
                "resources": [
                    "https://react.dev/learn/passing-props-to-a-component",
                    "https://tailwindcss.com/docs/installation",
                ],
                "duration": "1 week",
            },
            {
                "step": "Integrate APIs, loading states, and error handling",
                "resources": [
                    "https://tanstack.com/query/latest/docs/framework/react/overview",
                    "https://react.dev/learn/synchronizing-with-effects",
                ],
                "duration": "1 week",
            },
            {
                "step": "Ship a responsive dashboard project",
                "resources": [
                    "https://vite.dev/guide/",
                    "https://web.dev/responsive-web-design-basics/",
                ],
                "duration": "2 weeks",
            },
        ],
        "intermediate": [
            {
                "step": "Adopt TypeScript and stronger component architecture",
                "resources": [
                    "https://www.typescriptlang.org/docs/handbook/intro.html",
                    "https://react.dev/learn/typescript",
                ],
                "duration": "1 week",
            },
            {
                "step": "Improve performance, routing, and state flows",
                "resources": [
                    "https://react.dev/reference/react/lazy",
                    "https://reactrouter.com/en/main/start/overview",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Add testing and accessibility checks",
                "resources": [
                    "https://testing-library.com/docs/react-testing-library/intro/",
                    "https://www.w3.org/WAI/fundamentals/accessibility-intro/",
                ],
                "duration": "1 week",
            },
            {
                "step": "Deploy a production frontend with monitoring",
                "resources": [
                    "https://vite.dev/guide/static-deploy.html",
                    "https://web.dev/vitals/",
                ],
                "duration": "1 week",
            },
        ],
        "advanced": [
            {
                "step": "Lead design system architecture and component standards",
                "resources": [
                    "https://storybook.js.org/docs/react/get-started/install",
                    "https://atomicdesign.bradfrost.com/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Optimize bundle strategy, rendering, and app observability",
                "resources": [
                    "https://web.dev/code-splitting-with-dynamic-imports-in-nextjs/",
                    "https://sentry.io/for/javascript/",
                ],
                "duration": "2 weeks",
            },
            {
                "step": "Build advanced product surfaces with measurable UX outcomes",
                "resources": [
                    "https://www.nngroup.com/articles/",
                    "https://web.dev/learn/",
                ],
                "duration": "2 weeks",
            },
        ],
    },
}


class RoadmapEngine:
    @staticmethod
    def _normalize_experience_level(experience_level: str) -> str:
        normalized = experience_level.strip().lower()
        if normalized not in {"beginner", "intermediate", "advanced"}:
            return "beginner"
        return normalized

    @staticmethod
    def _role_track(target_role: str) -> str:
        role = target_role.strip().lower()
        if "front" in role or "ui" in role or "react" in role:
            return "frontend"
        return "backend"

    @classmethod
    def generate(cls, *, target_role: str, experience_level: str) -> dict[str, list[dict[str, object]]]:
        role_track = cls._role_track(target_role)
        level = cls._normalize_experience_level(experience_level)
        roadmap = ROLE_ROADMAPS[role_track][level]
        return {"roadmap": roadmap}
