from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

def extract_keywords(text):
    words = text.lower().split()
    clean = [w.strip(".,!?()[]{}") for w in words]
    return list({w for w in clean if len(w) > 3 and w not in ENGLISH_STOP_WORDS})[:5]

def guess_category(text):
    t = text.lower()

    categories = {
        "technology": ["ai", "software", "code", "tech", "computer"],
        "philosophy": ["meaning", "purpose", "ethics"],
        "personal": ["feel", "emotion", "life", "mood"],
        "work": ["project", "task", "deadline", "job"],
        "creativity": ["idea", "design", "creative"],
        "learning": ["study", "learn", "research"],
        "health": ["exercise", "sleep", "diet", "body"],
        "finance": ["money", "invest", "risk"],
        "relationships": ["friend", "family", "partner"]
    }

    for cat, words in categories.items():
        if any(w in t for w in words):
            return cat

    return "general"

def find_connections(new_text, existing):
    if not existing:
        return []

    corpus = [new_text] + [t.content for t in existing]

    vectorizer = TfidfVectorizer(stop_words="english")
    tfidf_matrix = vectorizer.fit_transform(corpus)

    new_vec = tfidf_matrix[0].toarray()[0]
    existing_vecs = tfidf_matrix[1:].toarray()

    similarities = np.dot(existing_vecs, new_vec)

    connections = []
    for i, sim in enumerate(similarities):
        if sim > 0.05:  # low threshold
            connections.append({
                "target_id": existing[i].id,
                "reason": "TF-IDF keyword similarity",
                "strength": int(sim * 10),
                "is_manual": False
            })

    return connections[:10]
