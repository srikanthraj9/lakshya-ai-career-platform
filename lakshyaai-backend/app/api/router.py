from fastapi import APIRouter

from app.api.routes import (
    activity,
    analytics,
    applications,
    auth,
    copilot,
    intelligence,
    interview,
    jobs,
    notifications,
    onboarding,
    resume,
    roadmap,
    role,
    users,
    voice,
    admin,
    feedback,
)

api_router = APIRouter(prefix="/api")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(onboarding.router)
api_router.include_router(resume.router)
api_router.include_router(resume.rewrite_router)
api_router.include_router(role.router)
api_router.include_router(roadmap.router)
api_router.include_router(activity.router)
api_router.include_router(notifications.router)
api_router.include_router(intelligence.router)
api_router.include_router(applications.router)
api_router.include_router(analytics.router)
api_router.include_router(interview.router)
api_router.include_router(voice.router)
api_router.include_router(jobs.router)
api_router.include_router(copilot.router)
api_router.include_router(admin.router)
api_router.include_router(feedback.router)


