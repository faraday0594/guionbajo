"""
Guionbajo — Comprehensive English IPA Dictionary & Phonetic Annotator
Provides accurate IPA (International Phonetic Alphabet) transcriptions
for English vocabulary across CEFR levels A1 to B2.4, with rule-based heuristics
for contractions, plurals, verb conjugations, and sentence tokenization.
"""
import re
from typing import Dict, List, Optional, Any

# ─── CORE HIGH-FREQUENCY ENGLISH TO IPA DICTIONARY ───────────────────────────
IPA_LOOKUP: Dict[str, str] = {
    # Pronouns & Determiners
    "i": "/aɪ/",
    "you": "/juː/",
    "he": "/hiː/",
    "she": "/ʃiː/",
    "it": "/ɪt/",
    "we": "/wiː/",
    "they": "/ðeɪ/",
    "me": "/miː/",
    "him": "/hɪm/",
    "her": "/hɜːr/",
    "us": "/ʌs/",
    "them": "/ðɛm/",
    "my": "/maɪ/",
    "your": "/jɔːr/",
    "his": "/hɪz/",
    "its": "/ɪts/",
    "our": "/ˈaʊər/",
    "their": "/ðɛər/",
    "this": "/ðɪs/",
    "that": "/ðæt/",
    "these": "/ðiːz/",
    "those": "/ðoʊz/",
    "the": "/ðə/",
    "a": "/ə/",
    "an": "/æn/",
    "some": "/sʌm/",
    "any": "/ˈɛni/",
    "every": "/ˈɛvri/",
    "all": "/ɔːl/",
    "both": "/boʊθ/",
    "each": "/iːtʃ/",
    "many": "/ˈmɛni/",
    "much": "/mʌtʃ/",
    "few": "/fjuː/",
    "little": "/ˈlɪtəl/",
    "other": "/ˈʌðər/",
    "another": "/əˈnʌðər/",
    "no": "/noʊ/",
    "none": "/nʌn/",
    "one": "/wʌn/",
    "two": "/tuː/",
    "three": "/θriː/",
    "four": "/fɔːr/",
    "five": "/faɪv/",
    "six": "/sɪks/",
    "seven": "/ˈsɛvən/",
    "eight": "/eɪt/",
    "nine": "/naɪn/",
    "ten": "/tɛn/",

    # Common Contractions
    "i'm": "/aɪm/",
    "you're": "/jʊər/",
    "he's": "/hiːz/",
    "she's": "/ʃiːz/",
    "it's": "/ɪts/",
    "we're": "/wɪər/",
    "they're": "/ðɛər/",
    "i've": "/aɪv/",
    "you've": "/juːv/",
    "we've": "/wiːv/",
    "they've": "/ðeɪv/",
    "i'll": "/aɪl/",
    "you'll": "/juːl/",
    "he'll": "/hiːl/",
    "she'll": "/ʃiːl/",
    "we'll": "/wiːl/",
    "they'll": "/ðeɪl/",
    "i'd": "/aɪd/",
    "you'd": "/juːd/",
    "he'd": "/hiːd/",
    "she'd": "/ʃiːd/",
    "we'd": "/wiːd/",
    "they'd": "/ðeɪd/",
    "don't": "/doʊnt/",
    "doesn't": "/ˈdʌzənt/",
    "didn't": "/ˈdɪdənt/",
    "isn't": "/ˈɪzənt/",
    "aren't": "/ɑːrnt/",
    "wasn't": "/ˈwɒzənt/",
    "weren't": "/wɜːrnt/",
    "can't": "/kænt/",
    "couldn't": "/ˈkʊdənt/",
    "won't": "/woʊnt/",
    "wouldn't": "/ˈwʊdənt/",
    "shouldn't": "/ˈʃʊdənt/",
    "haven't": "/ˈhævənt/",
    "hasn't": "/ˈhæzənt/",
    "hadn't": "/ˈhædənt/",
    "let's": "/lɛts/",
    "there's": "/ðɛərz/",
    "what's": "/wɒts/",
    "who's": "/huːz/",
    "where's": "/wɛərz/",
    "how's": "/haʊz/",

    # Auxiliary & Modal Verbs
    "be": "/biː/",
    "am": "/æm/",
    "is": "/ɪz/",
    "are": "/ɑːr/",
    "was": "/wɒz/",
    "were": "/wɜːr/",
    "been": "/biːn/",
    "being": "/ˈbiːɪŋ/",
    "have": "/hæv/",
    "has": "/hæz/",
    "had": "/hæd/",
    "having": "/ˈhævɪŋ/",
    "do": "/duː/",
    "does": "/dʌz/",
    "did": "/dɪd/",
    "doing": "/ˈduːɪŋ/",
    "done": "/dʌn/",
    "can": "/kæn/",
    "could": "/kʊd/",
    "will": "/wɪl/",
    "would": "/wʊd/",
    "shall": "/ʃæl/",
    "should": "/ʃʊd/",
    "may": "/meɪ/",
    "might": "/maɪt/",
    "must": "/mʌst/",

    # Common Verbs (Base, 3rd person, Past, Participle, -ing)
    "go": "/ɡoʊ/", "goes": "/ɡoʊz/", "went": "/wɛnt/", "going": "/ˈɡoʊɪŋ/", "gone": "/ɡɒn/",
    "come": "/kʌm/", "comes": "/kʌmz/", "came": "/keɪm/", "coming": "/ˈkʌmɪŋ/",
    "see": "/siː/", "sees": "/siːz/", "saw": "/sɔː/", "seeing": "/ˈsiːɪŋ/", "seen": "/siːn/",
    "look": "/lʊk/", "looks": "/lʊks/", "looked": "/lʊkt/", "looking": "/ˈlʊkɪŋ/",
    "watch": "/wɒtʃ/", "watches": "/ˈwɒtʃɪz/", "watched": "/wɒtʃt/", "watching": "/ˈwɒtʃɪŋ/",
    "listen": "/ˈlɪsən/", "listens": "/ˈlɪsənz/", "listened": "/ˈlɪsənd/", "listening": "/ˈlɪsənɪŋ/",
    "hear": "/hɪər/", "hears": "/hɪərz/", "heard": "/hɜːrd/", "hearing": "/ˈhɪərɪŋ/",
    "speak": "/spiːk/", "speaks": "/spiːks/", "spoke": "/spoʊk/", "speaking": "/ˈspiːkɪŋ/", "spoken": "/ˈspoʊkən/",
    "talk": "/tɔːk/", "talks": "/tɔːks/", "talked": "/tɔːkt/", "talking": "/ˈtɔːkɪŋ/",
    "say": "/seɪ/", "says": "/sɛz/", "said": "/sɛd/", "saying": "/ˈseɪɪŋ/",
    "tell": "/tɛl/", "tells": "/tɛlz/", "told": "/toʊld/", "telling": "/ˈtɛlɪŋ/",
    "ask": "/æsk/", "asks": "/æsks/", "asked": "/æskt/", "asking": "/ˈæskɪŋ/",
    "answer": "/ˈænsər/", "answers": "/ˈænsərz/", "answered": "/ˈænsərd/", "answering": "/ˈænsərɪŋ/",
    "read": "/riːd/", "reads": "/riːdz/", "reading": "/ˈriːdɪŋ/",
    "write": "/raɪt/", "writes": "/raɪts/", "wrote": "/roʊt/", "writing": "/ˈraɪtɪŋ/", "written": "/ˈrɪtən/",
    "learn": "/lɜːrn/", "learns": "/lɜːrnz/", "learned": "/lɜːrnd/", "learning": "/ˈlɜːrnɪŋ/",
    "study": "/ˈstʌdi/", "studies": "/ˈstʌdiz/", "studied": "/ˈstʌdid/", "studying": "/ˈstʌdiɪŋ/",
    "teach": "/tiːtʃ/", "teaches": "/ˈtiːtʃɪz/", "taught": "/tɔːt/", "teaching": "/ˈtiːtʃɪŋ/",
    "practice": "/ˈpræktɪs/", "practices": "/ˈpræktɪsɪz/", "practiced": "/ˈpræktɪst/", "practicing": "/ˈpræktɪsɪŋ/",
    "work": "/wɜːrk/", "works": "/wɜːrks/", "worked": "/wɜːrkt/", "working": "/ˈwɜːrkɪŋ/",
    "live": "/lɪv/", "lives": "/lɪvz/", "lived": "/lɪvd/", "living": "/ˈlɪvɪŋ/",
    "stay": "/steɪ/", "stays": "/steɪz/", "stayed": "/steɪd/", "staying": "/ˈsteɪɪŋ/",
    "like": "/laɪk/", "likes": "/laɪks/", "liked": "/laɪkt/", "liking": "/ˈlaɪkɪŋ/",
    "love": "/lʌv/", "loves": "/lʌvz/", "loved": "/lʌvd/", "loving": "/ˈlʌvɪŋ/",
    "want": "/wɒnt/", "wants": "/wɒnts/", "wanted": "/ˈwɒntɪd/", "wanting": "/ˈwɒntɪŋ/",
    "need": "/niːd/", "needs": "/niːdz/", "needed": "/ˈniːdɪd/", "needing": "/ˈniːdɪŋ/",
    "play": "/pleɪ/", "plays": "/pleɪz/", "played": "/pleɪd/", "playing": "/ˈpleɪɪŋ/",
    "help": "/hɛlp/", "helps": "/hɛlps/", "helped": "/hɛlpt/", "helping": "/ˈhɛlpɪŋ/",
    "start": "/stɑːrt/", "starts": "/stɑːrts/", "started": "/ˈstɑːrtɪd/", "starting": "/ˈstɑːrtɪŋ/",
    "finish": "/ˈfɪnɪʃ/", "finishes": "/ˈfɪnɪʃɪz/", "finished": "/ˈfɪnɪʃt/", "finishing": "/ˈfɪnɪʃɪŋ/",
    "open": "/ˈoʊpən/", "opens": "/ˈoʊpənz/", "opened": "/ˈoʊpənd/", "opening": "/ˈoʊpənɪŋ/",
    "close": "/kloʊz/", "closes": "/ˈkloʊzɪz/", "closed": "/kloʊzd/", "closing": "/ˈkloʊzɪŋ/",
    "eat": "/iːt/", "eats": "/iːts/", "ate": "/eɪt/", "eating": "/ˈiːtɪŋ/", "eaten": "/ˈiːtən/",
    "drink": "/drɪŋk/", "drinks": "/drɪŋks/", "drank": "/dræŋk/", "drinking": "/ˈdrɪŋkɪŋ/", "drunk": "/drʌŋk/",
    "cook": "/kʊk/", "cooks": "/kʊks/", "cooked": "/kʊkt/", "cooking": "/ˈkʊkɪŋ/",
    "walk": "/wɔːk/", "walks": "/wɔːks/", "walked": "/wɔːkt/", "walking": "/ˈwɔːkɪŋ/",
    "run": "/rʌn/", "runs": "/rʌnz/", "ran": "/ræn/", "running": "/ˈrʌnɪŋ/",
    "drive": "/draɪv/", "drives": "/draɪvz/", "drove": "/droʊv/", "driving": "/ˈdraɪvɪŋ/", "driven": "/ˈdrɪvən/",
    "travel": "/ˈtrævəl/", "travels": "/ˈtrævəlz/", "traveled": "/ˈtrævəld/", "traveling": "/ˈtrævəlɪŋ/",
    "buy": "/baɪ/", "buys": "/baɪz/", "bought": "/bɔːt/", "buying": "/ˈbaɪɪŋ/",
    "sell": "/sɛl/", "sells": "/sɛlz/", "sold": "/soʊld/", "selling": "/ˈsɛlɪŋ/",
    "pay": "/peɪ/", "pays": "/peɪz/", "paid": "/peɪd/", "paying": "/ˈpeɪɪŋ/",
    "cost": "/kɒst/", "costs": "/kɒsts/", "costing": "/ˈkɒstɪŋ/",
    "give": "/ɡɪv/", "gives": "/ɡɪvz/", "gave": "/ɡeɪv/", "giving": "/ˈɡɪvɪŋ/", "given": "/ˈɡɪvən/",
    "take": "/teɪk/", "takes": "/teɪks/", "took": "/tʊk/", "taking": "/ˈteɪkɪŋ/", "taken": "/ˈteɪkən/",
    "get": "/ɡɛt/", "gets": "/ɡɛts/", "got": "/ɡɒt/", "getting": "/ˈɡɛtɪŋ/", "gotten": "/ˈɡɒtən/",
    "make": "/meɪk/", "makes": "/meɪks/", "made": "/meɪd/", "making": "/ˈmeɪkɪŋ/",
    "find": "/faɪnd/", "finds": "/faɪndz/", "found": "/faʊnd/", "finding": "/ˈfaɪndɪŋ/",
    "know": "/noʊ/", "knows": "/noʊz/", "knew": "/nuː/", "knowing": "/ˈnoʊɪŋ/", "known": "/noʊn/",
    "think": "/θɪŋk/", "thinks": "/θɪŋks/", "thought": "/θɔːt/", "thinking": "/ˈθɪŋkɪŋ/",
    "feel": "/fiːl/", "feels": "/fiːlz/", "felt": "/fɛlt/", "feeling": "/ˈfiːlɪŋ/",
    "wake": "/weɪk/", "wakes": "/weɪks/", "woke": "/woʊk/", "waking": "/ˈweɪkɪŋ/", "woken": "/ˈwoʊkən/",
    "sleep": "/sliːp/", "sleeps": "/sliːps/", "slept": "/slɛpt/", "sleeping": "/ˈsliːpɪŋ/",
    "sit": "/sɪt/", "sits": "/sɪts/", "sat": "/sæt/", "sitting": "/ˈsɪtɪŋ/",
    "stand": "/stænd/", "stands": "/stændz/", "stood": "/stʊd/", "standing": "/ˈstændɪŋ/",
    "meet": "/miːt/", "meets": "/miːts/", "met": "/mɛt/", "meeting": "/ˈmiːtɪŋ/",
    "visit": "/ˈvɪzɪt/", "visits": "/ˈvɪzɪts/", "visited": "/ˈvɪzɪtɪd/", "visiting": "/ˈvɪzɪtɪŋ/",
    "call": "/kɔːl/", "calls": "/kɔːlz/", "called": "/kɔːld/", "calling": "/ˈkɔːlɪŋ/",
    "order": "/ˈɔːrdər/", "orders": "/ˈɔːrdərz/", "ordered": "/ˈɔːrdərd/", "ordering": "/ˈɔːrdərɪŋ/",
    "enjoy": "/ɪnˈdʒɔɪ/", "enjoys": "/ɪnˈdʒɔɪz/", "enjoyed": "/ɪnˈdʒɔɪd/", "enjoying": "/ɪnˈdʒɔɪɪŋ/",
    "arrive": "/əˈraɪv/", "arrives": "/əˈraɪvz/", "arrived": "/əˈraɪvd/", "arriving": "/əˈraɪvɪŋ/",
    "leave": "/liːv/", "leaves": "/liːvz/", "left": "/lɛft/", "leaving": "/ˈliːvɪŋ/",
    "wear": "/wɛər/", "wears": "/wɛərz/", "wore": "/wɔːr/", "wearing": "/ˈwɛərɪŋ/", "worn": "/wɔːrn/",
    "clean": "/kliːn/", "cleans": "/kliːnz/", "cleaned": "/kliːnd/", "cleaning": "/ˈkliːnɪŋ/",
    "wash": "/wɒʃ/", "washes": "/ˈwɒʃɪz/", "washed": "/wɒʃt/", "washing": "/ˈwɒʃɪŋ/",
    "try": "/traɪ/", "tries": "/traɪz/", "tried": "/traɪd/", "trying": "/ˈtraɪɪŋ/",
    "show": "/ʃoʊ/", "shows": "/ʃoʊz/", "showed": "/ʃoʊd/", "showing": "/ˈʃoʊɪŋ/", "shown": "/ʃoʊn/",
    "use": "/juːz/", "uses": "/ˈjuːzɪz/", "used": "/juːzd/", "using": "/ˈjuːzɪŋ/",
    "prepare": "/prɪˈpɛər/", "prepares": "/prɪˈpɛərz/", "prepared": "/prɪˈpɛərd/", "preparing": "/prɪˈpɛərɪŋ/",
    "choose": "/tʃuːz/", "chooses": "/ˈtʃuːzɪz/", "chose": "/tʃoʊz/", "choosing": "/ˈtʃuːzɪŋ/", "chosen": "/ˈtʃoʊzən/",
    "invite": "/ɪnˈvaɪt/", "invites": "/ɪnˈvaɪts/", "invited": "/ɪnˈvaɪtɪd/", "inviting": "/ɪnˈvaɪtɪŋ/",
    "smile": "/smaɪl/", "smiles": "/smaɪlz/", "smiled": "/smaɪld/", "smiling": "/ˈsmaɪlɪŋ/",
    "laugh": "/læf/", "laughs": "/læfs/", "laughed": "/læft/", "laughing": "/ˈlæfɪŋ/",
    "share": "/ʃɛər/", "shares": "/ʃɛərz/", "shared": "/ʃɛərd/", "sharing": "/ˈʃɛərɪŋ/",
    "bring": "/brɪŋ/", "brings": "/brɪŋz/", "brought": "/brɔːt/", "bringing": "/ˈbrɪŋɪŋ/",
    "send": "/sɛnd/", "sends": "/sɛndz/", "sent": "/sɛnt/", "sending": "/ˈsɛndɪŋ/",
    "receive": "/rɪˈsiːv/", "receives": "/rɪˈsiːvz/", "received": "/rɪˈsiːvd/", "receiving": "/rɪˈsiːvɪŋ/",
    "understand": "/ˌʌndərˈstænd/", "understands": "/ˌʌndərˈstændz/", "understood": "/ˌʌndərˈstʊd/",

    # Nouns: Everyday Objects, People, Places, Food, Time
    "name": "/neɪm/", "names": "/neɪmz/",
    "teacher": "/ˈtiːtʃər/", "teachers": "/ˈtiːtʃərz/",
    "student": "/ˈstjuːdənt/", "students": "/ˈstjuːdənts/",
    "friend": "/frɛnd/", "friends": "/frɛndz/",
    "family": "/ˈfæmɪli/", "families": "/ˈfæmɪliz/",
    "mother": "/ˈmʌðər/", "father": "/ˈfɑːðər/", "brother": "/ˈbrʌðər/", "sister": "/ˈsɪstər/",
    "parents": "/ˈpɛərənts/", "children": "/ˈtʃɪldrən/", "child": "/tʃaɪld/",
    "son": "/sʌn/", "daughter": "/ˈdɔːtər/", "baby": "/ˈbeɪbi/",
    "man": "/mæn/", "men": "/mɛn/", "woman": "/ˈwʊmən/", "women": "/ˈwɪmɪn/",
    "person": "/ˈpɜːrsən/", "people": "/ˈpiːpəl/",
    "house": "/haʊs/", "houses": "/ˈhaʊzɪz/",
    "home": "/hoʊm/", "room": "/ruːm/", "rooms": "/ruːmz/",
    "bedroom": "/ˈbɛdruːm/", "kitchen": "/ˈkɪtʃɪn/", "bathroom": "/ˈbæθruːm/", "living": "/ˈlɪvɪŋ/",
    "school": "/skuːl/", "university": "/ˌjuːnɪˈvɜːrsɪti/", "class": "/klæs/", "classes": "/ˈklæsɪz/",
    "lesson": "/ˈlɛsən/", "lessons": "/ˈlɛsənz/",
    "book": "/bʊk/", "books": "/bʊks/", "notebook": "/ˈnoʊtbʊk/", "pen": "/pɛn/", "pencil": "/ˈpɛnsəl/",
    "table": "/ˈteɪbəl/", "chair": "/tʃɛər/", "desk": "/dɛsk/", "bed": "/bɛd/", "door": "/dɔːr/", "window": "/ˈwɪndoʊ/",
    "city": "/ˈsɪti/", "cities": "/ˈsɪtiz/", "town": "/taʊn/", "country": "/ˈkʌntri/", "street": "/striːt/",
    "park": "/pɑːrk/", "parks": "/pɑːrks/", "restaurant": "/ˈrɛstərənt/", "café": "/kæˈfeɪ/", "cafe": "/kæˈfeɪ/",
    "store": "/stɔːr/", "shop": "/ʃɒp/", "supermarket": "/ˈsuːpərmɑːrkɪt/", "hospital": "/ˈhɒspɪtəl/",
    "office": "/ˈɒfɪs/", "bank": "/bæŋk/", "hotel": "/hoʊˈtɛl/", "airport": "/ˈɛərpɔːrt/", "station": "/ˈsteɪʃən/",
    "morning": "/ˈmɔːrnɪŋ/", "afternoon": "/ˌæftərˈnuːn/", "evening": "/ˈiːvnɪŋ/", "night": "/naɪt/",
    "day": "/deɪ/", "days": "/deɪz/", "week": "/wiːk/", "weeks": "/wiːks/",
    "weekend": "/ˈwiːkɛnd/", "month": "/mʌnθ/", "months": "/mʌnθs/", "year": "/jɪər/", "years": "/jɪərz/",
    "today": "/təˈdeɪ/", "yesterday": "/ˈjɛstərdeɪ/", "tomorrow": "/təˈmɒroʊ/",
    "time": "/taɪm/", "hour": "/ˈaʊər/", "minute": "/ˈmɪnɪt/", "second": "/ˈsɛkənd/",
    "breakfast": "/ˈbrɛkfəst/", "lunch": "/lʌntʃ/", "dinner": "/ˈdɪnər/",
    "food": "/fuːd/", "meal": "/miːl/", "water": "/ˈwɔːtər/", "coffee": "/ˈkɒfi/", "tea": "/tiː/", "milk": "/mɪlk/",
    "bread": "/brɛd/", "cheese": "/tʃiːz/", "fruit": "/fruːt/", "apple": "/ˈæpəl/", "banana": "/bəˈnænə/",
    "sandwich": "/ˈsænwɪtʃ/", "pizza": "/ˈpiːtsə/", "pasta": "/ˈpɑːstə/", "salad": "/ˈsæləd/", "soup": "/suːp/",
    "car": "/kɑːr/", "bus": "/bʌs/", "train": "/treɪn/", "bicycle": "/ˈbaɪsɪkəl/", "bike": "/baɪk/", "plane": "/pleɪn/",
    "dog": "/dɔːɡ/", "dogs": "/dɔːɡz/", "cat": "/kæt/", "cats": "/kæts/", "pet": "/pɛt/", "pets": "/pɛts/",
    "music": "/ˈmjuːzɪk/", "song": "/sɔːŋ/", "movie": "/ˈmuːvi/", "film": "/fɪlm/", "game": "/ɡeɪm/", "games": "/ɡeɪmz/",
    "story": "/ˈstɔːri/", "stories": "/ˈstɔːriz/", "word": "/wɜːrd/", "words": "/wɜːrdz/", "sentence": "/ˈsɛntəns/",
    "question": "/ˈkwɛstʃən/", "questions": "/ˈkwɛstʃənz/", "idea": "/aɪˈdiːə/", "problem": "/ˈprɒbləm/",
    "weather": "/ˈwɛðər/", "sun": "/sʌn/", "rain": "/reɪn/", "snow": "/snoʊ/", "wind": "/wɪnd/",
    "phone": "/foʊn/", "computer": "/kəmˈpjuːtər/", "laptop": "/ˈlæptɒp/", "message": "/ˈmɛsɪdʒ/", "email": "/ˈiːmeɪl/",
    "money": "/ˈmʌni/", "dollar": "/ˈdɒlər/", "price": "/praɪs/", "ticket": "/ˈtɪkɪt/",
    "job": "/dʒɒb/", "work": "/wɜːrk/", "doctor": "/ˈdɒktər/", "nurse": "/nɜːrs/", "engineer": "/ˌɛndʒɪˈnɪər/",

    # Adjectives
    "good": "/ɡʊd/", "better": "/ˈbɛtər/", "best": "/bɛst/",
    "bad": "/bæd/", "worse": "/wɜːrs/", "worst": "/wɜːrst/",
    "great": "/ɡreɪt/", "nice": "/naɪs/", "fine": "/faɪn/", "wonderful": "/ˈwʌndərfʊl/", "excellent": "/ˈɛksələnt/",
    "happy": "/ˈhæpi/", "sad": "/sæd/", "tired": "/ˈtaɪərd/", "excited": "/ɪkˈsaɪtɪd/", "nervous": "/ˈnɜːrvəs/",
    "big": "/bɪɡ/", "bigger": "/ˈbɪɡər/", "biggest": "/ˈbɪɡɪst/", "large": "/lɑːrdʒ/",
    "small": "/smɔːl/", "smaller": "/ˈsmɔːlər/", "smallest": "/ˈsmɔːlɪst/", "little": "/ˈlɪtəl/",
    "hot": "/hɒt/", "cold": "/koʊld/", "warm": "/wɔːrm/", "cool": "/kuːl/",
    "new": "/njuː/", "old": "/oʊld/", "young": "/jʌŋ/",
    "fast": "/fæst/", "faster": "/ˈfæstər/", "fastest": "/ˈfæstɪst/", "quick": "/kwɪk/", "slow": "/sloʊ/",
    "easy": "/ˈiːzi/", "easier": "/ˈiːziər/", "easiest": "/ˈiːziɪst/",
    "hard": "/hɑːrd/", "difficult": "/ˈdɪfɪkəlt/",
    "clean": "/kliːn/", "dirty": "/ˈdɜːrti/", "tidy": "/ˈtaɪdi/",
    "quiet": "/ˈkwaɪət/", "loud": "/laʊd/", "noisy": "/ˈnɔɪzi/",
    "busy": "/ˈbɪzi/", "free": "/friː/", "ready": "/ˈrɛdi/",
    "beautiful": "/ˈbjuːtɪfʊl/", "pretty": "/ˈprɪti/", "handsome": "/ˈhænsəm/",
    "important": "/ɪmˈpɔːrtənt/", "interesting": "/ˈɪntrəstɪŋ/", "favorite": "/ˈfeɪvərɪt/",
    "delicious": "/dɪˈlɪʃəs/", "sweet": "/swiːt/", "fresh": "/frɛʃ/",
    "sunny": "/ˈsʌni/", "rainy": "/ˈreɪni/", "cloudy": "/ˈklaʊdi/", "windy": "/ˈwɪndi/",
    "first": "/fɜːrst/", "last": "/læst/", "next": "/nɛkst/", "early": "/ˈɜːrli/", "late": "/leɪt/",

    # Adverbs & Connectors
    "always": "/ˈɔːlweɪz/", "usually": "/ˈjuːʒuəli/", "often": "/ˈɒfən/",
    "sometimes": "/ˈsʌmtaɪmz/", "rarely": "/ˈrɛərli/", "never": "/ˈnɛvər/",
    "very": "/ˈvɛri/", "really": "/ˈrɪəli/", "quite": "/kwaɪt/", "too": "/tuː/", "so": "/soʊ/",
    "now": "/naʊ/", "then": "/ðɛn/", "already": "/ɔːlˈrɛdi/", "yet": "/jɛt/", "still": "/stɪl/", "soon": "/suːn/",
    "here": "/hɪər/", "there": "/ðɛər/", "everywhere": "/ˈɛvriwɛər/",
    "well": "/wɛl/", "together": "/təˈɡɛðər/", "alone": "/əˈloʊn/",
    "and": "/ænd/", "but": "/bʌt/", "or": "/ɔːr/", "because": "/bɪˈkɒz/",
    "if": "/ɪf/", "when": "/wɛn/", "while": "/waɪl/", "after": "/ˈæftər/", "before": "/bɪˈfɔːr/",
    "although": "/ɔːlˈðoʊ/", "though": "/ðoʊ/", "since": "/sɪns/", "until": "/ənˈtɪl/",

    # Prepositions & Greetings
    "in": "/ɪn/", "on": "/ɒn/", "at": "/æt/", "to": "/tuː/", "for": "/fɔːr/",
    "with": "/wɪð/", "without": "/wɪˈðaʊt/", "by": "/baɪ/", "from": "/frʌm/",
    "of": "/ɒv/", "about": "/əˈbaʊt/", "into": "/ˈɪntuː/", "through": "/θruː/",
    "under": "/ˈʌndər/", "over": "/ˈoʊvər/", "between": "/bɪˈtwiːn/", "behind": "/bɪˈhaɪnd/",
    "hello": "/həˈloʊ/", "hi": "/haɪ/", "hey": "/heɪ/",
    "goodbye": "/ˌɡʊdˈbaɪ/", "bye": "/baɪ/",
    "please": "/pliːz/", "thanks": "/θæŋks/", "thank": "/θæŋk/",
    "welcome": "/ˈwɛlkəm/", "sorry": "/ˈsɒri/", "excuse": "/ɪkˈskjuːz/",
    "yes": "/jɛs/", "yeah": "/jɛə/",
}


