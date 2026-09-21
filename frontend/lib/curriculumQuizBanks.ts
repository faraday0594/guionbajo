// Guionbajo AI - Pedagogical Quiz Bank System
// Strictly aligns every lesson's 8-question quiz with its CEFR grammar target.
// Prevents out-of-scope tenses (e.g. testing 'can', 'past tense', or 'will' in a 'Do and Does' lesson).

export interface QuizExercise {
  id: string;
  sentence: string;
  options: string[];
  expected_answer: string;
  spanish_translation: string;
  image_prompt: string;
  hint: string;
}

// 1. A1.2 Class 2: Questions & Negatives (Do / Does, Don't / Doesn't, Wh- Questions)
export const DO_DOES_QUESTIONS_NEGATIVES_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: '_____ [Do / Does / Are] you drink hot coffee in the morning?',
    options: ['Do', 'Does', 'Are'],
    expected_answer: 'Do',
    spanish_translation: '¿Tomas café caliente por la mañana?',
    image_prompt: 'A person holding a steaming coffee mug in a sunny morning kitchen, 2D flat vector art, no text',
    hint: "Con el pronombre 'you', el auxiliar en preguntas de Present Simple es 'Do'."
  },
  {
    id: 'ex-2',
    sentence: 'She _____ [doesn\'t / don\'t / not] drink tea; she prefers mineral water.',
    options: ["doesn't", "don't", 'not'],
    expected_answer: "doesn't",
    spanish_translation: 'Ella no toma té; prefiere agua mineral.',
    image_prompt: 'A woman at a cafe table politely declining a cup of tea, 2D flat vector art, no text',
    hint: "Con 'She' (tercera persona singular), la forma negativa en Present Simple es 'doesn't'."
  },
  {
    id: 'ex-3',
    sentence: '_____ [Does / Do / Is] your brother live in Madrid or Barcelona?',
    options: ['Does', 'Do', 'Is'],
    expected_answer: 'Does',
    spanish_translation: '¿Tu hermano vive en Madrid o en Barcelona?',
    image_prompt: 'Two friends talking while looking at a map of Spain, 2D flat vector art, no text',
    hint: "Para 'your brother' (sujeto singular equivalente a He), el auxiliar interrogativo es 'Does'."
  },
  {
    id: 'ex-4',
    sentence: 'We _____ [don\'t / doesn\'t / no] work on Sunday mornings.',
    options: ["don't", "doesn't", 'no'],
    expected_answer: "don't",
    spanish_translation: 'Nosotros no trabajamos los domingos por la mañana.',
    image_prompt: 'Two coworkers enjoying a leisurely walk in a sunny park with flowers, 2D flat vector art, no text',
    hint: "Con el sujeto plural 'We', usamos el auxiliar negativo 'don't'."
  },
  {
    id: 'ex-5',
    sentence: 'Where _____ [do / does / are] you work on weekdays?',
    options: ['do', 'does', 'are'],
    expected_answer: 'do',
    spanish_translation: '¿Dónde trabajas los días de semana?',
    image_prompt: 'A modern bright office interior with desks and computers, 2D flat vector art, no text',
    hint: "En preguntas Wh- con 'you', el auxiliar que acompaña al verbo es 'do': Where do you work?"
  },
  {
    id: 'ex-6',
    sentence: 'Does Carlos _____ [speak / speaks / speaking] English at his job?',
    options: ['speak', 'speaks', 'speaking'],
    expected_answer: 'speak',
    spanish_translation: '¿Carlos habla inglés en su trabajo?',
    image_prompt: 'A young professional man speaking confidently on an office headset, 2D flat vector art, no text',
    hint: "¡Regla de oro! Tras el auxiliar 'Does', el verbo principal regresa a su forma base 'speak' (sin -s)."
  },
  {
    id: 'ex-7',
    sentence: 'What time _____ [does / do / is] the train arrive at the station?',
    options: ['does', 'do', 'is'],
    expected_answer: 'does',
    spanish_translation: '¿A qué hora llega el tren a la estación?',
    image_prompt: 'A clean passenger train arriving at a sunny railway platform, 2D flat vector art, no text',
    hint: "'The train' es sujeto singular (It), por lo tanto el auxiliar de pregunta es 'does'."
  },
  {
    id: 'ex-8',
    sentence: 'I _____ [don\'t / doesn\'t / not] like waking up before six in the morning.',
    options: ["don't", "doesn't", 'not'],
    expected_answer: "don't",
    spanish_translation: 'No me gusta despertarme antes de las seis de la mañana.',
    image_prompt: 'A person cozy in bed looking at an alarm clock at dawn, 2D flat vector art, no text',
    hint: "Con el pronombre personal 'I' usamos el auxiliar negativo 'don't'."
  }
];

// 2. A1.2 Class 1: Daily Routines (Present Simple Affirmative, 3rd Person -s / -es)
export const PRESENT_SIMPLE_ROUTINES_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Every weekday, Mateo _____ [wakes up / wake up / waking up] at six in the morning.',
    options: ['wakes up', 'wake up', 'waking up'],
    expected_answer: 'wakes up',
    spanish_translation: 'Cada día entre semana, Mateo se despierta a las seis de la mañana.',
    image_prompt: 'A cheerful person turning off an alarm clock with morning sunlight in bedroom, 2D flat vector art, no text',
    hint: "Para 'He' (Mateo) en Present Simple afirmativo agregamos '-s' al verbo: 'wakes up'."
  },
  {
    id: 'ex-2',
    sentence: 'She always _____ [has / have / haves] a healthy breakfast before going to the gym.',
    options: ['has', 'have', 'haves'],
    expected_answer: 'has',
    spanish_translation: 'Ella siempre desayuna saludable antes de ir al gimnasio.',
    image_prompt: 'A woman enjoying orange juice and toast at a bright breakfast table, 2D flat vector art, no text',
    hint: "Con 'She', la tercera persona singular irregular de 'have' es 'has'."
  },
  {
    id: 'ex-3',
    sentence: 'We usually _____ [drink / drinks / drinking] hot coffee together at the office.',
    options: ['drink', 'drinks', 'drinking'],
    expected_answer: 'drink',
    spanish_translation: 'Nosotros usualmente tomamos café caliente juntos en la oficina.',
    image_prompt: 'Coworkers holding ceramic mugs in a modern office breakroom, 2D flat vector art, no text',
    hint: "Con el pronombre 'We', el verbo se mantiene en su forma base: 'drink'."
  },
  {
    id: 'ex-4',
    sentence: 'Lucas _____ [goes / go / gos] to the university by subway every morning.',
    options: ['goes', 'go', 'gos'],
    expected_answer: 'goes',
    spanish_translation: 'Lucas va a la universidad en metro todas las mañanas.',
    image_prompt: 'A student with backpack waiting on a clean subway platform, 2D flat vector art, no text',
    hint: "Los verbos terminados en vocal '-o' añaden '-es' en tercera persona singular: 'goes'."
  },
  {
    id: 'ex-5',
    sentence: 'Elena _____ [watches / watch / watchs] educational documentaries in the evening.',
    options: ['watches', 'watch', 'watchs'],
    expected_answer: 'watches',
    spanish_translation: 'Elena mira documentales educativos por la tarde.',
    image_prompt: 'A woman relaxing on a cozy sofa watching television, 2D flat vector art, no text',
    hint: "Los verbos terminados en '-ch' añaden '-es' en tercera persona singular: 'watches'."
  },
  {
    id: 'ex-6',
    sentence: 'They _____ [live / lives / living] in a peaceful neighborhood near the central park.',
    options: ['live', 'lives', 'living'],
    expected_answer: 'live',
    spanish_translation: 'Ellos viven en un barrio tranquilo cerca del parque central.',
    image_prompt: 'A quiet suburban street with trees and modern houses, 2D flat vector art, no text',
    hint: "Con 'They', el verbo va en forma base: 'live'."
  },
  {
    id: 'ex-7',
    sentence: 'David _____ [studies / studys / study] English grammar thirty minutes every day.',
    options: ['studies', 'studys', 'study'],
    expected_answer: 'studies',
    spanish_translation: 'David estudia gramática de inglés treinta minutos todos los días.',
    image_prompt: 'A focused student taking notes next to an open book and desk lamp, 2D flat vector art, no text',
    hint: "Verbos terminados en consonante + 'y' cambian a '-ies': 'studies'."
  },
  {
    id: 'ex-8',
    sentence: 'My sister _____ [teaches / teach / teachs] mathematics at the local high school.',
    options: ['teaches', 'teach', 'teachs'],
    expected_answer: 'teaches',
    spanish_translation: 'Mi hermana enseña matemáticas en la escuela secundaria local.',
    image_prompt: 'A smiling teacher standing next to a clean green chalkboard with numbers, 2D flat vector art, no text',
    hint: "Verbos terminados en '-ch' agregan '-es': 'teaches'."
  }
];

