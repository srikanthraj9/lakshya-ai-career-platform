INTERVIEW_QUESTION_PROMPT = """
You are a senior technical interviewer.

Generate 5 technical interview questions for a candidate with the following skills:

{skills}

Focus on backend engineering, system design, APIs, databases, scalability, and debugging.
Return only the questions in a numbered list.
"""


RESUME_REWRITE_PROMPT = """
You are an expert ATS resume writer and resume parser.

Convert the raw resume into ONLY valid JSON using this exact schema:
{{
  "name": "",
  "phone": "",
  "email": "",
  "linkedin": "",
  "github": "",
  "portfolio": "",
  "summary": "",
  "education": [
    {{
      "college": "",
      "degree": "",
      "year": "",
      "cgpa": ""
    }}
  ],
  "experience": [
    {{
      "role": "",
      "company": "",
      "duration": "",
      "points": ["", ""]
    }}
  ],
  "projects": [
    {{
      "title": "",
      "duration": "",
      "points": ["", ""]
    }}
  ],
  "skills": {{
    "programming": [],
    "web": [],
    "cs": [],
    "databases": [],
    "tools": [],
    "professional": []
  }},
  "certifications": []
}}

Rules:
- No markdown.
- Return all keys even if values are empty.
- Keep content factual and grounded in the source.
- Prefer concise ATS-friendly wording.
- Escape nothing; return plain text only.
- Bullet arrays should contain short recruiter-friendly bullets.

Optional target job description:
{job_description}

Resume Text:
{resume_text}
"""


RESUME_FEEDBACK_PROMPT = """
You are an expert resume reviewer.

Analyze the resume below and return ONLY valid JSON using this schema:
{{
  "summary": ["high-priority recommendation"],
  "weak_bullet_points": ["rewrite suggestion"],
  "formatting_issues": ["issue"],
  "llm_feedback": ["additional recommendation"]
}}

Job Description:
{job_description}

ATS Score:
{ats_score}

Missing Skills:
{missing_skills}

Resume Text:
{resume_text}
"""
