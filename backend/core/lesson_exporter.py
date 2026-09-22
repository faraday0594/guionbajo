"""
lesson_exporter.py — Motor Profesional de Exportación de Clases
Genera presentaciones PowerPoint (.pptx 16:9), guías de estudio Word (.docx)
y documentos vectoriales PDF (.pdf) con diseño corporativo y pedagógico de alta calidad.
"""

import os
import io
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field

# PowerPoint
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Word
import docx
from docx import Document
from docx.shared import Inches as DocxInches, Pt as DocxPt, RGBColor as DocxRGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

# PDF (ReportLab)
from reportlab.lib.pagesizes import letter as letter_pagesize
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


# ─── ESTRUCTURAS DE DATOS DE LA CLASE ──────────────────────────────────────────

@dataclass
class FormulaToken:
    role: str
    example: str
    color: Optional[str] = "blue"

@dataclass
class ExampleSentence:
    english: str
    spanish: str
    tip: Optional[str] = ""

@dataclass
class CommonMistake:
    incorrect: str
    correct: str
    why: str

@dataclass
class LessonStage:
    stage_number: int
    title: str
    objective: str
    explanation: str
    formula: str
    formula_tokens: List[FormulaToken] = field(default_factory=list)
    examples: List[ExampleSentence] = field(default_factory=list)
    common_mistake: Optional[CommonMistake] = None

@dataclass
class QuizQuestion:
    question_number: int
    question: str
    options: Dict[str, str] = field(default_factory=dict)  # "A", "B", "C", "D"
    correct_option: str = "A"
    explanation: str = ""

@dataclass
class ContrastTable:
    title: str
    headers: List[str] = field(default_factory=list)
    rows: List[List[str]] = field(default_factory=list)

@dataclass
class LessonExportData:
    topic: str
    sublevel: str
    pedagogical_objective: str
    mental_model: str
    stages: List[LessonStage] = field(default_factory=list)
    contrast_table: Optional[ContrastTable] = None
    quiz: List[QuizQuestion] = field(default_factory=list)
    summary_takeaways: List[str] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> "LessonExportData":
        stages = []
        for s in data.get("stages", []):
            tokens = [FormulaToken(**t) if isinstance(t, dict) else FormulaToken("Elemento", str(t)) for t in s.get("formula_tokens", [])]
            examples = [ExampleSentence(**e) if isinstance(e, dict) else ExampleSentence(str(e), "", "") for e in s.get("examples", [])]
            mistake = None
            if s.get("common_mistake"):
                cm = s["common_mistake"]
                mistake = CommonMistake(
                    incorrect=cm.get("incorrect", ""),
                    correct=cm.get("correct", ""),
                    why=cm.get("why", "")
                )
            raw_title = str(s.get("title", f"Etapa {len(stages) + 1}")).strip()
            clean_title = re.sub(r'^(?:fase|stage|etapa)\s*\d+[\s:\-–—]+', '', raw_title, flags=re.IGNORECASE).strip()
            stages.append(LessonStage(
                stage_number=s.get("stage_number", len(stages) + 1),
                title=clean_title or raw_title,
                objective=s.get("objective", ""),
                explanation=s.get("explanation", ""),
                formula=s.get("formula", ""),
                formula_tokens=tokens,
                examples=examples,
                common_mistake=mistake
            ))

        contrast = None
        if data.get("contrast_table"):
            ct = data["contrast_table"]
            contrast = ContrastTable(
                title=ct.get("title", "Tabla Comparativa"),
                headers=ct.get("headers", []),
                rows=ct.get("rows", [])
            )

        quiz = []
        for q in data.get("quiz", []):
            quiz.append(QuizQuestion(
                question_number=q.get("question_number", len(quiz) + 1),
                question=q.get("question", ""),
                options=q.get("options", {}),
                correct_option=q.get("correct_option", "A"),
                explanation=q.get("explanation", "")
            ))

        return cls(
            topic=data.get("topic", "Clase de Inglés"),
            sublevel=data.get("sublevel", "B1.1"),
            pedagogical_objective=data.get("pedagogical_objective", ""),
            mental_model=data.get("mental_model", ""),
            stages=stages,
            contrast_table=contrast,
            quiz=quiz,
            summary_takeaways=data.get("summary_takeaways", [])
        )


# ─── 1. POWERPOINT EXPORTER (16:9 Widescreen Cyber-Dark & Emerald) ────────────

