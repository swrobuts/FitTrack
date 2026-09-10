"""API-Tests für FitTrack.

Regel im Kurs: Der Test wird ZUERST geschrieben und ist rot.
Dann lassen wir den Code schreiben, bis der Test grün ist.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# US-3: Health-Endpunkt
def test_health():
    antwort = client.get("/health")
    assert antwort.status_code == 200
    assert antwort.json() == {"status": "ok"}