// 3. A1.2 Class 3: Time & Frequency (Adverbs of Frequency, Time Prepositions)
export const TIME_AND_FREQUENCY_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'She _____ [always drinks / drinks always / always drink] tea with lemon in the afternoon.',
    options: ['always drinks', 'drinks always', 'always drink'],
    expected_answer: 'always drinks',
    spanish_translation: 'Ella siempre toma té con limón por la tarde.',
    image_prompt: 'A woman sipping tea by a sunlit window with potted plants, 2D flat vector art, no text',
    hint: "El adverbio de frecuencia 'always' va antes del verbo principal con tercera persona: 'always drinks'."
  },
  {
    id: 'ex-2',
    sentence: 'We usually have lunch _____ [at / in / on] one o\'clock in the afternoon.',
    options: ['at', 'in', 'on'],
    expected_answer: 'at',
    spanish_translation: 'Nosotros usualmente almorzamos a la una en punto de la tarde.',
    image_prompt: 'Colleagues sitting at an outdoor lunch table with plates of food, 2D flat vector art, no text',
    hint: "Para horas de reloj específicas usamos la preposición 'at' (at one o'clock)."
  },
  {
    id: 'ex-3',
    sentence: 'I _____ [never eat / eat never / never eats] heavy food late at night.',
    options: ['never eat', 'eat never', 'never eats'],
    expected_answer: 'never eat',
    spanish_translation: 'Yo nunca como comida pesada tarde en la noche.',
    image_prompt: 'A clean kitchen counter at night with a glass of water, 2D flat vector art, no text',
    hint: "Con el pronombre 'I', el adverbio 'never' va antes del verbo en forma base: 'never eat'."
  },
  {
    id: 'ex-4',
    sentence: 'Carlos plays basketball with his friends _____ [on / in / at] Saturdays.',
    options: ['on', 'in', 'at'],
    expected_answer: 'on',
    spanish_translation: 'Carlos juega al baloncesto con sus amigos los sábados.',
    image_prompt: 'Friends playing basketball on an outdoor neighborhood court, 2D flat vector art, no text',
    hint: "Para días de la semana usamos la preposición 'on' (on Saturdays)."
  },
  {
    id: 'ex-5',
    sentence: 'They _____ [sometimes go / go sometimes / sometimes goes] to the cinema after work.',
    options: ['sometimes go', 'go sometimes', 'sometimes goes'],
    expected_answer: 'sometimes go',
    spanish_translation: 'Ellos a veces van al cine después del trabajo.',
    image_prompt: 'Two moviegoers walking into a brightly lit cinema theater, 2D flat vector art, no text',
    hint: "Con 'They', usamos 'sometimes' seguido de la forma base 'go'."
  },
  {
    id: 'ex-6',
    sentence: 'The office opens _____ [in / at / on] the morning at eight sharp.',
    options: ['in', 'at', 'on'],
    expected_answer: 'in',
    spanish_translation: 'La oficina abre por la mañana a las ocho en punto.',
    image_prompt: 'Glass entrance doors of a modern office building with morning light, 2D flat vector art, no text',
    hint: "Para partes del día usamos 'in' (in the morning, in the afternoon)."
  },
  {
    id: 'ex-7',
    sentence: 'Elena is _____ [always / never / rarely] polite and helpful with her colleagues.',
    options: ['always', 'never', 'rarely'],
    expected_answer: 'always',
    spanish_translation: 'Elena siempre es amable y servicial con sus compañeros de trabajo.',
    image_prompt: 'A smiling professional woman assisting a colleague with paperwork, 2D flat vector art, no text',
    hint: "Con el verbo To Be, el adverbio de frecuencia se coloca DESPUÉS del verbo: 'is always'."
  },
  {
    id: 'ex-8',
    sentence: 'How _____ [often / many / much] do you practice English conversation during the week?',
    options: ['often', 'many', 'much'],
    expected_answer: 'often',
    spanish_translation: '¿Con qué frecuencia practicas conversación en inglés durante la semana?',
    image_prompt: 'Two students wearing headsets practicing conversation warmly, 2D flat vector art, no text',
    hint: "Para preguntar por la frecuencia de una acción usamos la frase interrogativa 'How often'."
  }
];

