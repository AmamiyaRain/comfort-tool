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


def test_relative_humidity_chart_endpoint() -> None:
    response = client.post("/api/ashrae55/relative-humidity-chart", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["layout"]["title"] == "Relative humidity chart"
    assert body["layout"]["xaxis"]["title"] == "Dry bulb temperature (C)"
    assert body["layout"]["yaxis"]["title"] == "Relative humidity (%)"


def test_utci_endpoint() -> None:
    response = client.post("/api/utci", json={})
    body = response.json()
    assert response.status_code == 200
    assert "utci" in body
    assert "stress_category" in body
