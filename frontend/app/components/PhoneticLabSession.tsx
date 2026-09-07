'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, X, ChevronDown, ChevronRight, ArrowRight, Sparkles, 
  Pause, Award, CheckCircle2, User
} from 'lucide-react';
import { api, playEnglishAudio } from '@/lib/api';
import { getPhonemeSvgParam } from './phonemeSvgPresets';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhonemeData {
  ipa: string;
  name: string;
  category: string;
  voicing: string;
  tongue_position: string;
  mouth_aperture: string;
  airflow: string;
  mouth_guide: { frontal: string; lateral: string };
  mouth_guide_es?: { frontal: string; lateral: string };
  examples: string[];
  contrast_with?: string;
  contrast_pairs?: string[][];
  introduced_at: string;
  drill_sentence: string;
  audio_file?: string;
  svg_params?: any;
}

interface PhoneticLabSessionProps {
  phoneme: PhonemeData;
  onClose: () => void;
}

// ─── Phoneme Audio & Slug Maps ────────────────────────────────────────────────

const PHONEME_SLUG_MAP: Record<string, string> = {
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
};

const PHONEME_AUDIO_MAP: Record<string, string> = {
  "/ɪ/": "/audio/phonemes/vowel_short_i.ogg",
  "/e/": "/audio/phonemes/vowel_short_e.ogg",
  "/æ/": "/audio/phonemes/vowel_short_ae.ogg",
  "/ʌ/": "/audio/phonemes/vowel_short_wedge.ogg",
  "/ɒ/": "/audio/phonemes/vowel_short_o.ogg",
  "/ʊ/": "/audio/phonemes/vowel_short_upsilon.ogg",
  "/ə/": "/audio/phonemes/vowel_schwa.ogg",
  "/iː/": "/audio/phonemes/vowel_long_i.ogg",
  "/ɑː/": "/audio/phonemes/vowel_long_a.ogg",
  "/ɔː/": "/audio/phonemes/vowel_long_o.ogg",
  "/uː/": "/audio/phonemes/vowel_long_u.ogg",
  "/ɜː/": "/audio/phonemes/vowel_long_er.ogg",
  "/eɪ/": "/audio/phonemes/diphthong_ei.ogg",
  "/aɪ/": "/audio/phonemes/diphthong_ai.ogg",
  "/ɔɪ/": "/audio/phonemes/diphthong_oi.ogg",
  "/aʊ/": "/audio/phonemes/diphthong_au.ogg",
  "/əʊ/": "/audio/phonemes/diphthong_ou.ogg",
  "/ɪə/": "/audio/phonemes/diphthong_ia.ogg",
  "/eə/": "/audio/phonemes/diphthong_ea.ogg",
  "/ʊə/": "/audio/phonemes/diphthong_ua.ogg",
  "/f/": "/audio/phonemes/fricative_f.ogg",
  "/v/": "/audio/phonemes/fricative_v.ogg",
  "/θ/": "/audio/phonemes/fricative_th_voiceless.ogg",
  "/ð/": "/audio/phonemes/fricative_th_voiced.ogg",
  "/s/": "/audio/phonemes/fricative_s.ogg",
  "/z/": "/audio/phonemes/fricative_z.ogg",
  "/ʃ/": "/audio/phonemes/fricative_sh.ogg",
  "/ʒ/": "/audio/phonemes/fricative_zh.ogg",
  "/h/": "/audio/phonemes/fricative_h.ogg",
  "/tʃ/": "/audio/phonemes/affricate_ch.ogg",
  "/dʒ/": "/audio/phonemes/affricate_j.ogg",
  "/p/": "/audio/phonemes/plosive_p.ogg",
  "/b/": "/audio/phonemes/plosive_b.ogg",
  "/t/": "/audio/phonemes/plosive_t.ogg",
  "/d/": "/audio/phonemes/plosive_d.ogg",
  "/k/": "/audio/phonemes/plosive_k.ogg",
  "/g/": "/audio/phonemes/plosive_g.ogg",
  "/m/": "/audio/phonemes/nasal_m.ogg",
  "/n/": "/audio/phonemes/nasal_n.ogg",
  "/ŋ/": "/audio/phonemes/nasal_ng.ogg",
  "/l/": "/audio/phonemes/approximant_l.ogg",
  "/r/": "/audio/phonemes/approximant_r.ogg",
  "/j/": "/audio/phonemes/approximant_j.ogg",
  "/w/": "/audio/phonemes/approximant_w.ogg",
};

const LOCAL_IPA_FALLBACK: Record<string, string> = {
  cat: "/kæt/", bad: "/bæd/", apple: "/ˈæp.əl/", hand: "/hænd/", black: "/blæk/",
  sheep: "/ʃiːp/", feel: "/fiːl/", see: "/siː/", tree: "/triː/", read: "/riːd/",
  ship: "/ʃɪp/", fill: "/fɪl/", sit: "/sɪt/", hit: "/hɪt/", big: "/bɪɡ/",
  bed: "/bed/", ten: "/ten/", red: "/red/", head: "/hed/", send: "/send/",
  cup: "/kʌp/", bus: "/bʌs/", sun: "/sʌn/", run: "/rʌn/", love: "/lʌv/",
  far: "/fɑːr/", car: "/kɑːr/", star: "/stɑːr/", father: "/ˈfɑː.ðər/", heart: "/hɑːrt/",
  think: "/θɪŋk/", thought: "/θɔːt/", bath: "/bæθ/", three: "/θriː/", mouth: "/maʊθ/",
  this: "/ðɪs/", that: "/ðæt/", them: "/ðem/", mother: "/ˈmʌð.ər/", with: "/wɪð/",
  shoe: "/ʃuː/", fish: "/fɪʃ/", shop: "/ʃɒp/", push: "/pʊʃ/", wash: "/wɒʃ/",
  chair: "/tʃeər/", cheese: "/tʃiːz/", match: "/mætʃ/", reach: "/riːtʃ/",
  man: "/mæn/", my: "/maɪ/", name: "/neɪm/", time: "/taɪm/", room: "/ruːm/",
  call: "/kɔːl/", law: "/lɔː/", walk: "/wɔːk/", water: "/ˈwɔː.tər/",
  food: "/fuːd/", blue: "/bluː/", moon: "/muːn/", cool: "/kuːl/",
  voice: "/vɔɪs/", very: "/ˈver.i/", leave: "/liːv/", have: "/hæv/",
  sea: "/siː/", sister: "/ˈsɪs.tər/", city: "/ˈsɪt.i/",
  zoo: "/zuː/", zero: "/ˈzɪə.rəʊ/", lazy: "/ˈleɪ.zi/", buzz: "/bʌz/",
};

