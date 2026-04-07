from app.db.database import SessionLocal
from app.db import models
from app.constants.roles import ROLE_SKILL_MATRIX


def seed_roles():

    db = SessionLocal()

    for role_name, skills in ROLE_SKILL_MATRIX.items():

        role = models.Role(name=role_name, description=role_name)

        db.add(role)
        db.commit()
        db.refresh(role)

        for skill in skills:

            role_skill = models.RoleSkill(
                role_id=role.id,
                skill_name=skill["skill"],
                weight=skill["weight"],
                importance_level=skill["importance"]
            )

            db.add(role_skill)

        db.commit()

    print("Roles seeded successfully")