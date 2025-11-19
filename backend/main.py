from fastapi import FastAPI, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import init_db, get_session
from models import Thought
from analysis import extract_keywords, guess_category, find_connections

app = FastAPI(title="ThoughtWeaver Local API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.on_event("startup")
def startup():
    init_db()


def thought_to_dict(t: Thought):
    data = {
        "id": t.id,
        "content": t.content,
        "category": t.category,
        "strength": t.strength,
        "x": t.x,
        "y": t.y,
        "created_date": t.created_date,
        "keywords": t.keywords,
        "connections": t.connections,
    }
    return data


@app.get("/thoughts")
def list_thoughts(session: Session = Depends(get_session)):
    thoughts = session.exec(select(Thought).order_by(Thought.created_date.desc())).all()
    return [thought_to_dict(t) for t in thoughts]


@app.post("/thoughts")
def create_thought(
    payload: dict = Body(...),
    session: Session = Depends(get_session)
):
    t = Thought(
        content=payload["content"],
        category=payload.get("category", "general"),
        strength=payload.get("strength", 1),
        x=payload.get("x", 0),
        y=payload.get("y", 0),
    )
    t.keywords = payload.get("keywords", [])
    t.connections = payload.get("connections", [])

    session.add(t)
    session.commit()
    session.refresh(t)
    return thought_to_dict(t)


@app.patch("/thoughts/{id}")
def update_thought(id: str, updates: dict = Body(...), session: Session = Depends(get_session)):
    t = session.get(Thought, id)
    if not t:
        return {"error": "Not found"}

    # handle special list fields
    if "keywords" in updates:
        t.keywords = updates["keywords"]
        updates.pop("keywords")

    if "connections" in updates:
        t.connections = updates["connections"]
        updates.pop("connections")

    for key, value in updates.items():
        setattr(t, key, value)

    session.add(t)
    session.commit()
    session.refresh(t)
    return thought_to_dict(t)


@app.post("/analyze")
def analyze_thought(payload: dict = Body(...), session: Session = Depends(get_session)):
    content = payload["content"]
    existing = session.exec(select(Thought)).all()

    return {
        "keywords": extract_keywords(content),
        "category": guess_category(content),
        "connections": find_connections(content, existing),
    }
