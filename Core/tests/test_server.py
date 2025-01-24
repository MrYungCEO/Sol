from fastapi.testclient import TestClient
from server import app
import pytest

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_calculate_invalid_percentage():
    response = client.post(
        "/calculate",
        json={"token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "percentage": 101}
    )
    assert response.status_code == 400

def test_calculate_invalid_token():
    response = client.post(
        "/calculate",
        json={"token_address": "invalid_address", "percentage": 50}
    )
    assert response.status_code == 404

def test_calculate_valid_request():
    response = client.post(
        "/calculate",
        json={"token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "percentage": 30}
    )
    assert response.status_code == 200
    data = response.json()
    assert "calculated_amount" in data
    assert "token_balance" in data
    assert "decimals" in data
