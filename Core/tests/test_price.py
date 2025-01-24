import requests
import json

def test_get_price():
    print("\n=== Starting Price Tests ===\n")

    # Test tokens
    tokens = {
        "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    }

    for token_name, token_address in tokens.items():
        print(f"\nTesting price for {token_name}...")
        
        response = requests.get(f"http://localhost:8005/get_price/{token_address}")
        print(f"\n=== Get Price for {token_name} ===")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print("================")

    print("\n=== All price tests completed ===")

if __name__ == "__main__":
    test_get_price()
