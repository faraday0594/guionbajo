"""
Guionbajo — Adaptive Diagnosis Engine
Generates and evaluates a 20-question adaptive CEFR placement exam.
"""
import json
import logging
from core.minimax_agent import TutorAgent, LEVEL_SEQUENCE, SUBLEVEL_DESCRIPTIONS

logger = logging.getLogger(__name__)

DIAGNOSIS_SYSTEM_PROMPT = """You are an expert CEFR English placement test designer.
Generate a precise 20-question adaptive exam that accurately determines a student's English level from A1.1 to B2.4.

The exam MUST cover all difficulty bands:
- Questions 1-4: A1 level (very basic)
- Questions 5-8: A2 level (elementary)
- Questions 9-12: B1 level (intermediate)
- Questions 13-16: Upper-B1 to B2.1
- Questions 17-20: B2 level (upper-intermediate)

Question types (mix them):
- vocabulary: Multiple choice, 4 options. Tests word knowledge appropriate for the level.
- grammar: Fill in blank or multiple choice. Tests grammar structures.
- reading: Short sentence/paragraph then a comprehension question.
- translation: Spanish sentence → English (for A1/A2 levels)
- error_correction: Find the mistake in a sentence.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": 1,
      "level": "A1.1",
      "type": "vocabulary",
      "question": "What is the English word for 'gato'?",
      "options": ["dog", "cat", "bird", "fish"],
      "correct_answer": "cat",
      "audio_text": null,
      "points": 5
    }
  ]
}

IMPORTANT:
- For 'listening' type questions, set audio_text to the text that will be played via TTS.
- Make questions culturally neutral.
- Use real English words and realistic sentences.
- Each question should have exactly 4 options for multiple choice.
"""

EVALUATION_SYSTEM_PROMPT = """You are a CEFR level evaluator. Given a student's exam answers, determine their precise English level.

Analyze:
1. Which questions they got right vs wrong
2. The CEFR level of each question they answered correctly
3. The pattern of errors (vocabulary gaps? grammar issues? comprehension?)

Return ONLY valid JSON:
{
  "assigned_level": "A2.3",
  "confidence": 0.85,
  "score_by_level": {
    "A1": 95,
    "A2": 70,
    "B1": 30,
    "B2": 10
  },
  "total_score": 65,
  "strong_areas": ["vocabulary", "reading"],
  "weak_areas": ["grammar", "past_tense"],
  "agent_reasoning": "The student performed well on A1 and basic A2 questions but struggled with past simple forms and B1 grammar structures. Recommended starting point is A2.3 to reinforce intermediate A2 grammar before advancing.",
  "recommendation": "Start at A2.3 — Practical English. Focus on modal verbs and present perfect."
}
"""


