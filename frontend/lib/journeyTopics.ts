// 64 Structured Classes across 16 Sublevels (A1.1 -> B2.4)
export interface JourneyTopic {
  id: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  levelColor: string;
  module: string;
  moduleTitle: string;
  classNum: number;
  title: string;
  grammar: string;
  vocab: string;
  phonetics: string;
}

export const JOURNEY_TOPICS: JourneyTopic[] = [
  {
    "id": "A1-01",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.1",
    "moduleTitle": "Getting Started",
    "classNum": 1,
    "title": "English Sounds & Introductions",
    "grammar": "Verbo To Be afirmativo, pronombres de sujeto (I, you, he, she...), estructura básica de oraciones.",
    "vocab": "Saludos, nombres, países, fórmulas de cortesía.",
    "phonetics": "Contraste vocálico tensa vs relajada /iː/ vs /ɪ/ (sheep / ship)."
  },
  {
    "id": "A1-02",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.1",
    "moduleTitle": "Getting Started",
    "classNum": 2,
    "title": "Personal Information",
    "grammar": "Verbo To Be afirmativo y negativo, adjetivos posesivos (my, your, his, her).",
    "vocab": "Edad, nacionalidades, profesiones, datos de contacto (email, teléfono).",
    "phonetics": "Entonación básica en oraciones declarativas e interrogativas."
  },
  {
    "id": "A1-03",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.1",
    "moduleTitle": "Getting Started",
    "classNum": 3,
    "title": "Objects & Possession",
    "grammar": "Demostrativos (This, That, These, Those), genitivo posesivo ('s), sustantivos plurales regulares.",
    "vocab": "Objetos cotidianos (llaves, celular, libro, bolígrafo, lentes).",
    "phonetics": "Reglas fonéticas de terminación plural -s / -es (/s/, /z/, /ɪz/)."
  },
  {
    "id": "A1-04",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.1",
    "moduleTitle": "Getting Started",
    "classNum": 4,
    "title": "Review & Communication (A1.1 Capstone)",
    "grammar": "Consolidación de To Be, pronombres, posesivos y demostrativos.",
    "vocab": "Pertenencias personales, síntesis de identidad.",
    "phonetics": "Fluidez y unión básica de palabras (linking words)."
  },
  {
    "id": "A1-05",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.2",
    "moduleTitle": "Daily Life",
    "classNum": 1,
    "title": "Daily Routines",
    "grammar": "Present Simple afirmativo, terminación de 3ª persona del singular (-s / -es).",
    "vocab": "Despertarse, desayunar, ir al trabajo, hacer ejercicio, dormir.",
    "phonetics": "Pronunciación de la tercera persona del singular (/s/, /z/, /ɪz/)."
  },
  {
    "id": "A1-06",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.2",
    "moduleTitle": "Daily Life",
    "classNum": 2,
    "title": "Questions & Negatives",
    "grammar": "Auxiliares Do / Does, negativas Don't / Doesn't, preguntas Wh- (What, When, Where).",
    "vocab": "Hábitos, pasatiempos, horarios de trabajo.",
    "phonetics": "Reducción de auxiliares en preguntas rápidas."
  },
  {
    "id": "A1-07",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.2",
    "moduleTitle": "Daily Life",
    "classNum": 3,
    "title": "Time & Frequency",
    "grammar": "Adverbios de frecuencia (Always, Usually, Sometimes, Never), expresiones de tiempo (at 7 AM, in the morning).",
    "vocab": "Horas de reloj, días de la semana, expresiones de frecuencia.",
    "phonetics": "El sonido Schwa /ə/ en palabras funcionales (a, an, the, of)."
  },
  {
    "id": "A1-08",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.2",
    "moduleTitle": "Daily Life",
    "classNum": 4,
    "title": "A1.2 Integration",
    "grammar": "Síntesis completa de Present Simple (afirmativo, negativo, interrogativo y frecuencia).",
    "vocab": "Rutina semanal integral, actividades de ocio y fin de semana.",
    "phonetics": "Ritmo acentual en oraciones cotidianas."
  },
  {
    "id": "A1-09",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.3",
    "moduleTitle": "The World Around Me",
    "classNum": 1,
    "title": "Present Continuous",
    "grammar": "Present Continuous (Subject + Be + Verb-ing), contraste inicial Present Simple vs Present Continuous.",
    "vocab": "Verbos de acción (cooking, reading, running, driving, calling).",
    "phonetics": "Pronunciación natural de la terminación nasal -ing (/ɪŋ/ sin 'g' dura)."
  },
  {
    "id": "A1-10",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.3",
    "moduleTitle": "The World Around Me",
    "classNum": 2,
    "title": "Places & There is / There are",
    "grammar": "There is / There are (afirmativo, negativo, preguntas), preposiciones de lugar (in front of, next to, between).",
    "vocab": "Lugares de la ciudad (supermercado, banco, farmacia, parque, hospital).",
    "phonetics": "Sonido dental sordo /θ/ (think, three, thanks)."
  },
  {
    "id": "A1-11",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.3",
    "moduleTitle": "The World Around Me",
    "classNum": 3,
    "title": "Can & Abilities",
    "grammar": "Modal Can / Can't para habilidades físicas e intelectuales, peticiones corteses.",
    "vocab": "Habilidades (swim, speak languages, play guitar, drive, cook).",
    "phonetics": "Formas débiles vs fuertes de Can /kən/ vs Can't /kænt/."
  },
  {
    "id": "A1-12",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.3",
    "moduleTitle": "The World Around Me",
    "classNum": 4,
    "title": "A1.3 Integration",
    "grammar": "Integración de Present Continuous, There is/are, preposiciones y Can.",
    "vocab": "Habitaciones de la casa, instalaciones del barrio, habilidades personales.",
    "phonetics": "Entonación en solicitudes con Can."
  },
  {
    "id": "A1-13",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.4",
    "moduleTitle": "Past & Future Basics",
    "classNum": 1,
    "title": "Past Simple: Was / Were & Regular Verbs",
    "grammar": "Pasado de Be (Was / Were), verbos regulares en pasado (-ed).",
    "vocab": "Marcadores temporales de pasado (yesterday, last night, last year, ago).",
    "phonetics": "Las 3 reglas de pronunciación de -ed (/t/, /d/, /ɪd/)."
  },
  {
    "id": "A1-14",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.4",
    "moduleTitle": "Past & Future Basics",
    "classNum": 2,
    "title": "Irregular Past & Questions",
    "grammar": "Verbos irregulares comunes (went, had, saw, ate, bought), preguntas y negativas con Did / Didn't.",
    "vocab": "Experiencias pasadas, actividades de fin de semana.",
    "phonetics": "Asimilación fonética de Did you /dɪdʒu/."
  },
  {
    "id": "A1-15",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.4",
    "moduleTitle": "Past & Future Basics",
    "classNum": 3,
    "title": "Future Plans with Be Going To",
    "grammar": "Be going to + verbo para intenciones y predicciones con evidencia, marcadores de futuro.",
    "vocab": "Planes de viaje, vacaciones de verano, expresiones de futuro (tomorrow, next week).",
    "phonetics": "Diptongos /əʊ/ (go, home) vs /aʊ/ (now, house)."
  },
  {
    "id": "A1-16",
    "level": "A1",
    "levelColor": "#00e676",
    "module": "A1.4",
    "moduleTitle": "Past & Future Basics",
    "classNum": 4,
    "title": "A1 Final Integration & Capstone (Certificación A1)",
    "grammar": "Integración de los 4 tiempos fundamentales: Past Simple, Present Simple, Present Continuous y Be going to.",
    "vocab": "Léxico comunicativo global de nivel A1.",
    "phonetics": "Evaluación oral integral de fluidez A1."
  },
  {
    "id": "A2-01",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.1",
    "moduleTitle": "Experiences & Events",
    "classNum": 1,
    "title": "Past Events Consolidation",
    "grammar": "Narración en pasado simple con conectores (first, then, after that), anécdotas de viajes.",
    "vocab": "Viajes, imprevistos, emociones y descripciones cronológicas.",
    "phonetics": "Pausas orales y enlaces entre oraciones narrativas."
  },
  {
    "id": "A2-02",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.1",
    "moduleTitle": "Experiences & Events",
    "classNum": 2,
    "title": "Past Continuous & Interrupted Actions",
    "grammar": "Past Continuous (was/were + -ing) y contraste con Past Simple usando While / When.",
    "vocab": "Accidentes, coincidencias e historias simultáneas.",
    "phonetics": "Vocales largas /ɜː/ (bird, work) vs /ɔː/ (door, saw)."
  },
  {
    "id": "A2-03",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.1",
    "moduleTitle": "Experiences & Events",
    "classNum": 3,
    "title": "Experiences & Present Perfect Intro",
    "grammar": "Introducción al Present Perfect con Ever / Never (Have you ever...?) y participios pasados.",
    "vocab": "Experiencias insólitas, viajes internacionales, deportes extremos.",
    "phonetics": "Contraste dental sordo vs sonoro /θ/ vs /ð/ (think / this)."
  },
  {
    "id": "A2-04",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.1",
    "moduleTitle": "Experiences & Events",
    "classNum": 4,
    "title": "A2.1 Integration",
    "grammar": "Integración de Past Simple, Past Continuous y Present Perfect.",
    "vocab": "Hitos personales, autobiografía y relatos de vida.",
    "phonetics": "Entonación interrogativa en Present Perfect."
  },
  {
    "id": "A2-05",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.2",
    "moduleTitle": "Comparing & Describing",
    "classNum": 1,
    "title": "Comparatives",
    "grammar": "Adjetivos comparativos (-er than / more... than / better / worse / as... as).",
    "vocab": "Estilos de vida, transporte, tecnología, precios y comodidades.",
    "phonetics": "Contraste vocálico /æ/ (cat) vs /ʌ/ (cut)."
  },
  {
    "id": "A2-06",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.2",
    "moduleTitle": "Comparing & Describing",
    "classNum": 2,
    "title": "Superlatives",
    "grammar": "Superlativos (the -est / the most... / the best / the worst), récords mundiales y geografía.",
    "vocab": "Récords mundiales, naturaleza, geografía y maravillas del mundo.",
    "phonetics": "Articulación del sufijo -est y enlace fonético."
  },
  {
    "id": "A2-07",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.2",
    "moduleTitle": "Comparing & Describing",
    "classNum": 3,
    "title": "Quantities & Countable / Uncountable",
    "grammar": "Contables vs incontables, Some / Any, Much / Many, A lot of, A few / A little.",
    "vocab": "Alimentos, recetas, compras, dinero y presupuestos.",
    "phonetics": "Contraste /ʃ/ (shoe) vs /tʃ/ (chair)."
  },
  {
    "id": "A2-08",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.2",
    "moduleTitle": "Comparing & Describing",
    "classNum": 4,
    "title": "A2.2 Integration",
    "grammar": "Comparación de ciudades, reseñas de productos y toma de decisiones.",
    "vocab": "Criterios de elección, pros y contras cotidianos.",
    "phonetics": "Entonación enfática en comparaciones."
  },
  {
    "id": "A2-09",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.3",
    "moduleTitle": "Future & Obligation",
    "classNum": 1,
    "title": "Future Forms Contrast",
    "grammar": "Diferencias entre Will (espontáneo/predicción), Going To (intención) y Present Continuous (acuerdos/citas agendadas).",
    "vocab": "Agendas profesionales, pronósticos del tiempo, compromisos sociales.",
    "phonetics": "Contraste /w/ (wine) vs /v/ (vine)."
  },
  {
    "id": "A2-10",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.3",
    "moduleTitle": "Future & Obligation",
    "classNum": 2,
    "title": "Advice & Obligation",
    "grammar": "Verbos modales Should / Shouldn't (consejo), Must / Mustn't (obligación/prohibición), Have to / Don't have to (necesidad).",
    "vocab": "Salud, normas de tráfico, leyes de convivencia, consejos laborales.",
    "phonetics": "Pronunciación de 'have to' /hæftə/."
  },
  {
    "id": "A2-11",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.3",
    "moduleTitle": "Future & Obligation",
    "classNum": 3,
    "title": "Possibility with May, Might & Could",
    "grammar": "Modales de posibilidad para situaciones inciertas futuras.",
    "vocab": "Planes alternativos, escenarios climáticos, predicciones personales.",
    "phonetics": "Diptongo en May y entonación de duda."
  },
  {
    "id": "A2-12",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.3",
    "moduleTitle": "Future & Obligation",
    "classNum": 4,
    "title": "A2.3 Integration",
    "grammar": "Simulación de reuniones de planificación y resolución de contingencias.",
    "vocab": "Negociación de acuerdos, itinerarios de trabajo.",
    "phonetics": "Ritmo conversacional ágil en acuerdos futuros."
  },
  {
    "id": "A2-13",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.4",
    "moduleTitle": "Communication",
    "classNum": 1,
    "title": "First Conditional",
    "grammar": "If + Present Simple, will + Verb (posibilidades reales y consecuencias directas).",
    "vocab": "Decisiones bajo condición, promesas y advertencias.",
    "phonetics": "Entonación condicional de subida y bajada."
  },
  {
    "id": "A2-14",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.4",
    "moduleTitle": "Communication",
    "classNum": 2,
    "title": "Relative Clauses Introduction",
    "grammar": "Pronombres relativos definitorios (Who, Which, That, Where) para definir cosas y personas sin repetir nombres.",
    "vocab": "Descripciones de perfiles, objetos técnicos y lugares.",
    "phonetics": "Contraste /l/ (light) vs /r/ (right)."
  },
  {
    "id": "A2-15",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.4",
    "moduleTitle": "Communication",
    "classNum": 3,
    "title": "Everyday Phrasal Verbs (Partículas Espaciales)",
    "grammar": "Phrasal verbs cotidianos (get in/out, sit down, turn on/off, pick up, put down).",
    "vocab": "Acciones en el hogar, oficina y aparatos electrónicos.",
    "phonetics": "Acento tónico en la partícula adverbial."
  },
  {
    "id": "A2-16",
    "level": "A2",
    "levelColor": "#ffd600",
    "module": "A2.4",
    "moduleTitle": "Communication",
    "classNum": 4,
    "title": "A2 Final Integration & Capstone (Certificación A2)",
    "grammar": "Evaluación integral para desenvolverse con autonomía en viajes, trabajo y entornos sociales.",
    "vocab": "Léxico consolidado A2.",
    "phonetics": "Prueba de fluidez y pronunciación nivel Plataforma A2."
  },
  {
    "id": "B1-01",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.1",
    "moduleTitle": "Narration & Experience",
    "classNum": 1,
    "title": "Present Perfect vs Past Simple",
    "grammar": "Tiempo cerrado/específico (ago, in 2020) vs tiempo abierto (so far, recently).",
    "vocab": "Trayectoria profesional, hitos históricos y proyectos personales.",
    "phonetics": "Oclusivas bilabiales /p/ vs /b/."
  },
  {
    "id": "B1-02",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.1",
    "moduleTitle": "Narration & Experience",
    "classNum": 2,
    "title": "Present Perfect Continuous",
    "grammar": "Duración con Have been + -ing (For / Since / How long).",
    "vocab": "Actividades de larga duración, causas de fatiga o estados actuales.",
    "phonetics": "Reducción de 'been' /bɪn/ en habla conectada."
  },
  {
    "id": "B1-03",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.1",
    "moduleTitle": "Narration & Experience",
    "classNum": 3,
    "title": "Narrative Tenses",
    "grammar": "Coordinación cronológica con Past Simple, Past Continuous y Past Perfect (Had + V3).",
    "vocab": "Misterios, literatura, noticias y anécdotas complejas.",
    "phonetics": "Contracción de Had ('d) y ritmo narrativo."
  },
  {
    "id": "B1-04",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.1",
    "moduleTitle": "Narration & Experience",
    "classNum": 4,
    "title": "Storytelling & Integration",
    "grammar": "Relato de historias complejas y anécdotas con marcadores discursivos (Meanwhile, By the time, As soon as).",
    "vocab": "Conectores narrativos avanzados.",
    "phonetics": "Pausas dramáticas y entonación de suspenso."
  },
  {
    "id": "B1-05",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.2",
    "moduleTitle": "Opinions & Communication",
    "classNum": 1,
    "title": "Giving Opinions & Linking Expressions",
    "grammar": "Estructuras de opinión (From my perspective, It seems to me) y conectores de discurso (Furthermore, Therefore).",
    "vocab": "Debate social, dilemas éticos y tendencias globales.",
    "phonetics": "Entonación diplomática y atenuación asertiva."
  },
  {
    "id": "B1-06",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.2",
    "moduleTitle": "Opinions & Communication",
    "classNum": 2,
    "title": "Comparisons & Preferences",
    "grammar": "Prefer... to... / Would rather... / Dobles comparativos (The more, the better).",
    "vocab": "Opciones de carrera, estilo de vida y prioridades.",
    "phonetics": "Contraste labiodental /f/ (fan) vs /v/ (van)."
  },
  {
    "id": "B1-07",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.2",
    "moduleTitle": "Opinions & Communication",
    "classNum": 3,
    "title": "Phrasal Verbs: Lógica Cognitiva de OUT y UP",
    "grammar": "Descubrimiento (find out), agotamiento (run out), completitud (clean up), creación (come up with).",
    "vocab": "Innovación, resolución de problemas y productividad.",
    "phonetics": "Enlace fonético consonante-vocal en phrasal verbs."
  },
  {
    "id": "B1-08",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.2",
    "moduleTitle": "Opinions & Communication",
    "classNum": 4,
    "title": "B1.2 Integration",
    "grammar": "Debates estructurados, argumentación cortés y resolución de problemas.",
    "vocab": "Léxico de negociación y consenso.",
    "phonetics": "Mantenimiento del turno de palabra (turn-taking cues)."
  },
  {
    "id": "B1-09",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.3",
    "moduleTitle": "Hypothetical English",
    "classNum": 1,
    "title": "Second Conditional",
    "grammar": "If + Past Simple, would + Verb (situaciones irreales o imaginarias en presente/futuro).",
    "vocab": "Dilemas morales, sueños utópicos y mundos alternativos.",
    "phonetics": "Diptongos /eɪ/ (face) vs /aɪ/ (price)."
  },
  {
    "id": "B1-10",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.3",
    "moduleTitle": "Hypothetical English",
    "classNum": 2,
    "title": "Third Conditional",
    "grammar": "If + Past Perfect, would have + V3 (hipótesis sobre el pasado y oportunidades perdidas).",
    "vocab": "Grandes errores históricos, decisiones críticas del pasado.",
    "phonetics": "Contracción de 'would have' /wʊdəv/ o /wʊdə/."
  },
  {
    "id": "B1-11",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.3",
    "moduleTitle": "Hypothetical English",
    "classNum": 3,
    "title": "Wish & Regret",
    "grammar": "Expresión de deseos presentes (Wish + Past), quejas (Wish + Would) y arrepentimientos pasados (Wish + Past Perfect).",
    "vocab": "Expectativas no cumplidas y reflexiones personales.",
    "phonetics": "Entonación de pesar y queja enfática."
  },
  {
    "id": "B1-12",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.3",
    "moduleTitle": "Hypothetical English",
    "classNum": 4,
    "title": "Mixed Conditionals & Integration",
    "grammar": "Condicionales mixtos (causa en el pasado con impacto en el presente) y espectro condicional completo.",
    "vocab": "Análisis contrafáctico de situaciones reales.",
    "phonetics": "Fluidez en cadenas condicionales extensas."
  },
  {
    "id": "B1-13",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.4",
    "moduleTitle": "Complex Everyday English",
    "classNum": 1,
    "title": "Passive Voice",
    "grammar": "Pasiva en presente, pasado y modales (Be + Participio / Can be done).",
    "vocab": "Procesos industriales, inventos, leyes y procedimientos formales.",
    "phonetics": "Acentuación del participio sobre el verbo To Be."
  },
  {
    "id": "B1-14",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.4",
    "moduleTitle": "Complex Everyday English",
    "classNum": 2,
    "title": "Reported Speech",
    "grammar": "Estilo indirecto (Backshifting, verbos de reporte: claim, admit, explain, warn).",
    "vocab": "Periodismo, transmisión de mensajes y citas textuales.",
    "phonetics": "Postalveolar /ʒ/ (vision) vs /dʒ/ (judge)."
  },
  {
    "id": "B1-15",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.4",
    "moduleTitle": "Complex Everyday English",
    "classNum": 3,
    "title": "Phrasal Verbs: Semántica de OFF, ON, AWAY y BACK",
    "grammar": "Separación (call off, take off), continuidad (carry on), almacenamiento/distancia (put away), retorno (pay back).",
    "vocab": "Vida cotidiana, viajes y gestión del tiempo.",
    "phonetics": "Patrones de acento tónico en combinaciones idiomáticas."
  },
  {
    "id": "B1-16",
    "level": "B1",
    "levelColor": "#00b0ff",
    "module": "B1.4",
    "moduleTitle": "Complex Everyday English",
    "classNum": 4,
    "title": "B1 Final Integration & Assessment (Certificación B1)",
    "grammar": "Capstone de fluidez comunicativa independiente.",
    "vocab": "Síntesis del umbral de independencia B1.",
    "phonetics": "Evaluación oral global de nivel B1."
  },
  {
    "id": "B2-01",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.1",
    "moduleTitle": "Complex Grammar",
    "classNum": 1,
    "title": "Advanced Perfect Tenses",
    "grammar": "Contraste de tiempos perfectos complejos y Future Perfect (By 2030, we will have achieved...).",
    "vocab": "Metas a largo plazo, prospectiva tecnológica y tendencias demográficas.",
    "phonetics": "Nasal velar /ŋ/ (sing) vs alveolar /n/ (sin)."
  },
  {
    "id": "B2-02",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.1",
    "moduleTitle": "Complex Grammar",
    "classNum": 2,
    "title": "Advanced Passive & Causatives",
    "grammar": "Pasiva impersonal periodística (It is claimed that... / He is thought to be...) y estructuras causativas (Have / Get something done).",
    "vocab": "Comunicados corporativos, prensa internacional y servicios delegados.",
    "phonetics": "Entonación impersonal formal."
  },
  {
    "id": "B2-03",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.1",
    "moduleTitle": "Complex Grammar",
    "classNum": 3,
    "title": "Advanced Modals: Deduction & Regret",
    "grammar": "Modales compuestos para deducir o reprochar el pasado (Must have / Can't have / Should have + V3).",
    "vocab": "Criminología, investigación forense y análisis de causas raíz.",
    "phonetics": "Contracción triple 'must've been' /mʌstəvbɪn/."
  },
  {
    "id": "B2-04",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.1",
    "moduleTitle": "Complex Grammar",
    "classNum": 4,
    "title": "B2.1 Integration",
    "grammar": "Análisis de casos, especulación sobre evidencias y argumentación crítica.",
    "vocab": "Léxico de auditoría y pensamiento crítico.",
    "phonetics": "Discurso fluido con modales especulativos."
  },
  {
    "id": "B2-05",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.2",
    "moduleTitle": "Natural English",
    "classNum": 1,
    "title": "Phrasal Verbs: Redes de Partículas Metafóricas",
    "grammar": "Registros ejecutivos (iron out, step down, look over, phase out).",
    "vocab": "Liderazgo, reestructuración empresarial y diplomacia.",
    "phonetics": "Acento de frase en lenguaje figurativo."
  },
  {
    "id": "B2-06",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.2",
    "moduleTitle": "Natural English",
    "classNum": 2,
    "title": "Three-Part Phrasal Verbs & Separability",
    "grammar": "Reglas de colocación de pronombres (figure it out) y phrasal verbs de 3 partes (come up with, cut down on, put up with).",
    "vocab": "Relaciones interpersonales complejas y convivencia profesional.",
    "phonetics": "Oclusivas velares /k/ (cat) vs /g/ (goat)."
  },
  {
    "id": "B2-07",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.2",
    "moduleTitle": "Natural English",
    "classNum": 3,
    "title": "Idiomatic English & Fixed Expressions",
    "grammar": "Collocations, pares binomiales (pros and cons, back and forth) y modismos en entornos laborales.",
    "vocab": "Metáforas del mundo laboral e inglés coloquial auténtico.",
    "phonetics": "Ritmo isócrono en pares fijos de palabras."
  },
  {
    "id": "B2-08",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.2",
    "moduleTitle": "Natural English",
    "classNum": 4,
    "title": "Advanced Verb Patterns & B2.2 Integration",
    "grammar": "Gerundio vs Infinitivo con cambio de significado (remember to do vs remember doing).",
    "vocab": "Matices de memoria, intención y arrepentimiento.",
    "phonetics": "Entonación en contrastes semánticos sutiles."
  },
  {
    "id": "B2-09",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.3",
    "moduleTitle": "Argumentation",
    "classNum": 1,
    "title": "Advanced Conditionals & Inversion",
    "grammar": "Inversiones condicionales formales (Had I known..., Should you require..., Were it not for...).",
    "vocab": "Contratos, acuerdos comerciales y protocolos oficiales.",
    "phonetics": "Diptongo /ʊə/ (cure) vs vocal larga /ɔː/ (door)."
  },
  {
    "id": "B2-10",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.3",
    "moduleTitle": "Argumentation",
    "classNum": 2,
    "title": "Hedging & Nuanced Caution",
    "grammar": "Lenguaje de cautela académica/corporativa (It seems..., Arguably, Tend to, As far as we can tell).",
    "vocab": "Publicaciones científicas, auditorías y predicciones financieras.",
    "phonetics": "Entonación modulada no categórica."
  },
  {
    "id": "B2-11",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.3",
    "moduleTitle": "Argumentation",
    "classNum": 3,
    "title": "Contrast & Concession",
    "grammar": "Cláusulas formales de concesión (Although, Despite, In spite of, Nevertheless, Nonetheless).",
    "vocab": "Ensayos analíticos y discursos de oratoria.",
    "phonetics": "Acentuación contrastiva en conectores formales."
  },
  {
    "id": "B2-12",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.3",
    "moduleTitle": "Argumentation",
    "classNum": 4,
    "title": "High-Stakes Debate & Integration",
    "grammar": "Construcción y refutación de argumentos persuasivos en tiempo real.",
    "vocab": "Técnicas de oratoria y persuasión.",
    "phonetics": "Modulación de voz y control de respiración en debates."
  },
  {
    "id": "B2-13",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.4",
    "moduleTitle": "Professional & Academic Communication",
    "classNum": 1,
    "title": "Formal English & Nominalization",
    "grammar": "Nominalización (convertir verbos/adjetivos en sustantivos conceptuales para elevar el registro) y pasivas formales.",
    "vocab": "Informes ejecutivos y documentos de política pública.",
    "phonetics": "Acentuación en palabras polisilábicas complejas."
  },
  {
    "id": "B2-14",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.4",
    "moduleTitle": "Professional & Academic Communication",
    "classNum": 2,
    "title": "Complex Relative Structures",
    "grammar": "Cláusulas de relativo reducidas con participios (The report written by... / The team managing the project).",
    "vocab": "Descripciones técnicas concisas de alta densidad informativa.",
    "phonetics": "Diptongos /ɪə/ (near) vs /eə/ (square)."
  },
  {
    "id": "B2-15",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.4",
    "moduleTitle": "Professional & Academic Communication",
    "classNum": 3,
    "title": "Nuance & Lexical Precision",
    "grammar": "Diferenciación sutil de casi-sinónimos (effective vs efficient, continuous vs continual) e idoneidad de registro.",
    "vocab": "Vocabulario de precisión ejecutiva y académica.",
    "phonetics": "Distinción de homófonos y pares cercanos."
  },
  {
    "id": "B2-16",
    "level": "B2",
    "levelColor": "#d500f9",
    "module": "B2.4",
    "moduleTitle": "Professional & Academic Communication",
    "classNum": 4,
    "title": "B2 Final Capstone: Professional Mastery (Certificación B2)",
    "grammar": "Pitch ejecutivo, debate de alto impacto, comunicación espontánea y fluida para el ámbito profesional internacional.",
    "vocab": "Léxico global consolidado C1-ready.",
    "phonetics": "Certificación de oratoria y competencia comunicativa B2."
  }
];

export const SUBLEVEL_ORDER = [
  'A1.1', 'A1.2', 'A1.3', 'A1.4',
  'A2.1', 'A2.2', 'A2.3', 'A2.4',
  'B1.1', 'B1.2', 'B1.3', 'B1.4',
  'B2.1', 'B2.2', 'B2.3', 'B2.4'
];

/**
 * Calculates the 0-based global topic index (0 to 63)
 * based on sublevel (e.g. 'A1.2') and class_index (1 to 4).
 */
export function getTopicIndex(sublevel: string, classIndex: number = 1): number {
  const sublevelIdx = SUBLEVEL_ORDER.indexOf(sublevel);
  const safeSublevelIdx = sublevelIdx >= 0 ? sublevelIdx : 0;
  const safeClassIdx = Math.max(1, Math.min(4, classIndex));
  return safeSublevelIdx * 4 + (safeClassIdx - 1);
}