// ─── Frontal Mouth Shapes by Archetype ────────────────────────────────────────

function FrontalMouthSvg({ uid, shapeType }: { uid: string; shapeType: string }) {
  if (shapeType === 'rounded_o') {
    return (
      <g className="svg-smooth">
        {/* 1. Deep Oral Cavity Aperture (smooth round vertical oval) */}
        <ellipse cx="150" cy="136" rx="21" ry="26" fill={`url(#cavG-${uid})`} stroke="#1a0206" strokeWidth="1" />

        {/* 2. Inside the opening (clipped to round aperture) */}
        <g clipPath={`url(#clip-o-${uid})`}>
          {/* Upper interior shadow */}
          <ellipse cx="150" cy="114" rx="18" ry="6" fill="#060002" opacity="0.6" />
          {/* Low tongue floor visible at base of oral cavity in /ɔː/ */}
          <path d="M 126 151 C 136 144, 164 144, 174 151 C 174 164, 126 164, 126 151 Z" fill="#9e3b48" opacity="0.85" />
          <ellipse cx="150" cy="151" rx="14" ry="2.8" fill="#c45868" opacity="0.4" />
        </g>

        {/* 3. Continuous Fleshy Lip Ring (EvenOdd: outer contour + perfectly rounded inner aperture) */}
        <path 
          d="
            M 150 97
            C 142 97, 130 102, 120 114
            C 114 121, 114 128, 114 136
            C 114 145, 115 154, 123 163
            C 133 174, 142 176, 150 176
            C 158 176, 167 174, 177 163
            C 185 154, 186 145, 186 136
            C 186 128, 186 121, 180 114
            C 170 102, 158 97, 150 97 Z
            M 150 110
            C 138.4 110, 129 121.6, 129 136
            C 129 150.4, 138.4 162, 150 162
            C 161.6 162, 171 150.4, 171 136
            C 171 121.6, 161.6 110, 150 110 Z
          "
          fillRule="evenodd"
          fill={`url(#lipG-${uid})`}
          stroke="#731628"
          strokeWidth="1.2"
        />

        {/* Cupid's bow subtle depression at top vermilion */}
        <path d="M 144 97 Q 150 101 156 97" stroke="#681222" strokeWidth="1.2" fill="none" opacity="0.65" />

        {/* Commissure indentation creases at sides */}
        <path d="M 114 136 Q 119 136 123 136" stroke="#5a0e1e" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M 186 136 Q 181 136 177 136" stroke="#5a0e1e" strokeWidth="1.6" strokeLinecap="round" />

        {/* Inner rim rolled vermilion border line */}
        <ellipse cx="150" cy="136" rx="21" ry="26" fill="none" stroke="#480815" strokeWidth="1.4" opacity="0.75" />

        {/* Radial puckering creases (3D protrusion) */}
        <path d="M 124 122 Q 128 125 132 128" stroke="#701528" strokeWidth="1" opacity="0.5" fill="none" strokeLinecap="round" />
        <path d="M 176 122 Q 172 125 168 128" stroke="#701528" strokeWidth="1" opacity="0.5" fill="none" strokeLinecap="round" />
        <path d="M 124 150 Q 128 147 132 144" stroke="#701528" strokeWidth="1" opacity="0.5" fill="none" strokeLinecap="round" />
        <path d="M 176 150 Q 172 147 168 144" stroke="#701528" strokeWidth="1" opacity="0.5" fill="none" strokeLinecap="round" />

        {/* Specular Volume Highlights */}
        <ellipse cx="150" cy="168" rx="14" ry="3.5" fill="white" opacity="0.25" />
        <ellipse cx="141" cy="104" rx="6" ry="2" fill="white" opacity="0.2" transform="rotate(-10 141 104)" />
        <ellipse cx="159" cy="104" rx="6" ry="2" fill="white" opacity="0.2" transform="rotate(10 159 104)" />
      </g>
    );
  }

  if (shapeType === 'rounded_tight') {
    return (
      <g className="svg-smooth">
        {/* Deep small circular oral aperture */}
        <ellipse cx="150" cy="136" rx="13" ry="15" fill={`url(#cavG-${uid})`} stroke="#1a0206" strokeWidth="1" />

        {/* Tight puckered lips ring */}
        <path 
          d="
            M 150 104
            C 140 104, 126 112, 122 122
            C 118 130, 118 142, 122 150
            C 126 158, 138 166, 150 166
            C 162 166, 174 158, 178 150
            C 182 142, 182 130, 178 122
            C 174 112, 160 104, 150 104 Z
            M 150 121
            C 142.8 121, 137 127.7, 137 136
            C 137 144.3, 142.8 151, 150 151
            C 157.2 151, 163 144.3, 163 136
            C 163 127.7, 157.2 121, 150 121 Z
          "
          fillRule="evenodd"
          fill={`url(#lipG-${uid})`}
          stroke="#731628"
          strokeWidth="1.2"
        />

        <ellipse cx="150" cy="136" rx="13" ry="15" fill="none" stroke="#480815" strokeWidth="1.4" opacity="0.75" />

        {/* Tight pucker lines radiating outward */}
        <path d="M 128 125 L 133 129" stroke="#701528" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <path d="M 172 125 L 167 129" stroke="#701528" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <path d="M 128 147 L 133 143" stroke="#701528" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
        <path d="M 172 147 L 167 143" stroke="#701528" strokeWidth="1" opacity="0.55" strokeLinecap="round" />

        {/* Highlights */}
        <ellipse cx="150" cy="159" rx="10" ry="2.8" fill="white" opacity="0.25" />
        <ellipse cx="150" cy="111" rx="8" ry="2" fill="white" opacity="0.18" />
      </g>
    );
  }

  if (shapeType === 'spread') {
    return (
      <g className="svg-smooth">
        <path 
          d="M 92 135 C 108 120, 130 118, 150 122 C 170 118, 192 120, 208 135 C 190 130, 170 129, 150 130 C 130 129, 110 130, 92 135 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="135" rx="55" ry="8" fill={`url(#cavG-${uid})`} stroke="#220306" strokeWidth="1" />
        <g clipPath={`url(#clip-spread-${uid})`}>
          <rect x="118" y="126" width="11" height="12" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="130" y="125" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="143" y="124" width="14" height="14" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="158" y="125" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="171" y="126" width="11" height="12" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="124" y="137" width="11" height="11" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="136" y="136" width="12" height="12" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="149" y="136" width="12" height="12" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="162" y="137" width="11" height="11" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
        </g>
        <path 
          d="M 92 135 C 112 140, 132 141, 150 141 C 168 141, 188 140, 208 135 C 196 156, 176 162, 150 162 C 124 162, 104 156, 92 135 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="153" rx="20" ry="3.5" fill="white" opacity="0.22" />
      </g>
    );
  }

  if (shapeType === 'wide_open') {
    return (
      <g className="svg-smooth">
        <path 
          d="M 104 126 C 118 112, 134 110, 150 114 C 166 110, 182 112, 196 126 C 182 122, 168 120, 150 121 C 132 120, 118 122, 104 126 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="140" rx="42" ry="28" fill={`url(#cavG-${uid})`} stroke="#220306" strokeWidth="1.2" />
        <g clipPath={`url(#clip-wide-${uid})`}>
          <rect x="122" y="116" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="135" y="115" width="14" height="14" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="150" y="115" width="14" height="14" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="165" y="116" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <path d="M 110 152 C 130 144, 170 144, 190 152 L 190 175 L 110 175 Z" fill="#d4615a" />
          <rect x="136" y="156" width="13" height="11" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="150" y="156" width="13" height="11" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
        </g>
        <path 
          d="M 104 126 C 118 150, 134 162, 150 162 C 166 162, 182 150, 196 126 C 188 170, 174 182, 150 182 C 126 182, 112 170, 104 126 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="174" rx="16" ry="4" fill="white" opacity="0.22" />
      </g>
    );
  }

  if (shapeType === 'closed') {
    return (
      <g className="svg-smooth">
        <path 
          d="M 98 135 C 114 122, 132 120, 150 123 C 168 120, 186 122, 202 135 C 188 136, 170 136, 150 136 C 130 136, 112 136, 98 135 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <path d="M 98 135 Q 150 137 202 135" stroke="#541220" strokeWidth="1.8" fill="none" />
        <path 
          d="M 98 135 C 112 136, 130 136, 150 136 C 170 136, 188 136, 202 135 C 192 158, 172 163, 150 163 C 128 163, 108 158, 98 135 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="153" rx="16" ry="3.5" fill="white" opacity="0.2" />
      </g>
    );
  }

  if (shapeType === 'labiodental') {
    return (
      <g className="svg-smooth">
        <path 
          d="M 98 130 C 114 118, 132 116, 150 119 C 168 116, 186 118, 202 130 C 186 126, 168 125, 150 126 C 132 125, 114 126, 98 130 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="132" rx="44" ry="10" fill={`url(#cavG-${uid})`} />
        <g>
          <rect x="130" y="123" width="12" height="14" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.6" />
          <rect x="144" y="122" width="13" height="15" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.6" />
          <rect x="159" y="123" width="12" height="14" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.6" />
        </g>
        <path 
          d="M 98 133 C 118 139, 134 140, 150 140 C 166 140, 182 139, 202 133 C 190 158, 172 163, 150 163 C 128 163, 110 158, 98 133 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <path d="M 126 139 Q 150 141 174 139" stroke="#7a182c" strokeWidth="1.2" fill="none" />
        <ellipse cx="150" cy="154" rx="16" ry="3.5" fill="white" opacity="0.2" />
      </g>
    );
  }

  if (shapeType === 'interdental') {
    return (
      <g className="svg-smooth">
        <path 
          d="M 98 135 C 114 122, 132 120, 150 123 C 168 120, 186 122, 202 135 C 186 130, 168 128, 150 129 C 132 128, 114 130, 98 135 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="135" rx="44" ry="14" fill={`url(#cavG-${uid})`} stroke="#220306" strokeWidth="1" />
        <g clipPath={`url(#clip-inter-${uid})`}>
          <rect x="130" y="124" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="144" y="123" width="13" height="14" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="159" y="124" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
          <ellipse cx="150" cy="135" rx="20" ry="8" fill="#d4615a" stroke="#b33d35" strokeWidth="1" />
          <rect x="135" y="141" width="11" height="9" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="148" y="141" width="11" height="9" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
          <rect x="161" y="141" width="11" height="9" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
        </g>
        <path 
          d="M 98 135 C 114 141, 132 143, 150 143 C 168 143, 186 141, 202 135 C 190 158, 172 163, 150 163 C 128 163, 110 158, 98 135 Z" 
          fill={`url(#lipG-${uid})`} 
          stroke="#8e243c" 
          strokeWidth="1.2" 
        />
        <ellipse cx="150" cy="154" rx="16" ry="3.5" fill="white" opacity="0.2" />
      </g>
    );
  }

  // Neutral default (/ə/, /t/, /d/, etc.)
  return (
    <g className="svg-smooth">
      <path 
        d="M 104 135 C 118 122, 134 120, 150 124 C 166 120, 182 122, 196 135 C 182 129, 166 127, 150 128 C 134 127, 118 129, 104 135 Z" 
        fill={`url(#lipG-${uid})`} 
        stroke="#8e243c" 
        strokeWidth="1.2" 
      />
      <ellipse cx="150" cy="135" rx="38" ry="12" fill={`url(#cavG-${uid})`} stroke="#220306" strokeWidth="1" />
      <g clipPath={`url(#clip-neutral-${uid})`}>
        <rect x="126" y="125" width="11" height="12" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
        <rect x="139" y="124" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
        <rect x="152" y="124" width="12" height="13" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
        <rect x="165" y="125" width="11" height="12" rx="1.5" fill="#f4f0eb" stroke="#c4bcaf" strokeWidth="0.5" />
        <rect x="133" y="137" width="11" height="9" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
        <rect x="146" y="137" width="11" height="9" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
        <rect x="159" y="137" width="11" height="9" rx="1.5" fill="#e8e3dc" stroke="#c4bcaf" strokeWidth="0.5" />
      </g>
      <path 
        d="M 104 135 C 118 141, 134 143, 150 143 C 166 143, 182 141, 196 135 C 186 158, 168 164, 150 164 C 132 164, 114 158, 104 135 Z" 
        fill={`url(#lipG-${uid})`} 
        stroke="#8e243c" 
        strokeWidth="1.2" 
      />
      <ellipse cx="150" cy="155" rx="15" ry="3.5" fill="white" opacity="0.2" />
    </g>
  );
}

