class PerformanceEngine:

    @staticmethod
    def record_resume_metrics(db, user_id, resume_id, ats_score):

        trend = models.UserPerformanceTrend(
            user_id=user_id,
            resume_id=resume_id,
            ats_score=ats_score
        )

        db.add(trend)
        db.commit()