class PowerPointLessonExporter:
    """Generador de presentaciones PowerPoint 16:9 de alto impacto visual."""

    # Paleta de colores PPTX
    C_BG = RGBColor(11, 19, 43)          # Deep Slate #0B132B
    C_CARD = RGBColor(23, 37, 84)        # Card Navy #172554
    C_CARD_BORDER = RGBColor(30, 58, 138)# Border Navy #1E3A8A
    C_CYAN = RGBColor(0, 212, 255)       # Electric Cyan #00D4FF
    C_EMERALD = RGBColor(16, 185, 129)   # Emerald #10B981
    C_AMBER = RGBColor(245, 158, 11)     # Amber #F59E0B
    C_RED = RGBColor(239, 68, 68)        # Red #EF4444
    C_TEXT_LIGHT = RGBColor(248, 250, 252) # White/Light Slate #F8FAFC
    C_TEXT_MUTED = RGBColor(148, 163, 184) # Muted Slate #94A3B8

    def __init__(self, data: LessonExportData):
        self.data = data
        self.prs = Presentation()
        # Formato 16:9 Widescreen (13.333 x 7.5 pulgadas)
        self.prs.slide_width = Inches(13.333)
        self.prs.slide_height = Inches(7.5)
        self.blank_layout = self.prs.slide_layouts[6]

    def _set_slide_background(self, slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = self.C_BG

    def _add_header(self, slide, title: str, category: str = "GUIONBAJO AI TUTOR"):
        # Header banner
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.733), Inches(0.9))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_cat = tf.paragraphs[0]
        p_cat.text = f"{category.upper()}  •  NIVEL CEFR: {self.data.sublevel}"
        p_cat.font.name = "Arial"
        p_cat.font.size = Pt(10)
        p_cat.font.bold = True
        p_cat.font.color.rgb = self.C_CYAN

        p_title = tf.add_paragraph()
        p_title.text = title
        p_title.font.name = "Arial"
        p_title.font.size = Pt(22)
        p_title.font.bold = True
        p_title.font.color.rgb = self.C_TEXT_LIGHT

    def build_slide_cover(self):
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)

        # Decorative glowing card in center
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(1.2), Inches(1.2), Inches(10.933), Inches(5.1)
        )
        card.fill.solid()
        card.fill.fore_color.rgb = self.C_CARD
        card.line.color.rgb = self.C_CYAN
        card.line.width = Pt(2)

        tf = card.text_frame
        tf.word_wrap = True
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE

        p0 = tf.paragraphs[0]
        p0.alignment = PP_ALIGN.CENTER
        p0.text = "🤖 GUIONBAJO AI TUTOR  |  MASTERCLASS OFICIAL CEFR"
        p0.font.name = "Arial"
        p0.font.size = Pt(14)
        p0.font.bold = True
        p0.font.color.rgb = self.C_CYAN
        p0.space_after = Pt(16)

        # Dynamic title sizing to prevent collision on cover
        p1 = tf.add_paragraph()
        p1.alignment = PP_ALIGN.CENTER
        p1.text = self.data.topic
        p1.font.name = "Arial"
        title_len = len(self.data.topic)
        p1.font.size = Pt(22 if title_len > 55 else (26 if title_len > 35 else 32))
        p1.font.bold = True
        p1.font.color.rgb = self.C_TEXT_LIGHT
        p1.space_after = Pt(14)

        p2 = tf.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        p2.text = f"Nivel Objetivo: {self.data.sublevel}  •  Enfoque Comunicativo de Alta Retención"
        p2.font.name = "Arial"
        p2.font.size = Pt(13)
        p2.font.color.rgb = self.C_EMERALD
        p2.space_after = Pt(12)

        if self.data.pedagogical_objective:
            p3 = tf.add_paragraph()
            p3.alignment = PP_ALIGN.CENTER
            p3.text = f"🎯 Objetivo: {self.data.pedagogical_objective}"
            p3.font.name = "Arial"
            p3.font.size = Pt(11)
            p3.font.italic = True
            p3.font.color.rgb = self.C_TEXT_MUTED

    def build_slide_mental_model(self):
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(slide, "Modelo Mental y Cambio de Paradigma", "FUNDAMENTOS CONCEPTUALES")

        # Tarjeta Central Amplia (11.733" de ancho)
        card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), Inches(1.45), Inches(11.733), Inches(5.35)
        )
        card.fill.solid()
        card.fill.fore_color.rgb = self.C_CARD
        card.line.color.rgb = self.C_CYAN
        card.line.width = Pt(1.5)
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = Inches(0.35)
        tf.margin_bottom = Inches(0.2)

        p0 = tf.paragraphs[0]
        p0.text = "🧠 ¿CÓMO PENSAR EN ESTE TEMA EN INGLÉS?"
        p0.font.name = "Arial"
        p0.font.size = Pt(16)
        p0.font.bold = True
        p0.font.color.rgb = self.C_CYAN
        p0.space_after = Pt(4)

        p_sub = tf.add_paragraph()
        p_sub.text = "CAMBIO DE PERSPECTIVA COGNITIVA ANTES DE APLICAR REGLAS GRAMATICALES"
        p_sub.font.name = "Arial"
        p_sub.font.size = Pt(10)
        p_sub.font.bold = True
        p_sub.font.color.rgb = self.C_TEXT_MUTED
        p_sub.space_after = Pt(14)

        p1 = tf.add_paragraph()
        p1.text = self.data.mental_model or "Domina el modelo mental antes de memorizar reglas. Conecta el concepto con su uso real en conversación."
        p1.font.name = "Arial"
        mm_len = len(self.data.mental_model or "")
        p1.font.size = Pt(11.5 if mm_len > 450 else 12.5)
        p1.font.color.rgb = self.C_TEXT_LIGHT
        p1.space_after = Pt(16)

        # Callout inferior: Regla de oro de mentalidad
        callout = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(1.15), Inches(5.25), Inches(11.033), Inches(1.25)
        )
        callout.fill.solid()
        callout.fill.fore_color.rgb = RGBColor(15, 23, 42)
        callout.line.color.rgb = self.C_EMERALD
        callout.line.width = Pt(1.2)
        tf_c = callout.text_frame
        tf_c.word_wrap = True
        tf_c.margin_left = tf_c.margin_right = tf_c.margin_top = tf_c.margin_bottom = Inches(0.2)
        tf_c.vertical_anchor = MSO_ANCHOR.MIDDLE

        pc0 = tf_c.paragraphs[0]
        pc0.text = "💡 REGLA DE ORO COGNITIVA:"
        pc0.font.name = "Arial"
        pc0.font.size = Pt(10.5)
        pc0.font.bold = True
        pc0.font.color.rgb = self.C_EMERALD
        pc0.space_after = Pt(3)

        pc1 = tf_c.add_paragraph()
        pc1.text = "No traduzcas palabra por palabra del español. Decide qué elemento debe estar en primer plano informativo y deja que la estructura guíe naturalmente la atención de tu interlocutor."
        pc1.font.name = "Arial"
        pc1.font.size = Pt(10.5)
        pc1.font.color.rgb = self.C_TEXT_LIGHT

    def build_slide_roadmap(self):
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(slide, "Hoja de Ruta y Competencias Clave", "ARQUITECTURA DEL APRENDIZAJE")

        takeaways = list(self.data.summary_takeaways) if self.data.summary_takeaways else [
            "Comprender la intención comunicativa y el cambio de perspectiva frente al español.",
            "Automatizar la fórmula estructural y la concordancia de auxiliares.",
            "Aplicar la estructura en contextos reales: noticias, negocios y procedimientos.",
            "Detectar y neutralizar trampas habituales de interferencia lingüística."
        ]
        while len(takeaways) < 4:
            takeaways.append("Consolidar fluidez y precisión mediante práctica reflexiva contextualizada.")

        # Cuadrícula 2x2 espaciosa
        grid_positions = [
            (Inches(0.8), Inches(1.45), self.C_CYAN),
            (Inches(6.8), Inches(1.45), self.C_EMERALD),
            (Inches(0.8), Inches(4.25), self.C_EMERALD),
            (Inches(6.8), Inches(4.25), self.C_CYAN),
        ]

        for i, (x_pos, y_pos, border_col) in enumerate(grid_positions[:4]):
            item_text = takeaways[i]
            card = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE,
                x_pos, y_pos, Inches(5.7), Inches(2.55)
            )
            card.fill.solid()
            card.fill.fore_color.rgb = self.C_CARD
            card.line.color.rgb = border_col
            card.line.width = Pt(1.5)
            tf = card.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(0.25)
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE

            p0 = tf.paragraphs[0]
            p0.text = f"🎯 HITO DIDÁCTICO 0{i+1}:"
            p0.font.name = "Arial"
            p0.font.size = Pt(11)
            p0.font.bold = True
            p0.font.color.rgb = border_col
            p0.space_after = Pt(6)

            p1 = tf.add_paragraph()
            p1.text = item_text
            p1.font.name = "Arial"
            p1.font.size = Pt(11.5 if len(item_text) < 180 else 10.5)
            p1.font.color.rgb = self.C_TEXT_LIGHT

    def build_slide_stage_theory(self, stage: LessonStage):
        """Diapositiva Parte 1: Teoría profunda, objetivo y fórmula matriz a ancho completo."""
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(
            slide,
            f"Fase {stage.stage_number}: {stage.title}",
            f"ETAPA DIDÁCTICA {stage.stage_number} DE {len(self.data.stages)}  •  TEORÍA Y ESTRUCTURA"
        )

        # ── Card Superior: Explicación y Fundamento Pedagógico (Ancho Completo) ──
        top_card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), Inches(1.45), Inches(11.733), Inches(3.05)
        )
        top_card.fill.solid()
        top_card.fill.fore_color.rgb = self.C_CARD
        top_card.line.color.rgb = self.C_CARD_BORDER
        top_card.line.width = Pt(1)
        tf_top = top_card.text_frame
        tf_top.word_wrap = True
        tf_top.margin_left = tf_top.margin_right = tf_top.margin_top = Inches(0.25)
        tf_top.margin_bottom = Inches(0.15)

        p_obj = tf_top.paragraphs[0]
        p_obj.text = f"🎯 OBJETIVO DE LA FASE:  {stage.objective}"
        p_obj.font.name = "Arial"
        p_obj.font.size = Pt(11)
        p_obj.font.bold = True
        p_obj.font.color.rgb = self.C_CYAN
        p_obj.space_after = Pt(6)

        p_lbl = tf_top.add_paragraph()
        p_lbl.text = "📖 FUNDAMENTO Y EXPLICACIÓN CONCEPTUAL:"
        p_lbl.font.name = "Arial"
        p_lbl.font.size = Pt(10)
        p_lbl.font.bold = True
        p_lbl.font.color.rgb = self.C_EMERALD
        p_lbl.space_after = Pt(4)

        p_exp = tf_top.add_paragraph()
        p_exp.text = stage.explanation
        p_exp.font.name = "Arial"
        exp_len = len(stage.explanation)
        p_exp.font.size = Pt(10.5 if exp_len > 700 else (11 if exp_len > 400 else 11.5))
        p_exp.font.color.rgb = self.C_TEXT_LIGHT

        # ── Card Inferior: Fórmula Gramatical Maestra ──
        has_tokens = bool(stage.formula_tokens)
        formula_h = Inches(1.05) if has_tokens else Inches(2.2)

        formula_box = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), Inches(4.65), Inches(11.733), formula_h
        )
        formula_box.fill.solid()
        formula_box.fill.fore_color.rgb = RGBColor(15, 23, 42)
        formula_box.line.color.rgb = self.C_AMBER
        formula_box.line.width = Pt(1.5)
        tf_f = formula_box.text_frame
        tf_f.word_wrap = True
        tf_f.margin_left = tf_f.margin_right = Inches(0.25)
        tf_f.margin_top = tf_f.margin_bottom = Inches(0.12)
        tf_f.vertical_anchor = MSO_ANCHOR.MIDDLE

        pf0 = tf_f.paragraphs[0]
        pf0.text = "⚡ FÓRMULA GRAMATICAL MAESTRA"
        pf0.font.name = "Arial"
        pf0.font.size = Pt(10)
        pf0.font.bold = True
        pf0.font.color.rgb = self.C_AMBER
        pf0.space_after = Pt(2)

        pf1 = tf_f.add_paragraph()
        pf1.text = stage.formula or "[ Sujeto ] + [ Estructura ] + [ Complemento ]"
        pf1.font.name = "Courier New"
        pf1.font.size = Pt(13.5)
        pf1.font.bold = True
        pf1.font.color.rgb = self.C_TEXT_LIGHT

        # Mini-tarjetas horizontales para el desglose de tokens sintácticos
        if has_tokens:
            tokens_to_show = stage.formula_tokens[:4]
            num_tokens = len(tokens_to_show)
            gap = 0.2
            total_gap = gap * (num_tokens - 1)
            tok_w = (11.733 - total_gap) / num_tokens

            for idx, tok in enumerate(tokens_to_show):
                tok_x = 0.8 + idx * (tok_w + gap)
                tok_card = slide.shapes.add_shape(
                    MSO_SHAPE.ROUNDED_RECTANGLE,
                    Inches(tok_x), Inches(5.85), Inches(tok_w), Inches(1.05)
                )
                tok_card.fill.solid()
                tok_card.fill.fore_color.rgb = self.C_CARD
                tok_card.line.color.rgb = self.C_CYAN
                tok_card.line.width = Pt(1)
                tf_t = tok_card.text_frame
                tf_t.word_wrap = True
                tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = Inches(0.12)
                tf_t.vertical_anchor = MSO_ANCHOR.MIDDLE

                pt0 = tf_t.paragraphs[0]
                pt0.text = tok.role.upper()
                pt0.font.name = "Arial"
                pt0.font.size = Pt(9)
                pt0.font.bold = True
                pt0.font.color.rgb = self.C_CYAN
                pt0.space_after = Pt(2)

                pt1 = tf_t.add_paragraph()
                pt1.text = f'"{tok.example}"'
                pt1.font.name = "Arial"
                pt1.font.size = Pt(10.5)
                pt1.font.bold = True
                pt1.font.color.rgb = self.C_TEXT_LIGHT

    def build_slide_stage_practice(self, stage: LessonStage):
        """Diapositiva Parte 2: Casos prácticos y trampa común en 2 columnas verticales amplias."""
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(
            slide,
            f"Fase {stage.stage_number}: {stage.title}",
            f"ETAPA DIDÁCTICA {stage.stage_number} DE {len(self.data.stages)}  •  PRÁCTICA Y APLICACIÓN"
        )

        # ── Columna Izquierda: Ejemplos en Contexto Real ──
        left_card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), Inches(1.45), Inches(6.4), Inches(5.35)
        )
        left_card.fill.solid()
        left_card.fill.fore_color.rgb = self.C_CARD
        left_card.line.color.rgb = self.C_EMERALD
        left_card.line.width = Pt(1.5)
        tf_l = left_card.text_frame
        tf_l.word_wrap = True
        tf_l.margin_left = tf_l.margin_right = Inches(0.25)
        tf_l.margin_top = Inches(0.22)
        tf_l.margin_bottom = Inches(0.15)

        pex0 = tf_l.paragraphs[0]
        pex0.text = "🎯 CASOS DE USO Y EJEMPLOS REALES"
        pex0.font.name = "Arial"
        pex0.font.size = Pt(12.5)
        pex0.font.bold = True
        pex0.font.color.rgb = self.C_EMERALD
        pex0.space_after = Pt(10)

        for i, ex in enumerate(stage.examples[:3]):
            p_lbl = tf_l.add_paragraph()
            p_lbl.text = f"EJEMPLO 0{i+1}:"
            p_lbl.font.name = "Arial"
            p_lbl.font.size = Pt(9)
            p_lbl.font.bold = True
            p_lbl.font.color.rgb = self.C_CYAN

            p_eng = tf_l.add_paragraph()
            p_eng.text = f'"{ex.english}"'
            p_eng.font.name = "Arial"
            p_eng.font.size = Pt(11)
            p_eng.font.bold = True
            p_eng.font.color.rgb = self.C_TEXT_LIGHT

            p_spa = tf_l.add_paragraph()
            p_spa.text = f'  ➔ {ex.spanish}'
            p_spa.font.name = "Arial"
            p_spa.font.size = Pt(9.5)
            p_spa.font.color.rgb = self.C_TEXT_MUTED

            if ex.tip:
                p_tip = tf_l.add_paragraph()
                p_tip.text = f'  💡 Tip: {ex.tip}'
                p_tip.font.name = "Arial"
                p_tip.font.size = Pt(8.5)
                p_tip.font.italic = True
                p_tip.font.color.rgb = self.C_AMBER

            p_spa.space_after = Pt(8)

        # ── Columna Derecha: Trampa Frecuente y Corrección ──
        right_card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(7.45), Inches(1.45), Inches(5.083), Inches(5.35)
        )
        right_card.fill.solid()
        right_card.fill.fore_color.rgb = RGBColor(28, 15, 23)
        right_card.line.color.rgb = self.C_RED
        right_card.line.width = Pt(1.5)
        tf_r = right_card.text_frame
        tf_r.word_wrap = True
        tf_r.margin_left = tf_r.margin_right = Inches(0.25)
        tf_r.margin_top = Inches(0.22)
        tf_r.margin_bottom = Inches(0.15)

        perr0 = tf_r.paragraphs[0]
        perr0.text = "⚠️ ¡CUIDADO CON ESTE ERROR!"
        perr0.font.name = "Arial"
        perr0.font.size = Pt(12.5)
        perr0.font.bold = True
        perr0.font.color.rgb = self.C_RED
        perr0.space_after = Pt(2)

        perr_sub = tf_r.add_paragraph()
        perr_sub.text = "Trampa típica del hispanohablante al hablar o escribir"
        perr_sub.font.name = "Arial"
        perr_sub.font.size = Pt(9)
        perr_sub.font.bold = True
        perr_sub.font.color.rgb = self.C_TEXT_MUTED
        perr_sub.space_after = Pt(12)

        if stage.common_mistake:
            p_inc_lbl = tf_r.add_paragraph()
            p_inc_lbl.text = "❌ FORMA INCORRECTA (A EVITAR):"
            p_inc_lbl.font.name = "Arial"
            p_inc_lbl.font.size = Pt(9.5)
            p_inc_lbl.font.bold = True
            p_inc_lbl.font.color.rgb = self.C_RED
            p_inc_lbl.space_after = Pt(2)

            p_inc = tf_r.add_paragraph()
            p_inc.text = f'"{stage.common_mistake.incorrect}"'
            p_inc.font.name = "Arial"
            p_inc.font.size = Pt(10.5)
            p_inc.font.bold = True
            p_inc.font.color.rgb = self.C_RED
            p_inc.space_after = Pt(8)

            p_cor_lbl = tf_r.add_paragraph()
            p_cor_lbl.text = "✅ FORMA CORRECTA:"
            p_cor_lbl.font.name = "Arial"
            p_cor_lbl.font.size = Pt(9.5)
            p_cor_lbl.font.bold = True
            p_cor_lbl.font.color.rgb = self.C_EMERALD
            p_cor_lbl.space_after = Pt(2)

            p_cor = tf_r.add_paragraph()
            p_cor.text = f'"{stage.common_mistake.correct}"'
            p_cor.font.name = "Arial"
            p_cor.font.size = Pt(10.5)
            p_cor.font.bold = True
            p_cor.font.color.rgb = self.C_EMERALD
            p_cor.space_after = Pt(10)

            p_why_lbl = tf_r.add_paragraph()
            p_why_lbl.text = "🔍 ¿POR QUÉ OCURRE EL ERROR?:"
            p_why_lbl.font.name = "Arial"
            p_why_lbl.font.size = Pt(9.5)
            p_why_lbl.font.bold = True
            p_why_lbl.font.color.rgb = self.C_AMBER
            p_why_lbl.space_after = Pt(2)

            p_why = tf_r.add_paragraph()
            p_why.text = stage.common_mistake.why
            p_why.font.name = "Arial"
            p_why.font.size = Pt(9.5)
            p_why.font.color.rgb = self.C_TEXT_LIGHT
            p_why.space_after = Pt(10)

            p_rule_lbl = tf_r.add_paragraph()
            p_rule_lbl.text = "💡 REGLA DE ORO:"
            p_rule_lbl.font.name = "Arial"
            p_rule_lbl.font.size = Pt(9)
            p_rule_lbl.font.bold = True
            p_rule_lbl.font.color.rgb = self.C_CYAN
            p_rule_lbl.space_after = Pt(2)

            p_rule = tf_r.add_paragraph()
            p_rule.text = "Asegura siempre la presencia del auxiliar conjugado antes del participio para garantizar precisión gramatical total."
            p_rule.font.name = "Arial"
            p_rule.font.size = Pt(8.5)
            p_rule.font.color.rgb = self.C_TEXT_MUTED
        else:
            p_fb = tf_r.add_paragraph()
            p_fb.text = "Presta especial atención a la concordancia temporal y la posición de los complementos circunstanciales para lograr máxima naturalidad."
            p_fb.font.name = "Arial"
            p_fb.font.size = Pt(10)
            p_fb.font.color.rgb = self.C_TEXT_MUTED

    def build_slide_contrast(self):
        if not self.data.contrast_table:
            return
        ct = self.data.contrast_table
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(slide, ct.title or "Cuadro Comparativo y Contrastes Clave", "ANÁLISIS COMPARATIVO")

        rows_count = len(ct.rows) + 1
        cols_count = len(ct.headers)
        if cols_count == 0 or rows_count == 1:
            return

        table_shape = slide.shapes.add_table(
            rows_count, cols_count, Inches(0.8), Inches(1.5), Inches(11.733), Inches(4.8)
        )
        tbl = table_shape.table

        # Format Headers
        for col_idx, h in enumerate(ct.headers):
            cell = tbl.cell(0, col_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = self.C_CARD
            tf = cell.text_frame
            tf.word_wrap = True
            tf.margin_top = tf.margin_bottom = Inches(0.1)
            p = tf.paragraphs[0]
            p.text = h
            p.alignment = PP_ALIGN.CENTER
            p.font.name = "Arial"
            p.font.size = Pt(12)
            p.font.bold = True
            p.font.color.rgb = self.C_CYAN

        # Format Rows
        for row_idx, r in enumerate(ct.rows):
            for col_idx, val in enumerate(r[:cols_count]):
                cell = tbl.cell(row_idx + 1, col_idx)
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(15, 23, 42) if row_idx % 2 == 0 else RGBColor(19, 31, 56)
                tf = cell.text_frame
                tf.word_wrap = True
                tf.margin_top = tf.margin_bottom = Inches(0.08)
                p = tf.paragraphs[0]
                p.text = str(val)
                p.font.name = "Arial"
                p.font.size = Pt(10)
                p.font.color.rgb = self.C_TEXT_LIGHT

    def build_slide_quiz_single(self, q: QuizQuestion, total_questions: int):
        """Una diapositiva espaciosa por pregunta con opciones en cuadrícula 2x2 para evitar colisiones."""
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(slide, f"Evaluación Práctica: Pregunta {q.question_number} de {total_questions}", "MINI-QUIZ DE OPCIÓN MÚLTIPLE")

        # Question prompt card (Top)
        q_card = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), Inches(1.45), Inches(11.733), Inches(1.6)
        )
        q_card.fill.solid()
        q_card.fill.fore_color.rgb = self.C_CARD
        q_card.line.color.rgb = self.C_AMBER
        q_card.line.width = Pt(1.5)
        tf_q = q_card.text_frame
        tf_q.word_wrap = True
        tf_q.margin_left = tf_q.margin_right = tf_q.margin_top = tf_q.margin_bottom = Inches(0.2)
        tf_q.vertical_anchor = MSO_ANCHOR.MIDDLE

        pq0 = tf_q.paragraphs[0]
        pq0.text = f"DESAFÍO #{q.question_number}:"
        pq0.font.name = "Arial"
        pq0.font.size = Pt(10.5)
        pq0.font.bold = True
        pq0.font.color.rgb = self.C_AMBER
        pq0.space_after = Pt(2)

        pq1 = tf_q.add_paragraph()
        pq1.text = q.question
        pq1.font.name = "Arial"
        pq1.font.size = Pt(13)
        pq1.font.bold = True
        pq1.font.color.rgb = self.C_TEXT_LIGHT

        # 4 Options in 2x2 Grid (Spacious & Zero Overlap)
        grid_coords = [
            ("A", Inches(0.8), Inches(3.25)),
            ("B", Inches(6.8), Inches(3.25)),
            ("C", Inches(0.8), Inches(5.05)),
            ("D", Inches(6.8), Inches(5.05)),
        ]

        for letter, x_pos, y_pos in grid_coords:
            opt_text = q.options.get(letter, "")
            opt_card = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE,
                x_pos, y_pos, Inches(5.7), Inches(1.65)
            )
            opt_card.fill.solid()
            opt_card.fill.fore_color.rgb = RGBColor(19, 31, 56)
            opt_card.line.color.rgb = self.C_CARD_BORDER
            opt_card.line.width = Pt(1)
            tf_o = opt_card.text_frame
            tf_o.word_wrap = True
            tf_o.margin_left = tf_o.margin_right = tf_o.margin_top = tf_o.margin_bottom = Inches(0.2)
            tf_o.vertical_anchor = MSO_ANCHOR.MIDDLE

            po0 = tf_o.paragraphs[0]
            po0.text = f"OPCIÓN  [{letter}]"
            po0.font.name = "Arial"
            po0.font.size = Pt(10)
            po0.font.bold = True
            po0.font.color.rgb = self.C_CYAN
            po0.space_after = Pt(3)

            po1 = tf_o.add_paragraph()
            po1.text = opt_text or "—"
            po1.font.name = "Arial"
            po1.font.size = Pt(10.5)
            po1.font.color.rgb = self.C_TEXT_LIGHT

    def build_slide_solutions(self):
        """Solucionario dividido en 2 columnas para asegurar holgura y lectura impecable."""
        if not self.data.quiz:
            return
        slide = self.prs.slides.add_slide(self.blank_layout)
        self._set_slide_background(slide)
        self._add_header(slide, "Solucionario Explicado y Clave de Respuestas", "RETROALIMENTACIÓN PEDAGÓGICA")

        half_idx = (len(self.data.quiz) + 1) // 2
        left_questions = self.data.quiz[:half_idx]
        right_questions = self.data.quiz[half_idx:]

        # Columna Izquierda (Preguntas 1 a 3)
        card_l = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(0.8), Inches(1.5), Inches(5.7), Inches(5.3)
        )
        card_l.fill.solid()
        card_l.fill.fore_color.rgb = self.C_CARD
        card_l.line.color.rgb = self.C_EMERALD
        card_l.line.width = Pt(1)
        tf_l = card_l.text_frame
        tf_l.word_wrap = True
        tf_l.margin_left = tf_l.margin_right = tf_l.margin_top = tf_l.margin_bottom = Inches(0.25)

        p0_l = tf_l.paragraphs[0]
        p0_l.text = "✅ Soluciones (Bloque 1)"
        p0_l.font.name = "Arial"
        p0_l.font.size = Pt(13)
        p0_l.font.bold = True
        p0_l.font.color.rgb = self.C_EMERALD
        p0_l.space_after = Pt(10)

        for q in left_questions:
            pq = tf_l.add_paragraph()
            pq.text = f"• Pregunta {q.question_number}: Opción [{q.correct_option}]"
            pq.font.name = "Arial"
            pq.font.size = Pt(10)
            pq.font.bold = True
            pq.font.color.rgb = self.C_CYAN

            pexp = tf_l.add_paragraph()
            pexp.text = f"  {q.explanation}"
            pexp.font.name = "Arial"
            pexp.font.size = Pt(9)
            pexp.font.color.rgb = self.C_TEXT_LIGHT
            pexp.space_after = Pt(6)

        # Columna Derecha (Preguntas 4 y 5 + Consejo de Dominio)
        card_r = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            Inches(6.8), Inches(1.5), Inches(5.7), Inches(5.3)
        )
        card_r.fill.solid()
        card_r.fill.fore_color.rgb = self.C_CARD
        card_r.line.color.rgb = self.C_EMERALD
        card_r.line.width = Pt(1)
        tf_r = card_r.text_frame
        tf_r.word_wrap = True
        tf_r.margin_left = tf_r.margin_right = tf_r.margin_top = tf_r.margin_bottom = Inches(0.25)

        p0_r = tf_r.paragraphs[0]
        p0_r.text = "✅ Soluciones (Bloque 2)"
        p0_r.font.name = "Arial"
        p0_r.font.size = Pt(13)
        p0_r.font.bold = True
        p0_r.font.color.rgb = self.C_EMERALD
        p0_r.space_after = Pt(10)

        for q in right_questions:
            pq = tf_r.add_paragraph()
            pq.text = f"• Pregunta {q.question_number}: Opción [{q.correct_option}]"
            pq.font.name = "Arial"
            pq.font.size = Pt(10)
            pq.font.bold = True
            pq.font.color.rgb = self.C_CYAN

            pexp = tf_r.add_paragraph()
            pexp.text = f"  {q.explanation}"
            pexp.font.name = "Arial"
            pexp.font.size = Pt(9)
            pexp.font.color.rgb = self.C_TEXT_LIGHT
            pexp.space_after = Pt(6)

        # Consejo de Cierre
        pt_head = tf_r.add_paragraph()
        pt_head.text = "💡 Clave de Automatización Lingüística:"
        pt_head.font.name = "Arial"
        pt_head.font.size = Pt(10)
        pt_head.font.bold = True
        pt_head.font.color.rgb = self.C_AMBER
        pt_head.space_after = Pt(2)

        pt_body = tf_r.add_paragraph()
        pt_body.text = "Al redactar o hablar, pregúntate primero: '¿Quién escucha esto realmente necesita saber quién hizo la acción?' Si la respuesta es no, la voz pasiva es tu mejor aliada natural."
        pt_body.font.name = "Arial"
        pt_body.font.size = Pt(9)
        pt_body.font.color.rgb = self.C_TEXT_MUTED

    def export(self, file_path: str):
        """Compila y guarda la presentación completa con distribución balanceada."""
        self.build_slide_cover()
        self.build_slide_mental_model()
        self.build_slide_roadmap()
        for stage in self.data.stages:
            self.build_slide_stage_theory(stage)
            self.build_slide_stage_practice(stage)
        self.build_slide_contrast()

        # Quiz: 1 pregunta por diapositiva con cuadrícula 2x2 para máxima legibilidad
        total_q = len(self.data.quiz)
        for q in self.data.quiz:
            self.build_slide_quiz_single(q, total_q)

        self.build_slide_solutions()
        try:
            self.prs.save(file_path)
            return file_path
        except PermissionError:
            base, ext = os.path.splitext(file_path)
            alt_path = f"{base}_actualizado{ext}"
            self.prs.save(alt_path)
            return alt_path


