from sqlmodel import SQLModel, Field
from typing import Optional
import uuid
import json
from datetime import datetime


def json_default():
    return "[]"


class Thought(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    content: str

    # Store lists as JSON strings
    keywords_json: str = Field(default_factory=lambda: "[]")
    connections_json: str = Field(default_factory=lambda: "[]")

    category: str = "general"
    strength: int = 1

    x: float = 0
    y: float = 0

    created_date: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

    # ---------- Python properties (auto-convert JSON <-> Python list) ----------

    @property
    def keywords(self):
        return json.loads(self.keywords_json)

    @keywords.setter
    def keywords(self, value):
        self.keywords_json = json.dumps(value)

    @property
    def connections(self):
        return json.loads(self.connections_json)

    @connections.setter
    def connections(self, value):
        self.connections_json = json.dumps(value)
