from get_sell_percentage import analyze_token_transfer
import asyncio

def test_analyze_transfers():
    """Test analyzing different token transfers"""
    
    # Test cases - each tuple contains (tx_signature, wallet, token_mint, expected_result)
    test_cases = [
        # Test case 1: Recent PUMP token sell
        (
            "iBEccoaVDXsdRBZ5hNjixhRZVmd5sGJCEpEQB8FUxz4horXykmhcfCoryAjuerhB4V7bRYnXqrYFdDXeeNACP8q",
            "HAEcViATgps9PbxruNhVN17o6Cic3V3kKzDuwrRaMEvj",
            "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
            50  # Expected 100% sell
        ), ]
        
     
    
    # Run tests
    for tx_sig, wallet, token, expected in test_cases:
        print(f"\nAnalyzing transaction: {tx_sig}")
        print(f"Token: {token}")
        
        result = analyze_token_transfer(tx_sig, wallet, token)
        
        if result >= 0:
            print(f"Result: {result:.2f}% tokens sold")
            if abs(result - expected) < 0.1:  # Allow 0.1% difference
                print("PASS - Test passed")
            else:
                print(f"FAIL - Expected {expected}%, got {result:.2f}%")
        else:
            print("FAIL - Error analyzing transaction")

if __name__ == "__main__":
    test_analyze_transfers()
