from sqlalchemy import text


class RoleAlignmentEngine:

    @staticmethod
    def find_best_roles(db, resume_embedding):

        # convert numpy → list
        try:
            resume_embedding = resume_embedding.tolist()
        except AttributeError:
            pass

        query = text("""
        SELECT
            r.id,
            r.name,
            r.description,
            1 - (re.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM role_embeddings re
        JOIN roles r ON r.id = re.role_id
        ORDER BY re.embedding <=> CAST(:embedding AS vector)
        LIMIT 5
        """)

        result = db.execute(
            query,
            {"embedding": resume_embedding}
        ).fetchall()

        matches = []

        for row in result:
            matches.append({
                "role_id": row.id,
                "role_name": row.name,
                "description": row.description,
                "similarity": float(row.similarity)
            })

        return matches


    # =========================
    # SAFE ROLE ALIGNMENT
    # =========================

    @staticmethod
    def find_best_roles_safe(db, resume_embedding):
        """
        Prevent crashes if vector search fails.
        """

        try:
            return RoleAlignmentEngine.find_best_roles(db, resume_embedding)
        except Exception as e:
            print("Role alignment error:", str(e))
            return []


    # =========================
    # SKILL-BASED ROLE MATCHING
    # =========================

    @staticmethod
    def match_roles_by_skills(db, resume_skills):

        if not resume_skills:
            return []

        role_scores = {}

        role_skills = db.execute(text("""
        SELECT role_id, skill_name, weight
        FROM role_skills
        """)).fetchall()

        resume_skill_set = set([s.lower() for s in resume_skills])

        for row in role_skills:

            skill_name = row.skill_name.lower()

            if skill_name in resume_skill_set:

                role_scores[row.role_id] = role_scores.get(row.role_id, 0) + row.weight

        results = []

        for role_id, score in sorted(role_scores.items(), key=lambda x: x[1], reverse=True)[:5]:

            role = db.execute(text("""
            SELECT id, name, description
            FROM roles
            WHERE id = :role_id
            """), {"role_id": role_id}).fetchone()

            if role:
                results.append({
                    "role_id": role.id,
                    "role_name": role.name,
                    "description": role.description,
                    "similarity": float(score)
                })

        return results


    # =========================
    # HYBRID ROLE MATCHING
    # =========================

    @staticmethod
    def hybrid_role_match(db, resume_embedding, resume_skills):

        embedding_matches = RoleAlignmentEngine.find_best_roles_safe(
            db,
            resume_embedding
        )

        skill_matches = RoleAlignmentEngine.match_roles_by_skills(
            db,
            resume_skills
        )

        combined_scores = {}

        for match in embedding_matches:
            combined_scores[match["role_name"]] = match["similarity"]

        for match in skill_matches:

            role_name = match["role_name"]

            if role_name in combined_scores:
                combined_scores[role_name] += match["similarity"] * 0.3
            else:
                combined_scores[role_name] = match["similarity"] * 0.3

        ranked = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)

        results = []

        for role_name, score in ranked[:5]:
            results.append({
                "role_name": role_name,
                "similarity": float(round(score, 3))
            })

        return results