def clean_token(token: str) -> str:
    """Removes outer punctuation while preserving internal apostrophes."""
    if not token or not isinstance(token, str):
        return ""
    cleaned = re.sub(r'^[^\w\']+|[^\w\']+$', '', token.strip())
    return cleaned.strip()


def heuristic_ipa_generator(clean_w: str) -> str:
    """
    Algorithmic phonetic fallback for words not directly in the lookup dictionary.
    Handles regular plurals, past tense suffixes, gerunds, and standard spelling patterns.
    """
    if not clean_w:
        return "/.../"
    w = clean_w.lower()

    # 1. Possessive -'s
    if w.endswith("'s"):
        base = w[:-2]
        if base in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[base].strip("/")
            ending = "ɪz" if base_ipa.endswith(("s", "z", "ʃ", "tʃ", "dʒ")) else "s" if base_ipa.endswith(("p", "t", "k", "f", "θ")) else "z"
            return f"/{base_ipa}{ending}/"

    # 2. Regular plurals / 3rd person -s/-es
    if w.endswith("es") and len(w) > 4:
        stem = w[:-2]
        if stem in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem].strip("/")
            return f"/{base_ipa}ɪz/"
    elif w.endswith("s") and len(w) > 3 and not w.endswith("ss"):
        stem = w[:-1]
        if stem in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem].strip("/")
            ending = "s" if base_ipa.endswith(("p", "t", "k", "f", "θ")) else "z"
            return f"/{base_ipa}{ending}/"

    # 3. Regular past tense -ed
    if w.endswith("ed") and len(w) > 4:
        stem = w[:-2]
        if stem in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem].strip("/")
            ending = "ɪd" if base_ipa.endswith(("t", "d")) else "t" if base_ipa.endswith(("p", "k", "f", "s", "ʃ", "tʃ")) else "d"
            return f"/{base_ipa}{ending}/"
        stem_e = w[:-1]
        if stem_e in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem_e].strip("/")
            ending = "ɪd" if base_ipa.endswith(("t", "d")) else "t" if base_ipa.endswith(("p", "k", "f", "s", "ʃ", "tʃ")) else "d"
            return f"/{base_ipa}{ending}/"

    # 4. Gerund -ing
    if w.endswith("ing") and len(w) > 5:
        stem = w[:-3]
        if stem in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem].strip("/")
            return f"/{base_ipa}ɪŋ/"
        stem_e = stem + "e"
        if stem_e in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem_e].strip("/")
            return f"/{base_ipa}ɪŋ/"

    # 5. Adverb -ly
    if w.endswith("ly") and len(w) > 4:
        stem = w[:-2]
        if stem in IPA_LOOKUP:
            base_ipa = IPA_LOOKUP[stem].strip("/")
            return f"/{base_ipa}li/"

    # 6. Common proper names
    names_ipa = {
        "emma": "/ˈɛmə/",
        "leo": "/ˈliːoʊ/",
        "alex": "/ˈælɪks/",
        "sarah": "/ˈsɛərə/",
        "david": "/ˈdeɪvɪd/",
        "lucas": "/ˈluːkəs/",
        "maria": "/məˈriːə/",
        "carlos": "/ˈkɑːrloʊs/",
        "john": "/dʒɒn/",
        "anna": "/ˈænə/",
        "tom": "/tɒm/",
        "max": "/mæks/",
        "london": "/ˈlʌndən/",
        "new": "/njuː/",
        "york": "/jɔːrk/",
        "central": "/ˈsɛntrəl/",
        "park": "/pɑːrk/",
        "california": "/ˌkælɪˈfɔːrnjə/",
        "spain": "/speɪn/",
        "mexico": "/ˈmɛksɪkoʊ/",
    }
    if w in names_ipa:
        return names_ipa[w]

    approx = w
    approx = approx.replace("th", "θ").replace("sh", "ʃ").replace("ch", "tʃ")
    approx = approx.replace("ph", "f").replace("ck", "k").replace("ee", "iː")
    approx = approx.replace("oo", "uː").replace("ea", "iː").replace("ai", "eɪ")
    approx = approx.replace("ay", "eɪ").replace("ou", "aʊ").replace("ow", "oʊ")
    return f"/{approx}/"


def get_word_ipa(word: str) -> str:
    """Returns the IPA phonetic transcription for a single English word."""
    if not word:
        return ""
    clean = clean_token(word).lower()
    if not clean:
        return ""
    if clean in IPA_LOOKUP:
        return IPA_LOOKUP[clean]
    return heuristic_ipa_generator(clean)


def annotate_sentence_words(sentence: str, target_keywords: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    """
    Splits a sentence into word tokens, annotating each token with its raw string,
    clean word, exact IPA transcription, and whether it represents target vocabulary.
    """
    if not sentence or not isinstance(sentence, str):
        return []

    targets = {clean_token(t).lower() for t in (target_keywords or []) if clean_token(t)}
    tokens = sentence.strip().split()
    annotated: List[Dict[str, Any]] = []

    for raw_token in tokens:
        clean = clean_token(raw_token)
        if not clean:
            continue
        ipa = get_word_ipa(clean)
        is_target = clean.lower() in targets or any(t in clean.lower() for t in targets if len(t) > 3)
        annotated.append({
            "word": raw_token,
            "clean_word": clean,
            "ipa": ipa,
            "is_target": is_target,
        })

    return annotated