// 4. A1.1 Introductions & Verb To Be
export const INTRODUCTIONS_TO_BE_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Hello! I _____ [am / is / are] Carlos and I live in Madrid.',
    options: ['am', 'is', 'are'],
    expected_answer: 'am',
    spanish_translation: '¡Hola! Yo soy Carlos y vivo en Madrid.',
    image_prompt: 'A friendly young man waving and smiling warmly in a bright European city square, 2D flat vector art, no text',
    hint: "Con el pronombre de primera persona 'I' usamos el verbo 'am'."
  },
  {
    id: 'ex-2',
    sentence: 'Maria _____ [is / am / are] an architect from Barcelona.',
    options: ['is', 'am', 'are'],
    expected_answer: 'is',
    spanish_translation: 'María es arquitecta de Barcelona.',
    image_prompt: 'A young professional woman smiling with architectural blueprints, 2D flat vector art, no text',
    hint: "Con 'She' (Maria) usamos la forma singular 'is'."
  },
  {
    id: 'ex-3',
    sentence: 'They _____ [are / is / am] new students in our English class.',
    options: ['are', 'is', 'am'],
    expected_answer: 'are',
    spanish_translation: 'Ellos son nuevos estudiantes en nuestra clase de inglés.',
    image_prompt: 'Two cheerful students holding notebooks in a sunny campus hallway, 2D flat vector art, no text',
    hint: "Con el pronombre plural 'They' usamos 'are'."
  },
  {
    id: 'ex-4',
    sentence: 'My name _____ [is / are / am] Sofia and it is a pleasure to meet you.',
    options: ['is', 'are', 'am'],
    expected_answer: 'is',
    spanish_translation: 'Mi nombre es Sofía y es un placer conocerte.',
    image_prompt: 'A smiling woman introducing herself politely with a gentle hand gesture, 2D flat vector art, no text',
    hint: "'My name' equivale a tercera persona singular (It), por lo que lleva 'is'."
  },
  {
    id: 'ex-5',
    sentence: 'Where _____ [are / is / am] you from?',
    options: ['are', 'is', 'am'],
    expected_answer: 'are',
    spanish_translation: '¿De dónde eres tú?',
    image_prompt: 'Two travelers chatting happily at a coffee stand with a world map behind, 2D flat vector art, no text',
    hint: "Con el pronombre 'you' en preguntas usamos 'are you'."
  },
  {
    id: 'ex-6',
    sentence: 'He _____ [is / are / am] from Colombia and speaks Spanish natively.',
    options: ['is', 'are', 'am'],
    expected_answer: 'is',
    spanish_translation: 'Él es de Colombia y habla español de forma nativa.',
    image_prompt: 'A friendly man in casual clothes standing in front of colorful colonial architecture, 2D flat vector art, no text',
    hint: "Con el pronombre singular 'He' usamos 'is'."
  },
  {
    id: 'ex-7',
    sentence: 'We _____ [are / is / am] very excited to learn together.',
    options: ['are', 'is', 'am'],
    expected_answer: 'are',
    spanish_translation: 'Estamos muy emocionados de aprender juntos.',
    image_prompt: 'A diverse group of smiling classmates sitting at a circular study table, 2D flat vector art, no text',
    hint: "Con el sujeto plural 'We' usamos 'are'."
  },
  {
    id: 'ex-8',
    sentence: 'It _____ [is / are / am] a wonderful morning to practice.',
    options: ['is', 'are', 'am'],
    expected_answer: 'is',
    spanish_translation: 'Es una mañana maravillosa para practicar.',
    image_prompt: 'Morning sun shining through big classroom windows onto study desks, 2D flat vector art, no text',
    hint: "Con el pronombre neutro singular 'It' usamos 'is'."
  }
];

// 5. A1.1 Objects & Possession (Demonstratives, Possessive 's, Plural Nouns)
export const OBJECTS_AND_POSSESSION_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: '_____ [This / These / Those] is my new smartphone on the desk.',
    options: ['This', 'These', 'Those'],
    expected_answer: 'This',
    spanish_translation: 'Este es mi nuevo teléfono inteligente sobre el escritorio.',
    image_prompt: 'A modern smartphone resting next to a coffee mug on a clean wooden desk, 2D flat vector art, no text',
    hint: "Para un objeto singular que está cerca del hablante usamos 'This is'."
  },
  {
    id: 'ex-2',
    sentence: '_____ [Those / That / This] are your house keys on the kitchen counter.',
    options: ['Those', 'That', 'This'],
    expected_answer: 'Those',
    spanish_translation: 'Esas son las llaves de tu casa sobre la mesada de la cocina.',
    image_prompt: 'A keychain with brass keys lying on a kitchen counter in the distance, 2D flat vector art, no text',
    hint: "Para objetos plurales que están lejos del hablante usamos 'Those are'."
  },
  {
    id: 'ex-3',
    sentence: 'Is this _____ [John\'s / Johns / John] black leather jacket?',
    options: ["John's", 'Johns', 'John'],
    expected_answer: "John's",
    spanish_translation: '¿Esta es la chaqueta de cuero negro de John?',
    image_prompt: 'A stylish black leather jacket hanging neatly on a wooden coat rack, 2D flat vector art, no text',
    hint: "El genitivo posesivo en inglés requiere apóstrofo y 's': 'John's jacket'."
  },
  {
    id: 'ex-4',
    sentence: 'She has two luxury _____ [watches / watchs / watch] in her collection.',
    options: ['watches', 'watchs', 'watch'],
    expected_answer: 'watches',
    spanish_translation: 'Ella tiene dos relojes de lujo en su colección.',
    image_prompt: 'Two elegant metallic wristwatches displayed inside an open velvet box, 2D flat vector art, no text',
    hint: "Sustantivos terminados en '-ch' agregan '-es' en plural: 'watches'."
  },
  {
    id: 'ex-5',
    sentence: '_____ [These / This / That] books belong to the university library.',
    options: ['These', 'This', 'That'],
    expected_answer: 'These',
    spanish_translation: 'Estos libros pertenecen a la biblioteca universitaria.',
    image_prompt: 'A stack of colorful academic textbooks right in front of a student, 2D flat vector art, no text',
    hint: "Para sustantivos plurales cercanos (books) usamos el demostrativo 'These'."
  },
  {
    id: 'ex-6',
    sentence: 'That red car _____ [is / are / am] Sarah\'s new vehicle.',
    options: ['is', 'are', 'am'],
    expected_answer: 'is',
    spanish_translation: 'Ese auto rojo es el nuevo vehículo de Sarah.',
    image_prompt: 'A sleek red car parked in front of a modern suburban house, 2D flat vector art, no text',
    hint: "Sujeto singular 'That red car' lleva el verbo singular 'is'."
  },
  {
    id: 'ex-7',
    sentence: 'Where are Carlos\'s _____ [glasses / glass / glasss]? He needs them to read.',
    options: ['glasses', 'glass', 'glasss'],
    expected_answer: 'glasses',
    spanish_translation: '¿Dónde están los lentes de Carlos? Los necesita para leer.',
    image_prompt: 'A pair of reading glasses resting on an open book next to a desk lamp, 2D flat vector art, no text',
    hint: "Palabras terminadas en '-ss' agregan '-es' para formar el plural: 'glasses'."
  },
  {
    id: 'ex-8',
    sentence: 'This is Maria\'s backpack and that is _____ [David\'s / Davids / David] laptop bag.',
    options: ["David's", 'Davids', 'David'],
    expected_answer: "David's",
    spanish_translation: 'Esta es la mochila de María y esa es la bolsa de la laptop de David.',
    image_prompt: 'A student backpack and a laptop bag resting on a university bench, 2D flat vector art, no text',
    hint: "Indica pertenencia con el apóstrofo posesivo: 'David's'."
  }
];

