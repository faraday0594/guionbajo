"""
Guionbajo — Comprehensive CEFR & Phonetics Diagnosis Engine
Generates and evaluates an 80-question comprehensive exam:
- 60 Curricular Questions (6 level bands x 10 questions)
- 20 Phonetic Questions (10 Pure Audio + 10 Highlighted Word)
Supports dynamic option randomization and full/partial exam evaluation.
"""
import json
import random
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from core.minimax_agent import TutorAgent, LEVEL_SEQUENCE, SUBLEVEL_DESCRIPTIONS
from core.diagnosis_bank import (
    CURRICULAR_QUESTIONS_60,
    PHONETIC_QUESTIONS_20,
    get_all_diagnosis_questions
)

logger = logging.getLogger(__name__)


class DiagnosisEngine:
    def __init__(self, agent: TutorAgent):
        self.agent = agent
        self.all_questions = get_all_diagnosis_questions()
        self.question_map = {q["id"]: q for q in self.all_questions}

    async def generate_exam(self) -> list:
        """
        Return all 80 questions with randomized options positions.
        Ensures that correct answers are never fixed to option A.
        """
        logger.info("Delivering 80-question diagnosis exam with randomized options order")
        shuffled_questions = []
        for q in self.all_questions:
            q_copy = dict(q)
            opts = list(q.get("options", []))
            random.shuffle(opts)
            q_copy["options"] = opts
            shuffled_questions.append(q_copy)
        return shuffled_questions

    async def evaluate_exam(self, questions: list, answers: list) -> dict:
        """
        Comprehensive evaluation of curricular and phonetic performance.
        Supports both partial evaluation (if student finishes early) and full 80-question evaluation.
        Determines exact CEFR sublevel (A1.1 -> B2.4) and populates initial phonetic mastery.
        """
        # Build answer map by question_id
        ans_map = {}
        for a in answers:
            qid = a.get("question_id")
            if qid is not None:
                ans_map[qid] = str(a.get("answer", "")).strip().lower()

        # Separate questions into Curricular (1-60) and Phonetics (61-80)
        curricular_results = []
        phonetic_results = []

        for q in self.all_questions:
            qid = q["id"]
            user_ans = ans_map.get(qid, "")
            corr_ans = str(q.get("correct_answer", "")).strip().lower()
            is_correct = bool(user_ans and user_ans == corr_ans)

            item = {
                "id": qid,
                "section": q.get("section", "curriculum"),
                "level": q.get("level", "A1.1"),
                "band": q.get("band", 1),
                "topic": q.get("topic") or q.get("phoneme_symbol", ""),
                "type": q.get("type", "grammar"),
                "user_answer": user_ans,
                "correct_answer": corr_ans,
                "is_correct": is_correct,
                "points": q.get("points", 5),
            }

            if q.get("section") == "phonetics" or qid > 60:
                item["phoneme_symbol"] = q.get("phoneme_symbol", "")
                phonetic_results.append(item)
            else:
                curricular_results.append(item)

        # ─── 1. EVALUATE CURRICULAR PERFORMANCE ───────────────────────
        attempted_curricular = [item for item in curricular_results if item["user_answer"]]
        total_attempted_curr = len(attempted_curricular)

        band_stats = {b: {"attempted": 0, "correct": 0, "total_bank": 10} for b in range(1, 7)}
        for item in curricular_results:
            b = item.get("band", 1)
            if b in band_stats:
                if item["user_answer"]:
                    band_stats[b]["attempted"] += 1
                    if item["is_correct"]:
                        band_stats[b]["correct"] += 1

        curr_correct = sum(1 for item in attempted_curricular if item["is_correct"])

        def get_band_pct(b):
            att = band_stats[b]["attempted"]
            return (band_stats[b]["correct"] / att) * 100.0 if att > 0 else 0.0

        b1_pct = get_band_pct(1)
        b2_pct = get_band_pct(2)
        b3_pct = get_band_pct(3)
        b4_pct = get_band_pct(4)
        b5_pct = get_band_pct(5)
        b6_pct = get_band_pct(6)

        # Determine level based on demonstrated progressive mastery
        if total_attempted_curr == 0:
            assigned_level = "A1.1"
        elif band_stats[1]["attempted"] > 0 and b1_pct < 60:
            assigned_level = "A1.1"
        elif band_stats[1]["attempted"] > 0 and b1_pct < 85 and band_stats[2]["attempted"] == 0:
            assigned_level = "A1.2"
        elif band_stats[2]["attempted"] > 0 and b2_pct < 60:
            assigned_level = "A1.3"
        elif band_stats[2]["attempted"] > 0 and b2_pct < 85 and band_stats[3]["attempted"] == 0:
            assigned_level = "A1.4"
        elif band_stats[3]["attempted"] > 0 and b3_pct < 60:
            assigned_level = "A2.1"
        elif band_stats[3]["attempted"] > 0 and b3_pct < 85 and band_stats[4]["attempted"] == 0:
            assigned_level = "A2.2"
        elif band_stats[4]["attempted"] > 0 and b4_pct < 60:
            assigned_level = "A2.3"
        elif band_stats[4]["attempted"] > 0 and b4_pct < 85 and band_stats[5]["attempted"] == 0:
            assigned_level = "A2.4"
        elif band_stats[5]["attempted"] > 0 and b5_pct < 60:
            assigned_level = "B1.1"
        elif band_stats[5]["attempted"] > 0 and b5_pct < 85 and band_stats[6]["attempted"] == 0:
            assigned_level = "B1.2"
        elif band_stats[6]["attempted"] > 0 and b6_pct < 50:
            assigned_level = "B1.3"
        elif band_stats[6]["attempted"] > 0 and b6_pct < 70:
            assigned_level = "B1.4"
        elif band_stats[6]["attempted"] > 0 and b6_pct < 85:
            assigned_level = "B2.1"
        elif band_stats[6]["attempted"] > 0 and b6_pct < 95:
            assigned_level = "B2.2"
        elif band_stats[6]["attempted"] > 0 and b6_pct >= 95:
            assigned_level = "B2.4"
        else:
            # Fallback based on highest attempted band with good performance
            if band_stats[6]["attempted"] > 0 and b6_pct >= 60:
                assigned_level = "B2.1"
            elif band_stats[5]["attempted"] > 0 and b5_pct >= 60:
                assigned_level = "B1.2"
            elif band_stats[4]["attempted"] > 0 and b4_pct >= 60:
                assigned_level = "A2.4"
            elif band_stats[3]["attempted"] > 0 and b3_pct >= 60:
                assigned_level = "A2.2"
            elif band_stats[2]["attempted"] > 0 and b2_pct >= 60:
                assigned_level = "A1.4"
            else:
                assigned_level = "A1.2" if b1_pct >= 70 else "A1.1"

        # CEFR score breakdown (approximate 0-100 per stage)
        score_by_level = {
            "A1": round((b1_pct + b2_pct) / 2.0, 1),
            "A2": round((b3_pct + b4_pct) / 2.0, 1),
            "B1": round((b5_pct + min(b6_pct * 1.2, 100)) / 2.0, 1),
            "B2": round(b6_pct, 1),
        }

        # ─── 2. EVALUATE PHONETIC PERFORMANCE ─────────────────────────
        attempted_phonetic = [item for item in phonetic_results if item["user_answer"]]
        total_attempted_phon = len(attempted_phonetic)
        phonetic_correct = sum(1 for item in attempted_phonetic if item["is_correct"])
        phonetic_pct = round((phonetic_correct / max(total_attempted_phon, 1)) * 100.0, 1) if total_attempted_phon > 0 else 0.0

        now_iso = datetime.now(timezone.utc).isoformat()
        phonetics_mastery_dict = {}
        mastered_phonemes = []
        weak_phonemes = []

        for item in attempted_phonetic:
            sym = item.get("phoneme_symbol")
            if not sym:
                continue
            is_corr = item["is_correct"]
            mastery_score = 95.0 if is_corr else 30.0
            phonetics_mastery_dict[sym] = {
                "mastery": mastery_score,
                "times_practiced": 1,
                "last_seen_date": now_iso,
            }
            if is_corr:
                if sym not in mastered_phonemes:
                    mastered_phonemes.append(sym)
            else:
                if sym not in weak_phonemes:
                    weak_phonemes.append(sym)

        # Strengths and weaknesses extraction
        strong_areas = []
        weak_areas = []
        for item in attempted_curricular:
            topic = item["topic"]
            if item["is_correct"]:
                if topic not in strong_areas and len(strong_areas) < 4:
                    strong_areas.append(topic)
            else:
                if topic not in weak_areas and len(weak_areas) < 4:
                    weak_areas.append(topic)

        agent_reasoning = (
            f"Diagnóstico completado con {total_attempted_curr} respuestas curriculares ({curr_correct} aciertos) "
            f"y {total_attempted_phon} pruebas fonéticas ({phonetic_correct} aciertos). "
            f"Nivel asignado: {assigned_level}. "
            f"Se identificaron {len(mastered_phonemes)} fonemas dominados y {len(weak_phonemes)} fonemas para reforzar."
        )

        recommendation = (
            f"Comenzar en el subnivel {assigned_level}. "
            f"Tu ruta de aprendizaje integrará las 4 clases de este nivel y entrenamiento fonético personalizado."
        )

        return {
            "assigned_level": assigned_level,
            "score_by_level": score_by_level,
            "total_score": (curr_correct * 5) + (phonetic_correct * 5),
            "strong_areas": strong_areas,
            "weak_areas": weak_areas,
            "agent_reasoning": agent_reasoning,
            "recommendation": recommendation,
            "confidence": 0.92 if total_attempted_curr >= 20 else 0.75,
            "phonetic_mastery_pct": phonetic_pct,
            "phonetic_breakdown": {
                "correct": phonetic_correct,
                "total": total_attempted_phon,
                "pure_sound_correct": sum(1 for p in attempted_phonetic if p.get("type") == "phonetic_sound" and p["is_correct"]),
                "word_highlight_correct": sum(1 for p in attempted_phonetic if p.get("type") == "phonetic_word" and p["is_correct"]),
            },
            "mastered_phonemes": mastered_phonemes,
            "weak_phonemes": weak_phonemes,
            "phonetics_mastery_dict": phonetics_mastery_dict,
        }
