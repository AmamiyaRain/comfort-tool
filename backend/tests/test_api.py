from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_psychrometric_chart_endpoint() -> None:
    response = client.post("/api/ashrae55/psychrometric-chart", json={})
    body = response.json()
    assert response.status_code == 200
    assert "traces" in body
    assert "layout" in body