// 6. A1.3 Class 1: Present Continuous (am / is / are + verb-ing)
export const PRESENT_CONTINUOUS_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Right now, Mateo is _____ [cooking / cook / cooked] dinner in the kitchen.',
    options: ['cooking', 'cook', 'cooked'],
    expected_answer: 'cooking',
    spanish_translation: 'Ahora mismo, Mateo está cocinando la cena en la cocina.',
    image_prompt: 'A person happily stirring soup in a modern kitchen with steam rising, 2D flat vector art, no text',
    hint: "En Present Continuous usamos el verbo 'to be' + verbo con terminación '-ing': 'is cooking'."
  },
  {
    id: 'ex-2',
    sentence: 'They are _____ [studying / study / studies] for tomorrow\'s English test at the library.',
    options: ['studying', 'study', 'studies'],
    expected_answer: 'studying',
    spanish_translation: 'Ellos están estudiando para el examen de inglés de mañana en la biblioteca.',
    image_prompt: 'Two students focused on open notebooks at a wooden study desk, 2D flat vector art, no text',
    hint: "Con 'They are' la acción en desarrollo lleva la forma con '-ing': 'studying'."
  },
  {
    id: 'ex-3',
    sentence: 'What _____ [are you doing / do you do / you doing] at this moment?',
    options: ['are you doing', 'do you do', 'you doing'],
    expected_answer: 'are you doing',
    spanish_translation: '¿Qué estás haciendo en este momento?',
    image_prompt: 'A person holding a phone and chatting casually in a living room, 2D flat vector art, no text',
    hint: "Para acciones ocurriendo en este momento exacto usamos 'What are you doing?'."
  },
  {
    id: 'ex-4',
    sentence: 'She isn\'t _____ [sleeping / sleep / sleeps]; she is reading a novel in her bedroom.',
    options: ['sleeping', 'sleep', 'sleeps'],
    expected_answer: 'sleeping',
    spanish_translation: 'Ella no está durmiendo; está leyendo una novela en su habitación.',
    image_prompt: 'A woman sitting propped up in bed reading a book under a warm lamp, 2D flat vector art, no text',
    hint: "En la forma negativa continua usamos 'isn't' + verbo con '-ing': 'isn't sleeping'."
  },
  {
    id: 'ex-5',
    sentence: 'Look! It _____ [is raining / rains / raining] outside, take an umbrella.',
    options: ['is raining', 'rains', 'raining'],
    expected_answer: 'is raining',
    spanish_translation: '¡Mira! Está lloviendo afuera, lleva un paraguas.',
    image_prompt: 'Raindrops falling against a window pane looking onto a city street, 2D flat vector art, no text',
    hint: "Para una acción que ocurre frente a nuestros ojos ('Look!'), usamos 'is raining'."
  },
  {
    id: 'ex-6',
    sentence: 'We _____ [are listening / listen / listening] to an interesting podcast right now.',
    options: ['are listening', 'listen', 'listening'],
    expected_answer: 'are listening',
    spanish_translation: 'Estamos escuchando un podcast interesante ahora mismo.',
    image_prompt: 'Two people sharing earbuds and smiling while listening to audio, 2D flat vector art, no text',
    hint: "Con 'We' y el marcador temporal 'right now' usamos 'are listening'."
  },
  {
    id: 'ex-7',
    sentence: 'Carlos is _____ [driving / drive / drove] to the airport to pick up his friend.',
    options: ['driving', 'drive', 'drove'],
    expected_answer: 'driving',
    spanish_translation: 'Carlos está conduciendo hacia el aeropuerto para recoger a su amigo.',
    image_prompt: 'A driver focused on the road through the car windshield on a highway, 2D flat vector art, no text',
    hint: "Los verbos terminados en 'e' como 'drive' eliminan la 'e' y añaden '-ing': 'driving'."
  },
  {
    id: 'ex-8',
    sentence: 'Why _____ [is she crying / does she cry / she is crying]? Is everything okay?',
    options: ['is she crying', 'does she cry', 'she is crying'],
    expected_answer: 'is she crying',
    spanish_translation: '¿Por qué está llorando ella? ¿Está todo bien?',
    image_prompt: 'A comforting friend placing a reassuring hand on someone\'s shoulder, 2D flat vector art, no text',
    hint: "Estructura de pregunta continua: Wh-word + is + sujeto + verbo-ing: 'is she crying'."
  }
];

// 6.5. B1 Past Continuous (was / were + verb-ing, Interrupted Actions)
export const PAST_CONTINUOUS_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'I was _____ [cooking / cooked / cook] dinner in the kitchen when the lights suddenly went out.',
    options: ['cooking', 'cooked', 'cook'],
    expected_answer: 'cooking',
    spanish_translation: 'Estaba cocinando la cena en la cocina cuando de repente se fue la luz.',
    image_prompt: 'A person holding a wooden spoon in a cozy kitchen looking surprised as the lights go off, 2D flat vector art, no text',
    hint: 'Para la acción continua en el pasado usamos was + verbo con -ing.'
  },
  {
    id: 'ex-2',
    sentence: 'While we were _____ [walking / walked / walk] through the city park, it began to rain heavily.',
    options: ['walking', 'walked', 'walk'],
    expected_answer: 'walking',
    spanish_translation: 'Mientras estábamos caminando por el parque de la ciudad, empezó a llover fuerte.',
    image_prompt: 'Two friends walking on a tree-lined park path looking up as rain droplets start falling, 2D vector art, no text',
    hint: 'Con While we were... la acción de fondo va en gerundio (-ing).'
  },
  {
    id: 'ex-3',
    sentence: 'David was _____ [driving / drove / drive] home from work when his phone rang.',
    options: ['driving', 'drove', 'drive'],
    expected_answer: 'driving',
    spanish_translation: 'David estaba conduciendo a casa del trabajo cuando sonó su teléfono.',
    image_prompt: 'A driver focused on a sunset city highway road while a phone on the dashboard lights up, 2D vector art, no text',
    hint: 'Sujeto singular David + was + verbo con -ing.'
  },
  {
    id: 'ex-4',
    sentence: "What were you _____ [doing / did / do] at eight o'clock yesterday evening?",
    options: ['doing', 'did', 'do'],
    expected_answer: 'doing',
    spanish_translation: '¿Qué estabas haciendo a las ocho en punto ayer por la noche?',
    image_prompt: 'A young detective asking questions in a bright living room, 2D vector art, no text',
    hint: 'En preguntas en pasado continuo: What were you + doing?'
  },
  {
    id: 'ex-5',
    sentence: 'They were _____ [playing / played / play] soccer in the stadium when the coach arrived.',
    options: ['playing', 'played', 'play'],
    expected_answer: 'playing',
    spanish_translation: 'Ellos estaban jugando fútbol en el estadio cuando llegó el entrenador.',
    image_prompt: 'Teenagers kicking a soccer ball on a green stadium grass field, 2D vector art, no text',
    hint: 'Sujeto plural They + were + verbo con -ing.'
  },
  {
    id: 'ex-6',
    sentence: 'Elena was _____ [studying / studied / study] for her exam while her brother was sleeping.',
    options: ['studying', 'study', 'studies'],
    expected_answer: 'studying',
    spanish_translation: 'Elena estaba estudiando para su examen mientras su hermano dormía.',
    image_prompt: 'A student studying with books and a desk lamp in a cozy room, 2D vector art, no text',
    hint: 'Dos acciones continuas paralelas usan was/were + -ing.'
  },
  {
    id: 'ex-7',
    sentence: 'I _____ [dropped / was dropping / drop] my keys while I was running for the bus.',
    options: ['dropped', 'was dropping', 'drop'],
    expected_answer: 'dropped',
    spanish_translation: 'Se me cayeron las llaves mientras estaba corriendo tras el autobús.',
    image_prompt: 'A commuter rushing toward a city bus as keys slip onto the sidewalk, 2D vector art, no text',
    hint: 'La acción puntual que interrumpe va en Past Simple: dropped.'
  },
  {
    id: 'ex-8',
    sentence: 'She was _____ [reading / read / reads] a novel when the doorbell rang loudly.',
    options: ['reading', 'read', 'reads'],
    expected_answer: 'reading',
    spanish_translation: 'Ella estaba leyendo una novela cuando el timbre sonó fuerte.',
    image_prompt: 'A woman in an armchair holding a book looking toward the front door, 2D vector art, no text',
    hint: 'Acción en progreso was reading interrumpida por rang.'
  }
];

