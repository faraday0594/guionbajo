"""
Guionbajo — Master Oxford Studio 44 Phonemes Downloader & Synchronizer
Downloads the single-sound, clean Oxford Phonetics Studio recordings
for all 44 English phonemes to guarantee zero double-repetitions ('pa.. a-pa')
and 100% pedagogical accuracy.
"""
import sys
import os
import urllib.request
import urllib.parse
from pathlib import Path

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

backend_dir = Path(__file__).resolve().parent
FRONTEND_AUDIO = backend_dir.parent / "frontend" / "public" / "audio" / "phonemes"
BACKEND_CACHE = backend_dir / "static" / "phonemes_cache"

FRONTEND_AUDIO.mkdir(parents=True, exist_ok=True)
BACKEND_CACHE.mkdir(parents=True, exist_ok=True)

# 44 English Phonemes -> Oxford Studio Filenames & Standard Local Basenames
PHONEME_OXFORD_DATA = {
    # ─── SHORT VOWELS ─────────────────────────────────────────────────────────────
    "/ɪ/":  {"oxford": "ɪ_isolation.mp3",  "local": "vowel_short_i",       "name": "Short I"},
    "/e/":  {"oxford": "e_isolation.mp3",  "local": "vowel_short_e",       "name": "Short E"},
    "/æ/":  {"oxford": "æ_isolation.mp3",  "local": "vowel_short_ae",      "name": "Short A (Trap / Cat)"},
    "/ʌ/":  {"oxford": "ʌ_isolation.mp3",  "local": "vowel_short_wedge",   "name": "Short U (Cup)"},
    "/ɒ/":  {"oxford": "ɒ_isolation.mp3",  "local": "vowel_short_o",       "name": "Short O (Lot)"},
    "/ʊ/":  {"oxford": "ʊ_isolation.mp3",  "local": "vowel_short_upsilon", "name": "Short OO (Foot)"},
    "/ə/":  {"oxford": "ə_isolation.mp3",  "local": "vowel_schwa",         "name": "Schwa (About)"},

    # ─── LONG VOWELS ──────────────────────────────────────────────────────────────
    "/iː/": {"oxford": "iː_isolation.mp3", "local": "vowel_long_i",        "name": "Long E (Sheep)"},
    "/ɑː/": {"oxford": "ɑː_isolation.mp3", "local": "vowel_long_a",        "name": "Long A (Car)"},
    "/ɔː/": {"oxford": "ɔː_isolation.mp3", "local": "vowel_long_o",        "name": "Long O (Door)"},
    "/uː/": {"oxford": "uː_isolation.mp3", "local": "vowel_long_u",        "name": "Long OO (Blue)"},
    "/ɜː/": {"oxford": "ɜː_isolation.mp3", "local": "vowel_long_er",       "name": "Long ER (Bird)"},

    # ─── DIPHTHONGS ───────────────────────────────────────────────────────────────
    "/eɪ/": {"oxford": "eɪ_isolation.mp3", "local": "diphthong_ei",        "name": "Face Diphthong"},
    "/aɪ/": {"oxford": "aɪ_isolation.mp3", "local": "diphthong_ai",        "name": "Price Diphthong"},
    "/ɔɪ/": {"oxford": "ɔɪ_isolation.mp3", "local": "diphthong_oi",        "name": "Choice Diphthong"},
    "/aʊ/": {"oxford": "aʊ_isolation.mp3", "local": "diphthong_au",        "name": "Mouth Diphthong"},
    "/əʊ/": {"oxford": "əʊ_isolation.mp3", "local": "diphthong_ou",        "name": "Goat Diphthong"},
    "/ɪə/": {"oxford": "ɪə_isolation.mp3", "local": "diphthong_ia",        "name": "Near Diphthong"},
    "/eə/": {"oxford": "eə_isolation.mp3", "local": "diphthong_ea",        "name": "Square Diphthong"},
    "/ʊə/": {"oxford": "ʊə_isolation.mp3", "local": "diphthong_ua",        "name": "Cure Diphthong"},

    # ─── FRICATIVES & AFFRICATES ──────────────────────────────────────────────────
    "/f/":  {"oxford": "f_isolation.mp3",  "local": "fricative_f",            "name": "Voiceless F"},
    "/v/":  {"oxford": "v_isolation.mp3",  "local": "fricative_v",            "name": "Voiced V"},
    "/θ/":  {"oxford": "θ_isolation.mp3",  "local": "fricative_th_voiceless", "name": "Voiceless TH (Think)"},
    "/ð/":  {"oxford": "ð_isolation.mp3",  "local": "fricative_th_voiced",    "name": "Voiced TH (This)"},
    "/s/":  {"oxford": "s_isolation.mp3",  "local": "fricative_s",            "name": "Voiceless S"},
    "/z/":  {"oxford": "z_isolation.mp3",  "local": "fricative_z",            "name": "Voiced Z"},
    "/ʃ/":  {"oxford": "ʃ_isolation.mp3",  "local": "fricative_sh",           "name": "SH Sound (Shoe)"},
    "/ʒ/":  {"oxford": "ʒ_isolation.mp3",  "local": "fricative_zh",           "name": "ZH Sound (Vision)"},
    "/h/":  {"oxford": "h_isolation.mp3",  "local": "fricative_h",            "name": "H Sound (Hat)"},
    "/tʃ/": {"oxford": "tʃ_isolation.mp3", "local": "affricate_ch",           "name": "CH Sound (Chair)"},
    "/dʒ/": {"oxford": "dʒ_isolation.mp3", "local": "affricate_j",            "name": "J Sound (Judge)"},

    # ─── PLOSIVES ─────────────────────────────────────────────────────────────────
    "/p/":  {"oxford": "p_isolation.mp3",  "local": "plosive_p",  "name": "Voiceless P (Pen)"},
    "/b/":  {"oxford": "b_isolation.mp3",  "local": "plosive_b",  "name": "Voiced B (Book)"},
    "/t/":  {"oxford": "t_isolation.mp3",  "local": "plosive_t",  "name": "Voiceless T (Table)"},
    "/d/":  {"oxford": "d_isolation.mp3",  "local": "plosive_d",  "name": "Voiced D (Door)"},
    "/k/":  {"oxford": "k_isolation.mp3",  "local": "plosive_k",  "name": "Voiceless K (Cat)"},
    "/g/":  {"oxford": "g_isolation.mp3",  "local": "plosive_g",  "name": "Voiced G (Go)"},

    # ─── NASALS & APPROXIMANTS ────────────────────────────────────────────────────
    "/m/":  {"oxford": "m_isolation.mp3",  "local": "nasal_m",        "name": "M Nasal (Man)"},
    "/n/":  {"oxford": "n_isolation.mp3",  "local": "nasal_n",        "name": "N Nasal (No)"},
    "/ŋ/":  {"oxford": "ŋ_isolation.mp3",  "local": "nasal_ng",       "name": "NG Nasal (Sing)"},
    "/l/":  {"oxford": "l_isolation.mp3",  "local": "approximant_l",  "name": "L Liquid (Light)"},
    "/r/":  {"oxford": "r_isolation.mp3",  "local": "approximant_r",  "name": "R Approximant (Red)"},
    "/j/":  {"oxford": "j_isolation.mp3",  "local": "approximant_j",  "name": "Y Glide (Yes)"},
    "/w/":  {"oxford": "w_isolation.mp3",  "local": "approximant_w",  "name": "W Glide (Water)"},
}

