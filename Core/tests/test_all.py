import requests
import json
from typing import Dict, Any
import time

BASE_URL = "http://127.0.0.1:8005"
RATE_LIMIT_DELAY = 2  # Increased delay between calls

def print_response(name: str, response: requests.Response):
    print(f"\n=== {name} ===")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response: {response.text}")
    print("=" * (len(name) + 8))

def test_health():
    """Test health check endpoint"""
    print("\nTesting health check...")
    response = requests.get(f"{BASE_URL}/health")
    print_response("Health Check", response)
    time.sleep(RATE_LIMIT_DELAY)

def test_token_operations():
    """Test token calculation endpoints"""
    tokens = {
        "USDC": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "SOL": "So11111111111111111111111111111111111111112",
        "BONK": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
    }

    print("\nTesting token calculations...")
    for name, address in tokens.items():
        print(f"\nTesting {name}...")
        data = {
            "token_address": address,
            "percentage": 1
        }
        response = requests.post(f"{BASE_URL}/calculate", json=data)
        print_response(f"{name} Calculation", response)
        time.sleep(RATE_LIMIT_DELAY)

def test_jupiter_quote():
    """Test Jupiter quote endpoint"""
    print("\nTesting Jupiter quote...")
    quote_data = {
        "input_token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        "output_token": "So11111111111111111111111111111111111111112",  # SOL
        "amount": "1000000",  # 1 USDC
        "slippage": 0.5
    }
    response = requests.post(f"{BASE_URL}/jupiter/quote", json=quote_data)
    print_response("Jupiter Quote", response)
    time.sleep(RATE_LIMIT_DELAY)
    return response.ok

def test_jupiter_swap():
    """Test Jupiter swap endpoint"""
    print("\nTesting Jupiter swap...")
    swap_data = {
        "input_token": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  # USDC
        "output_token": "So11111111111111111111111111111111111111112",  # SOL
        "amount": "1000000",  # 1 USDC
        "slippage": 0.5
    }
    response = requests.post(f"{BASE_URL}/jupiter/swap", json=swap_data)
    print_response("Jupiter Swap", response)
    time.sleep(RATE_LIMIT_DELAY)

def test_sell_operations():
    """Test sell endpoints"""
    print("\nTesting sell operations...")
    
    # Test sell all
    print("\nTesting sell all...")
    sell_all_data = {
        "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "slippage": 0.5
    }
    response = requests.post(f"{BASE_URL}/sell/all", json=sell_all_data)
    print_response("Sell All", response)
    time.sleep(RATE_LIMIT_DELAY)

    # Test sell max
    print("\nTesting sell max...")
    sell_max_data = {
        "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "slippage": 0.5
    }
    response = requests.post(f"{BASE_URL}/sell/max", json=sell_max_data)
    print_response("Sell Max", response)
    time.sleep(RATE_LIMIT_DELAY)

    # Test sell percentage
    print("\nTesting sell percentage...")
    sell_percentage_data = {
        "token_address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "percentage": 50,
        "slippage": 0.5
    }
    response = requests.post(f"{BASE_URL}/sell/percentage", json=sell_percentage_data)
    print_response("Sell Percentage", response)
    time.sleep(RATE_LIMIT_DELAY)

def test_wallet_operations():
    """Test wallet tracking endpoints"""
    print("\nTesting wallet operations...")
    
    # Test wallet balances
    print("\nTesting wallet balances...")
    response = requests.get(f"{BASE_URL}/wallet/balances")
    print_response("Wallet Balances", response)
    time.sleep(RATE_LIMIT_DELAY)

    # Test wallet transactions
    print("\nTesting wallet transactions...")
    response = requests.get(f"{BASE_URL}/wallet/transactions?limit=5")
    print_response("Wallet Transactions", response)
    time.sleep(RATE_LIMIT_DELAY)

def main():
    """Run all tests"""
    print("\n=== Starting API Tests ===\n")
    
    try:
        test_health()
        test_token_operations()
        
        # Only test swap if quote succeeds
        if test_jupiter_quote():
            test_jupiter_swap()
        else:
            print("\nSkipping swap test due to quote failure")
        
        test_sell_operations()
        test_wallet_operations()
        
        print("\n=== All tests completed ===")
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to server. Make sure server is running on http://127.0.0.1:8005")
    except Exception as e:
        print(f"\nERROR: Test failed - {str(e)}")

if __name__ == "__main__":
    main()
