"""
Guionbajo — Curriculum Knowledge Graph & Macro-Objectives (A1 -> B2)
Defines the hierarchical structure of CEFR levels, 16 sublevels, 64 structured classes,
prerequisites, periodic phonetic schedule, and pedagogical interleaving relationships.
"""
from typing import Dict, List, Optional, Any

# 16 Sublevels with Macro-Objectives and 4 Structured Classes Each (Total 64 Classes)
CURRICULUM_GRAPH: Dict[str, Dict[str, Any]] = {   'A1.1': {   'title': 'A1.1 — Getting Started',
                'badge': 'A1 Foundation',
                'macro_objective': 'Sound Awareness & Basic Identity',
                'description': 'Establecer la identidad personal, explorar el sistema fonético y el verbo To Be.',
                'prerequisites': [],
                'classes': [   {   'class_index': 1,
                                   'topic': 'English Sounds & Introductions',
                                   'grammar_core': 'Verb To Be (Affirmative), Subject Pronouns, Basic Sentence '
                                                   'Structure',
                                   'vocabulary_core': 'Greetings, Name, Country, Basic courtesy words',
                                   'phonetic_contrast': ['/iː/', '/ɪ/'],
                                   'phonetic_focus_title': 'Introducción a vocales: Contraste Tensa vs Relajada '
                                                           '(sheep/ship)',
                                   'retrieval_topics': [],
                                   'target_skills': ['sound_awareness', 'speaking', 'listening'],
                                   'can_do': 'Can introduce oneself (My name is..., I am from...) and identify basic '
                                             'vowel sounds.'},
                               {   'class_index': 2,
                                   'topic': 'Personal Information',
                                   'grammar_core': 'Verb To Be (Affirmative & Negative), Possessive Adjectives (my, '
                                                   'your, his, her)',
                                   'vocabulary_core': 'Age, Nationalities, Jobs, Contact info (email, phone)',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['English Sounds & Introductions'],
                                   'target_skills': ['speaking', 'grammar', 'phonetic_discrimination'],
                                   'can_do': "Can state personal details, negative facts with 'be', and contrast /iː/ "
                                             'vs /ɪ/.'},
                               {   'class_index': 3,
                                   'topic': 'Objects & Possession',
                                   'grammar_core': "Demonstratives (This / That / These / Those), Possessive 's, "
                                                   'Regular Plural Nouns',
                                   'vocabulary_core': 'Everyday objects (phone, key, book, pen, bag, glasses)',
                                   'phonetic_contrast': ['/s/', '/z/', '/ɪz/'],
                                   'phonetic_focus_title': 'Reglas fonéticas de terminación plural -s/-es',
                                   'retrieval_topics': ['Personal Information'],
                                   'target_skills': ['grammar', 'pronunciation', 'speaking'],
                                   'can_do': 'Can point to and name singular/plural items and pronounce plural endings '
                                             'accurately.'},
                               {   'class_index': 4,
                                   'topic': 'Review & Communication',
                                   'grammar_core': 'Consolidation of Be, Pronouns, Possessives, Demonstratives',
                                   'vocabulary_core': 'Personal belongings, Identity synthesis, Basic courtesy',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'English Sounds & Introductions',
                                                           'Personal Information',
                                                           'Objects & Possession'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can introduce self and others fluidly, describe personal belongings, and '
                                             'pass A1.1 assessment.'}]},
    'A1.2': {   'title': 'A1.2 — Daily Life',
                'badge': 'A1 Foundation',
                'macro_objective': 'Routines, Habits & Time Expressions',
                'description': 'Expresar acciones cotidianas, frecuencia y preguntas en Present Simple.',
                'prerequisites': ['A1.1'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Daily Routines',
                                   'grammar_core': 'Present Simple Affirmative (I wake up, He works), Third-person '
                                                   'singular -s',
                                   'vocabulary_core': 'Wake up, Have breakfast, Go to work, Exercise, Sleep',
                                   'phonetic_contrast': ['/s/', '/z/', '/ɪz/'],
                                   'phonetic_focus_title': 'Tercera persona singular en verbos cotidianos',
                                   'retrieval_topics': ['Objects & Possession'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can describe daily routines and pronounce 3rd person singular -s endings '
                                             'correctly.'},
                               {   'class_index': 2,
                                   'topic': 'Questions & Negatives',
                                   'grammar_core': "Do / Does, Don't / Doesn't, Simple Wh- Questions (What, When, "
                                                   'Where)',
                                   'vocabulary_core': 'Habits, Hobbies, Work hours, Daily schedules',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Daily Routines'],
                                   'target_skills': ['grammar', 'listening', 'speaking'],
                                   'can_do': 'Can ask and answer questions about habits using do/does with proper '
                                             'stress.'},
                               {   'class_index': 3,
                                   'topic': 'Time & Frequency',
                                   'grammar_core': 'Adverbs of Frequency (Always, Usually, Sometimes, Never), Time '
                                                   'Expressions (At 7 AM, In the morning)',
                                   'vocabulary_core': 'Clock times, Days of the week, Frequency expressions',
                                   'phonetic_contrast': ['/ə/'],
                                   'phonetic_focus_title': 'El sonido Schwa /ə/ en palabras funcionales (a, an, the, '
                                                           'of)',
                                   'retrieval_topics': ['English Sounds & Introductions', 'Daily Routines'],
                                   'target_skills': ['vocabulary', 'speaking', 'phonetic_awareness'],
                                   'can_do': 'Can tell the exact time, state activity frequency, and produce the '
                                             'unstressed schwa /ə/.'},
                               {   'class_index': 4,
                                   'topic': 'A1.2 Integration',
                                   'grammar_core': 'Full Present Simple Synthesis (Affirmative, Negative, '
                                                   'Interrogative + Frequency)',
                                   'vocabulary_core': 'Comprehensive daily life, Free-time activities, Weekend habits',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Daily Routines', 'Questions & Negatives', 'Time & Frequency'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can hold a continuous dialogue describing weekly habits, asking '
                                             'questions, and demonstrating correct rhythm.'}]},
    'A1.3': {   'title': 'A1.3 — The World Around Me',
                'badge': 'A1 Expansion',
                'macro_objective': 'Environment, Ongoing Actions & Abilities',
                'description': 'Describir el entorno inmediato, acciones en progreso con -ing y habilidades con Can.',
                'prerequisites': ['A1.2'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Present Continuous',
                                   'grammar_core': 'Present Continuous (Subject + Be + Verb-ing), Present Simple vs '
                                                   'Present Continuous Intro',
                                   'vocabulary_core': 'Action verbs (cooking, reading, running, driving, calling)',
                                   'phonetic_contrast': ['/ɪŋ/'],
                                   'phonetic_focus_title': "Pronunciación de la terminación -ing sin 'g' dura",
                                   'retrieval_topics': ['Daily Routines'],
                                   'target_skills': ['grammar', 'pronunciation', 'speaking'],
                                   'can_do': 'Can describe what people are doing right now and pronounce -ing '
                                             'naturally.'},
                               {   'class_index': 2,
                                   'topic': 'Places & There is / There are',
                                   'grammar_core': 'There is / There are (Affirmative, Negative, Questions), '
                                                   'Prepositions of Place (in front of, next to, between)',
                                   'vocabulary_core': 'Town locations (supermarket, bank, pharmacy, park, hospital)',
                                   'phonetic_contrast': ['/θ/'],
                                   'phonetic_focus_title': 'Sonido dental sordo /θ/ (think, three, thanks)',
                                   'retrieval_topics': ['Present Continuous'],
                                   'target_skills': ['vocabulary', 'speaking', 'phonetic_discrimination'],
                                   'can_do': 'Can describe physical locations and pronounce the voiceless dental '
                                             'fricative /θ/ cleanly.'},
                               {   'class_index': 3,
                                   'topic': 'Can & Abilities',
                                   'grammar_core': "Modal Verb Can / Can't for Abilities and Polite Requests",
                                   'vocabulary_core': 'Skills (swim, speak languages, play guitar, drive, cook)',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Places & There is / There are'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can express personal abilities, make simple requests, and differentiate '
                                             '/k/ vs /g/.'},
                               {   'class_index': 4,
                                   'topic': 'A1.3 Integration',
                                   'grammar_core': 'Integration of Present Continuous, There is/are, Prepositions and '
                                                   'Can',
                                   'vocabulary_core': 'Home rooms, Neighborhood facilities, Personal skills',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Present Continuous',
                                                           'Places & There is / There are',
                                                           'Can & Abilities'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can describe homes, neighborhoods, active scenes, and personal abilities '
                                             'fluently.'}]},
    'A1.4': {   'title': 'A1.4 — Past & Future Basics',
                'badge': 'A1 Consolidation',
                'macro_objective': 'Narrative Foundations & Future Plans',
                'description': 'Iniciarse en el relato de eventos pasados y formulación de planes futuros.',
                'prerequisites': ['A1.3'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Past Simple: Was / Were & Regular Verbs',
                                   'grammar_core': 'Past Simple of Be (Was/Were), Regular Verbs affirmative with -ed',
                                   'vocabulary_core': 'Time markers (yesterday, last night, last year, ago), Common '
                                                      'regular verbs',
                                   'phonetic_contrast': ['/t/', '/d/', '/ɪd/'],
                                   'phonetic_focus_title': 'Reglas de pronunciación de -ed en pasado',
                                   'retrieval_topics': ['Daily Routines'],
                                   'target_skills': ['grammar', 'pronunciation', 'speaking'],
                                   'can_do': 'Can talk about past states and actions with regular verbs, applying the '
                                             '3 -ed pronunciation rules.'},
                               {   'class_index': 2,
                                   'topic': 'Irregular Past & Questions',
                                   'grammar_core': "Common Irregular Verbs (went, had, saw, ate, bought), Did / Didn't "
                                                   'Questions',
                                   'vocabulary_core': 'Past experiences, Weekend activities, Irregular verb forms',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Past Simple: Was / Were & Regular Verbs'],
                                   'target_skills': ['grammar', 'speaking', 'listening'],
                                   'can_do': 'Can ask and answer questions about past activities using irregular verbs '
                                             'and did.'},
                               {   'class_index': 3,
                                   'topic': 'Future Plans with Be Going To',
                                   'grammar_core': 'Be going to + Verb for Intentions and Evidence, Future Time '
                                                   'Expressions',
                                   'vocabulary_core': 'Tomorrow, Next week, Summer vacation, Travel plans',
                                   'phonetic_contrast': ['/əʊ/', '/aʊ/'],
                                   'phonetic_focus_title': 'Diptongos /əʊ/ (go, home) vs /aʊ/ (now, house)',
                                   'retrieval_topics': ['Past Simple: Was / Were & Regular Verbs', 'Daily Routines'],
                                   'target_skills': ['grammar', 'speaking', 'phonetic_discrimination'],
                                   'can_do': 'Can state future intentions, make predictions based on evidence, and '
                                             'contrast diphthongs.'},
                               {   'class_index': 4,
                                   'topic': 'A1 Final Integration & Capstone',
                                   'grammar_core': 'A1 Capstone: Past Simple, Present Simple, Present Continuous, and '
                                                   'Future Going To',
                                   'vocabulary_core': 'Comprehensive A1 Lexicon (Identity, Routine, Past, Future)',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'English Sounds & Introductions',
                                                           'Daily Routines',
                                                           'Present Continuous',
                                                           'Past Simple: Was / Were & Regular Verbs'],
                                   'target_skills': ['speaking', 'listening', 'reading', 'pronunciation', 'assessment'],
                                   'can_do': 'Can narrate past, present, and future events with intelligible '
                                             'pronunciation (A1 CEFR Certified).'}]},
    'A2.1': {   'title': 'A2.1 — Experiences & Events',
                'badge': 'A2 Expansion',
                'macro_objective': 'Narrative Mastery & Life Milestones',
                'description': 'Consolidar relatos en pasado, acciones interrumpidas e introducción al Present '
                               'Perfect.',
                'prerequisites': ['A1.4'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Past Events Consolidation',
                                   'grammar_core': 'Past Simple consolidation (Regular & Irregular), Extended time '
                                                   'expressions',
                                   'vocabulary_core': 'Travel anecdotes, Historical events, Milestones, Connectors '
                                                      '(first, then, after that)',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Past Simple: Was / Were & Regular Verbs',
                                                           'Irregular Past & Questions'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can narrate a complete past event using time connectors with proper '
                                             'sentence stress.'},
                               {   'class_index': 2,
                                   'topic': 'Past Continuous & Interrupted Actions',
                                   'grammar_core': 'Past Continuous (was/were + -ing), Past Simple vs Past Continuous '
                                                   'with While / When',
                                   'vocabulary_core': 'Accidents, Surprises, Background events, Weather circumstances',
                                   'phonetic_contrast': ['/ɜː/', '/ɔː/'],
                                   'phonetic_focus_title': 'Vocales largas /ɜː/ (bird, work) vs /ɔː/ (door, saw)',
                                   'retrieval_topics': ['Past Events Consolidation'],
                                   'target_skills': ['grammar', 'speaking', 'phonetic_discrimination'],
                                   'can_do': 'Can describe an ongoing past action interrupted by another event.'},
                               {   'class_index': 3,
                                   'topic': 'Experiences & Present Perfect Intro',
                                   'grammar_core': 'Present Perfect with Ever and Never (Have you ever...?), Past '
                                                   'Participles',
                                   'vocabulary_core': 'Life experiences (traveled, eaten exotic food, tried extreme '
                                                      'sports, seen)',
                                   'phonetic_contrast': ['/θ/', '/ð/'],
                                   'phonetic_focus_title': 'Contraste dental sordo vs sonoro /θ/ vs /ð/ (think / this)',
                                   'retrieval_topics': ['Past Events Consolidation'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can ask and answer questions about lifetime experiences without '
                                             'specifying exact dates.'},
                               {   'class_index': 4,
                                   'topic': 'A2.1 Integration',
                                   'grammar_core': 'Synthesis of Past Simple, Past Continuous and Present Perfect '
                                                   '(Ever/Never)',
                                   'vocabulary_core': 'Storytelling, Biographical narratives, Travel memories',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Past Events Consolidation',
                                                           'Past Continuous & Interrupted Actions',
                                                           'Experiences & Present Perfect Intro'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can recount experiences, contrast completed actions with continuous '
                                             'states, and speak naturally.'}]},
    'A2.2': {   'title': 'A2.2 — Comparing & Describing',
                'badge': 'A2 Expansion',
                'macro_objective': 'Comparative Analysis & Quantities',
                'description': 'Hacer comparaciones complejas, superlativos y cuantificadores contables/incontables.',
                'prerequisites': ['A2.1'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Comparatives',
                                   'grammar_core': 'Comparative Adjectives (-er than / more... than / better / worse / '
                                                   'as... as)',
                                   'vocabulary_core': 'Dimensions, Quality adjectives, Cost, Speed, Lifestyle '
                                                      'comparisons',
                                   'phonetic_contrast': ['/æ/', '/ʌ/'],
                                   'phonetic_focus_title': 'Contraste vocal /æ/ (cat, bad) vs /ʌ/ (cut, but)',
                                   'retrieval_topics': ['Objects & Possession'],
                                   'target_skills': ['grammar', 'speaking', 'phonetic_discrimination'],
                                   'can_do': 'Can compare two cities, products, or lifestyles using comparative '
                                             'structures.'},
                               {   'class_index': 2,
                                   'topic': 'Superlatives',
                                   'grammar_core': 'Superlative Adjectives (the -est / the most... / the best / the '
                                                   'worst)',
                                   'vocabulary_core': 'World records, Geography extremes, Opinions on best/worst '
                                                      'options',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Comparatives'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can identify and describe the highest degree of quality among items or '
                                             'places.'},
                               {   'class_index': 3,
                                   'topic': 'Quantities & Countable / Uncountable',
                                   'grammar_core': 'Countable vs Uncountable Nouns, Some / Any, Much / Many, A lot of, '
                                                   'A few / A little',
                                   'vocabulary_core': 'Food ingredients, Money, Time, Supermarket groceries',
                                   'phonetic_contrast': ['/ʃ/', '/tʃ/'],
                                   'phonetic_focus_title': 'Contraste fricativo vs africado /ʃ/ (shoe) vs /tʃ/ (chair)',
                                   'retrieval_topics': ['Comparatives'],
                                   'target_skills': ['vocabulary', 'grammar', 'phonetic_discrimination'],
                                   'can_do': "Can quantify ingredients and items, asking 'How much' vs 'How many' "
                                             'accurately.'},
                               {   'class_index': 4,
                                   'topic': 'A2.2 Integration',
                                   'grammar_core': 'Comparative, Superlative and Quantifier Synthesis',
                                   'vocabulary_core': 'City comparisons, Market choices, Product reviews',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Comparatives',
                                                           'Superlatives',
                                                           'Quantities & Countable / Uncountable'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can debate advantages of different products/places with accurate '
                                             'comparisons and clear phonemes.'}]},
    'A2.3': {   'title': 'A2.3 — Future & Obligation',
                'badge': 'A2 Expansion',
                'macro_objective': 'Future Arrangements, Modals & Possibility',
                'description': 'Dominar formas de futuro (Will vs Going to vs Present Continuous) y verbos modales.',
                'prerequisites': ['A2.2'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Future Forms Contrast',
                                   'grammar_core': 'Will (Spontaneous/Predictions) vs Going To (Intentions) vs Present '
                                                   'Continuous (Arrangements)',
                                   'vocabulary_core': 'Agendas, Business appointments, Social events, Weather '
                                                      'forecasts',
                                   'phonetic_contrast': ['/w/', '/v/'],
                                   'phonetic_focus_title': 'Contraste bilabial /w/ (wet, wine) vs labiodental /v/ '
                                                           '(vet, vine)',
                                   'retrieval_topics': ['Future Plans with Be Going To'],
                                   'target_skills': ['grammar', 'speaking', 'phonetic_discrimination'],
                                   'can_do': 'Can select the appropriate future tense according to spontaneity or '
                                             'arrangement.'},
                               {   'class_index': 2,
                                   'topic': 'Advice & Obligation',
                                   'grammar_core': "Modals: Should / Shouldn't (Advice), Must / Mustn't (Strong "
                                                   "obligation), Have to / Don't have to (Requirement)",
                                   'vocabulary_core': 'Health recommendations, Workplace rules, Road signs, Etiquette',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Future Forms Contrast'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can give advice and distinguish between obligation and lack of '
                                             'necessity.'},
                               {   'class_index': 3,
                                   'topic': 'Possibility with May, Might & Could',
                                   'grammar_core': 'Modals of Possibility: May, Might, Could for uncertain future '
                                                   'situations',
                                   'vocabulary_core': 'Contingencies, Weather possibilities, Career options, '
                                                      'Speculation',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Advice & Obligation'],
                                   'target_skills': ['grammar', 'speaking', 'listening'],
                                   'can_do': 'Can express different degrees of probability and doubt about future '
                                             'events.'},
                               {   'class_index': 4,
                                   'topic': 'A2.3 Integration',
                                   'grammar_core': 'Future forms + Modal Verbs Synthesis (Plans, Predictions, Advice, '
                                                   'Possibilities)',
                                   'vocabulary_core': 'Decision making, Problem solving, Consultations',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Future Forms Contrast',
                                                           'Advice & Obligation',
                                                           'Possibility with May, Might & Could'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can participate in a planning meeting, give suggestions, and express '
                                             'future contingencies.'}]},
    'A2.4': {   'title': 'A2.4 — Communication',
                'badge': 'A2 Consolidation',
                'macro_objective': 'Conditional Logic, Relatives & Everyday Fluency',
                'description': 'Primer condicional, pronombres relativos básicos, phrasal verbs e integración A2.',
                'prerequisites': ['A2.3'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'First Conditional',
                                   'grammar_core': 'First Conditional: If + Present Simple, will + Verb (Real '
                                                   'possibilities)',
                                   'vocabulary_core': 'Causes and consequences, Superstitions, Weather conditions, '
                                                      'Promises',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Future Forms Contrast'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can construct real condition-result sentences with natural melodic '
                                             'intonation.'},
                               {   'class_index': 2,
                                   'topic': 'Relative Clauses Introduction',
                                   'grammar_core': 'Defining Relative Pronouns: Who (people), Which (things), That '
                                                   '(both), Where (places)',
                                   'vocabulary_core': 'Definitions, Identifying people in a crowd, Explaining gadget '
                                                      'functions',
                                   'phonetic_contrast': ['/r/', '/l/'],
                                   'phonetic_focus_title': 'Contraste alveolar /l/ (light) vs retroflejo /r/ (right)',
                                   'retrieval_topics': ['First Conditional'],
                                   'target_skills': ['grammar', 'speaking', 'phonetic_discrimination'],
                                   'can_do': 'Can define and identify people, objects, and places without repeating '
                                             'nouns.'},
                               {   'class_index': 3,
                                   'topic': 'Everyday Communication & Phrasal Verbs',
                                   'grammar_core': 'High-frequency Phrasal Verbs (turn on/off, get up, look for, pick '
                                                   'up), Verb Patterns',
                                   'vocabulary_core': 'Daily social interactions, Routine actions, Technology handling',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Relative Clauses Introduction'],
                                   'target_skills': ['vocabulary', 'speaking', 'pronunciation'],
                                   'can_do': 'Can use essential phrasal verbs with natural linking pronunciation.'},
                               {   'class_index': 4,
                                   'topic': 'A2 Final Integration & Capstone',
                                   'grammar_core': 'Comprehensive A2 Assessment: Conditionals, Relatives, Modals, Past '
                                                   '& Future',
                                   'vocabulary_core': 'Full A2 Communicative Lexicon',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Past Events Consolidation',
                                                           'Comparatives',
                                                           'Future Forms Contrast',
                                                           'First Conditional'],
                                   'target_skills': ['speaking', 'listening', 'pronunciation', 'assessment'],
                                   'can_do': 'Can communicate independently in everyday travel, work, and social '
                                             'situations (A2 CEFR Certified).'}]},
    'B1.1': {   'title': 'B1.1 — Narration & Experience',
                'badge': 'B1 Independent',
                'macro_objective': 'Temporal Precision & Storytelling Flow',
                'description': 'Dominar la frontera entre tiempos terminados e inacabados, y relatos narrativos.',
                'prerequisites': ['A2.4'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Present Perfect vs Past Simple',
                                   'grammar_core': 'Finished vs Unfinished Time, Specific Time Markers (ago, in 2020) '
                                                   'vs Open Time (so far, recently)',
                                   'vocabulary_core': 'Career milestones, Life changes, Project updates',
                                   'phonetic_contrast': ['/p/', '/b/'],
                                   'phonetic_focus_title': 'Contraste plosivo bilabial sordo vs sonoro /p/ vs /b/',
                                   'retrieval_topics': [   'Experiences & Present Perfect Intro',
                                                           'Past Events Consolidation'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can clearly distinguish between finished past actions and ongoing '
                                             'experiences.'},
                               {   'class_index': 2,
                                   'topic': 'Present Perfect Continuous',
                                   'grammar_core': 'Present Perfect Continuous (Have been + -ing) for Duration (For / '
                                                   'Since / How long)',
                                   'vocabulary_core': 'Ongoing projects, Hobbies, Work tenure, Temporary habits',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Present Perfect vs Past Simple'],
                                   'target_skills': ['grammar', 'speaking', 'listening'],
                                   'can_do': 'Can explain how long an activity has been happening and its present '
                                             'result.'},
                               {   'class_index': 3,
                                   'topic': 'Narrative Tenses',
                                   'grammar_core': 'Past Simple, Past Continuous, and Past Perfect (Had + V3) for '
                                                   'Background Sequence',
                                   'vocabulary_core': 'Plot twists, Unexpected discoveries, Crime stories, Historical '
                                                      'moments',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Past Continuous & Interrupted Actions',
                                                           'Present Perfect vs Past Simple'],
                                   'target_skills': ['grammar', 'narrative', 'pronunciation'],
                                   'can_do': 'Can organize complex past events chronologically using the Past '
                                             'Perfect.'},
                               {   'class_index': 4,
                                   'topic': 'Storytelling & Integration',
                                   'grammar_core': 'Synthesis of All Narrative Tenses + Discourse Time Linkers '
                                                   '(Meanwhile, By the time, As soon as)',
                                   'vocabulary_core': 'Anecdotes, Dramatic tension, Sequences of events',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Present Perfect vs Past Simple',
                                                           'Present Perfect Continuous',
                                                           'Narrative Tenses'],
                                   'target_skills': ['speaking', 'storytelling', 'assessment'],
                                   'can_do': 'Can deliver an engaging, well-structured story with natural pacing and '
                                             'rhythm.'}]},
    'B1.2': {   'title': 'B1.2 — Opinions & Communication',
                'badge': 'B1 Independent',
                'macro_objective': 'Nuanced Opinions, Preferences & Deduction',
                'description': 'Expresar juicios críticos, preferencias sofisticadas y deducciones lógicas.',
                'prerequisites': ['B1.1'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Giving Opinions & Linking Expressions',
                                   'grammar_core': 'Opinion Structures (From my perspective, It seems to me), Linking '
                                                   '(Furthermore, In contrast, Therefore)',
                                   'vocabulary_core': 'Social debates, Environmental issues, Lifestyle choices, '
                                                      'Education',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Storytelling & Integration'],
                                   'target_skills': ['speaking', 'discourse', 'pronunciation'],
                                   'can_do': 'Can present and defend personal viewpoints with structured discourse '
                                             'markers.'},
                               {   'class_index': 2,
                                   'topic': 'Comparisons & Preferences',
                                   'grammar_core': 'Prefer... to... / Would rather + bare infinitive / Double '
                                                   'comparatives (The more, the better)',
                                   'vocabulary_core': 'Career choices, Urban vs rural living, Travel styles, '
                                                      'Technology',
                                   'phonetic_contrast': ['/f/', '/v/'],
                                   'phonetic_focus_title': 'Contraste labiodental /f/ (fan) vs /v/ (van)',
                                   'retrieval_topics': ['Giving Opinions & Linking Expressions', 'Comparatives'],
                                   'target_skills': ['grammar', 'speaking', 'phonetic_awareness'],
                                   'can_do': 'Can express nuanced preferences and proportional relationships.'},
                               {   'class_index': 3,
                                   'topic': 'Modals of Deduction',
                                   'grammar_core': "Must be (Certainty positive), Can't be (Certainty negative), Might "
                                                   '/ Could be (Possibility)',
                                   'vocabulary_core': 'Mysteries, Forensic clues, Behavioral observation, Speculation',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Possibility with May, Might & Could'],
                                   'target_skills': ['grammar', 'speaking', 'listening'],
                                   'can_do': 'Can deduce explanations for ambiguous situations using modal logic.'},
                               {   'class_index': 4,
                                   'topic': 'B1.2 Integration',
                                   'grammar_core': 'Debate & Argumentation Synthesis (Opinions, Deductions, '
                                                   'Preferences)',
                                   'vocabulary_core': 'Critical thinking, Evidence analysis, Collaborative dialogue',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Giving Opinions & Linking Expressions',
                                                           'Comparisons & Preferences',
                                                           'Modals of Deduction'],
                                   'target_skills': ['speaking', 'debate', 'assessment'],
                                   'can_do': 'Can lead an interactive discussion, counter-argue politely, and '
                                             'speculate logically.'}]},
    'B1.3': {   'title': 'B1.3 — Hypothetical English',
                'badge': 'B1 Independent',
                'macro_objective': 'Hypothetical Scenarios, Regrets & Mixed Logic',
                'description': 'Explorar el segundo condicional, tercer condicional, deseos (Wish) y condicionales '
                               'mixtos.',
                'prerequisites': ['B1.2'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Second Conditional',
                                   'grammar_core': 'Second Conditional: If + Past Simple, would + Verb (Unreal / '
                                                   'Imaginary situations in present/future)',
                                   'vocabulary_core': 'Moral dilemmas, Dream scenarios, Hypothetical decisions',
                                   'phonetic_contrast': ['/eɪ/', '/aɪ/'],
                                   'phonetic_focus_title': 'Contraste de diptongos /eɪ/ (face) vs /aɪ/ (price)',
                                   'retrieval_topics': ['First Conditional'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can discuss hypothetical problems and imagined choices fluidly.'},
                               {   'class_index': 2,
                                   'topic': 'Third Conditional',
                                   'grammar_core': 'Third Conditional: If + Past Perfect, would have + V3 (Past '
                                                   'hypothetical actions & consequences)',
                                   'vocabulary_core': 'Historical turning points, Missed chances, Personal regrets',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Second Conditional', 'Narrative Tenses'],
                                   'target_skills': ['grammar', 'speaking', 'listening'],
                                   'can_do': 'Can evaluate past mistakes and alternative historical outcomes.'},
                               {   'class_index': 3,
                                   'topic': 'Wish & Regret',
                                   'grammar_core': 'Wish + Past Simple (Present desires), Wish + Would (Annoyances), '
                                                   'Wish + Past Perfect (Past regrets)',
                                   'vocabulary_core': 'Frustrations, Ideal worlds, Remorse, Constructive feedback',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Third Conditional'],
                                   'target_skills': ['grammar', 'speaking', 'prosody'],
                                   'can_do': 'Can express regrets about the past and complaints about annoying present '
                                             'habits.'},
                               {   'class_index': 4,
                                   'topic': 'Mixed Conditionals & Integration',
                                   'grammar_core': 'Mixed Conditionals (Past cause -> Present result) & Full '
                                                   'Conditional Review (0, 1, 2, 3, Mixed)',
                                   'vocabulary_core': 'Long-term consequences, Complex life outcomes',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Second Conditional', 'Third Conditional', 'Wish & Regret'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can master the full conditional spectrum with accurate tense '
                                             'coordination and rhythm.'}]},
    'B1.4': {   'title': 'B1.4 — Complex Everyday English',
                'badge': 'B1 Consolidation',
                'macro_objective': 'Passive Voice, Reported Speech & Relatives',
                'description': 'Transformaciones avanzadas: voz pasiva, estilo indirecto y oraciones de relativo '
                               'explicativas.',
                'prerequisites': ['B1.3'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Passive Voice',
                                   'grammar_core': 'Present & Past Passive (Be + Past Participle), Modal Passive (Can '
                                                   'be done, Should be checked)',
                                   'vocabulary_core': 'Processes, News reports, Inventions, Scientific facts',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Past Events Consolidation'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can shift focus from the agent to the action/object in formal '
                                             'descriptions.'},
                               {   'class_index': 2,
                                   'topic': 'Reported Speech',
                                   'grammar_core': 'Reported Statements, Questions & Commands (Backshifting tenses, '
                                                   'say vs tell)',
                                   'vocabulary_core': 'Reporting verbs (claim, admit, promise, warn, explain)',
                                   'phonetic_contrast': ['/ʒ/', '/dʒ/'],
                                   'phonetic_focus_title': 'Contraste postalveolar /ʒ/ (vision) vs /dʒ/ (judge)',
                                   'retrieval_topics': ['Passive Voice'],
                                   'target_skills': ['grammar', 'speaking', 'listening'],
                                   'can_do': 'Can summarize interviews and report messages without direct quotation.'},
                               {   'class_index': 3,
                                   'topic': 'Relative Clauses: Defining & Non-Defining',
                                   'grammar_core': 'Defining vs Non-defining Relative Clauses (Punctuation and pronoun '
                                                   'omission rules)',
                                   'vocabulary_core': 'Biographical profiles, Architectural descriptions, Nuanced '
                                                      'context',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Relative Clauses Introduction'],
                                   'target_skills': ['grammar', 'speaking', 'prosody'],
                                   'can_do': 'Can add supplementary details using non-defining clauses with correct '
                                             'pausing.'},
                               {   'class_index': 4,
                                   'topic': 'B1 Final Integration & Assessment',
                                   'grammar_core': 'Comprehensive B1 Capstone: Story, Debate, Hypotheses, Passive & '
                                                   'Reported Speech',
                                   'vocabulary_core': 'Full B1 Independent Communication Lexicon',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Present Perfect vs Past Simple',
                                                           'Giving Opinions & Linking Expressions',
                                                           'Second Conditional',
                                                           'Passive Voice'],
                                   'target_skills': ['speaking', 'listening', 'reading', 'pronunciation', 'assessment'],
                                   'can_do': 'Can communicate flexibly, debate opinions, report facts, and speak with '
                                             'natural rhythm (B1 CEFR Certified).'}]},
    'B2.1': {   'title': 'B2.1 — Complex Grammar',
                'badge': 'B2 Advanced Control',
                'macro_objective': 'Advanced Aspect, Causatives & Modal Speculation',
                'description': 'Estructuras pasivas de reporte, causativos y modales pasados de deducción/reproche.',
                'prerequisites': ['B1.4'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Advanced Perfect Tenses',
                                   'grammar_core': 'Present Perfect vs Continuous vs Past Perfect vs Future Perfect '
                                                   '(By 2030, we will have done)',
                                   'vocabulary_core': 'Macro trends, Projections, Longitudinal research, Long-term '
                                                      'careers',
                                   'phonetic_contrast': ['/ŋ/', '/n/'],
                                   'phonetic_focus_title': 'Contraste nasal velar /ŋ/ (sing) vs alveolar /n/ (sin)',
                                   'retrieval_topics': ['Present Perfect vs Past Simple', 'Narrative Tenses'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can precisely position actions across past, present, and future '
                                             'timelines.'},
                               {   'class_index': 2,
                                   'topic': 'Advanced Passive & Causatives',
                                   'grammar_core': 'Passive Reporting (It is claimed that / He is thought to be), '
                                                   'Causatives (Have/Get something done)',
                                   'vocabulary_core': 'Journalism, Corporate announcements, Legal obligations, '
                                                      'Delegated services',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Passive Voice'],
                                   'target_skills': ['grammar', 'speaking', 'prosody'],
                                   'can_do': 'Can use impersonal journalistic reporting and causative constructions '
                                             'smoothly.'},
                               {   'class_index': 3,
                                   'topic': 'Advanced Modals: Deduction & Regret',
                                   'grammar_core': "Must have / Can't have / Might have + V3 (Past deduction), Should "
                                                   'have + V3 (Past criticism/regret)',
                                   'vocabulary_core': 'Historical mysteries, Unsolved crimes, Post-mortem analysis, '
                                                      'Tactical errors',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Modals of Deduction', 'Third Conditional'],
                                   'target_skills': ['grammar', 'speaking', 'prosody'],
                                   'can_do': 'Can evaluate evidence to formulate past deductions and articulate '
                                             'constructive criticism.'},
                               {   'class_index': 4,
                                   'topic': 'B2.1 Integration',
                                   'grammar_core': 'Synthesis of Advanced Perfects, Impersonal Passives, and Compound '
                                                   'Modals',
                                   'vocabulary_core': 'Speculative reasoning, Case studies, Evidence evaluation',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Advanced Perfect Tenses',
                                                           'Advanced Passive & Causatives',
                                                           'Advanced Modals: Deduction & Regret'],
                                   'target_skills': ['speaking', 'integration', 'assessment'],
                                   'can_do': 'Can explain complex situations, speculate on causes, and critique '
                                             'outcomes fluently.'}]},
    'B2.2': {   'title': 'B2.2 — Natural English',
                'badge': 'B2 Advanced Control',
                'macro_objective': 'Idiomatic Fluency, Phrasal Mastery & Patterns',
                'description': 'Phrasal verbs separables/inseparables, expresiones idiomáticas y patrones verbales '
                               'avanzados.',
                'prerequisites': ['B2.1'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Phrasal Verbs Mastery',
                                   'grammar_core': 'Transitive vs Intransitive, Separable vs Inseparable (look it up '
                                                   'vs look up the word), Three-part phrasal verbs',
                                   'vocabulary_core': 'Workplace collaboration, Conflict resolution, Efficiency (come '
                                                      'up with, cut down on)',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Everyday Communication & Phrasal Verbs'],
                                   'target_skills': ['vocabulary', 'grammar', 'pronunciation'],
                                   'can_do': 'Can use three-part and separable phrasal verbs with accurate stress and '
                                             'pronoun placement.'},
                               {   'class_index': 2,
                                   'topic': 'Idiomatic English & Fixed Expressions',
                                   'grammar_core': 'Collocations, Idioms in professional & casual contexts, Binomial '
                                                   'pairs (pros and cons, back and forth)',
                                   'vocabulary_core': 'Metaphorical language, Pragmatic workplace idioms, Casual '
                                                      'social banter',
                                   'phonetic_contrast': ['/k/', '/g/'],
                                   'phonetic_focus_title': 'Contraste velar oclusivo /k/ (cat) vs /g/ (goat)',
                                   'retrieval_topics': ['Phrasal Verbs Mastery'],
                                   'target_skills': ['vocabulary', 'speaking', 'fluency'],
                                   'can_do': 'Can incorporate common idioms and fixed collocations without sounding '
                                             'forced.'},
                               {   'class_index': 3,
                                   'topic': 'Advanced Verb Patterns',
                                   'grammar_core': 'Gerund vs Infinitive with Meaning Change (remember, stop, forget, '
                                                   'regret), Verb + Object + Infinitive',
                                   'vocabulary_core': 'Decision making, Psychological reflections, Management '
                                                      'instructions',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Phrasal Verbs Mastery'],
                                   'target_skills': ['grammar', 'speaking', 'pronunciation'],
                                   'can_do': 'Can use dual-meaning verbs (stop to talk vs stop talking) with precise '
                                             'syntactic control.'},
                               {   'class_index': 4,
                                   'topic': 'B2.2 Integration',
                                   'grammar_core': 'Natural English Synthesis: Phrasal verbs, Idioms and Complex Verb '
                                                   'Patterns',
                                   'vocabulary_core': 'Spontaneous conversational flow, Register adaptation',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Phrasal Verbs Mastery',
                                                           'Idiomatic English & Fixed Expressions',
                                                           'Advanced Verb Patterns'],
                                   'target_skills': ['speaking', 'fluency', 'assessment'],
                                   'can_do': 'Can sustain a lively, natural conversation using varied idiomatic '
                                             'phrases and smooth linking.'}]},
    'B2.3': {   'title': 'B2.3 — Argumentation',
                'badge': 'B2 Advanced Control',
                'macro_objective': 'Persuasion, Hedging & Academic Debate',
                'description': 'Condicionales invertidos, lenguaje cauteloso (hedging) y debate de alto nivel.',
                'prerequisites': ['B2.2'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Advanced Conditionals & Inversion',
                                   'grammar_core': 'Inverted Conditionals (Had I known..., Should you require..., Were '
                                                   'it not for...), Implied Conditions (Otherwise, But for)',
                                   'vocabulary_core': 'Formal agreements, Contingency plans, Risk mitigation, '
                                                      'Diplomatic statements',
                                   'phonetic_contrast': ['/ʊə/', '/ɔː/'],
                                   'phonetic_focus_title': 'Contraste diptongo /ʊə/ (cure) vs vocal larga /ɔː/ (door)',
                                   'retrieval_topics': ['Mixed Conditionals & Integration'],
                                   'target_skills': ['grammar', 'speaking', 'prosody'],
                                   'can_do': 'Can employ formal conditional inversions in negotiations and executive '
                                             'memos.'},
                               {   'class_index': 2,
                                   'topic': 'Hedging & Nuanced Caution',
                                   'grammar_core': 'Hedging Devices (It seems..., It appears..., Arguably, Tend to, As '
                                                   'far as we can tell, Likely)',
                                   'vocabulary_core': 'Academic papers, Market forecasts, Risk assessments, Diplomatic '
                                                      'communications',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Advanced Conditionals & Inversion'],
                                   'target_skills': ['speaking', 'discourse', 'prosody'],
                                   'can_do': 'Can tone down certainty in professional analysis using sophisticated '
                                             'hedging.'},
                               {   'class_index': 3,
                                   'topic': 'Contrast & Concession',
                                   'grammar_core': 'Concession Clauses (Although, Even though, Despite, In spite of, '
                                                   'Whereas, Nevertheless, Nonetheless)',
                                   'vocabulary_core': 'Comparative economic data, Political debates, Scientific '
                                                      'contradictions',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Hedging & Nuanced Caution',
                                                           'Giving Opinions & Linking Expressions'],
                                   'target_skills': ['grammar', 'speaking', 'discourse'],
                                   'can_do': 'Can balance opposing arguments using formal concessive markers.'},
                               {   'class_index': 4,
                                   'topic': 'High-Stakes Debate & Integration',
                                   'grammar_core': 'Argument, Counterargument, and Rebuttal Triad with Rhetorical '
                                                   'Devices',
                                   'vocabulary_core': 'Public policy, Ethics, Technological disruption, Governance',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Advanced Conditionals & Inversion',
                                                           'Hedging & Nuanced Caution',
                                                           'Contrast & Concession'],
                                   'target_skills': ['speaking', 'debate', 'assessment'],
                                   'can_do': 'Can construct and deliver persuasive arguments with counter-rebuttal '
                                             'mastery in real time.'}]},
    'B2.4': {   'title': 'B2.4 — Professional & Academic Communication',
                'badge': 'B2 Full Mastery',
                'macro_objective': 'Executive Presence, Register Nuance & B2 Capstone',
                'description': 'Nominalización, cláusulas relativas reducidas, precisión léxica y certificación B2.',
                'prerequisites': ['B2.3'],
                'classes': [   {   'class_index': 1,
                                   'topic': 'Formal English & Nominalization',
                                   'grammar_core': 'Nominalization (turning verbs/adjectives into abstract nouns), '
                                                   'Executive Passives, Elevated Register',
                                   'vocabulary_core': 'Implementation, Feasibility, Assessment, Optimization, '
                                                      'Governance',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Advanced Passive & Causatives'],
                                   'target_skills': ['grammar', 'vocabulary', 'pronunciation'],
                                   'can_do': 'Can elevate writing and speech from conversational to academic/executive '
                                             'register.'},
                               {   'class_index': 2,
                                   'topic': 'Complex Relative Structures',
                                   'grammar_core': 'Reduced Relative Clauses (Participle clauses: The report written '
                                                   'by... / The team managing the project)',
                                   'vocabulary_core': 'Executive summaries, Technical manuals, Concise corporate '
                                                      'reporting',
                                   'phonetic_contrast': ['/ɪə/', '/eə/'],
                                   'phonetic_focus_title': 'Contraste diptongo /ɪə/ (near) vs /eə/ (square)',
                                   'retrieval_topics': ['Relative Clauses: Defining & Non-Defining'],
                                   'target_skills': ['grammar', 'speaking', 'prosody'],
                                   'can_do': 'Can streamline complex sentences using concise participle clauses.'},
                               {   'class_index': 3,
                                   'topic': 'Nuance & Lexical Precision',
                                   'grammar_core': 'Subtle Semantic Contrasts between Near-Synonyms (effective vs '
                                                   'efficient, continuous vs continual)',
                                   'vocabulary_core': 'Precision vocabulary, Collocational strength, Formal idioms',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': ['Formal English & Nominalization'],
                                   'target_skills': ['vocabulary', 'speaking', 'pronunciation'],
                                   'can_do': 'Can choose words with exact nuance and appropriate register for specific '
                                             'audiences.'},
                               {   'class_index': 4,
                                   'topic': 'B2 Final Capstone: Professional Mastery',
                                   'grammar_core': 'Comprehensive B2 Mastery: Executive Pitch, Debate, Formal Analysis '
                                                   'and Nuance',
                                   'vocabulary_core': 'Full B2 Executive & Academic Lexicon',
                                   'phonetic_contrast': None,
                                   'phonetic_focus_title': None,
                                   'retrieval_topics': [   'Advanced Perfect Tenses',
                                                           'Phrasal Verbs Mastery',
                                                           'High-Stakes Debate & Integration',
                                                           'Formal English & Nominalization'],
                                   'target_skills': [   'speaking',
                                                        'listening',
                                                        'reading',
                                                        'pronunciation',
                                                        'assessment',
                                                        'placement'],
                                   'can_do': 'Can communicate fluently, spontaneously, and effectively in '
                                             'professional, academic, and social realms (B2 CEFR Certified).'}]}}


def get_sublevel_info(sublevel: str) -> Optional[Dict[str, Any]]:
    """Retrieve full metadata for a sublevel."""
    return CURRICULUM_GRAPH.get(sublevel.upper())


def get_class_node(sublevel: str, class_index: int) -> Optional[Dict[str, Any]]:
    """Retrieve metadata for a specific class (1-4)."""
    sub = get_sublevel_info(sublevel)
    if not sub:
        return None
    classes = sub.get("classes", [])
    if 1 <= class_index <= len(classes):
        return classes[class_index - 1]
    return None


def get_all_sublevels() -> List[str]:
    """Returns sorted list of available sublevel keys."""
    return list(CURRICULUM_GRAPH.keys())