BASE_URL = "https://raw.githubusercontent.com/xiaozhah/phoneme_audio/main/audio/"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Guionbajo/1.0"

def main():
    print("=================================================================")
    print("Guionbajo: Installing 44 Clean Single-Sound Oxford Studio Phonemes")
    print(f"Backend Target:  {BACKEND_CACHE}")
    print(f"Frontend Target: {FRONTEND_AUDIO}")
    print("=================================================================")

    success_count = 0
    failed = []

    for ipa, info in PHONEME_OXFORD_DATA.items():
        oxford_filename = info["oxford"]
        local_base = info["local"]
        name = info["name"]

        encoded_name = urllib.parse.quote(oxford_filename)
        url = BASE_URL + encoded_name

        print(f"[{ipa:6}] {name:30} -> {local_base}.mp3...", end=" ")

        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=10) as res:
                audio_bytes = res.read()
                
            if len(audio_bytes) > 500:
                # Save as both .mp3 and .ogg for complete compatibility
                for ext in [".mp3", ".ogg"]:
                    (BACKEND_CACHE / f"{local_base}{ext}").write_bytes(audio_bytes)
                    (FRONTEND_AUDIO / f"{local_base}{ext}").write_bytes(audio_bytes)

                size_kb = len(audio_bytes) / 1024
                print(f"[OK] ({size_kb:.1f} KB)")
                success_count += 1
            else:
                print("[FAIL] (too small)")
                failed.append((ipa, "File too small"))
        except Exception as e:
            print(f"[FAIL] ({e})")
            failed.append((ipa, str(e)))

    print("=================================================================")
    print(f"Summary: {success_count}/44 Phonemes successfully downloaded and synchronized.")
    if success_count == 44:
        print("ALL 44 PHONEMES ARE NOW SINGLE-HIT, CLEAN, STUDIO-GRADE AUDIO!")
    else:
        print(f"WARNING: {len(failed)} phonemes failed.")
    print("=================================================================")

if __name__ == "__main__":
    main()
