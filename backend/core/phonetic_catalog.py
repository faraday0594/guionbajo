"""
Guionbajo — Comprehensive English Phonetic Catalog (44 Phonemes)
Includes IPA symbols, articulatory anatomy instructions, contrast pairs, and example words.
"""
from typing import Dict, List, Optional, Any

# 44 English Phonemes Catalog
PHONETIC_CATALOG: Dict[str, Dict[str, Any]] = {
    # ─── VOWELS: SHORT & LONG MONOPHTHONGS ──────────────────────────────────────────
    "/iː/": {
        "ipa": "/iː/",
        "name": "Long E",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "High front, tense",
        "mouth_aperture": "Close, smiling lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Lips stretched wide in a smile, teeth close together.",
            "lateral": "Tongue arched high towards the hard palate, tongue tip behind lower teeth."
        },
        "examples": ["sheep", "feel", "see", "tree", "read"],
        "contrast_with": "/ɪ/",
        "contrast_pairs": [["sheep", "ship"], ["feel", "fill"], ["leave", "live"], ["seat", "sit"]],
        "introduced_at": "A1.1",
        "drill_sentence": "She sees three green trees near the beach."
    },
    "/ɪ/": {
        "ipa": "/ɪ/",
        "name": "Short I",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Near-high front, relaxed/lax",
        "mouth_aperture": "Slightly open, relaxed lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Lips relaxed and slightly apart, mouth loosely open.",
            "lateral": "Tongue slightly lower and more centralized than for /iː/."
        },
        "examples": ["ship", "fill", "sit", "hit", "big"],
        "contrast_with": "/iː/",
        "contrast_pairs": [["ship", "sheep"], ["fill", "feel"], ["live", "leave"], ["sit", "seat"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Tim bit a big piece of crisp biscuit."
    },
    "/e/": {
        "ipa": "/e/",
        "name": "Short E (Dress)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Mid-front, relaxed",
        "mouth_aperture": "Medium open, unrounded lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Mouth open more than /ɪ/, jaw drops slightly.",
            "lateral": "Front of tongue raised to mid height."
        },
        "examples": ["bed", "ten", "red", "head", "send"],
        "contrast_with": "/æ/",
        "contrast_pairs": [["bed", "bad"], ["pen", "pan"], ["men", "man"], ["ten", "tan"]],
        "introduced_at": "A1.2",
        "drill_sentence": "Ten red pens were sent on Wednesday."
    },
    "/æ/": {
        "ipa": "/æ/",
        "name": "Short A (Trap / Cat)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Low-front, open",
        "mouth_aperture": "Wide open, jaw dropped",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Jaw drops low, mouth wide and open wide horizontally.",
            "lateral": "Tongue flat and low in the floor of the mouth, tip touching lower incisors."
        },
        "examples": ["cat", "bad", "apple", "hand", "black"],
        "contrast_with": "/ʌ/",
        "contrast_pairs": [["cat", "cut"], ["hat", "hut"], ["bat", "but"], ["bad", "bed"]],
        "introduced_at": "A1.2",
        "drill_sentence": "That black cat sat on the fat man's hat."
    },
    "/ʌ/": {
        "ipa": "/ʌ/",
        "name": "Short U (Strut / Cup)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Mid-central to back-low, lax",
        "mouth_aperture": "Relaxed open, unrounded",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Neutral mouth, relaxed jaw opening.",
            "lateral": "Tongue rests low and relaxed in center of oral cavity."
        },
        "examples": ["cup", "bus", "run", "sun", "luck"],
        "contrast_with": "/æ/",
        "contrast_pairs": [["cut", "cat"], ["hut", "hat"], ["luck", "lack"], ["cup", "cap"]],
        "introduced_at": "A1.3",
        "drill_sentence": "The funny puppy jumped into the muddy puddle."
    },
    "/ɑː/": {
        "ipa": "/ɑː/",
        "name": "Long A (Palm / Car)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "Low back, open",
        "mouth_aperture": "Very open, relaxed lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Mouth open widely like saying 'ah' at the doctor.",
            "lateral": "Tongue pulled back and low in throat."
        },
        "examples": ["car", "park", "heart", "father", "smart"],
        "contrast_with": "/æ/",
        "contrast_pairs": [["car", "cat"], ["park", "pack"], ["heart", "hat"]],
        "introduced_at": "A1.3",
        "drill_sentence": "Park the dark car far in the farm garden."
    },
    "/ɒ/": {
        "ipa": "/ɒ/",
        "name": "Short O (Lot / Hot)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Low back, open",
        "mouth_aperture": "Open, slightly rounded lips",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Lips slightly oval and rounded, jaw lowered.",
            "lateral": "Back of tongue depressed low."
        },
        "examples": ["hot", "box", "dog", "coffee", "clock"],
        "contrast_with": "/ɔː/",
        "contrast_pairs": [["spot", "sport"], ["shot", "short"], ["cot", "caught"]],
        "introduced_at": "A1.4",
        "drill_sentence": "Tom got a lot of hot coffee in the pot."
    },
    "/ɔː/": {
        "ipa": "/ɔː/",
        "name": "Long O (Thought / Door)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "Mid-low back, tense",
        "mouth_aperture": "Medium rounded lips (O-shape)",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Lips pursed into a distinct medium circle.",
            "lateral": "Back of tongue raised towards the soft palate."
        },
        "examples": ["door", "water", "call", "four", "board"],
        "contrast_with": "/ɒ/",
        "contrast_pairs": [["sport", "spot"], ["short", "shot"], ["port", "pot"]],
        "introduced_at": "A1.4",
        "drill_sentence": "Paul saw four tall horses walking on the lawn."
    },
    "/ʊ/": {
        "ipa": "/ʊ/",
        "name": "Short OO (Foot / Put)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Near-high back, lax",
        "mouth_aperture": "Slightly rounded, relaxed",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Lips loosely rounded without tension.",
            "lateral": "Tongue pulled back slightly higher than mid-level."
        },
        "examples": ["book", "look", "good", "put", "foot"],
        "contrast_with": "/uː/",
        "contrast_pairs": [["look", "Luke"], ["pull", "pool"], ["full", "fool"], ["foot", "food"]],
        "introduced_at": "A2.1",
        "drill_sentence": "Look at the good cookbook full of pudding recipes."
    },
    "/uː/": {
        "ipa": "/uː/",
        "name": "Long OO (Goose / Food)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "High back, tense",
        "mouth_aperture": "Tight small circle lips (pursed)",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Lips pushed forward into a small tight circular tube.",
            "lateral": "Back of tongue raised high toward soft palate."
        },
        "examples": ["food", "blue", "moon", "choose", "shoe"],
        "contrast_with": "/ʊ/",
        "contrast_pairs": [["pool", "pull"], ["fool", "full"], ["suit", "soot"]],
        "introduced_at": "A2.1",
        "drill_sentence": "Sue chose blue shoes for the cool swimming pool."
    },
    "/ɜː/": {
        "ipa": "/ɜː/",
        "name": "Long ER (Nurse / Bird)",
        "category": "vowel_long",
        "voicing": "voiced",
        "tongue_position": "Mid-central, tense",
        "mouth_aperture": "Neutral, medium unrounded",
        "airflow": "Continuous vocalized",
        "mouth_guide": {
            "frontal": "Neutral relaxed lips, slightly open mouth.",
            "lateral": "Tongue bunched in the center of the mouth, sides touching upper molars."
        },
        "examples": ["bird", "work", "learn", "girl", "first"],
        "contrast_with": "/ə/",
        "contrast_pairs": [["word", "ward"], ["burn", "barn"], ["first", "fast"]],
        "introduced_at": "A2.2",
        "drill_sentence": "The early bird works hard to learn words first."
    },
    "/ə/": {
        "ipa": "/ə/",
        "name": "Schwa (About / Teacher)",
        "category": "vowel_short",
        "voicing": "voiced",
        "tongue_position": "Pure center, completely relaxed/unstressed",
        "mouth_aperture": "Relaxed neutral opening",
        "airflow": "Continuous vocalized lax",
        "mouth_guide": {
            "frontal": "Completely lazy, neutral mouth. No effort in lips or jaw.",
            "lateral": "Tongue resting completely flat in neutral center position."
        },
        "examples": ["about", "banana", "teacher", "police", "sofa"],
        "contrast_with": "/ʌ/",
        "contrast_pairs": [["sofa", "cup"], ["teacher", "church"]],
        "introduced_at": "A1.1",
        "drill_sentence": "A doctor and a teacher arrived about eleven o'clock."
    },

    # ─── DIPHTHONGS ──────────────────────────────────────────────────────────────
    "/eɪ/": {
        "ipa": "/eɪ/",
        "name": "Face Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /e/ to /ɪ/",
        "mouth_aperture": "Medium open to smiling close",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Starts medium open and stretches outward into a smile.",
            "lateral": "Tongue begins mid-front and slides upward toward palate."
        },
        "examples": ["day", "make", "game", "train", "say"],
        "contrast_with": "/e/",
        "contrast_pairs": [["taste", "test"], ["late", "let"], ["mate", "met"], ["paper", "pepper"]],
        "introduced_at": "A1.2",
        "drill_sentence": "They gave great praise to the brave player today."
    },
    "/aɪ/": {
        "ipa": "/aɪ/",
        "name": "Price Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /a/ to /ɪ/",
        "mouth_aperture": "Wide open to smiling close",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Starts with open jaw and closes up into a wide grin.",
            "lateral": "Tongue ascends from bottom floor to high-front."
        },
        "examples": ["time", "sky", "like", "night", "fly"],
        "contrast_with": "/ɔɪ/",
        "contrast_pairs": [["tie", "toy"], ["buy", "boy"], ["point", "pint"]],
        "introduced_at": "A1.3",
        "drill_sentence": "Mike likes flying kites high in the night sky."
    },
    "/ɔɪ/": {
        "ipa": "/ɔɪ/",
        "name": "Choice Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ɔː/ to /ɪ/",
        "mouth_aperture": "Rounded open to unrounded close",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Starts with rounded lips and transitions into a flat smile.",
            "lateral": "Tongue moves from back-mid to high-front."
        },
        "examples": ["boy", "voice", "choice", "coin", "enjoy"],
        "contrast_with": "/aɪ/",
        "contrast_pairs": [["boy", "buy"], ["toy", "tie"], ["noise", "nice"]],
        "introduced_at": "A2.2",
        "drill_sentence": "The joyful boy destroyed the noisy toy coin."
    },
    "/aʊ/": {
        "ipa": "/aʊ/",
        "name": "Mouth Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /a/ to /ʊ/",
        "mouth_aperture": "Wide open to small rounded circle",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Jaw starts dropped wide, then lips purse into a small circle.",
            "lateral": "Tongue slides from low front to high back."
        },
        "examples": ["now", "house", "brown", "cloud", "sound"],
        "contrast_with": "/əʊ/",
        "contrast_pairs": [["now", "no"], ["town", "tone"], ["shout", "show"]],
        "introduced_at": "A1.4",
        "drill_sentence": "How now brown cow walks around the sound town."
    },
    "/əʊ/": {
        "ipa": "/əʊ/",
        "name": "Goat Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ə/ to /ʊ/",
        "mouth_aperture": "Neutral relaxed to rounded circle",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Starts neutral and rounds gently into an O-shape.",
            "lateral": "Tongue moves from central resting position upward and back."
        },
        "examples": ["go", "home", "cold", "boat", "know"],
        "contrast_with": "/ɔː/",
        "contrast_pairs": [["boat", "bought"], ["coat", "caught"], ["low", "law"]],
        "introduced_at": "A1.3",
        "drill_sentence": "Joe rode home alone slowly through the cold snow."
    },
    "/ɪə/": {
        "ipa": "/ɪə/",
        "name": "Near Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ɪ/ to /ə/",
        "mouth_aperture": "Close to neutral relaxation",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Starts slightly smiling and relaxes into completely neutral mouth.",
            "lateral": "Tongue releases from high-front down to central position."
        },
        "examples": ["ear", "here", "near", "clear", "beer"],
        "contrast_with": "/eə/",
        "contrast_pairs": [["hear", "hair"], ["fear", "fair"], ["peer", "pair"]],
        "introduced_at": "A2.3",
        "drill_sentence": "It is clear that dear peers hear near here."
    },
    "/eə/": {
        "ipa": "/eə/",
        "name": "Square Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /e/ to /ə/",
        "mouth_aperture": "Medium open to neutral",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Medium open unrounded lips relaxing to neutral resting.",
            "lateral": "Tongue glides from mid-front down to center."
        },
        "examples": ["air", "care", "chair", "where", "wear"],
        "contrast_with": "/ɪə/",
        "contrast_pairs": [["hair", "hear"], ["fair", "fear"], ["bear", "beer"]],
        "introduced_at": "A2.3",
        "drill_sentence": "Careful where you wear rare chairs over there."
    },
    "/ʊə/": {
        "ipa": "/ʊə/",
        "name": "Cure Diphthong",
        "category": "diphthong",
        "voicing": "voiced",
        "tongue_position": "Glides from /ʊ/ to /ə/",
        "mouth_aperture": "Rounded close to neutral",
        "airflow": "Continuous vocalized glide",
        "mouth_guide": {
            "frontal": "Starts slightly rounded, opens softly into neutral mouth.",
            "lateral": "Tongue glides from high back to neutral center."
        },
        "examples": ["pure", "tour", "sure", "cure", "mature"],
        "contrast_with": "/ɔː/",
        "contrast_pairs": [["tour", "tore"], ["sure", "shore"], ["cure", "core"]],
        "introduced_at": "B1.1",
        "drill_sentence": "I am sure the tourist tour will cure your boredom."
    },

    # ─── CONSONANTS: FRICATIVES & DENTALS ──────────────────────────────────────────
    "/θ/": {
        "ipa": "/θ/",
        "name": "Voiceless TH",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Tip between upper and lower teeth",
        "mouth_aperture": "Slightly open, teeth visible",
        "airflow": "Continuous friction without vocal cord vibration",
        "mouth_guide": {
            "frontal": "Tongue tip visibly placed gently between top and bottom front teeth.",
            "lateral": "Air gently blows over the tongue tip; vocal cords are OFF (silent airflow)."
        },
        "examples": ["think", "three", "thank", "month", "math"],
        "contrast_with": "/ð/",
        "contrast_pairs": [["thigh", "thy"], ["teeth", "teethe"], ["ether", "either"], ["think", "sink"]],
        "introduced_at": "A1.4",
        "drill_sentence": "I think the three healthy thieves ran north."
    },
    "/ð/": {
        "ipa": "/ð/",
        "name": "Voiced TH",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Tip between upper and lower teeth",
        "mouth_aperture": "Slightly open, teeth visible",
        "airflow": "Continuous friction WITH vocal cord vibration (buzzing)",
        "mouth_guide": {
            "frontal": "Exact same tongue position as /θ/ between teeth.",
            "lateral": "Vocal cords vibrate producing a humming buzz at the tip of the tongue."
        },
        "examples": ["this", "that", "brother", "they", "father"],
        "contrast_with": "/θ/",
        "contrast_pairs": [["this", "think"], ["they", "day"], ["breathe", "breath"], ["then", "den"]],
        "introduced_at": "A1.4",
        "drill_sentence": "They gather with their mother and brother together."
    },
    "/s/": {
        "ipa": "/s/",
        "name": "Voiceless S",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Alveolar ridge, narrow air channel",
        "mouth_aperture": "Teeth close together, smiling",
        "airflow": "Sharp hissing friction, voiceless",
        "mouth_guide": {
            "frontal": "Teeth lightly touching or nearly closed, lips slightly smiling.",
            "lateral": "Tongue tip behind upper ridge, air directed forcefully down the center."
        },
        "examples": ["sun", "see", "city", "glass", "smile"],
        "contrast_with": "/z/",
        "contrast_pairs": [["sue", "zoo"], ["peace", "peas"], ["price", "prize"], ["bus", "buzz"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Seven sweet sisters sat silently beside six dogs."
    },
    "/z/": {
        "ipa": "/z/",
        "name": "Voiced Z",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Alveolar ridge, narrow channel",
        "mouth_aperture": "Teeth close together",
        "airflow": "Buzzing friction, voiced",
        "mouth_guide": {
            "frontal": "Same mouth and teeth position as /s/.",
            "lateral": "Vocal cords vibrate creating a distinct bee-like buzzing sound."
        },
        "examples": ["zoo", "zero", "music", "easy", "has"],
        "contrast_with": "/s/",
        "contrast_pairs": [["zoo", "sue"], ["buzz", "bus"], ["eyes", "ice"], ["rise", "rice"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Zoe visits zebras in busy crazy zoos."
    },
    "/ʃ/": {
        "ipa": "/ʃ/",
        "name": "SH sound (Shoe)",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Post-alveolar / palate, broad blade",
        "mouth_aperture": "Lips pushed forward and flared (shhh gesture)",
        "airflow": "Soft rushing friction, voiceless",
        "mouth_guide": {
            "frontal": "Lips slightly rounded and protruded like saying 'shhh'.",
            "lateral": "Tongue blade raised close to roof behind alveolar ridge."
        },
        "examples": ["shoe", "fish", "wash", "national", "ocean"],
        "contrast_with": "/tʃ/",
        "contrast_pairs": [["share", "chair"], ["sheet", "cheat"], ["shoe", "chew"], ["wash", "watch"]],
        "introduced_at": "A1.2",
        "drill_sentence": "She wished she washed shiny short shoes."
    },
    "/ʒ/": {
        "ipa": "/ʒ/",
        "name": "ZH sound (Vision / Measure)",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Post-alveolar / palate",
        "mouth_aperture": "Lips protruded and flared",
        "airflow": "Buzzing soft friction, voiced",
        "mouth_guide": {
            "frontal": "Same lip flare as /ʃ/.",
            "lateral": "Vocal cords buzz while rushing air passes across the wide tongue blade."
        },
        "examples": ["measure", "vision", "treasure", "garage", "television"],
        "contrast_with": "/dʒ/",
        "contrast_pairs": [["measure", "major"], ["pleasure", "pledge"]],
        "introduced_at": "B1.2",
        "drill_sentence": "It is a pleasure to measure leisure treasures on television."
    },
    "/tʃ/": {
        "ipa": "/tʃ/",
        "name": "CH sound (Chair)",
        "category": "consonant_affricate",
        "voicing": "voiceless",
        "tongue_position": "Stop at ridge then release to /ʃ/",
        "mouth_aperture": "Lips rounded slightly, explosive release",
        "airflow": "Stops completely then explodes into friction",
        "mouth_guide": {
            "frontal": "Lips flared slightly, quick explosive release.",
            "lateral": "Tongue seals behind top teeth, pressure builds, pops cleanly."
        },
        "examples": ["chair", "teach", "church", "chocolate", "match"],
        "contrast_with": "/ʃ/",
        "contrast_pairs": [["chair", "share"], ["cheat", "sheet"], ["chew", "shoe"], ["catch", "cash"]],
        "introduced_at": "A1.2",
        "drill_sentence": "Charles cheered cheerfully during the match at church."
    },
    "/dʒ/": {
        "ipa": "/dʒ/",
        "name": "J sound (Jump / Age)",
        "category": "consonant_affricate",
        "voicing": "voiced",
        "tongue_position": "Stop at ridge then release to /ʒ/",
        "mouth_aperture": "Lips rounded, voiced pop",
        "airflow": "Stops completely then explodes with voice",
        "mouth_guide": {
            "frontal": "Mouth shape identical to /tʃ/.",
            "lateral": "Air blocked behind upper ridge, released with strong vocal vibration."
        },
        "examples": ["job", "juice", "bridge", "age", "orange"],
        "contrast_with": "/tʃ/",
        "contrast_pairs": [["job", "chop"], ["joke", "choke"], ["gin", "chin"], ["jump", "chump"]],
        "introduced_at": "A1.2",
        "drill_sentence": "Judge John enjoys drinking orange juice in July."
    },
    "/f/": {
        "ipa": "/f/",
        "name": "Voiceless F",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Neutral resting",
        "mouth_aperture": "Top teeth resting gently on lower lip",
        "airflow": "Continuous friction between lip and teeth, silent",
        "mouth_guide": {
            "frontal": "Upper front incisors touch the wet inner part of bottom lip.",
            "lateral": "Air expelled smoothly without activating vocal cords."
        },
        "examples": ["food", "phone", "coffee", "laugh", "life"],
        "contrast_with": "/v/",
        "contrast_pairs": [["fan", "van"], ["safe", "save"], ["few", "view"], ["leaf", "leave"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Four famous friends found fresh fruit quickly."
    },
    "/v/": {
        "ipa": "/v/",
        "name": "Voiced V",
        "category": "consonant_fricative",
        "voicing": "voiced",
        "tongue_position": "Neutral resting",
        "mouth_aperture": "Top teeth resting on lower lip",
        "airflow": "Continuous friction with strong vocal buzz",
        "mouth_guide": {
            "frontal": "Exact same physical contact as /f/ (top teeth on lower lip).",
            "lateral": "Vocal cords vibrate intensely, vibrating the lower lip."
        },
        "examples": ["voice", "very", "travel", "live", "seven"],
        "contrast_with": "/f/",
        "contrast_pairs": [["van", "fan"], ["save", "safe"], ["view", "few"], ["vest", "best"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Victor travels with vibrant energy every November."
    },
    "/h/": {
        "ipa": "/h/",
        "name": "H sound (House)",
        "category": "consonant_fricative",
        "voicing": "voiceless",
        "tongue_position": "Adopts position of following vowel",
        "mouth_aperture": "Open mouth, relaxed",
        "airflow": "Exhaled breath through open glottis",
        "mouth_guide": {
            "frontal": "Mouth simply opens in readiness for the next vowel.",
            "lateral": "Air flows gently from the throat like fogging a mirror."
        },
        "examples": ["happy", "house", "hotel", "help", "who"],
        "contrast_with": "/r/",
        "contrast_pairs": [["hat", "at"], ["hear", "ear"], ["hold", "old"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Harry had a happy holiday in his huge house."
    },

    # ─── CONSONANTS: PLOSIVES / STOPS ──────────────────────────────────────────────
    "/p/": {
        "ipa": "/p/",
        "name": "Voiceless P",
        "category": "consonant_plosive",
        "voicing": "voiceless",
        "tongue_position": "Neutral",
        "mouth_aperture": "Both lips sealed together then popped open",
        "airflow": "Complete burst of air (aspirated)",
        "mouth_guide": {
            "frontal": "Lips close firmly, building air pressure, then burst open with a puff of air.",
            "lateral": "Velum raised to close nasal cavity; vocal cords silent."
        },
        "examples": ["pen", "park", "apple", "stop", "happy"],
        "contrast_with": "/b/",
        "contrast_pairs": [["pat", "bat"], ["pin", "bin"], ["rope", "robe"], ["cap", "cab"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Peter picked a piece of paper for the party."
    },
    "/b/": {
        "ipa": "/b/",
        "name": "Voiced B",
        "category": "consonant_plosive",
        "voicing": "voiced",
        "tongue_position": "Neutral",
        "mouth_aperture": "Both lips sealed then released with voice",
        "airflow": "Burst of vocalized air",
        "mouth_guide": {
            "frontal": "Same lip seal as /p/.",
            "lateral": "Vocal cords begin vibrating before or during lip release."
        },
        "examples": ["book", "boy", "table", "club", "baby"],
        "contrast_with": "/p/",
        "contrast_pairs": [["bat", "pat"], ["bin", "pin"], ["robe", "rope"], ["cab", "cap"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Bob bought big brown bags of bright balloons."
    },
    "/t/": {
        "ipa": "/t/",
        "name": "Voiceless T",
        "category": "consonant_plosive",
        "voicing": "voiceless",
        "tongue_position": "Tip firmly seals against alveolar ridge",
        "mouth_aperture": "Slightly open",
        "airflow": "Aspirated clean burst",
        "mouth_guide": {
            "frontal": "Teeth slightly apart, tongue tip firmly touching the upper gum ridge.",
            "lateral": "Tongue pulls away quickly, releasing a crisp tap of air."
        },
        "examples": ["table", "tea", "water", "cat", "time"],
        "contrast_with": "/d/",
        "contrast_pairs": [["tin", "din"], ["town", "down"], ["heart", "hard"], ["bat", "bad"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Two tall teachers told ten funny tales."
    },
    "/d/": {
        "ipa": "/d/",
        "name": "Voiced D",
        "category": "consonant_plosive",
        "voicing": "voiced",
        "tongue_position": "Tip against alveolar ridge",
        "mouth_aperture": "Slightly open",
        "airflow": "Voiced pop release",
        "mouth_guide": {
            "frontal": "Identical tongue seal to /t/.",
            "lateral": "Released with vocal resonance and less air pressure."
        },
        "examples": ["door", "dog", "day", "under", "red"],
        "contrast_with": "/t/",
        "contrast_pairs": [["din", "tin"], ["down", "town"], ["hard", "heart"], ["bad", "bat"]],
        "introduced_at": "A1.1",
        "drill_sentence": "David did daring deeds during difficult days."
    },
    "/k/": {
        "ipa": "/k/",
        "name": "Voiceless K",
        "category": "consonant_plosive",
        "voicing": "voiceless",
        "tongue_position": "Back of tongue against soft palate (velum)",
        "mouth_aperture": "Medium open",
        "airflow": "Velar plosive burst",
        "mouth_guide": {
            "frontal": "Jaw dropped medium, mouth open.",
            "lateral": "Back of tongue seals tightly against soft palate then drops with air puff."
        },
        "examples": ["cat", "car", "key", "school", "back"],
        "contrast_with": "/g/",
        "contrast_pairs": [["coat", "goat"], ["class", "glass"], ["cold", "gold"], ["back", "bag"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Karl kept cooking crispy cookies in the kitchen."
    },
    "/g/": {
        "ipa": "/g/",
        "name": "Voiced G",
        "category": "consonant_plosive",
        "voicing": "voiced",
        "tongue_position": "Back of tongue against soft palate",
        "mouth_aperture": "Medium open",
        "airflow": "Voiced velar release",
        "mouth_guide": {
            "frontal": "Identical seal to /k/.",
            "lateral": "Vocal cords vibrate heavily upon release from soft palate."
        },
        "examples": ["go", "girl", "game", "big", "green"],
        "contrast_with": "/k/",
        "contrast_pairs": [["goat", "coat"], ["glass", "class"], ["gold", "cold"], ["bag", "back"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Great green grass grows gracefully in Greg's garden."
    },

    # ─── CONSONANTS: NASALS & APPROXIMANTS ─────────────────────────────────────────
    "/m/": {
        "ipa": "/m/",
        "name": "Bilabial Nasal M",
        "category": "consonant_nasal",
        "voicing": "voiced",
        "tongue_position": "Neutral",
        "mouth_aperture": "Lips completely closed",
        "airflow": "100% through the nose with humming voice",
        "mouth_guide": {
            "frontal": "Lips pressed together lightly in neutral line.",
            "lateral": "Velum lowers, sound resonates entirely in nasal chambers."
        },
        "examples": ["man", "mother", "summer", "time", "room"],
        "contrast_with": "/n/",
        "contrast_pairs": [["mice", "nice"], ["sum", "sun"], ["mime", "nine"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Many memorable moments make marvelous memories."
    },
    "/n/": {
        "ipa": "/n/",
        "name": "Alveolar Nasal N",
        "category": "consonant_nasal",
        "voicing": "voiced",
        "tongue_position": "Tongue tip seals upper gum ridge",
        "mouth_aperture": "Slightly open lips",
        "airflow": "Through nose with vocal cord vibration",
        "mouth_guide": {
            "frontal": "Mouth slightly open, tongue clearly seen touching top ridge.",
            "lateral": "Air redirects upwards into the nasal cavity."
        },
        "examples": ["no", "name", "night", "sun", "open"],
        "contrast_with": "/ŋ/",
        "contrast_pairs": [["sin", "sing"], ["thin", "thing"], ["ran", "rang"], ["pan", "pang"]],
        "introduced_at": "A1.1",
        "drill_sentence": "No nice neighbor notices nine noisy nightingales."
    },
    "/ŋ/": {
        "ipa": "/ŋ/",
        "name": "Velar Nasal NG",
        "category": "consonant_nasal",
        "voicing": "voiced",
        "tongue_position": "Back of tongue seals against soft palate",
        "mouth_aperture": "Medium open lips",
        "airflow": "Through nose from back of throat",
        "mouth_guide": {
            "frontal": "Mouth stays relaxed and open.",
            "lateral": "Back of tongue seals soft palate; never make an audible /g/ click at the end."
        },
        "examples": ["sing", "song", "english", "bring", "young"],
        "contrast_with": "/n/",
        "contrast_pairs": [["sing", "sin"], ["thing", "thin"], ["ring", "rinse"], ["bang", "ban"]],
        "introduced_at": "A1.3",
        "drill_sentence": "The strong young king was singing a charming song."
    },
    "/l/": {
        "ipa": "/l/",
        "name": "Lateral L",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "Tip against alveolar ridge, sides lowered",
        "mouth_aperture": "Slightly open",
        "airflow": "Air flows freely around both sides of tongue",
        "mouth_guide": {
            "frontal": "Tongue tip pressed to roof, lips relaxed.",
            "lateral": "Air escapes along the cheeks and molars on either side."
        },
        "examples": ["light", "love", "play", "call", "yellow"],
        "contrast_with": "/r/",
        "contrast_pairs": [["light", "right"], ["glass", "grass"], ["fly", "fry"], ["belly", "berry"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Lucy loves looking at lovely yellow lights."
    },
    "/r/": {
        "ipa": "/r/",
        "name": "Approximant R",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "Curled back / bunched near palate without touching",
        "mouth_aperture": "Lips slightly rounded and flared",
        "airflow": "Smooth unobstructed voiced flow",
        "mouth_guide": {
            "frontal": "Lips round slightly forward.",
            "lateral": "Tongue curls back (retroflex) or bunches high, never tapping roof."
        },
        "examples": ["red", "run", "room", "friend", "try"],
        "contrast_with": "/l/",
        "contrast_pairs": [["right", "light"], ["grass", "glass"], ["fry", "fly"], ["red", "led"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Robert ran rapidly around the red running ring."
    },
    "/w/": {
        "ipa": "/w/",
        "name": "Labio-velar W",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "Back of tongue high, transitions rapidly to vowel",
        "mouth_aperture": "Lips pursed in tight small circle like whistling",
        "airflow": "Voiced glide release",
        "mouth_guide": {
            "frontal": "Lips form an intense tight O-shape, then quickly open wide.",
            "lateral": "Back of tongue elevates toward velum during glide."
        },
        "examples": ["water", "we", "work", "window", "sweet"],
        "contrast_with": "/v/",
        "contrast_pairs": [["west", "vest"], ["wine", "vine"], ["wet", "vet"], ["whale", "veil"]],
        "introduced_at": "A1.2",
        "drill_sentence": "We will watch William walk while water winds west."
    },
    "/j/": {
        "ipa": "/j/",
        "name": "Palatal Approximant Y",
        "category": "consonant_approximant",
        "voicing": "voiced",
        "tongue_position": "High front arched toward hard palate",
        "mouth_aperture": "Smiling lips",
        "airflow": "Smooth voiced palatal glide",
        "mouth_guide": {
            "frontal": "Lips spread in a quick smile, immediately launching into next vowel.",
            "lateral": "Front tongue arches close to roof of mouth without creating friction."
        },
        "examples": ["yes", "you", "yellow", "young", "year"],
        "contrast_with": "/dʒ/",
        "contrast_pairs": [["yet", "jet"], ["year", "jeer"], ["yolk", "joke"], ["yam", "jam"]],
        "introduced_at": "A1.1",
        "drill_sentence": "Young yesterday youth yielded yellow yachts."
    }
}


PHONEME_IMAGE_MAP: Dict[str, str] = {
    "/ɪ/": "vowel_short_i",
    "/e/": "vowel_short_e",
    "/æ/": "vowel_short_ae",
    "/ʌ/": "vowel_short_wedge",
    "/ɒ/": "vowel_short_o",
    "/ʊ/": "vowel_short_upsilon",
    "/ə/": "vowel_schwa",
    "/iː/": "vowel_long_i",
    "/ɑː/": "vowel_long_a",
    "/ɔː/": "vowel_long_o",
    "/uː/": "vowel_long_u",
    "/ɜː/": "vowel_long_er",
    "/eɪ/": "diphthong_ei",
    "/aɪ/": "diphthong_ai",
    "/ɔɪ/": "diphthong_oi",
    "/aʊ/": "diphthong_au",
    "/əʊ/": "diphthong_ou",
    "/ɪə/": "diphthong_ia",
    "/eə/": "diphthong_ea",
    "/ʊə/": "diphthong_ua",
    "/f/": "fricative_f",
    "/v/": "fricative_v",
    "/θ/": "fricative_th_voiceless",
    "/ð/": "fricative_th_voiced",
    "/s/": "fricative_s",
    "/z/": "fricative_z",
    "/ʃ/": "fricative_sh",
    "/ʒ/": "fricative_zh",
    "/h/": "fricative_h",
    "/tʃ/": "affricate_ch",
    "/dʒ/": "affricate_j",
    "/p/": "plosive_p",
    "/b/": "plosive_b",
    "/t/": "plosive_t",
    "/d/": "plosive_d",
    "/k/": "plosive_k",
    "/g/": "plosive_g",
    "/m/": "nasal_m",
    "/n/": "nasal_n",
    "/ŋ/": "nasal_ng",
    "/l/": "approximant_l",
    "/r/": "approximant_r",
    "/j/": "approximant_j",
    "/w/": "approximant_w",
}


def _enrich_phoneme(item: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not item:
        return None
    data = dict(item)
    ipa = data.get("ipa", "")
    base = PHONEME_IMAGE_MAP.get(ipa)
    if base:
        data["mouth_frontal_img"] = f"/images/phonemes/{base}_frontal.svg"
        data["mouth_lateral_img"] = f"/images/phonemes/{base}_lateral.svg"
        data["audio_file"] = f"/audio/phonemes/{base}.ogg"
    return data


def get_all_phonemes() -> List[Dict[str, Any]]:
    """Returns list of all phoneme definitions with enriched image and audio metadata."""
    return [_enrich_phoneme(v) for v in PHONETIC_CATALOG.values()]


def get_phoneme(symbol: str) -> Optional[Dict[str, Any]]:
    """Get single phoneme metadata by IPA key e.g. '/θ/' or 'θ'."""
    if not symbol:
        return None
    clean = symbol.strip()
    if not clean.startswith("/"):
        clean = f"/{clean}"
    if not clean.endswith("/"):
        clean = f"{clean}/"
    item = PHONETIC_CATALOG.get(clean)
    return _enrich_phoneme(item)


def get_phonemes_by_category() -> Dict[str, List[Dict[str, Any]]]:
    """Group phonemes into categorized lists for frontend UI board rendering."""
    categories: Dict[str, List[Dict[str, Any]]] = {
        "vowels_short": [],
        "vowels_long": [],
        "diphthongs": [],
        "consonants_fricatives": [],
        "consonants_plosives": [],
        "consonants_other": []
    }
    for item in PHONETIC_CATALOG.values():
        enriched = _enrich_phoneme(item)
        cat = enriched.get("category", "")
        if cat == "vowel_short":
            categories["vowels_short"].append(enriched)
        elif cat == "vowel_long":
            categories["vowels_long"].append(enriched)
        elif cat == "diphthong":
            categories["diphthongs"].append(enriched)
        elif "fricative" in cat or "affricate" in cat:
            categories["consonants_fricatives"].append(enriched)
        elif "plosive" in cat:
            categories["consonants_plosives"].append(enriched)
        else:
            categories["consonants_other"].append(enriched)
    return categories


def get_phonetic_focus_for_sublevel(sublevel: str, class_index: int = 1) -> Optional[Dict[str, Any]]:
    """
    Select recommended phoneme contrast for a given sublevel and class index (1-4).
    Enforces the 'Enseñar por Contraste' pedagogical rule.
    """
    focus_map: Dict[str, Dict[int, str]] = {
        "A1.1": {1: "/iː/", 2: "/ɪ/", 3: "/s/", 4: "/z/"},
        "A1.2": {1: "/e/", 2: "/æ/", 3: "/ʃ/", 4: "/tʃ/"},
        "A1.3": {1: "/ʌ/", 2: "/ɑː/", 3: "/eɪ/", 4: "/aɪ/"},
        "A1.4": {1: "/θ/", 2: "/ð/", 3: "/ɒ/", 4: "/ɔː/"},
        "A2.1": {1: "/ʊ/", 2: "/uː/", 3: "/p/", 4: "/b/"},
        "A2.2": {1: "/ɜː/", 2: "/ə/", 3: "/ɔɪ/", 4: "/aʊ/"},
        "A2.3": {1: "/ɪə/", 2: "/eə/", 3: "/f/", 4: "/v/"},
        "A2.4": {1: "/t/", 2: "/d/", 3: "/k/", 4: "/g/"},
        "B1.1": {1: "/θ/", 2: "/ð/", 3: "/ʊə/", 4: "/əʊ/"},
        "B1.2": {1: "/æ/", 2: "/ʌ/", 3: "/ʒ/", 4: "/dʒ/"},
        "B1.3": {1: "/iː/", 2: "/ɪ/", 3: "/w/", 4: "/v/"},
        "B1.4": {1: "/s/", 2: "/z/", 3: "/l/", 4: "/r/"},
        "B2.1": {1: "/ʃ/", 2: "/tʃ/", 3: "/ŋ/", 4: "/n/"},
        "B2.2": {1: "/θ/", 2: "/s/", 3: "/eɪ/", 4: "/e/"},
        "B2.3": {1: "/dʒ/", 2: "/j/", 3: "/ɔː/", 4: "/ɒ/"},
        "B2.4": {1: "/ɜː/", 2: "/ə/", 3: "/ʊ/", 4: "/uː/"}
    }
    
    sub = sublevel.upper()
    ph_symbol = focus_map.get(sub, {}).get(class_index, "/θ/")
    return get_phoneme(ph_symbol)