// 7. A1.3 Class 2: Places & There is / There are
export const THERE_IS_THERE_ARE_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: '_____ [There is / There are / There be] a large supermarket near my apartment.',
    options: ['There is', 'There are', 'There be'],
    expected_answer: 'There is',
    spanish_translation: 'Hay un supermercado grande cerca de mi apartamento.',
    image_prompt: 'A modern neighborhood supermarket with fresh produce visible through windows, 2D flat vector art, no text',
    hint: "Para un solo lugar singular ('a large supermarket') usamos 'There is'."
  },
  {
    id: 'ex-2',
    sentence: '_____ [There are / There is / Is there] three quiet coffee shops on this street.',
    options: ['There are', 'There is', 'Is there'],
    expected_answer: 'There are',
    spanish_translation: 'Hay tres cafeterías tranquilas en esta calle.',
    image_prompt: 'A cozy city street with outdoor cafe tables and awnings, 2D flat vector art, no text',
    hint: "Para sustantivos plurales ('three quiet coffee shops') usamos 'There are'."
  },
  {
    id: 'ex-3',
    sentence: '_____ [Is there / Are there / There is] a pharmacy around here?',
    options: ['Is there', 'Are there', 'There is'],
    expected_answer: 'Is there',
    spanish_translation: '¿Hay una farmacia por aquí cerca?',
    image_prompt: 'A pedestrian looking around an urban corner with storefronts, 2D flat vector art, no text',
    hint: "En preguntas para un lugar singular invertimos el orden: 'Is there a pharmacy?'"
  },
  {
    id: 'ex-4',
    sentence: '_____ [Are there / Is there / There are] any good restaurants near the train station?',
    options: ['Are there', 'Is there', 'There are'],
    expected_answer: 'Are there',
    spanish_translation: '¿Hay buenos restaurantes cerca de la estación de tren?',
    image_prompt: 'Exterior of a bustling train station with city restaurants nearby, 2D flat vector art, no text',
    hint: "En preguntas plurales ('any good restaurants') usamos 'Are there'."
  },
  {
    id: 'ex-5',
    sentence: 'There _____ [isn\'t / aren\'t / not] a bank on this block; you must walk two more blocks.',
    options: ["isn't", "aren't", 'not'],
    expected_answer: "isn't",
    spanish_translation: 'No hay un banco en esta cuadra; debes caminar dos cuadras más.',
    image_prompt: 'A city sidewalk with trees and retail shops, 2D flat vector art, no text',
    hint: "La negación singular de 'There is' es 'There isn't'."
  },
  {
    id: 'ex-6',
    sentence: 'There _____ [aren\'t / isn\'t / no] any free parking spots available right now.',
    options: ["aren't", "isn't", 'no'],
    expected_answer: "aren't",
    spanish_translation: 'No hay espacios de estacionamiento libres disponibles ahora mismo.',
    image_prompt: 'A crowded parking lot with cars parked neatly side by side, 2D flat vector art, no text',
    hint: "La negación plural de 'There are' con 'any' es 'There aren't'."
  },
  {
    id: 'ex-7',
    sentence: 'The bookstore is _____ [next to / between / under] the post office and the bank.',
    options: ['between', 'next to', 'under'],
    expected_answer: 'between',
    spanish_translation: 'La librería está entre la oficina de correos y el banco.',
    image_prompt: 'A charming little bookstore flanked by two other storefront buildings, 2D flat vector art, no text',
    hint: "Cuando un lugar se encuentra en medio de dos puntos de referencia usamos 'between A and B'."
  },
  {
    id: 'ex-8',
    sentence: 'The bakery is _____ [opposite / in / on] the cinema, across the main avenue.',
    options: ['opposite', 'in', 'on'],
    expected_answer: 'opposite',
    spanish_translation: 'La panadería está frente al cine, cruzando la avenida principal.',
    image_prompt: 'A bakery with fresh bread displayed facing across a street toward a cinema, 2D flat vector art, no text',
    hint: "Para indicar que un lugar está enfrente cruzando la calle usamos 'opposite' o 'across from'."
  }
];