// ─── Anatomical Plate Component (Parametric Bounded SVG Engine) ───────────────

function AnatomicalPlate({ 
  ipa, 
  guide, 
  voiced,
  svgParamsOverride
}: { 
  ipa: string; 
  guide?: { frontal?: string; lateral?: string }; 
  voiced: boolean;
  svgParamsOverride?: any;
}) {
  const [viewMode, setViewMode] = useState<'hd' | 'simulator'>('hd');
  const params = getPhonemeSvgParam(ipa, svgParamsOverride);
  const isVoiced = voiced !== undefined ? voiced : params.voiced;
  const shapeType = params.shape_type || 'neutral';

  const cleanIpa = ipa.startsWith('/') ? ipa : `/${ipa}/`;
  const slug = PHONEME_SLUG_MAP[cleanIpa] || PHONEME_SLUG_MAP[ipa] || 'vowel_short_i';
  const frontalPath = `/images/phonemes/${slug}_frontal.svg`;
  const lateralPath = `/images/phonemes/${slug}_lateral.svg`;

  const drop = params.lip_drop;
  const jawDrop = Math.min(drop * 0.5, 16);

  // Unique sanitized ID for clipPath and gradients to prevent DOM collisions across phonemes
  const uid = ipa.replace(/[^a-zA-Z0-9]/g, '') || 'ph';

  return (
    <div className="space-y-4">
      {/* Styles for smooth morphing, animated vocal vibration, and outward air dashes */}
      <style>{`
        @keyframes pulseVocalFolds {
          0%, 100% { opacity: 0.35; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes pulseVoiceRing {
          0% { r: 5; opacity: 0.9; }
          100% { r: 18; opacity: 0; }
        }
        @keyframes airStreamDash {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .vocal-pulse-anim { animation: pulseVocalFolds 0.45s infinite ease-in-out; }
        .vocal-ring-anim { animation: pulseVoiceRing 0.9s infinite ease-out; }
        .air-stream-anim {
          stroke-dasharray: 6 6;
          animation: airStreamDash 0.85s infinite linear;
        }
        .svg-smooth { transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
      `}</style>

      {/* View Mode Toggle: Medical HD Plates vs Vector Simulator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <span className="text-xs text-zinc-400 font-medium">
          {viewMode === 'hd' 
            ? '✨ Visualizando atlas anatómico médico en alta definición' 
            : '⚡ Visualizando simulador vectorial paramétrico en tiempo real'}
        </span>
        <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('hd')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'hd'
                ? 'bg-emerald-500 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lámina Médica HD
          </button>
          <button
            type="button"
            onClick={() => setViewMode('simulator')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'simulator'
                ? 'bg-cyan-500 text-black shadow-md font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Simulador Vectorial
          </button>
        </div>
      </div>

      {/* Dual Interactive SVG Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 👄 1. FRONTAL VIEW (Lips & Teeth by Archetype) */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👄 Vista Frontal (Exterior: Labios y Dientes)</span>
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {params.lip_lbl}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Forma y tensión de los labios y apertura dental</p>

            <div className="bg-[#0b0f1a] rounded-2xl p-2 border border-zinc-800/80 flex items-center justify-center min-h-[260px]">
              {viewMode === 'hd' ? (
                <img
                  src={frontalPath}
                  alt={`Vista frontal de ${ipa}`}
                  className="w-full max-h-[260px] object-contain drop-shadow-md select-none"
                  loading="lazy"
                />
              ) : (
              <svg viewBox="0 0 300 260" className="w-full max-h-[260px] select-none">
                <defs>
                  <linearGradient id={`skinG-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ddb89a" />
                    <stop offset="100%" stopColor="#c9956c" />
                  </linearGradient>
                  <linearGradient id={`lipG-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e8788a" />
                    <stop offset="100%" stopColor="#b83b58" />
                  </linearGradient>
                  <radialGradient id={`cavG-${uid}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e060a" />
                    <stop offset="100%" stopColor="#0a0103" />
                  </radialGradient>
                  
                  {/* Clip paths for each mouth archetype */}
                  <clipPath id={`clip-o-${uid}`}>
                    <ellipse cx="150" cy="136" rx="21" ry="26" />
                  </clipPath>
                  <clipPath id={`clip-u-${uid}`}>
                    <ellipse cx="150" cy="136" rx="13" ry="15" />
                  </clipPath>
                  <clipPath id={`clip-spread-${uid}`}>
                    <ellipse cx="150" cy="135" rx="55" ry="8" />
                  </clipPath>
                  <clipPath id={`clip-wide-${uid}`}>
                    <ellipse cx="150" cy="140" rx="42" ry="28" />
                  </clipPath>
                  <clipPath id={`clip-inter-${uid}`}>
                    <ellipse cx="150" cy="135" rx="44" ry="14" />
                  </clipPath>
                  <clipPath id={`clip-neutral-${uid}`}>
                    <ellipse cx="150" cy="135" rx="38" ry="12" />
                  </clipPath>
                </defs>

                {/* Subtle Face Contour */}
                <ellipse cx="150" cy="140" rx="100" ry="120" fill={`url(#skinG-${uid})`} opacity="0.12" />
                
                {/* Anatomic nose base & philtrum (subtle nostrils & philtrum columns descending to Cupid's bow) */}
                <path d="M 136 72 Q 142 68 150 69 Q 158 68 164 72" fill="none" stroke="#966b4f" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
                <ellipse cx="143" cy="73" rx="3.5" ry="1.8" fill="#2d170d" opacity="0.4" />
                <ellipse cx="157" cy="73" rx="3.5" ry="1.8" fill="#2d170d" opacity="0.4" />
                <path d="M 147 75 Q 146 85 144 96" stroke="#8b5a38" strokeWidth="1" strokeLinecap="round" opacity="0.3" fill="none" />
                <path d="M 153 75 Q 154 85 156 96" stroke="#8b5a38" strokeWidth="1" strokeLinecap="round" opacity="0.3" fill="none" />

                {/* Archetype-Specific Frontal Mouth Rendering */}
                <FrontalMouthSvg uid={uid} shapeType={shapeType} />
              </svg>
            )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl text-xs text-zinc-300 leading-relaxed">
            <span className="font-semibold text-rose-300">Detalle labial: </span>
            {guide?.frontal || params.f_desc}
          </div>
        </div>

        {/* 👅 2. SAGITTAL VIEW (Vocal Tract Cross-Section) */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>👅 Corte Sagital (Tracto Vocal)</span>
              </span>
              <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full border ${
                isVoiced 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {isVoiced ? 'Sonoro ● Vocal ON' : 'Sordo ● Sin Vibración'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mb-3">Elevación de lengua, velo, laringe y flujo de aire egresivo</p>

            <div className="bg-[#0b0f1a] rounded-2xl p-2 border border-zinc-800/80 flex items-center justify-center min-h-[260px]">
              {viewMode === 'hd' ? (
                <img
                  src={lateralPath}
                  alt={`Corte sagital de ${ipa}`}
                  className="w-full max-h-[260px] object-contain drop-shadow-md select-none"
                  loading="lazy"
                />
              ) : (
              <svg viewBox="0 0 400 340" className="w-full max-h-[260px] select-none">
                <defs>
                  <linearGradient id={`tissueG-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c2727e" />
                    <stop offset="100%" stopColor="#a35060" />
                  </linearGradient>
                  <linearGradient id={`tngG-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#e8856e" />
                    <stop offset="100%" stopColor="#c45a3c" />
                  </linearGradient>
                  <linearGradient id={`boneG-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#d4c8b8" />
                    <stop offset="100%" stopColor="#a89880" />
                  </linearGradient>
                </defs>

                {/* Outer face profile */}
                <path 
                  d="M 130 20 Q 115 30 110 50 Q 108 70 95 85 Q 80 95 72 100 Q 78 108 82 112 Q 72 118 68 125" 
                  fill="none" stroke="#7a6555" strokeWidth="2" opacity="0.65" 
                />
                <path 
                  d="M 68 160 Q 65 180 72 200 Q 85 225 110 240" 
                  fill="none" stroke="#7a6555" strokeWidth="2" opacity="0.65" 
                />

                {/* Nasal Cavity */}
                <path 
                  d="M 95 55 Q 105 45 180 48 Q 215 50 225 65 L 220 75 Q 200 62 140 60 Q 105 62 95 70 Z" 
                  fill="#1a1228" stroke="#4a3860" strokeWidth="1.2" opacity="0.85" 
                />

                {/* Hard Palate (Rigid Bone Roof) */}
                <path 
                  d="M 95 75 Q 100 90 140 98 Q 180 105 215 95 Q 220 85 220 75" 
                  fill={`url(#boneG-${uid})`} stroke="#8a7a65" strokeWidth="1.8" opacity="0.9" 
                />
                {/* Alveolar Ridge Bump */}
                <circle cx="98" cy="88" r="5" fill="#c4b49a" stroke="#8a7a65" strokeWidth="1" opacity="0.65" />

                {/* Fixed Upper Incisor */}
                <path d="M 78 108 L 82 108 L 84 130 L 76 130 Z" fill="#f0ebe4" stroke="#b8ad9a" strokeWidth="1" />
                <path d="M 80 100 L 82 108" stroke="#c4b49a" strokeWidth="1.5" opacity="0.4" />

                {/* Upper Lip Tissue */}
                <path d="M 68 125 Q 60 128 58 132 Q 60 135 68 138" fill="#c87080" stroke="#a35060" strokeWidth="1.5" opacity="0.85" />

                {/* Articulated Lower Teeth (Moves with Jaw) */}
                <g className="svg-smooth" transform={`translate(0, ${jawDrop})`}>
                  <path d="M 76 146 L 84 146 L 82 162 L 78 162 Z" fill="#e8e3dc" stroke="#b8ad9a" strokeWidth="1" />
                </g>

                {/* Articulated Lower Lip Tissue */}
                <path 
                  d={`M 68 ${155 + jawDrop} Q 60 ${165 + jawDrop} 62 ${178 + jawDrop} Q 68 ${192 + jawDrop} 78 ${198 + jawDrop}`} 
                  fill="none" stroke="#b07060" strokeWidth="2.5" strokeLinecap="round" className="svg-smooth" opacity="0.75" 
                />

                {/* Pharynx Posterior Wall */}
                <path 
                  d="M 240 75 Q 248 100 252 140 Q 255 180 255 220 Q 252 260 248 290" 
                  fill="none" stroke="#6a4a55" strokeWidth="2.5" opacity="0.6" 
                />
                <path 
                  d="M 220 75 Q 240 75 248 100 Q 252 140 255 180 Q 255 220 252 260 L 235 280 Q 230 250 228 220 Q 225 180 222 140 Q 220 100 220 75 Z" 
                  fill="#1a1018" opacity="0.5" 
                />

                {/* Movable Velum (Soft Palate) & Uvula */}
                <path 
                  d={params.velum} 
                  fill="none" stroke="#c87080" strokeWidth="4" strokeLinecap="round" className="svg-smooth" 
                />
                <ellipse cx="230" cy={params.uvula_y} rx="5" ry="8" fill="#c87080" stroke="#a35060" strokeWidth="1" className="svg-smooth" />

                {/* Epiglottis */}
                <path d="M 230 225 Q 225 210 228 195 Q 232 185 238 180" fill="none" stroke="#8a7050" strokeWidth="3" strokeLinecap="round" opacity="0.65" />

                {/* Larynx / Trachea Structure & Rings */}
                <path d="M 222 260 Q 218 275 220 295 Q 222 310 225 325" fill="none" stroke="#5a4a55" strokeWidth="2" opacity="0.5" />
                <path d="M 248 260 Q 252 275 250 295 Q 248 310 245 325" fill="none" stroke="#5a4a55" strokeWidth="2" opacity="0.5" />
                <line x1="224" y1="280" x2="246" y2="280" stroke="#4a3a45" strokeWidth="1.5" opacity="0.4" />
                <line x1="223" y1="295" x2="247" y2="295" stroke="#4a3a45" strokeWidth="1.5" opacity="0.4" />
                <line x1="224" y1="310" x2="246" y2="310" stroke="#4a3a45" strokeWidth="1.5" opacity="0.4" />

                {/* Vocal Folds with Active Voicing Phonation */}
                <g transform="translate(235, 255)">
                  <line x1="-8" y1="-3" x2="0" y2="0" stroke="#a878b8" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="8" y1="-3" x2="0" y2="0" stroke="#a878b8" strokeWidth="2.5" strokeLinecap="round" />
                  {isVoiced ? (
                    <>
                      <circle cx="0" cy="0" r="5" fill="none" stroke="#c084fc" strokeWidth="1.5" className="vocal-ring-anim" />
                      <circle cx="0" cy="0" r="8" fill="none" stroke="#a855f7" strokeWidth="1" className="vocal-pulse-anim" />
                      <circle cx="0" cy="0" r="3.5" fill="#a855f7" className="vocal-pulse-anim" />
                    </>
                  ) : (
                    <circle cx="0" cy="0" r="2.5" fill="#475569" opacity="0.5" />
                  )}
                </g>

                {/* Floor of mouth */}
                <path d="M 78 165 Q 100 185 140 200 Q 180 210 210 225 Q 225 235 235 250" fill="none" stroke="#6a4a50" strokeWidth="1.5" opacity="0.4" />

                {/* Dynamic Tongue Body */}
                <path 
                  d={params.tongue} 
                  fill={`url(#tngG-${uid})`} 
                  stroke="#9a4030" 
                  strokeWidth="1.8" 
                  className="svg-smooth" 
                />
                {/* Tongue Texture Striations */}
                <path d={params.tex1} fill="none" stroke="#b86855" strokeWidth="0.8" opacity="0.4" className="svg-smooth" />
                <path d={params.tex2} fill="none" stroke="#b86855" strokeWidth="0.6" opacity="0.3" className="svg-smooth" />

                {/* Primary Articulatory Constriction Focus Marker (Cyan Glow) */}
                <circle cx={params.focus_x} cy={params.focus_y} r="6" fill="#22d3ee" opacity="0.75" className="svg-smooth" />
                <circle cx={params.focus_x} cy={params.focus_y} r="10" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.35" className="svg-smooth" />

                {/* Egressive Oral Airflow (animated dashes strictly outward) */}
                <path 
                  d={params.air} 
                  fill="none" 
                  stroke="#22d3ee" 
                  strokeWidth="2.2" 
                  strokeLinecap="round"
                  className="air-stream-anim svg-smooth" 
                  opacity="0.85" 
                />

                {/* Nasal Airflow (only animated when nasal is true) */}
                {params.nasal && (
                  <path 
                    d="M 218 120 Q 180 65 120 55 Q 100 55 75 70" 
                    fill="none" 
                    stroke="#f59e0b" 
                    strokeWidth="2.2" 
                    strokeLinecap="round"
                    className="air-stream-anim" 
                    opacity="0.85" 
                  />
                )}

                {/* Clear Anatomical Labels */}
                <g fontSize="8" fill="#64748b" fontFamily="monospace" opacity="0.7">
                  <text x="130" y="50">C. Nasal</text>
                  <text x="130" y="108">Paladar Duro</text>
                  <text x="250" y="120">Velo</text>
                  <text x="260" y="200">Faringe</text>
                  <text x="252" y="252">Laringe</text>
                </g>
              </svg>
            )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-zinc-950/70 border border-zinc-800/80 rounded-2xl text-xs text-zinc-300 leading-relaxed">
            <span className="font-semibold text-cyan-300">Mecánica interna: </span>
            {guide?.lateral || params.s_desc}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PhoneticLabSession({ phoneme, onClose }: PhoneticLabSessionProps) {
  const [phase, setPhase] = useState(0); // 0=hero, 1=anatomy, 2=words, 3=twin
  const [twinPhoneme, setTwinPhoneme] = useState<PhonemeData | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [wordIpas, setWordIpas] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const anatomySectionRef = useRef<HTMLDivElement>(null);
  const wordsSectionRef = useRef<HTMLDivElement>(null);
  const twinSectionRef = useRef<HTMLDivElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const voiced = phoneme.voicing === 'voiced';
  const guide = phoneme.mouth_guide_es || phoneme.mouth_guide;

  // 1. Fetch twin phoneme data
  useEffect(() => {
    if (phoneme.contrast_with) {
      const clean = phoneme.contrast_with.replace(/\//g, '');
      api.get(`/phonetics/card/${encodeURIComponent(clean)}`)
        .then((data: PhonemeData) => setTwinPhoneme(data))
        .catch(() => setTwinPhoneme(null));
    }
  }, [phoneme.contrast_with]);

  // 2. Fetch IPA for example words
  useEffect(() => {
    if (phoneme.examples && phoneme.examples.length > 0) {
      const words = phoneme.examples.slice(0, 4);
      const sentence = words.join(' ');
      
      const initialMap: Record<string, string> = {};
      words.forEach(w => {
        const lower = w.toLowerCase();
        if (LOCAL_IPA_FALLBACK[lower]) initialMap[lower] = LOCAL_IPA_FALLBACK[lower];
      });
      setWordIpas(initialMap);

      api.get(`/tts/annotate?sentence=${encodeURIComponent(sentence)}`)
        .then((res: any) => {
          if (res && Array.isArray(res)) {
            const enrichedMap = { ...initialMap };
            res.forEach((item: { word: string; ipa: string }) => {
              if (item.word && item.ipa) enrichedMap[item.word.toLowerCase()] = item.ipa;
            });
            setWordIpas(enrichedMap);
          }
        })
        .catch(() => {});
    }
  }, [phoneme.examples]);

  // 3. Tutor Speech Narrator
  const stopTutorVoice = () => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch (_) {}
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    setIsSpeaking(false);
  };

  const speakGuide = useCallback(async (customText?: string) => {
    stopTutorVoice();
    setIsSpeaking(true);

    const frontalText = guide?.frontal || 'Coloca los labios en la posición indicada.';
    const lateralText = guide?.lateral || 'Ajusta la lengua y el flujo de aire.';
    const fullText = customText || `Para pronunciar el sonido ${phoneme.ipa}: ${frontalText} ${lateralText}`;

    try {
      const blob = await api.synthesize(fullText, 'female-yujie', 'calm', 0.95);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        playWebSpeechFallback(fullText);
      };
      await audio.play();
    } catch (err) {
      playWebSpeechFallback(fullText);
    }
  }, [guide, phoneme.ipa]);

  const playWebSpeechFallback = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    return () => {
      stopTutorVoice();
    };
  }, []);

  // 4. Navigation Handlers
  const goToPhase1 = () => {
    setPhase(1);
    setTimeout(() => {
      anatomySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      speakGuide();
    }, 100);
  };

  const goToPhase2 = () => {
    setPhase(2);
    setTimeout(() => {
      wordsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const goToPhase3 = () => {
    setPhase(3);
    setTimeout(() => {
      twinSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handlePlayPhoneme = async (ipa: string) => {
    setIsPlayingSound(ipa);
    const path = PHONEME_AUDIO_MAP[ipa];
    if (path) {
      try {
        const audio = new Audio(path);
        await audio.play();
        setTimeout(() => setIsPlayingSound(null), 800);
        return;
      } catch (_) {}
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/tts/phoneme?symbol=${encodeURIComponent(ipa)}`);
      if (res.ok) {
        const blob = await res.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        await audio.play();
      }
    } catch (_) {}
    setTimeout(() => setIsPlayingSound(null), 800);
  };

  const handlePlayWord = async (word: string) => {
    setIsPlayingSound(word);
    try {
      await playEnglishAudio(word);
    } catch (_) {}
    setTimeout(() => setIsPlayingSound(null), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070b16] flex flex-col">
      {/* ─── Top Header & Step Navigation ─── */}
      <div className="relative z-20 bg-zinc-950/90 border-b border-zinc-800/80 px-4 py-3 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-emerald-400 text-lg">
            {phoneme.ipa}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
              Laboratorio Fonético: {phoneme.name}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                voiced ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {voiced ? 'Sonoro' : 'Sordo'}
              </span>
            </h2>
            <p className="text-[11px] text-zinc-400">Atlas anatómico y entrenamiento fonético</p>
          </div>
        </div>

        {/* Navigation Step Pills */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold">
          <button 
            onClick={() => setPhase(0)}
            className={`px-3 py-1 rounded-lg transition-all ${phase === 0 ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
            1. Sonido
          </button>
          <span className="text-zinc-600">→</span>
          <button 
            onClick={goToPhase1}
            className={`px-3 py-1 rounded-lg transition-all ${phase === 1 ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
            2. Anatomía Bucal
          </button>
          <span className="text-zinc-600">→</span>
          <button 
            onClick={goToPhase2}
            className={`px-3 py-1 rounded-lg transition-all ${phase === 2 ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
            3. Palabras de Práctica
          </button>
          {twinPhoneme && (
            <>
              <span className="text-zinc-600">→</span>
              <button 
                onClick={goToPhase3}
                className={`px-3 py-1 rounded-lg transition-all ${phase === 3 ? 'bg-purple-500 text-white' : 'text-purple-400 hover:text-purple-300'}`}>
                4. Fonema Gemelo ({twinPhoneme.ipa})
              </button>
            </>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
          title="Cerrar clase"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Scrollable Body ─── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-12 relative z-10">

          {/* ═══════════════════════════════════════════════════════════════════
              FASE 0: HERO (Fonema animado grande con audio)
             ═══════════════════════════════════════════════════════════════════ */}
          <div className="min-h-[72vh] flex flex-col items-center justify-center text-center">
            <motion.button
              onClick={() => handlePlayPhoneme(phoneme.ipa)}
              initial={{ x: 200, y: -150, scale: 0.2, opacity: 0 }}
              animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className={`relative w-44 h-44 sm:w-56 sm:h-56 rounded-3xl flex items-center justify-center cursor-pointer border-2 transition-all shadow-2xl ${
                isPlayingSound === phoneme.ipa
                  ? 'bg-emerald-500/30 border-emerald-400 shadow-emerald-500/40 scale-105'
                  : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/40 hover:border-emerald-400'
              }`}
            >
              <span className="text-7xl sm:text-8xl font-black font-mono text-emerald-400 select-none">
                {phoneme.ipa}
              </span>
              <motion.div
                className="absolute inset-0 rounded-3xl border-2 border-emerald-400/40 pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-6 space-y-2"
            >
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{phoneme.name}</h1>
              <p className="text-sm text-zinc-400 flex items-center justify-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Presiona el símbolo para escuchar el sonido puro
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <span className="text-xs px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                  Apertura: {phoneme.mouth_aperture}
                </span>
                <span className="text-xs px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-300">
                  Lengua: {phoneme.tongue_position}
                </span>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
              onClick={goToPhase1}
              className="mt-8 flex items-center gap-2 px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Continuar a Anatomía Bucal <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              FASE 1: ANATOMÍA BUCAL & NARRACIÓN DEL TUTOR
             ═══════════════════════════════════════════════════════════════════ */}
          <div ref={anatomySectionRef} className="pt-6 pb-8 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handlePlayPhoneme(phoneme.ipa)}
                  className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-mono font-black text-emerald-400 text-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Escuchar fonema de nuevo"
                >
                  {phoneme.ipa}
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">Mecánica Articulatoria</h2>
                  <p className="text-xs text-zinc-400">Lámina anatómica médica y posición del tracto vocal</p>
                </div>
              </div>

              {/* Tutor Voice Bar */}
              <button
                onClick={() => speakGuide()}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-500/25 animate-pulse'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Pause className="w-4 h-4 fill-black" />
                    <span>Tutor Explicando...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span>Escuchar al Tutor</span>
                  </>
                )}
              </button>
            </div>

            {/* Tutor Explanation Card */}
            <div className="p-4 bg-zinc-900/90 border border-emerald-500/30 rounded-2xl flex items-start gap-3 shadow-lg">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <span>Guión del Tutor</span>
                  {isSpeaking && (
                    <span className="flex items-center gap-0.5">
                      <span className="w-1 h-3 bg-amber-400 animate-bounce"></span>
                      <span className="w-1 h-4 bg-amber-400 animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                      <span className="w-1 h-2 bg-amber-400 animate-bounce" style={{ animationDelay: '0.3s' }}></span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed">
                  {guide?.frontal} {guide?.lateral}
                </p>
              </div>
            </div>

            {/* Medical Atlas Anatomical Plate */}
            <AnatomicalPlate 
              ipa={phoneme.ipa} 
              guide={guide} 
              voiced={voiced} 
              svgParamsOverride={phoneme.svg_params}
            />

            {/* Button to proceed to Phase 2 */}
            <div className="flex justify-center pt-4">
              <button
                onClick={goToPhase2}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Ver Palabras de Ejemplo <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              FASE 2: PALABRAS DE PRÁCTICA CON TRANSCRIBCIÓN IPA
             ═══════════════════════════════════════════════════════════════════ */}
          <div ref={wordsSectionRef} className="pt-6 pb-8 space-y-6 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Palabras de Práctica con {phoneme.ipa}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">Haz clic en cualquier palabra para escuchar su pronunciación</p>
              </div>
              <span className="text-xs font-mono text-zinc-500">4 Palabras Clave</span>
            </div>

            {/* Word Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {phoneme.examples.slice(0, 4).map((word) => {
                const lower = word.toLowerCase();
                const ipa = wordIpas[lower] || LOCAL_IPA_FALLBACK[lower] || '';
                const isPlaying = isPlayingSound === word;

                return (
                  <button
                    key={word}
                    onClick={() => handlePlayWord(word)}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer group ${
                      isPlaying
                        ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 scale-[1.02]'
                        : 'bg-zinc-900/80 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-2xl font-black text-white tracking-tight">{word}</div>
                      {ipa ? (
                        <div className="text-sm font-mono text-emerald-400 font-semibold mt-0.5">{ipa}</div>
                      ) : (
                        <div className="text-xs font-mono text-zinc-500 mt-0.5">Audio disponible</div>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isPlaying ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400 group-hover:text-white'
                    }`}>
                      <Volume2 className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drill Sentence Card */}
            {phoneme.drill_sentence && (
              <div className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Frase de Entrenamiento en Contexto
                  </span>
                  <button
                    onClick={() => handlePlayWord(phoneme.drill_sentence)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" /> Escuchar Frase
                  </button>
                </div>
                <p className="text-lg text-white font-serif italic">
                  &ldquo;{phoneme.drill_sentence}&rdquo;
                </p>
              </div>
            )}

            {/* Minimal Pairs if available */}
            {phoneme.contrast_pairs && phoneme.contrast_pairs.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-zinc-200">
                  Pares Mínimos de Contraste ({phoneme.ipa} vs {phoneme.contrast_with || 'hermano'})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {phoneme.contrast_pairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm">
                      <button
                        onClick={() => handlePlayWord(pair[0])}
                        className="flex items-center gap-1.5 font-bold text-emerald-400 hover:underline cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> {pair[0]}
                      </button>
                      <span className="text-zinc-600 font-mono text-xs">vs</span>
                      <button
                        onClick={() => handlePlayWord(pair[1])}
                        className="flex items-center gap-1.5 font-bold text-purple-400 hover:underline cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> {pair[1]}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Button to proceed to Phase 3 (Twin Phoneme) */}
            {twinPhoneme && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={goToPhase3}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-sm shadow-xl shadow-purple-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <ChevronDown className="w-4 h-4" />
                  Ver Fonema Hermano: {twinPhoneme.ipa} ({twinPhoneme.name})
                </button>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              FASE 3: FONEMA HERMANO / GEMELO (YANG)
             ═══════════════════════════════════════════════════════════════════ */}
          {twinPhoneme && (
            <div ref={twinSectionRef} className="pt-8 pb-12 space-y-6 border-t border-purple-500/30">
              <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
                  Contraste Fonético Directo
                </div>
                <h3 className="text-2xl font-bold text-white">
                  Fonema Gemelo: <span className="font-mono text-purple-400">{twinPhoneme.ipa}</span> ({twinPhoneme.name})
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Observa la diferencia articulatoria clave: {twinPhoneme.voicing === 'voiced' ? 'las cuerdas vocales vibran' : 'el sonido se emite sin vibración'}.
                </p>
              </div>

              {/* Twin Mini Hero */}
              <div className="flex justify-center">
                <button
                  onClick={() => handlePlayPhoneme(twinPhoneme.ipa)}
                  className={`w-28 h-28 rounded-3xl flex items-center justify-center border-2 transition-all cursor-pointer shadow-xl ${
                    isPlayingSound === twinPhoneme.ipa
                      ? 'bg-purple-500/30 border-purple-400 shadow-purple-500/40 scale-105'
                      : 'bg-purple-500/10 border-purple-500/30 hover:border-purple-400'
                  }`}
                >
                  <span className="text-5xl font-black font-mono text-purple-400 select-none">
                    {twinPhoneme.ipa}
                  </span>
                </button>
              </div>

              {/* Twin Anatomical Plate */}
              <AnatomicalPlate
                ipa={twinPhoneme.ipa}
                guide={twinPhoneme.mouth_guide_es || twinPhoneme.mouth_guide}
                voiced={twinPhoneme.voicing === 'voiced'}
                svgParamsOverride={twinPhoneme.svg_params}
              />

              {/* Twin Example Words */}
              <div className="space-y-3 pt-2">
                <h4 className="text-sm font-bold text-zinc-300">Palabras Ejemplo de {twinPhoneme.ipa}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {twinPhoneme.examples.slice(0, 4).map((w) => (
                    <button
                      key={w}
                      onClick={() => handlePlayWord(w)}
                      className="p-3 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-purple-500/40 rounded-xl text-left cursor-pointer transition-all flex items-center justify-between"
                    >
                      <span className="text-base font-bold text-white">{w}</span>
                      <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom complete button */}
              <div className="flex justify-center pt-8">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Completar Laboratorio Fonético
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
