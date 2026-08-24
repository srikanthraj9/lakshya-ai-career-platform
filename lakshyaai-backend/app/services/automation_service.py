from sqlalchemy.orm import Session
from typing import Dict, Any, List
import uuid

from app.db import models


class AutomationService:
    @staticmethod
    def evaluate_rules(db: Session, user_id: uuid.UUID, event_type: str, context_data: Dict[str, Any]):
        rules = db.query(models.CareerAutomationRule).filter(
            models.CareerAutomationRule.user_id == user_id,
            models.CareerAutomationRule.is_enabled == True,
            models.CareerAutomationRule.trigger_type == event_type,
        ).all()

        for rule in rules:
            try:
                if rule.action_type == "create_notification":
                    title = rule.action_config.get("title", "Career Intelligence Alert")
                    message = rule.action_config.get("message", "A new recommendation is ready for your career goal.")
                    action_url = rule.action_config.get("action_url", "/dashboard")
                    action_text = rule.action_config.get("action_text", "View Insight")

                    # Check if notification already created
                    client_id = f"auto-notif-{rule.id}-{event_type}"
                    existing = db.query(models.Notification).filter(
                        models.Notification.user_id == user_id,
                        models.Notification.client_event_id == client_id,
                    ).first()

                    if not existing:
                        notif = models.Notification(
                            user_id=user_id,
                            client_event_id=client_id,
                            type="career_insight",
                            title=title,
                            message=message,
                            action_url=action_url,
                            action_text=action_text,
                            is_read=False,
                        )
                        db.add(notif)
                        db.commit()

            except Exception as e:
                print(f"[AutomationService Rule Error] {e}")
                db.rollback()
