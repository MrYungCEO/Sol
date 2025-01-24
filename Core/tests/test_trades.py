import requests
import json
import time

def test_trades():
    print("\n=== Starting Trade Tests ===\n")

    # Test tokens
    tokens = {
        "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    }

    # Test buy and create trade
    print("\nTesting buy and trade creation...")
    response = requests.post(
        "http://localhost:8005/buy",
        json={
            "token_address": tokens["USDC"],
            "amount_in_sol": 0.1,
            "slippage": 0.5
        }
    )
    print(f"\n=== Buy Order ===")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("================")

    if response.status_code == 200:
        trade_id = response.json()["trade_id"]

        # Test get trade
        print("\nTesting get trade...")
        response = requests.get(f"http://localhost:8005/trades/{trade_id}")
        print(f"\n=== Get Trade ===")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print("================")

        # Test update trades
        print("\nTesting update trades...")
        response = requests.post("http://localhost:8005/trades/update")
        print(f"\n=== Update Trades ===")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print("================")

        # Test get active trades
        print("\nTesting get active trades...")
        response = requests.get("http://localhost:8005/trades/active")
        print(f"\n=== Active Trades ===")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print("================")

        # Test close trade
        print("\nTesting close trade...")
        response = requests.post(f"http://localhost:8005/trades/{trade_id}/close")
        print(f"\n=== Close Trade ===")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        print("================")

    # Test get all trades
    print("\nTesting get all trades...")
    response = requests.get("http://localhost:8005/trades")
    print(f"\n=== All Trades ===")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print("================")

    print("\n=== All trade tests completed ===")

if __name__ == "__main__":
    test_trades()