// 8. A1.3 Class 3: Can & Abilities (Modal Can / Can't)
export const CAN_AND_ABILITIES_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Mateo _____ [can speak / can speaks / can to speak] Spanish and English fluently.',
    options: ['can speak', 'can speaks', 'can to speak'],
    expected_answer: 'can speak',
    spanish_translation: 'Mateo puede hablar español e inglés con fluidez.',
    image_prompt: 'A young man speaking confidently in an international conference room, 2D flat vector art, no text',
    hint: "Tras el modal 'can' siempre usamos la forma base del verbo sin 'to' ni '-s': 'can speak'."
  },
  {
    id: 'ex-2',
    sentence: '_____ [Can you / Do you can / Are you can] swim in deep water?',
    options: ['Can you', 'Do you can', 'Are you can'],
    expected_answer: 'Can you',
    spanish_translation: '¿Puedes nadar en aguas profundas?',
    image_prompt: 'A swimmer in a clear blue swimming pool lane, 2D flat vector art, no text',
    hint: "En preguntas de habilidad con 'can', se coloca 'Can' directamente al inicio: 'Can you...?'"
  },
  {
    id: 'ex-3',
    sentence: 'She _____ [can\'t / doesn\'t can / not can] play the piano, but she wants to learn.',
    options: ["can't", "doesn't can", 'not can'],
    expected_answer: "can't",
    spanish_translation: 'Ella no puede tocar el piano, pero quiere aprender.',
    image_prompt: 'A person looking curiously at the keys of a grand piano, 2D flat vector art, no text',
    hint: "La forma negativa correcta del modal de habilidad es 'can't' (o cannot)."
  },
  {
    id: 'ex-4',
    sentence: 'My father can _____ [cook / cooks / cooking] delicious Italian meals.',
    options: ['cook', 'cooks', 'cooking'],
    expected_answer: 'cook',
    spanish_translation: 'Mi padre puede cocinar deliciosas comidas italianas.',
    image_prompt: 'A happy man preparing pasta with fresh tomatoes in a rustic kitchen, 2D flat vector art, no text',
    hint: "El verbo después de 'can' va en su forma base pura: 'cook'."
  },
  {
    id: 'ex-5',
    sentence: 'They _____ [can run / can to run / can running] ten kilometers without stopping.',
    options: ['can run', 'can to run', 'can running'],
    expected_answer: 'can run',
    spanish_translation: 'Ellos pueden correr diez kilómetros sin detenerse.',
    image_prompt: 'Two runners jogging along a scenic riverside path at sunset, 2D flat vector art, no text',
    hint: "Estructura correcta: Sujeto + can + verbo base ('can run')."
  },
  {
    id: 'ex-6',
    sentence: 'Carlos can\'t _____ [drive / drives / driving] a manual transmission car.',
    options: ['drive', 'drives', 'driving'],
    expected_answer: 'drive',
    spanish_translation: 'Carlos no puede conducir un auto de transmisión manual.',
    image_prompt: 'A driver sitting in a car looking thoughtfully at the gear shift, 2D flat vector art, no text',
    hint: "Tras 'can't' el verbo nunca cambia, se mantiene en infinitivo sin to: 'drive'."
  },
  {
    id: 'ex-7',
    sentence: '_____ [Can she / Does she can / Is she can] repair computers and smartphones?',
    options: ['Can she', 'Does she can', 'Is she can'],
    expected_answer: 'Can she',
    spanish_translation: '¿Puede ella reparar computadoras y teléfonos inteligentes?',
    image_prompt: 'A technician with precision tools working on circuit boards in a workshop, 2D flat vector art, no text',
    hint: "'Can' no necesita el auxiliar 'does'. La pregunta es directamente: 'Can she...?'"
  },
  {
    id: 'ex-8',
    sentence: 'I can understand written English, but I _____ [can\'t speak / don\'t can speak / not can speak] very fast yet.',
    options: ["can't speak", "don't can speak", 'not can speak'],
    expected_answer: "can't speak",
    spanish_translation: 'Puedo entender inglés escrito, pero todavía no puedo hablar muy rápido.',
    image_prompt: 'A student reading an English book with concentration and confidence, 2D flat vector art, no text',
    hint: "La negación del modal can es 'can't + verbo base': 'can't speak'."
  }
];

// 9. A1.4 Class 1 & 2: Past Simple (Was / Were, Regular & Irregular Verbs, Did / Didn't)
export const PAST_SIMPLE_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Yesterday morning, Liam _____ [went / go / goes] to the central library to study.',
    options: ['went', 'go', 'goes'],
    expected_answer: 'went',
    spanish_translation: 'Ayer por la mañana, Liam fue a la biblioteca central a estudiar.',
    image_prompt: 'A young male student walking into a warm sunlit modern library carrying a backpack, 2D flat vector art, no text',
    hint: "El pasado irregular de 'go' en forma afirmativa es 'went'."
  },
  {
    id: 'ex-2',
    sentence: 'Did you _____ [see / saw / seen] the beautiful sunset at the beach last night?',
    options: ['see', 'saw', 'seen'],
    expected_answer: 'see',
    spanish_translation: '¿Viste el hermoso atardecer en la playa anoche?',
    image_prompt: 'Two friends watching a golden sunset over gentle ocean waves, 2D flat vector art, no text',
    hint: "Tras el auxiliar interrogativo 'Did', el verbo principal regresa a su forma base 'see'."
  },
  {
    id: 'ex-3',
    sentence: 'We _____ [didn\'t buy / didn\'t bought / not bought] the expensive tickets because we had no cash.',
    options: ["didn't buy", "didn't bought", 'not bought'],
    expected_answer: "didn't buy",
    spanish_translation: 'No compramos los boletos caros porque no teníamos efectivo.',
    image_prompt: 'A young couple smiling in front of a cinema ticket counter, 2D flat vector art, no text',
    hint: "Con 'didn't', el verbo principal se mantiene en su forma base 'buy'."
  },
  {
    id: 'ex-4',
    sentence: 'Lucas _____ [ate / eat / eated] delicious tacos with his family last weekend.',
    options: ['ate', 'eat', 'eated'],
    expected_answer: 'ate',
    spanish_translation: 'Lucas comió deliciosos tacos con su familia el fin de semana pasado.',
    image_prompt: 'A family gathered around a dining table enjoying Mexican food, 2D flat vector art, no text',
    hint: "El pasado irregular de 'eat' es 'ate'."
  },
  {
    id: 'ex-5',
    sentence: 'Where did you _____ [travel / traveled / travels] during your summer vacation?',
    options: ['travel', 'traveled', 'travels'],
    expected_answer: 'travel',
    spanish_translation: '¿A dónde viajaste durante tus vacaciones de verano?',
    image_prompt: 'A traveler with a backpack looking at departure flight boards in a modern airport, 2D flat vector art, no text',
    hint: "En preguntas con 'Where did you...', el verbo va en forma base: 'travel'."
  },
  {
    id: 'ex-6',
    sentence: 'She _____ [wrote / write / writed] a warm handwritten letter to her grandmother in Spain.',
    options: ['wrote', 'write', 'writed'],
    expected_answer: 'wrote',
    spanish_translation: 'Ella le escribió una cálida carta a mano a su abuela en España.',
    image_prompt: 'A person writing with a fountain pen on vintage paper with flowers on desk, 2D flat vector art, no text',
    hint: "El pasado simple irregular de 'write' es 'wrote'."
  },
  {
    id: 'ex-7',
    sentence: 'They _____ [bought / buy / buyed] a new red bicycle for their daughter\'s birthday.',
    options: ['bought', 'buy', 'buyed'],
    expected_answer: 'bought',
    spanish_translation: 'Compraron una nueva bicicleta roja para el cumpleaños de su hija.',
    image_prompt: 'Parents surprising a happy little girl with a shiny red bicycle in a garden, 2D flat vector art, no text',
    hint: "El pasado irregular de 'buy' es 'bought'."
  },
  {
    id: 'ex-8',
    sentence: 'I _____ [lost / lose / losed] my office badge yesterday, but I found it this morning.',
    options: ['lost', 'lose', 'losed'],
    expected_answer: 'lost',
    spanish_translation: 'Perdí mi credencial de la oficina ayer, pero la encontré esta mañana.',
    image_prompt: 'An office worker looking with relief at an ID card badge on a desk, 2D flat vector art, no text',
    hint: "El pasado irregular de 'lose' es 'lost'."
  }
];