# ─── 2. WORD EXPORTER (.docx Executive Workbook / Study Guide) ────────────────

class WordLessonExporter:
    """Generador de Guías de Estudio / Workbooks en formato Microsoft Word."""

    def __init__(self, data: LessonExportData):
        self.data = data
        self.doc = Document()
        self._setup_page_margins()

    def _setup_page_margins(self):
        sections = self.doc.sections
        for section in sections:
            section.top_margin = DocxInches(1.0)
            section.bottom_margin = DocxInches(1.0)
            section.left_margin = DocxInches(1.0)
            section.right_margin = DocxInches(1.0)
            # Header
            header = section.header
            hp = header.paragraphs[0]
            hp.text = f"GUIONBAJO AI TUTOR  •  NIVEL CEFR: {self.data.sublevel}  •  GUÍA OFICIAL DE ESTUDIO"
            hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            hp.runs[0].font.name = "Arial"
            hp.runs[0].font.size = DocxPt(8.5)
            hp.runs[0].font.color.rgb = DocxRGBColor(100, 116, 139)

    @staticmethod
    def _set_cell_background(cell, fill_hex: str):
        shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shd)

    @staticmethod
    def _set_cell_left_border(cell, color_hex: str = "0284C7", sz: str = "36"):
        borders = parse_xml(
            f'<w:tcBorders {nsdecls("w")}>'
            f'<w:top w:val="none"/>'
            f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color_hex}"/>'
            f'<w:bottom w:val="none"/>'
            f'<w:right w:val="none"/>'
            f'</w:tcBorders>'
        )
        cell._tc.get_or_add_tcPr().append(borders)

    @staticmethod
    def _set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'<w:top w:w="{top}" w:type="dxa"/>'
            f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'<w:left w:w="{left}" w:type="dxa"/>'
            f'<w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        cell._tc.get_or_add_tcPr().append(tcMar)

    def build_header(self):
        # Badge
        p_badge = self.doc.add_paragraph()
        run_badge = p_badge.add_run(f"CERTIFICACIÓN CEFR: {self.data.sublevel}  |  CLASE MAGISTRAL")
        run_badge.font.name = "Arial"
        run_badge.font.size = DocxPt(9.5)
        run_badge.font.bold = True
        run_badge.font.color.rgb = DocxRGBColor(2, 132, 199)

        # Title
        p_title = self.doc.add_paragraph()
        run_title = p_title.add_run(self.data.topic)
        run_title.font.name = "Arial"
        run_title.font.size = DocxPt(24)
        run_title.font.bold = True
        run_title.font.color.rgb = DocxRGBColor(15, 23, 42)

        # Subtitle / Objective
        if self.data.pedagogical_objective:
            p_sub = self.doc.add_paragraph()
            r_sub = p_sub.add_run(f"Objetivo Pedagógico: {self.data.pedagogical_objective}")
            r_sub.font.name = "Arial"
            r_sub.font.size = DocxPt(11)
            r_sub.font.italic = True
            r_sub.font.color.rgb = DocxRGBColor(71, 85, 105)

        self.doc.add_paragraph().paragraph_format.space_after = DocxPt(8)

    def build_callout_box(self, title: str, text: str, border_color: str = "0284C7", bg_color: str = "F8FAFC"):
        tbl = self.doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        self._set_cell_background(cell, bg_color)
        self._set_cell_left_border(cell, color_hex=border_color, sz="36")
        self._set_cell_margins(cell, top=140, bottom=140, left=200, right=160)

        p = cell.paragraphs[0]
        p.paragraph_format.space_after = DocxPt(4)
        r_t = p.add_run(title)
        r_t.font.name = "Arial"
        r_t.font.size = DocxPt(11)
        r_t.font.bold = True
        # Parse hex color
        try:
            r = int(border_color[0:2], 16)
            g = int(border_color[2:4], 16)
            b = int(border_color[4:6], 16)
            r_t.font.color.rgb = DocxRGBColor(r, g, b)
        except Exception:
            r_t.font.color.rgb = DocxRGBColor(2, 132, 199)

        p_txt = cell.add_paragraph()
        r_txt = p_txt.add_run(text)
        r_txt.font.name = "Arial"
        r_txt.font.size = DocxPt(10.5)
        r_txt.font.color.rgb = DocxRGBColor(30, 41, 59)

        self.doc.add_paragraph().paragraph_format.space_after = DocxPt(6)

    def build_section_mental_model(self):
        h = self.doc.add_heading(level=1)
        rh = h.add_run("1. Modelo Mental y Fundamentos")
        rh.font.name = "Arial"
        rh.font.size = DocxPt(15)
        rh.font.bold = True
        rh.font.color.rgb = DocxRGBColor(15, 23, 42)

        self.build_callout_box(
            "💡 ¿CÓMO DEBES PENSAR EN ESTE CONCEPTO?",
            self.data.mental_model or "Interioriza el propósito comunicativo antes de las fórmulas sintácticas.",
            border_color="0284C7",
            bg_color="F0F9FF"
        )

        if self.data.summary_takeaways:
            p_tk = self.doc.add_paragraph()
            r_tk = p_tk.add_run("Hitos Clave de Dominio:")
            r_tk.font.name = "Arial"
            r_tk.font.size = DocxPt(11)
            r_tk.font.bold = True

            for item in self.data.summary_takeaways:
                p_it = self.doc.add_paragraph(style='List Bullet')
                p_it.paragraph_format.space_after = DocxPt(3)
                r_it = p_it.add_run(item)
                r_it.font.name = "Arial"
                r_it.font.size = DocxPt(10)
                r_it.font.color.rgb = DocxRGBColor(51, 65, 85)

        self.doc.add_paragraph().paragraph_format.space_after = DocxPt(10)

    def build_section_stages(self):
        h = self.doc.add_heading(level=1)
        rh = h.add_run("2. Fases Explicativas de la Clase Magistral")
        rh.font.name = "Arial"
        rh.font.size = DocxPt(15)
        rh.font.bold = True
        rh.font.color.rgb = DocxRGBColor(15, 23, 42)

        for s in self.data.stages:
            h2 = self.doc.add_heading(level=2)
            rh2 = h2.add_run(f"Fase {s.stage_number}: {s.title}")
            rh2.font.name = "Arial"
            rh2.font.size = DocxPt(13)
            rh2.font.bold = True
            rh2.font.color.rgb = DocxRGBColor(2, 132, 199)

            p_exp = self.doc.add_paragraph()
            p_exp.paragraph_format.space_after = DocxPt(6)
            r_exp = p_exp.add_run(s.explanation)
            r_exp.font.name = "Arial"
            r_exp.font.size = DocxPt(10.5)
            r_exp.font.color.rgb = DocxRGBColor(30, 41, 59)

            # Formula Callout
            if s.formula:
                self.build_callout_box(
                    "⚡ FÓRMULA GRAMATICAL MAESTRA",
                    s.formula,
                    border_color="059669",
                    bg_color="F0FDF4"
                )

            # Examples Table
            if s.examples:
                tbl = self.doc.add_table(rows=len(s.examples) + 1, cols=3)
                tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                # Header row
                headers = ["Oración en Inglés", "Traducción al Español", "Nota Fonética / Uso"]
                for c_idx, h_text in enumerate(headers):
                    cell = tbl.cell(0, c_idx)
                    self._set_cell_background(cell, "1E293B")
                    self._set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                    p = cell.paragraphs[0]
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    r = p.add_run(h_text)
                    r.font.name = "Arial"
                    r.font.size = DocxPt(9.5)
                    r.font.bold = True
                    r.font.color.rgb = DocxRGBColor(255, 255, 255)

                for r_idx, ex in enumerate(s.examples):
                    row_bg = "FFFFFF" if r_idx % 2 == 0 else "F8FAFC"
                    c0 = tbl.cell(r_idx + 1, 0)
                    c1 = tbl.cell(r_idx + 1, 1)
                    c2 = tbl.cell(r_idx + 1, 2)
                    for c in (c0, c1, c2):
                        self._set_cell_background(c, row_bg)
                        self._set_cell_margins(c, top=80, bottom=80, left=140, right=140)

                    p0 = c0.paragraphs[0]
                    r0 = p0.add_run(ex.english)
                    r0.font.name = "Arial"
                    r0.font.size = DocxPt(9.5)
                    r0.font.bold = True
                    r0.font.color.rgb = DocxRGBColor(15, 23, 42)

                    p1 = c1.paragraphs[0]
                    r1 = p1.add_run(ex.spanish)
                    r1.font.name = "Arial"
                    r1.font.size = DocxPt(9.5)
                    r1.font.color.rgb = DocxRGBColor(71, 85, 105)

                    p2 = c2.paragraphs[0]
                    r2 = p2.add_run(ex.tip or "—")
                    r2.font.name = "Arial"
                    r2.font.size = DocxPt(9)
                    r2.font.italic = True
                    r2.font.color.rgb = DocxRGBColor(100, 116, 139)

                self.doc.add_paragraph().paragraph_format.space_after = DocxPt(8)

            # Common Mistake Callout
            if s.common_mistake:
                err_text = f"❌ Incorrecto: {s.common_mistake.incorrect}\n✅ Correcto: {s.common_mistake.correct}\n💡 ¿Por qué?: {s.common_mistake.why}"
                self.build_callout_box(
                    "⚠️ TRAMPA COMÚN A EVITAR (Interferencia Lingüística)",
                    err_text,
                    border_color="DC2626",
                    bg_color="FEF2F2"
                )

            self.doc.add_paragraph().paragraph_format.space_after = DocxPt(10)

    def build_section_quiz(self):
        if not self.data.quiz:
            return
        sec_quiz_num = "4" if (self.data.contrast_table and self.data.contrast_table.rows) else "3"
        h = self.doc.add_heading(level=1)
        rh = h.add_run(f"{sec_quiz_num}. Taller Evaluativo: Cuestionario de Opción Múltiple")
        rh.font.name = "Arial"
        rh.font.size = DocxPt(15)
        rh.font.bold = True
        rh.font.color.rgb = DocxRGBColor(15, 23, 42)

        p_desc = self.doc.add_paragraph()
        r_desc = p_desc.add_run("Selecciona la opción correcta para cada una de las siguientes situaciones prácticas:")
        r_desc.font.name = "Arial"
        r_desc.font.size = DocxPt(10.5)
        r_desc.font.italic = True
        r_desc.font.color.rgb = DocxRGBColor(71, 85, 105)

        for q in self.data.quiz:
            p_q = self.doc.add_paragraph()
            p_q.paragraph_format.space_before = DocxPt(8)
            p_q.paragraph_format.space_after = DocxPt(4)
            r_q = p_q.add_run(f"Pregunta {q.question_number}: {q.question}")
            r_q.font.name = "Arial"
            r_q.font.size = DocxPt(11)
            r_q.font.bold = True
            r_q.font.color.rgb = DocxRGBColor(15, 23, 42)

            for letter in ["A", "B", "C", "D"]:
                opt_text = q.options.get(letter)
                if opt_text:
                    p_opt = self.doc.add_paragraph()
                    p_opt.paragraph_format.left_indent = DocxInches(0.25)
                    p_opt.paragraph_format.space_after = DocxPt(2)
                    r_opt = p_opt.add_run(f"[   ]  {letter})  {opt_text}")
                    r_opt.font.name = "Arial"
                    r_opt.font.size = DocxPt(10)
                    r_opt.font.color.rgb = DocxRGBColor(51, 65, 85)

        # Clave de Respuestas
        sec_sol_num = "5" if (self.data.contrast_table and self.data.contrast_table.rows) else "4"
        self.doc.add_page_break()
        h_sol = self.doc.add_heading(level=1)
        rh_sol = h_sol.add_run(f"{sec_sol_num}. Clave de Respuestas y Solucionario Comentado")
        rh_sol.font.name = "Arial"
        rh_sol.font.size = DocxPt(15)
        rh_sol.font.bold = True
        rh_sol.font.color.rgb = DocxRGBColor(5, 150, 105)

        for q in self.data.quiz:
            p_ans = self.doc.add_paragraph()
            p_ans.paragraph_format.space_after = DocxPt(4)
            r_a = p_ans.add_run(f"• Pregunta {q.question_number}: Respuesta Correcta [{q.correct_option}]")
            r_a.font.name = "Arial"
            r_a.font.size = DocxPt(11)
            r_a.font.bold = True
            r_a.font.color.rgb = DocxRGBColor(5, 150, 105)

            p_why = self.doc.add_paragraph()
            p_why.paragraph_format.left_indent = DocxInches(0.25)
            p_why.paragraph_format.space_after = DocxPt(8)
            r_why = p_why.add_run(f"Justificación Pedagógica: {q.explanation}")
            r_why.font.name = "Arial"
            r_why.font.size = DocxPt(10)
            r_why.font.color.rgb = DocxRGBColor(71, 85, 105)

    def build_section_contrast_table(self):
        """Genera la tabla comparativa o matriz de transformación sistemática por tiempos."""
        if not self.data.contrast_table or not self.data.contrast_table.rows:
            return

        ct = self.data.contrast_table
        self.doc.add_page_break()
        h_ct = self.doc.add_heading(level=1)
        rh_ct = h_ct.add_run(f"3. {ct.title or 'Matriz de Contrastes y Transformaciones'}")
        rh_ct.font.name = "Arial"
        rh_ct.font.size = DocxPt(15)
        rh_ct.font.bold = True
        rh_ct.font.color.rgb = DocxRGBColor(23, 37, 84)

        p_desc = self.doc.add_paragraph()
        p_desc.paragraph_format.space_after = DocxPt(10)
        r_desc = p_desc.add_run("Esta matriz sintetiza las transformaciones estructurales, tiempos verbales o contrastes clave para garantizar precisión y naturalidad comunicativa:")
        r_desc.font.name = "Arial"
        r_desc.font.size = DocxPt(10)
        r_desc.font.italic = True
        r_desc.font.color.rgb = DocxRGBColor(100, 116, 139)

        cols_count = len(ct.headers)
        rows_count = len(ct.rows) + 1
        table = self.doc.add_table(rows=rows_count, cols=cols_count)
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        # Header Row
        hdr_cells = table.rows[0].cells
        for idx, h_text in enumerate(ct.headers):
            cell = hdr_cells[idx]
            self._set_cell_background(cell, "172554")
            self._set_cell_margins(cell, top=120, bottom=120, left=140, right=140)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = DocxPt(2)
            p.paragraph_format.space_after = DocxPt(2)
            run = p.add_run(h_text)
            run.font.name = "Arial"
            run.font.size = DocxPt(10)
            run.font.bold = True
            run.font.color.rgb = DocxRGBColor(255, 255, 255)

        # Data Rows
        for r_idx, row_data in enumerate(ct.rows):
            row_cells = table.rows[r_idx + 1].cells
            bg_color = "F8FAFC" if r_idx % 2 == 0 else "FFFFFF"
            for c_idx, val in enumerate(row_data[:cols_count]):
                cell = row_cells[c_idx]
                self._set_cell_background(cell, bg_color)
                self._set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                p = cell.paragraphs[0]
                p.paragraph_format.space_before = DocxPt(2)
                p.paragraph_format.space_after = DocxPt(2)
                run = p.add_run(str(val))
                run.font.name = "Arial"
                run.font.size = DocxPt(9.5)
                if c_idx == 0:
                    run.font.bold = True
                    run.font.color.rgb = DocxRGBColor(15, 23, 42)
                else:
                    run.font.color.rgb = DocxRGBColor(51, 65, 85)

        p_end = self.doc.add_paragraph()
        p_end.paragraph_format.space_after = DocxPt(12)

    def export(self, file_path: str):
        """Compila y guarda el documento Word completo."""
        self.build_header()
        self.build_section_mental_model()
        self.build_section_stages()
        self.build_section_contrast_table()
        self.build_section_quiz()
        try:
            self.doc.save(file_path)
            return file_path
        except PermissionError:
            base, ext = os.path.splitext(file_path)
            alt_path = f"{base}_actualizado{ext}"
            self.doc.save(alt_path)
            return alt_path


