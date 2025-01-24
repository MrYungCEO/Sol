# Solana Network Configuration
SOLANA_MAINNET_RPC = "https://api.mainnet-beta.solana.com"
RPC_URL = "https://api.mainnet-beta.solana.com"
SOLANA_DEVNET_RPC = "https://api.devnet.solana.com"

# Jupiter DEX Configuration
JUPITER_API_BASE = "https://quote-api.jup.ag/v6"
JUPITER_QUOTE_ENDPOINT = f"{JUPITER_API_BASE}/quote"
JUPITER_SWAP_ENDPOINT = f"{JUPITER_API_BASE}/swap"

# Token Constants
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"
TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"  # This is the official Solana Token Program ID
PUMP_TOKEN_MINT = "nosXBVoaCTtYdLvKY6Csb4AC8JCdQKKAaWYtx2ZMoo7"  # Your pump token mint address

# Transaction Settings
DEFAULT_SLIPPAGE_BPS = 50  # 0.5% slippage

# Error Messages
ERROR_NO_TOKENS = "No tokens found in the wallet"
ERROR_INVALID_WALLET = "Invalid wallet address"
ERROR_QUOTE_FAILED = "Failed to get quote from Jupiter"
ERROR_SWAP_FAILED = "Failed to create swap transaction"
ERROR_TOKEN_ACCOUNTS = "Error getting token accounts"
ERROR_TRANSACTION = "Error processing transaction"
