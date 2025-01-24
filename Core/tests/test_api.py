import requests
import json

BASE_URL = "http://127.0.0.1:8005"

def test_calculate():
    # Test USDC calculation
    print("\nTesting USDC calculation...")
    data = {
        "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "percentage": 1
    }
    response = requests.post(f"{BASE_URL}/calculate", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    # Test SOL calculation
    print("\nTesting SOL calculation...")
    data = {
        "token_address": "So11111111111111111111111111111111111111112",
        "percentage": 1
    }
    response = requests.post(f"{BASE_URL}/calculate", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    # Test BONK calculation
    print("\nTesting BONK calculation...")
    data = {
        "token_address": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "percentage": 1
    }
    response = requests.post(f"{BASE_URL}/calculate", json=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

if __name__ == "__main__":
    test_calculate()