# ─── 3. PDF EXPORTER (ReportLab Vectorial Multi-Page Document) ─────────────────

class NumberedCanvas(canvas.Canvas):
    """Canvas de dos pasadas para calcular 'Página X de Y' y encabezado dinámico."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        # Top Header (on pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0284C7"))
            self.drawString(40, 755, "GUIONBAJO AI TUTOR")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(160, 755, "|  Guía Oficial de Aprendizaje CEFR")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, 748, 572, 748)

        # Bottom Footer (all pages)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 42, 572, 42)
        self.setFont("Helvetica", 8.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(40, 30, "Guionbajo Language System  •  Material de Estudio Personalizado")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(572, 30, page_str)
        self.restoreState()


class PdfLessonExporter:
    """Generador de documentos PDF vectoriales nítidos con ReportLab."""

    def __init__(self, data: LessonExportData):
        self.data = data
        self.styles = getSampleStyleSheet()
        self._init_custom_styles()

    def _init_custom_styles(self):
        self.styles.add(ParagraphStyle(
            name='CEFRBadge',
            fontName='Helvetica-Bold',
            fontSize=9,
            textColor=colors.HexColor('#0284C7'),
            spaceAfter=4
        ))
        self.styles.add(ParagraphStyle(
            name='LessonTitle',
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor=colors.HexColor('#0F172A'),
            spaceAfter=6
        ))
        self.styles.add(ParagraphStyle(
            name='LessonObjective',
            fontName='Helvetica-Oblique',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#475569'),
            spaceAfter=14
        ))
        self.styles.add(ParagraphStyle(
            name='SectionH1',
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#0F172A'),
            spaceBefore=12,
            spaceAfter=8
        ))
        self.styles.add(ParagraphStyle(
            name='StageH2',
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#0284C7'),
            spaceBefore=8,
            spaceAfter=4
        ))
        self.styles.add(ParagraphStyle(
            name='BodyClean',
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#1E293B'),
            spaceAfter=6
        ))
        self.styles.add(ParagraphStyle(
            name='FormulaTitle',
            fontName='Helvetica-Bold',
            fontSize=8.5,
            textColor=colors.HexColor('#047857'),
            spaceAfter=2
        ))
        self.styles.add(ParagraphStyle(
            name='FormulaCode',
            fontName='Courier-Bold',
            fontSize=11,
            leading=14,
            textColor=colors.HexColor('#064E3B')
        ))
        self.styles.add(ParagraphStyle(
            name='TableHead',
            fontName='Helvetica-Bold',
            fontSize=8.5,
            textColor=colors.white
        ))
        self.styles.add(ParagraphStyle(
            name='TableCellEng',
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0F172A')
        ))
        self.styles.add(ParagraphStyle(
            name='TableCellSpa',
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor('#475569')
        ))
        self.styles.add(ParagraphStyle(
            name='TableCellTip',
            fontName='Helvetica-Oblique',
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#64748B')
        ))
        self.styles.add(ParagraphStyle(
            name='MistakeText',
            fontName='Helvetica',
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#7F1D1D')
        ))

    def _create_callout(self, title: str, text: str, border_hex='#0284C7', bg_hex='#F0F9FF'):
        p_t = Paragraph(f"<b>{title}</b>", ParagraphStyle('ct', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor(border_hex), spaceAfter=3))
        p_b = Paragraph(text, ParagraphStyle('cb', fontName='Helvetica', fontSize=9.5, leading=13, textColor=colors.HexColor('#1E293B')))
        t = Table([[p_t], [p_b]], colWidths=[520])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_hex)),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor(border_hex)),
        ]))
        return t

    def export(self, file_path: str):
        doc = SimpleDocTemplate(
            file_path,
            pagesize=letter_pagesize,
            leftMargin=40,
            rightMargin=40,
            topMargin=45,
            bottomMargin=50
        )
        story = []

        # 1. Header
        story.append(Paragraph(f"NIVEL CEFR: {self.data.sublevel}  |  GUÍA OFICIAL DE ESTUDIO", self.styles['CEFRBadge']))
        story.append(Paragraph(self.data.topic, self.styles['LessonTitle']))
        if self.data.pedagogical_objective:
            story.append(Paragraph(f"Objetivo Pedagógico: {self.data.pedagogical_objective}", self.styles['LessonObjective']))

        # 2. Modelo Mental
        story.append(Paragraph("1. Modelo Mental y Fundamentos", self.styles['SectionH1']))
        story.append(self._create_callout(
            "🧠 ¿CÓMO INTERIORIZAR ESTE CONCEPTO?",
            self.data.mental_model or "Comprende el patrón conceptual en su contexto real antes de fijar las reglas gramaticales.",
            border_hex='#0284C7',
            bg_hex='#F0F9FF'
        ))
        story.append(Spacer(1, 10))

        if self.data.summary_takeaways:
            for item in self.data.summary_takeaways:
                story.append(Paragraph(f"•  {item}", self.styles['BodyClean']))
            story.append(Spacer(1, 10))

        # 3. Fases Explicativas
        story.append(Paragraph("2. Fases Didácticas de la Clase Magistral", self.styles['SectionH1']))
        for s in self.data.stages:
            stage_elements = []
            stage_elements.append(Paragraph(f"Fase {s.stage_number}: {s.title}", self.styles['StageH2']))
            stage_elements.append(Paragraph(s.explanation, self.styles['BodyClean']))

            # Formula box
            if s.formula:
                f_title = Paragraph("FÓRMULA GRAMATICAL MAESTRA", self.styles['FormulaTitle'])
                f_code = Paragraph(s.formula, self.styles['FormulaCode'])
                f_tbl = Table([[f_title], [f_code]], colWidths=[520])
                f_tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F0FDF4')),
                    ('LEFTPADDING', (0,0), (-1,-1), 12),
                    ('RIGHTPADDING', (0,0), (-1,-1), 10),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('LINELEFT', (0,0), (0,-1), 3.5, colors.HexColor('#10B981')),
                ]))
                stage_elements.append(f_tbl)
                stage_elements.append(Spacer(1, 8))

            # Examples Table
            if s.examples:
                t_data = [[
                    Paragraph("Oración en Inglés", self.styles['TableHead']),
                    Paragraph("Traducción al Español", self.styles['TableHead']),
                    Paragraph("Nota de Pronunciación / Uso", self.styles['TableHead']),
                ]]
                for ex in s.examples:
                    t_data.append([
                        Paragraph(ex.english, self.styles['TableCellEng']),
                        Paragraph(ex.spanish, self.styles['TableCellSpa']),
                        Paragraph(ex.tip or "—", self.styles['TableCellTip'])
                    ])
                ex_tbl = Table(t_data, colWidths=[180, 180, 160])
                ex_tbl.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E293B')),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
                    ('TOPPADDING', (0,0), (-1,-1), 5),
                    ('LEFTPADDING', (0,0), (-1,-1), 6),
                    ('RIGHTPADDING', (0,0), (-1,-1), 6),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ]))
                stage_elements.append(ex_tbl)
                stage_elements.append(Spacer(1, 8))

            # Common Mistake
            if s.common_mistake:
                err_text = f"<b>❌ Incorrecto:</b> {s.common_mistake.incorrect}<br/><b>✅ Correcto:</b> {s.common_mistake.correct}<br/><b>💡 Causa:</b> {s.common_mistake.why}"
                m_tbl = self._create_callout(
                    "⚠️ TRAMPA COMÚN A EVITAR",
                    err_text,
                    border_hex='#EF4444',
                    bg_hex='#FEF2F2'
                )
                stage_elements.append(m_tbl)
                stage_elements.append(Spacer(1, 10))

            story.append(KeepTogether(stage_elements))

        # 3. Cuadro Comparativo / Matriz de Transformación Sistemática
        has_contrast = bool(self.data.contrast_table and self.data.contrast_table.rows)
        if has_contrast:
            ct = self.data.contrast_table
            story.append(Spacer(1, 14))
            story.append(Paragraph(f"3. {ct.title or 'Matriz de Contrastes y Transformaciones'}", self.styles['SectionH1']))
            story.append(Paragraph("Esta matriz sintetiza las transformaciones estructurales, tiempos verbales o contrastes clave para dominar el tema:", self.styles['BodyClean']))
            story.append(Spacer(1, 8))

            cols_count = len(ct.headers)
            table_data = []
            # Headers
            h_row = [Paragraph(f"<b>{h}</b>", ParagraphStyle('pth', fontName='Helvetica-Bold', fontSize=9, leading=11, textColor=colors.white, alignment=1)) for h in ct.headers]
            table_data.append(h_row)

            # Rows
            for r in ct.rows:
                r_cells = []
                for c_idx, val in enumerate(r[:cols_count]):
                    style = ParagraphStyle('ptd1', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#0F172A')) if c_idx == 0 else ParagraphStyle('ptd2', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#334155'))
                    r_cells.append(Paragraph(str(val), style))
                table_data.append(r_cells)

            total_table_width = 518.4  # 7.2 inches * 72 points
            col_w = total_table_width / cols_count
            pdf_tbl = Table(table_data, colWidths=[col_w] * cols_count)
            pdf_tbl.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#172554')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.HexColor('#F8FAFC'), colors.white]),
            ]))
            story.append(KeepTogether([pdf_tbl]))
            story.append(Spacer(1, 14))

        sec_quiz_num = "4" if has_contrast else "3"
        sec_sol_num = "5" if has_contrast else "4"

        # 4. Taller de Evaluación (Quiz)
        if self.data.quiz:
            story.append(PageBreak())
            story.append(Paragraph(f"{sec_quiz_num}. Taller Evaluativo: Cuestionario de Opción Múltiple", self.styles['SectionH1']))
            for q in self.data.quiz:
                q_box = []
                q_box.append(Paragraph(f"<b>Pregunta {q.question_number}:</b> {q.question}", self.styles['BodyClean']))
                for opt_char in ["A", "B", "C", "D"]:
                    opt = q.options.get(opt_char)
                    if opt:
                        q_box.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;[ &nbsp; ] &nbsp; <b>{opt_char})</b> {opt}", self.styles['TableCellSpa']))
                q_box.append(Spacer(1, 6))
                story.append(KeepTogether(q_box))

            # Solucionario
            story.append(Spacer(1, 12))
            story.append(Paragraph(f"{sec_sol_num}. Solucionario Comentado y Justificación", self.styles['SectionH1']))
            for q in self.data.quiz:
                story.append(Paragraph(f"<b>• Pregunta {q.question_number}:</b> Opción [{q.correct_option}]", ParagraphStyle('aq', fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.HexColor('#059669'))))
                story.append(Paragraph(f"&nbsp;&nbsp;Explicación: {q.explanation}", ParagraphStyle('ae', fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#475569'), spaceAfter=4)))

        try:
            doc.build(story, canvasmaker=NumberedCanvas)
            return file_path
        except PermissionError:
            base, ext = os.path.splitext(file_path)
            alt_path = f"{base}_actualizado{ext}"
            alt_doc = SimpleDocTemplate(
                alt_path,
                pagesize=letter_pagesize,
                leftMargin=DocxInches(0.65),
                rightMargin=DocxInches(0.65),
                topMargin=DocxInches(0.7),
                bottomMargin=DocxInches(0.75)
            )
            alt_doc.build(story, canvasmaker=NumberedCanvas)
            return alt_path


# ─── FUNCIÓN CONVENIENTE PRINCIPAL ─────────────────────────────────────────────

def export_lesson_materials(lesson_data: dict, output_dir: str, base_filename: str) -> Dict[str, str]:
    """
    Toma un diccionario con los datos estructurados de la clase y compila
    los 3 formatos en el directorio especificado. Retorna las rutas de los archivos generados.
    """
    os.makedirs(output_dir, exist_ok=True)
    data = LessonExportData.from_dict(lesson_data)

    pptx_path = os.path.join(output_dir, f"{base_filename}.pptx")
    docx_path = os.path.join(output_dir, f"{base_filename}.docx")
    pdf_path = os.path.join(output_dir, f"{base_filename}.pdf")

    pptx_exporter = PowerPointLessonExporter(data)
    actual_pptx_path = pptx_exporter.export(pptx_path)

    docx_exporter = WordLessonExporter(data)
    actual_docx_path = docx_exporter.export(docx_path)

    pdf_exporter = PdfLessonExporter(data)
    actual_pdf_path = pdf_exporter.export(pdf_path)

    return {
        "pptx": actual_pptx_path,
        "docx": actual_docx_path,
        "pdf": actual_pdf_path
    }
