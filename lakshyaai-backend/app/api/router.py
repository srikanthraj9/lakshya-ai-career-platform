from fastapi import APIRouter

from app.api.routes import analytics, auth, copilot, interview, jobs, resume, roadmap, role, users

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(resume.router)
api_router.include_router(resume.rewrite_router)
api_router.include_router(role.router)
api_router.include_router(roadmap.router)
api_router.include_router(analytics.router)
api_router.include_router(interview.router)
api_router.include_router(jobs.router)
api_router.include_router(copilot.router)