// 10. A1.4 Class 3: Future with Be Going To
export const FUTURE_GOING_TO_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Next summer, Maria is _____ [going to travel / go to travel / will traveling] to Japan.',
    options: ['going to travel', 'go to travel', 'will traveling'],
    expected_answer: 'going to travel',
    spanish_translation: 'El próximo verano, María va a viajar a Japón.',
    image_prompt: 'A woman with a travel suitcase looking enthusiastically at a Tokyo travel guide, 2D flat vector art, no text',
    hint: "Para planes futuros e intenciones planeadas usamos 'is going to + verbo base'."
  },
  {
    id: 'ex-2',
    sentence: 'Look at those dark clouds! It is _____ [going to rain / rain / raining] in a few minutes.',
    options: ['going to rain', 'rain', 'raining'],
    expected_answer: 'going to rain',
    spanish_translation: '¡Mira esas nubes oscuras! Va a llover en unos minutos.',
    image_prompt: 'Dark dramatic storm clouds over a city street as people open umbrellas, 2D flat vector art, no text',
    hint: "Para predicciones con evidencia visual presente ('Look at those clouds') usamos 'going to rain'."
  },
  {
    id: 'ex-3',
    sentence: 'We are _____ [going to buy / go to buy / will buyed] a new apartment next month.',
    options: ['going to buy', 'go to buy', 'will buyed'],
    expected_answer: 'going to buy',
    spanish_translation: 'Vamos a comprar un nuevo apartamento el próximo mes.',
    image_prompt: 'A smiling couple holding new apartment keys outside a sunny building, 2D flat vector art, no text',
    hint: "Con 'We are' usamos la estructura de plan 'going to buy'."
  },
  {
    id: 'ex-4',
    sentence: 'What are you _____ [going to do / go to do / will doing] this weekend?',
    options: ['going to do', 'go to do', 'will doing'],
    expected_answer: 'going to do',
    spanish_translation: '¿Qué vas a hacer este fin de semana?',
    image_prompt: 'Friends reviewing a calendar of weekend leisure activities, 2D flat vector art, no text',
    hint: "Pregunta sobre planes futuros: 'What are you going to do?'"
  },
  {
    id: 'ex-5',
    sentence: 'Carlos isn\'t _____ [going to attend / go to attend / going attend] the meeting tomorrow.',
    options: ['going to attend', 'go to attend', 'going attend'],
    expected_answer: 'going to attend',
    spanish_translation: 'Carlos no va a asistir a la reunión de mañana.',
    image_prompt: 'A conference room with an empty chair at a business meeting table, 2D flat vector art, no text',
    hint: "Forma negativa: isn't + going to + verbo base ('going to attend')."
  },
  {
    id: 'ex-6',
    sentence: 'They are _____ [going to start / go to start / will starting] their English course on Monday.',
    options: ['going to start', 'go to start', 'will starting'],
    expected_answer: 'going to start',
    spanish_translation: 'Ellos van a comenzar su curso de inglés el lunes.',
    image_prompt: 'Students in a language academy smiling with new textbooks, 2D flat vector art, no text',
    hint: "Con 'They are' usamos 'going to start'."
  },
  {
    id: 'ex-7',
    sentence: '_____ [Are you going to / Do you going to / Will you to] visit your family this holiday?',
    options: ['Are you going to', 'Do you going to', 'Will you to'],
    expected_answer: 'Are you going to',
    spanish_translation: '¿Vas a visitar a tu familia estas vacaciones?',
    image_prompt: 'A happy family greeting each other at an airport arrival hall, 2D flat vector art, no text',
    hint: "Estructura de pregunta con going to: 'Are you going to + verbo base?'"
  },
  {
    id: 'ex-8',
    sentence: 'I am _____ [going to study / go to study / will study] hard for the upcoming exam.',
    options: ['going to study', 'go to study', 'will study'],
    expected_answer: 'going to study',
    spanish_translation: 'Voy a estudiar con dedicación para el próximo examen.',
    image_prompt: 'A student organizing colorful study notes on a tidy desk with a lamp, 2D flat vector art, no text',
    hint: "Con 'I am' la intención planeada es 'going to study'."
  }
];

// 11. Clean Baseline Fallback (Strictly Present Simple & Everyday Communication - NO random modals or future/past)
export const CLEAN_BASELINE_PRESENT_BANK: QuizExercise[] = [
  {
    id: 'ex-1',
    sentence: 'Every morning, Sophia _____ [practices / practice / practicing] English conversation before work.',
    options: ['practices', 'practice', 'practicing'],
    expected_answer: 'practices',
    spanish_translation: 'Cada mañana, Sophia practica conversación en inglés antes del trabajo.',
    image_prompt: 'A young professional woman practicing speaking with headphones in a sunny room, 2D flat vector art, no text',
    hint: "Tercera persona singular (Sophia = She) en Present Simple afirmativo lleva '-s': 'practices'."
  },
  {
    id: 'ex-2',
    sentence: 'We always _____ [review / reviews / reviewing] the key grammar rules before practicing.',
    options: ['review', 'reviews', 'reviewing'],
    expected_answer: 'review',
    spanish_translation: 'Nosotros siempre repasamos las reglas gramaticales clave antes de practicar.',
    image_prompt: 'Two students studying together with flashcards and a whiteboard, 2D flat vector art, no text',
    hint: "Con el pronombre 'We', el verbo va en forma base pura: 'review'."
  },
  {
    id: 'ex-3',
    sentence: 'David _____ [writes / write / writing] down new vocabulary words in his study notebook.',
    options: ['writes', 'write', 'writing'],
    expected_answer: 'writes',
    spanish_translation: 'David anota nuevas palabras de vocabulario en su cuaderno de estudio.',
    image_prompt: 'A student writing neatly with a pen in a clean notebook, 2D flat vector art, no text',
    hint: "Sujeto singular David (He) lleva terminación '-s': 'writes'."
  },
  {
    id: 'ex-4',
    sentence: 'They _____ [understand / understands / understanding] the main concept of the lesson very well.',
    options: ['understand', 'understands', 'understanding'],
    expected_answer: 'understand',
    spanish_translation: 'Ellos entienden el concepto principal de la lección muy bien.',
    image_prompt: 'A team of classmates smiling and nodding while discussing an idea, 2D flat vector art, no text',
    hint: "Con 'They', usamos la forma base del verbo: 'understand'."
  },
  {
    id: 'ex-5',
    sentence: 'She _____ [speaks / speak / speaking] clearly and with confidence in class.',
    options: ['speaks', 'speak', 'speaking'],
    expected_answer: 'speaks',
    spanish_translation: 'Ella habla con claridad y seguridad en clase.',
    image_prompt: 'A student giving an inspiring presentation in front of peers, 2D flat vector art, no text',
    hint: "Tercera persona singular She lleva '-s': 'speaks'."
  },
  {
    id: 'ex-6',
    sentence: 'Students usually _____ [ask / asks / asking] insightful questions during the discussion.',
    options: ['ask', 'asks', 'asking'],
    expected_answer: 'ask',
    spanish_translation: 'Los estudiantes usualmente hacen preguntas interesantes durante la discusión.',
    image_prompt: 'A student raising a hand politely in a bright seminar room, 2D flat vector art, no text',
    hint: "Sujeto plural 'Students' (They) lleva la forma base: 'ask'."
  },
  {
    id: 'ex-7',
    sentence: 'It is essential to _____ [practice / practices / practicing] speaking every single day.',
    options: ['practice', 'practices', 'practicing'],
    expected_answer: 'practice',
    spanish_translation: 'Es fundamental practicar el habla todos los días.',
    image_prompt: 'A dedicated learner practicing pronunciation in front of a mirror with audio notes, 2D flat vector art, no text',
    hint: "Tras el infinitivo 'to' usamos siempre el verbo en forma base: 'to practice'."
  },
  {
    id: 'ex-8',
    sentence: 'He _____ [reads / read / reading] an interesting article about modern technology every evening.',
    options: ['reads', 'read', 'reading'],
    expected_answer: 'reads',
    spanish_translation: 'Él lee un artículo interesante sobre tecnología moderna cada noche.',
    image_prompt: 'A person reading a digital tablet in a comfortable armchair, 2D flat vector art, no text',
    hint: "Sujeto He en presente simple afirmativo lleva '-s': 'reads'."
  }
];

