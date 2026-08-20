"""
Guionbajo — Official Wikimedia Commons / Wikipedia IPA Audio Catalog
Maps all 44 English phonemes to their official Wikipedia/Wikimedia Commons
isolated audio recordings produced by phonetician linguists (e.g. Peter Ladefoged, John Wells).
"""
from typing import Dict, Any, Optional

# Mapping each standard IPA phoneme key to its Wikimedia Commons audio filename and local safe filename
WIKIMEDIA_IPA_CATALOG: Dict[str, Dict[str, Any]] = {
    # ─── SHORT VOWELS ─────────────────────────────────────────────────────────────
    "/ɪ/": {
        "ipa": "/ɪ/",
        "local_file": "vowel_short_i.ogg",
        "wiki_file": "Near-close_near-front_unrounded_vowel.ogg",
        "alt_wiki_files": ["Near-close_near-front_unrounded_vowel.ogg", "Short_i.ogg"],
        "name": "Short I",
        "category": "vowels_short"
    },
    "/e/": {
        "ipa": "/e/",
        "local_file": "vowel_short_e.ogg",
        "wiki_file": "Close-mid_front_unrounded_vowel.ogg",
        "alt_wiki_files": ["Close-mid_front_unrounded_vowel.ogg", "Open-mid_front_unrounded_vowel.ogg"],
        "name": "Short E",
        "category": "vowels_short"
    },
    "/æ/": {
        "ipa": "/æ/",
        "local_file": "vowel_short_ae.ogg",
        "wiki_file": "Near-open_front_unrounded_vowel.ogg",
        "alt_wiki_files": ["Near-open_front_unrounded_vowel.ogg"],
        "name": "Short A (Trap / Cat)",
        "category": "vowels_short"
    },
    "/ʌ/": {
        "ipa": "/ʌ/",
        "local_file": "vowel_short_wedge.ogg",
        "wiki_file": "Open-mid_back_unrounded_vowel.ogg",
        "alt_wiki_files": ["Open-mid_back_unrounded_vowel.ogg", "PR-open-mid_back_unrounded_vowel.ogg"],
        "name": "Short U (Cup)",
        "category": "vowels_short"
    },
    "/ɒ/": {
        "ipa": "/ɒ/",
        "local_file": "vowel_short_o.ogg",
        "wiki_file": "Open_back_rounded_vowel.ogg",
        "alt_wiki_files": ["Open_back_rounded_vowel.ogg"],
        "name": "Short O (Lot)",
        "category": "vowels_short"
    },
    "/ʊ/": {
        "ipa": "/ʊ/",
        "local_file": "vowel_short_upsilon.ogg",
        "wiki_file": "Near-close_near-back_rounded_vowel.ogg",
        "alt_wiki_files": ["Near-close_near-back_rounded_vowel.ogg", "Near-close_near-back_vowel.ogg"],
        "name": "Short OO (Foot)",
        "category": "vowels_short"
    },
    "/ə/": {
        "ipa": "/ə/",
        "local_file": "vowel_schwa.ogg",
        "wiki_file": "Mid-central_vowel.ogg",
        "alt_wiki_files": ["Mid-central_vowel.ogg"],
        "name": "Schwa",
        "category": "vowels_short"
    },

    # ─── LONG VOWELS ──────────────────────────────────────────────────────────────
    "/iː/": {
        "ipa": "/iː/",
        "local_file": "vowel_long_i.ogg",
        "wiki_file": "Close_front_unrounded_vowel.ogg",
        "alt_wiki_files": ["Close_front_unrounded_vowel.ogg"],
        "name": "Long E (Sheep)",
        "category": "vowels_long"
    },
    "/ɑː/": {
        "ipa": "/ɑː/",
        "local_file": "vowel_long_a.ogg",
        "wiki_file": "Open_back_unrounded_vowel.ogg",
        "alt_wiki_files": ["Open_back_unrounded_vowel.ogg"],
        "name": "Long A (Car / Palm)",
        "category": "vowels_long"
    },
    "/ɔː/": {
        "ipa": "/ɔː/",
        "local_file": "vowel_long_o.ogg",
        "wiki_file": "Open-mid_back_rounded_vowel.ogg",
        "alt_wiki_files": ["Open-mid_back_rounded_vowel.ogg"],
        "name": "Long O (Door / Thought)",
        "category": "vowels_long"
    },
    "/uː/": {
        "ipa": "/uː/",
        "local_file": "vowel_long_u.ogg",
        "wiki_file": "Close_back_rounded_vowel.ogg",
        "alt_wiki_files": ["Close_back_rounded_vowel.ogg"],
        "name": "Long OO (Blue / Goose)",
        "category": "vowels_long"
    },
    "/ɜː/": {
        "ipa": "/ɜː/",
        "local_file": "vowel_long_er.ogg",
        "wiki_file": "Open-mid_central_unrounded_vowel.ogg",
        "alt_wiki_files": ["Open-mid_central_unrounded_vowel.ogg"],
        "name": "Long ER (Bird / Nurse)",
        "category": "vowels_long"
    },

    # ─── DIPHTHONGS ───────────────────────────────────────────────────────────────
    "/eɪ/": {
        "ipa": "/eɪ/",
        "local_file": "diphthong_ei.ogg",
        "wiki_file": "Closing_diphthong-ei.ogg",
        "alt_wiki_files": ["Closing_diphthong-ei.ogg", "Received_Pronunciation_diphthong_eɪ.ogg", "En-uk-eɪ.ogg"],
        "name": "Face Diphthong",
        "category": "diphthongs"
    },
    "/aɪ/": {
        "ipa": "/aɪ/",
        "local_file": "diphthong_ai.ogg",
        "wiki_file": "Closing_diphthong-ai.ogg",
        "alt_wiki_files": ["Closing_diphthong-ai.ogg", "Received_Pronunciation_diphthong_aɪ.ogg", "En-uk-aɪ.ogg"],
        "name": "Price Diphthong",
        "category": "diphthongs"
    },
    "/ɔɪ/": {
        "ipa": "/ɔɪ/",
        "local_file": "diphthong_oi.ogg",
        "wiki_file": "Closing_diphthong-oi.ogg",
        "alt_wiki_files": ["Closing_diphthong-oi.ogg", "Received_Pronunciation_diphthong_ɔɪ.ogg", "En-uk-ɔɪ.ogg"],
        "name": "Choice Diphthong",
        "category": "diphthongs"
    },
    "/aʊ/": {
        "ipa": "/aʊ/",
        "local_file": "diphthong_au.ogg",
        "wiki_file": "Closing_diphthong-au.ogg",
        "alt_wiki_files": ["Closing_diphthong-au.ogg", "Received_Pronunciation_diphthong_aʊ.ogg", "En-uk-aʊ.ogg"],
        "name": "Mouth Diphthong",
        "category": "diphthongs"
    },
    "/əʊ/": {
        "ipa": "/əʊ/",
        "local_file": "diphthong_ou.ogg",
        "wiki_file": "Closing_diphthong-ou.ogg",
        "alt_wiki_files": ["Closing_diphthong-ou.ogg", "Closing_diphthong-eu.ogg", "Received_Pronunciation_diphthong_əʊ.ogg"],
        "name": "Goat Diphthong",
        "category": "diphthongs"
    },
    "/ɪə/": {
        "ipa": "/ɪə/",
        "local_file": "diphthong_ia.ogg",
        "wiki_file": "Centring_diphthong-ia.ogg",
        "alt_wiki_files": ["Centring_diphthong-ia.ogg", "Received_Pronunciation_diphthong_ɪə.ogg"],
        "name": "Near Diphthong",
        "category": "diphthongs"
    },
    "/eə/": {
        "ipa": "/eə/",
        "local_file": "diphthong_ea.ogg",
        "wiki_file": "Centring_diphthong-ea.ogg",
        "alt_wiki_files": ["Centring_diphthong-ea.ogg", "Received_Pronunciation_diphthong_eə.ogg"],
        "name": "Square Diphthong",
        "category": "diphthongs"
    },
    "/ʊə/": {
        "ipa": "/ʊə/",
        "local_file": "diphthong_ua.ogg",
        "wiki_file": "Centring_diphthong-ua.ogg",
        "alt_wiki_files": ["Centring_diphthong-ua.ogg", "Received_Pronunciation_diphthong_ʊə.ogg"],
        "name": "Cure Diphthong",
        "category": "diphthongs"
    },

    # ─── FRICATIVES & AFFRICATES ──────────────────────────────────────────────────
    "/f/": {
        "ipa": "/f/",
        "local_file": "fricative_f.ogg",
        "wiki_file": "Voiceless_labiodental_fricative.ogg",
        "alt_wiki_files": ["Voiceless_labiodental_fricative.ogg"],
        "name": "Voiceless F",
        "category": "consonants_fricatives"
    },
    "/v/": {
        "ipa": "/v/",
        "local_file": "fricative_v.ogg",
        "wiki_file": "Voiced_labiodental_fricative.ogg",
        "alt_wiki_files": ["Voiced_labiodental_fricative.ogg"],
        "name": "Voiced V",
        "category": "consonants_fricatives"
    },
    "/θ/": {
        "ipa": "/θ/",
        "local_file": "fricative_th_voiceless.ogg",
        "wiki_file": "Voiceless_dental_fricative.ogg",
        "alt_wiki_files": ["Voiceless_dental_fricative.ogg", "Voiceless_dental_non-sibilant_fricative.ogg"],
        "name": "Voiceless TH (Think)",
        "category": "consonants_fricatives"
    },
    "/ð/": {
        "ipa": "/ð/",
        "local_file": "fricative_th_voiced.ogg",
        "wiki_file": "Voiced_dental_fricative.ogg",
        "alt_wiki_files": ["Voiced_dental_fricative.ogg", "Voiced_dental_non-sibilant_fricative.ogg"],
        "name": "Voiced TH (This)",
        "category": "consonants_fricatives"
    },
    "/s/": {
        "ipa": "/s/",
        "local_file": "fricative_s.ogg",
        "wiki_file": "Voiceless_alveolar_fricative.ogg",
        "alt_wiki_files": ["Voiceless_alveolar_fricative.ogg", "Voiceless_alveolar_sibilant.ogg"],
        "name": "Voiceless S",
        "category": "consonants_fricatives"
    },
    "/z/": {
        "ipa": "/z/",
        "local_file": "fricative_z.ogg",
        "wiki_file": "Voiced_alveolar_fricative.ogg",
        "alt_wiki_files": ["Voiced_alveolar_fricative.ogg", "Voiced_alveolar_sibilant.ogg"],
        "name": "Voiced Z",
        "category": "consonants_fricatives"
    },
    "/ʃ/": {
        "ipa": "/ʃ/",
        "local_file": "fricative_sh.ogg",
        "wiki_file": "Voiceless_postalveolar_fricative.ogg",
        "alt_wiki_files": ["Voiceless_postalveolar_fricative.ogg", "Voiceless_palato-alveolar_sibilant.ogg"],
        "name": "SH Sound (Shoe)",
        "category": "consonants_fricatives"
    },
    "/ʒ/": {
        "ipa": "/ʒ/",
        "local_file": "fricative_zh.ogg",
        "wiki_file": "Voiced_postalveolar_fricative.ogg",
        "alt_wiki_files": ["Voiced_postalveolar_fricative.ogg", "Voiced_palato-alveolar_sibilant.ogg"],
        "name": "ZH Sound (Vision)",
        "category": "consonants_fricatives"
    },
    "/h/": {
        "ipa": "/h/",
        "local_file": "fricative_h.ogg",
        "wiki_file": "Voiceless_glottal_fricative.ogg",
        "alt_wiki_files": ["Voiceless_glottal_fricative.ogg"],
        "name": "H Sound (Hat)",
        "category": "consonants_fricatives"
    },
    "/tʃ/": {
        "ipa": "/tʃ/",
        "local_file": "affricate_ch.ogg",
        "wiki_file": "Voiceless_palato-alveolar_affricate.ogg",
        "alt_wiki_files": ["Voiceless_palato-alveolar_affricate.ogg", "Voiceless_postalveolar_affricate.ogg"],
        "name": "CH Sound (Chair)",
        "category": "consonants_fricatives"
    },
    "/dʒ/": {
        "ipa": "/dʒ/",
        "local_file": "affricate_j.ogg",
        "wiki_file": "Voiced_palato-alveolar_affricate.ogg",
        "alt_wiki_files": ["Voiced_palato-alveolar_affricate.ogg", "Voiced_postalveolar_affricate.ogg"],
        "name": "J Sound (Judge)",
        "category": "consonants_fricatives"
    },

    # ─── PLOSIVES (STOPS) ─────────────────────────────────────────────────────────
    "/p/": {
        "ipa": "/p/",
        "local_file": "plosive_p.ogg",
        "wiki_file": "Voiceless_bilabial_plosive.ogg",
        "alt_wiki_files": ["Voiceless_bilabial_plosive.ogg"],
        "name": "P Plosive",
        "category": "consonants_plosives"
    },
    "/b/": {
        "ipa": "/b/",
        "local_file": "plosive_b.ogg",
        "wiki_file": "Voiced_bilabial_plosive.ogg",
        "alt_wiki_files": ["Voiced_bilabial_plosive.ogg"],
        "name": "B Plosive",
        "category": "consonants_plosives"
    },
    "/t/": {
        "ipa": "/t/",
        "local_file": "plosive_t.ogg",
        "wiki_file": "Voiceless_alveolar_plosive.ogg",
        "alt_wiki_files": ["Voiceless_alveolar_plosive.ogg"],
        "name": "T Plosive",
        "category": "consonants_plosives"
    },
    "/d/": {
        "ipa": "/d/",
        "local_file": "plosive_d.ogg",
        "wiki_file": "Voiced_alveolar_plosive.ogg",
        "alt_wiki_files": ["Voiced_alveolar_plosive.ogg"],
        "name": "D Plosive",
        "category": "consonants_plosives"
    },
    "/k/": {
        "ipa": "/k/",
        "local_file": "plosive_k.ogg",
        "wiki_file": "Voiceless_velar_plosive.ogg",
        "alt_wiki_files": ["Voiceless_velar_plosive.ogg"],
        "name": "K Plosive",
        "category": "consonants_plosives"
    },
    "/g/": {
        "ipa": "/g/",
        "local_file": "plosive_g.ogg",
        "wiki_file": "Voiced_velar_plosive.ogg",
        "alt_wiki_files": ["Voiced_velar_plosive.ogg"],
        "name": "G Plosive",
        "category": "consonants_plosives"
    },

    # ─── NASALS, LIQUIDS & APPROXIMANTS ───────────────────────────────────────────
    "/m/": {
        "ipa": "/m/",
        "local_file": "nasal_m.ogg",
        "wiki_file": "Bilabial_nasal.ogg",
        "alt_wiki_files": ["Bilabial_nasal.ogg"],
        "name": "M Nasal",
        "category": "consonants_other"
    },
    "/n/": {
        "ipa": "/n/",
        "local_file": "nasal_n.ogg",
        "wiki_file": "Alveolar_nasal.ogg",
        "alt_wiki_files": ["Alveolar_nasal.ogg"],
        "name": "N Nasal",
        "category": "consonants_other"
    },
    "/ŋ/": {
        "ipa": "/ŋ/",
        "local_file": "nasal_ng.ogg",
        "wiki_file": "Velar_nasal.ogg",
        "alt_wiki_files": ["Velar_nasal.ogg"],
        "name": "NG Nasal (Sing)",
        "category": "consonants_other"
    },
    "/l/": {
        "ipa": "/l/",
        "local_file": "approximant_l.ogg",
        "wiki_file": "Alveolar_lateral_approximant.ogg",
        "alt_wiki_files": ["Alveolar_lateral_approximant.ogg"],
        "name": "L Liquid",
        "category": "consonants_other"
    },
    "/r/": {
        "ipa": "/r/",
        "local_file": "approximant_r.ogg",
        "wiki_file": "Alveolar_approximant.ogg",
        "alt_wiki_files": ["Alveolar_approximant.ogg", "Postalveolar_approximant.ogg"],
        "name": "R Approximant",
        "category": "consonants_other"
    },
    "/j/": {
        "ipa": "/j/",
        "local_file": "approximant_j.ogg",
        "wiki_file": "Palatal_approximant.ogg",
        "alt_wiki_files": ["Palatal_approximant.ogg"],
        "name": "Y Glide (Yes)",
        "category": "consonants_other"
    },
    "/w/": {
        "ipa": "/w/",
        "local_file": "approximant_w.ogg",
        "wiki_file": "Voiced_labial-velar_approximant.ogg",
        "alt_wiki_files": ["Voiced_labial-velar_approximant.ogg"],
        "name": "W Glide (Wet)",
        "category": "consonants_other"
    },
}

def get_wikimedia_entry(ipa_symbol: str) -> Optional[Dict[str, Any]]:
    """Look up phoneme entry by raw or normalized IPA symbol."""
    if not ipa_symbol:
        return None
    clean = ipa_symbol.strip()
    if not clean.startswith("/"):
        clean = f"/{clean}"
    if not clean.endswith("/"):
        clean = f"{clean}/"
    return WIKIMEDIA_IPA_CATALOG.get(clean)