class DiagnosisEngine:
    def __init__(self, agent: TutorAgent):
        self.agent = agent

    async def generate_exam(self) -> list:
        """Generate 20 adaptive questions covering A1.1 → B2.4."""
        try:
            response = await self.agent.client.chat.completions.create(
                model=self.agent.model,
                messages=[
                    {"role": "system", "content": DIAGNOSIS_SYSTEM_PROMPT},
                    {"role": "user", "content": (
                        "Generate 20 questions for a CEFR placement test. "
                        "Questions 1-4 should be A1 level, 5-8 A2, 9-12 B1, 13-16 upper-B1/B2.1, 17-20 B2. "
                        "Mix vocabulary, grammar, reading, and error_correction types. "
                        "Make them engaging and realistic."
                    )},
                ],
                response_format={"type": "json_object"},
                extra_body={"thinking": {"type": "adaptive"}},
            )
            data = json.loads(response.choices[0].message.content)
            questions = data.get("questions", [])
            logger.info(f"Generated {len(questions)} diagnosis questions")
            return questions
        except Exception as e:
            logger.error(f"Exam generation error: {e}")
            return self._fallback_questions()

    async def evaluate_exam(self, questions: list, answers: list) -> dict:
        """Evaluate all answers and assign precise CEFR sublevel."""
        # Build evaluation context
        qa_pairs = []
        for q in questions:
            qid = q.get("id")
            student_answer = next((a.get("answer") for a in answers if a.get("question_id") == qid), None)
            is_correct = student_answer and student_answer.strip().lower() == q.get("correct_answer", "").strip().lower()
            qa_pairs.append({
                "question_id": qid,
                "level": q.get("level"),
                "type": q.get("type"),
                "correct_answer": q.get("correct_answer"),
                "student_answer": student_answer,
                "is_correct": is_correct,
                "points": q.get("points", 5),
            })

        correct_count = sum(1 for qa in qa_pairs if qa["is_correct"])
        total = len(qa_pairs)

        try:
            response = await self.agent.client.chat.completions.create(
                model=self.agent.model,
                messages=[
                    {"role": "system", "content": EVALUATION_SYSTEM_PROMPT},
                    {"role": "user", "content": (
                        f"Evaluate these exam results:\n"
                        f"Total questions: {total}\n"
                        f"Correct answers: {correct_count}\n"
                        f"Detailed results:\n{json.dumps(qa_pairs, indent=2)}\n\n"
                        f"Determine the student's precise CEFR sublevel and provide detailed reasoning."
                    )},
                ],
                response_format={"type": "json_object"},
                extra_body={"thinking": {"type": "enabled"}},
            )
            data = json.loads(response.choices[0].message.content)
            return {
                "assigned_level": data.get("assigned_level", "A1.1"),
                "score_by_level": data.get("score_by_level", {}),
                "total_score": data.get("total_score", correct_count * 5),
                "strong_areas": data.get("strong_areas", []),
                "weak_areas": data.get("weak_areas", []),
                "agent_reasoning": data.get("agent_reasoning", ""),
                "recommendation": data.get("recommendation", ""),
                "confidence": data.get("confidence", 0.8),
            }
        except Exception as e:
            logger.error(f"Exam evaluation error: {e}")
            # Fallback: calculate from score percentage
            pct = (correct_count / max(total, 1)) * 100
            level = self._level_from_percentage(pct)
            return {
                "assigned_level": level,
                "score_by_level": {},
                "total_score": correct_count * 5,
                "strong_areas": [],
                "weak_areas": [],
                "agent_reasoning": f"Assigned based on {correct_count}/{total} correct answers ({pct:.0f}%)",
                "recommendation": f"Start at {level}",
                "confidence": 0.6,
            }

    def _level_from_percentage(self, pct: float) -> str:
        if pct < 15:  return "A1.1"
        if pct < 25:  return "A1.2"
        if pct < 35:  return "A1.3"
        if pct < 45:  return "A1.4"
        if pct < 50:  return "A2.1"
        if pct < 55:  return "A2.2"
        if pct < 60:  return "A2.3"
        if pct < 65:  return "A2.4"
        if pct < 70:  return "B1.1"
        if pct < 75:  return "B1.2"
        if pct < 80:  return "B1.3"
        if pct < 85:  return "B1.4"
        if pct < 90:  return "B2.1"
        if pct < 95:  return "B2.2"
        if pct < 98:  return "B2.3"
        return "B2.4"

    def _fallback_questions(self) -> list:
        """Minimal fallback if API call fails."""
        return [
            {"id": 1, "level": "A1.1", "type": "vocabulary", "question": "What is 'hello' in a greeting context?", "options": ["Goodbye", "Hello", "Thank you", "Please"], "correct_answer": "Hello", "audio_text": None, "points": 5},
            {"id": 2, "level": "A1.2", "type": "grammar", "question": "Complete: 'My name ___ Maria.'", "options": ["am", "is", "are", "be"], "correct_answer": "is", "audio_text": None, "points": 5},
            {"id": 3, "level": "A2.1", "type": "grammar", "question": "Yesterday, I ___ to the store.", "options": ["go", "goes", "went", "going"], "correct_answer": "went", "audio_text": None, "points": 5},
            {"id": 4, "level": "B1.1", "type": "grammar", "question": "I ___ lived in Madrid for 5 years.", "options": ["have", "had", "has", "having"], "correct_answer": "have", "audio_text": None, "points": 5},
            {"id": 5, "level": "B2.1", "type": "error_correction", "question": "Find the error: 'If I would have more time, I would study more.'", "options": ["would have → had", "would study → studied", "more time → times", "no error"], "correct_answer": "would have → had", "audio_text": None, "points": 5},
        ]