/**
 * Intelligent resolver that inspects topic, sublevel, and classIndex to return
 * the pedagogically correct 8-question quiz bank.
 */
export function getTopicQuizExercises(topic: string = '', sublevel: string = '', classIndex: number = 1): QuizExercise[] {
  const t = (topic || '').toLowerCase().trim();
  const sub = (sublevel || '').toUpperCase().trim();

  // 1. Present Continuous (HIGHEST PRIORITY: Must evaluate before Present Simple / Routines)
  const isContinuous =
    (!t.includes('past') && !t.includes('pasado')) && (
      t.includes('present continuous') ||
      t.includes('presente continuo') ||
      t.includes('continuous') ||
      t.includes('continuo') ||
      t.includes('actions in progress') ||
      t.includes('verb-ing') ||
      (sub === 'A1.3' && classIndex === 1)
    );

  if (isContinuous) {
    return PRESENT_CONTINUOUS_BANK;
  }

  // 2. Past Continuous & Interrupted Actions
  const isPastContinuous =
    (t.includes('continuous') || t.includes('continuo')) &&
    (t.includes('past') || t.includes('pasado') || t.includes('was/were') || t.includes('interrupted'));

  if (isPastContinuous) {
    return PAST_CONTINUOUS_BANK;
  }

  // 3. A1.3 Class 3 / Can & Abilities
  const isCanAbilities =
    t.includes('can & abilities') ||
    t.includes('can and abilities') ||
    t.includes('abilities') ||
    t.includes('habilidades') ||
    (t.includes('can') && !t.includes('scan') && !t.includes('candle') && !t.includes('cant')) ||
    (sub === 'A1.3' && classIndex === 3);

  if (isCanAbilities) {
    return CAN_AND_ABILITIES_BANK;
  }

  // 4. A1.3 Class 2 / Places & There is / There are
  const isThereIs =
    t.includes('there is') ||
    t.includes('there are') ||
    t.includes('places & there is') ||
    t.includes('lugares y ciudad') ||
    (sub === 'A1.3' && classIndex === 2);

  if (isThereIs) {
    return THERE_IS_THERE_ARE_BANK;
  }

  // 5. A1.2 Class 2 / Questions & Negatives / Do and Does
  const isDoDoes = 
    t.includes('questions & negatives') ||
    t.includes('questions and negatives') ||
    t.includes('do and does') ||
    t.includes('do / does') ||
    t.includes('do & does') ||
    t.includes("don't / doesn't") ||
    t.includes("don't and doesn't") ||
    (t.includes('negative') && sub.startsWith('A1') && !t.includes('continuous')) ||
    (t.includes('question') && t.includes('auxiliar')) ||
    (t.includes('auxiliares') && t.includes('do')) ||
    (sub === 'A1.2' && classIndex === 2 && !t.includes('continuous'));

  if (isDoDoes) {
    return DO_DOES_QUESTIONS_NEGATIVES_BANK;
  }

  // 6. A1.2 Class 3 / Time & Frequency
  const isFrequency =
    t.includes('frequency') ||
    t.includes('frecuencia') ||
    t.includes('time & frequency') ||
    t.includes('always') ||
    t.includes('usually') ||
    t.includes('adverbios de frecuencia') ||
    (sub === 'A1.2' && classIndex === 3 && !t.includes('continuous'));

  if (isFrequency) {
    return TIME_AND_FREQUENCY_BANK;
  }

  // 7. A1.2 Class 1 / Daily Routines / Present Simple Affirmative (Strictly NOT continuous)
  const isRoutine =
    !t.includes('continuous') && !t.includes('continuo') && (
      t.includes('routine') ||
      t.includes('rutina') ||
      t.includes('daily life') ||
      t.includes('habit') ||
      t.includes('present simple') ||
      (sub === 'A1.2' && (classIndex === 1 || classIndex === 4))
    );

  if (isRoutine) {
    return PRESENT_SIMPLE_ROUTINES_BANK;
  }

  // 8. Past Simple (A1.4 #1 & #2, A2.1)
  const isPast =
    !t.includes('continuous') && !t.includes('continuo') && (
      t.includes('past simple') ||
      t.includes('irregular past') ||
      t.includes('was / were') ||
      (t.includes('past') && !t.includes('continuous')) ||
      (sub === 'A1.4' && (classIndex === 1 || classIndex === 2)) ||
      (sub === 'A2.1' && classIndex === 1)
    );

  if (isPast) {
    return PAST_SIMPLE_BANK;
  }

  // 9. Future Going To (A1.4 #3)
  const isFuture =
    t.includes('going to') ||
    t.includes('future plans') ||
    (sub === 'A1.4' && classIndex === 3);

  if (isFuture) {
    return FUTURE_GOING_TO_BANK;
  }

  // 10. A1.1 Objects & Possession
  const isObjects =
    t.includes('object') ||
    t.includes('possession') ||
    t.includes('demonstrative') ||
    t.includes('this / that') ||
    t.includes('these / those') ||
    (sub === 'A1.1' && classIndex === 3);

  if (isObjects) {
    return OBJECTS_AND_POSSESSION_BANK;
  }

  // 11. A1.1 Introductions & Verb To Be
  const isIntro =
    t.includes('sound') ||
    t.includes('intro') ||
    t.includes('greet') ||
    t.includes('to be') ||
    t.includes('personal information') ||
    t.includes('hello') ||
    (sub === 'A1.1' && (classIndex === 1 || classIndex === 2 || classIndex === 4));

  if (isIntro) {
    return INTRODUCTIONS_TO_BE_BANK;
  }

  // Clean fallback: Present Simple everyday communication (strictly NO out-of-scope modals/tenses)
  return CLEAN_BASELINE_PRESENT_BANK;
}
