import requests
import json
import time
from typing import Dict, Any

BASE_URL = "http://127.0.0.1:8005"

def print_response(name: str, response: requests.Response):
    print(f"\n=== {name} ===")
    print(f"Status: {response.status_code}")
    try:
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        if result.get('success') and result.get('transaction_url'):
            print(f"\nTransaction URL: {result['transaction_url']}")
    except:
        print(f"Response: {response.text}")
    print("=" * (len(name) + 8))

def test_buy():
    print("\n=== Starting Buy Tests ===\n")

    # Test tokens
    tokens = {
        "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    }

    # Test amounts (in SOL)
    amounts = [0.001]

    for token_name, token_address in tokens.items():
        for amount in amounts:
            print(f"\nTesting buy {amount} SOL worth of {token_name}...")
            
            response = requests.post(
                "http://localhost:8005/buy",
                json={
                    "token_address": token_address,
                    "amount_in_sol": amount,
                    "slippage": 0.5
                }
            )
            
            print(f"\n=== Buy {token_name} ===")
            print(f"Status: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('transaction'):
                    print(f"\nTransaction: {result['transaction']}")
                    print("Buy test successful!")
                else:
                    print("Error: No transaction in response")
            else:
                print(f"Error: Request failed with status {response.status_code}")
            
            # Wait between tests
            time.sleep(2)

    print("\n=== Buy Tests Complete ===\n")

if __name__ == "__main__":
    test_buy()
