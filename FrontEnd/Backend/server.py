from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import logging
import os
import json
from datetime import datetime
import time
import asyncio
import threading
import traceback
from dotenv import load_dotenv
from wallet_tracking import track_wallet
from pydantic import BaseModel, Field
from decimal import Decimal
import httpx
from jupiter import Jupiter
from base58 import b58decode
from solders.keypair import Keypair
from solders.pubkey import Pubkey
from solders.signature import Signature
from typing import Dict, Any
import base64
from contextlib import asynccontextmanager
from trade_manager import trade_bp
from copytrading import copytrading_bp
from api_routes import api_bp
import requests
import aiohttp

app = Flask(__name__)

# Configure CORS to allow requests from the frontend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Register blueprints
app.register_blueprint(trade_bp)
app.register_blueprint(copytrading_bp)
app.register_blueprint(api_bp)  # Register the API routes blueprint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Constants
WALLET_ADDRESS = os.getenv("WALLET_ADDRESS")
if not WALLET_ADDRESS:
    raise ValueError("WALLET_ADDRESS environment variable is not set")

RPC_URL = os.getenv("SOLANA_MAINNET_RPC", "https://api.mainnet-beta.solana.com")
JUPITER_API_URL = os.getenv("JUPITER_QUOTE_API", "https://quote-api.jup.ag/v6")

print(f"Using RPC URL: {RPC_URL}")  # Debug log
print(f"Using wallet address: {WALLET_ADDRESS}")  # Debug log

# Global HTTP client
client = None

@asynccontextmanager
async def lifespan(app: Flask):
    # Startup
    global client
    client = httpx.AsyncClient(timeout=30.0)
    print("Starting up Flask app...")
    yield
    # Shutdown
    print("Shutting down Flask app...")
    await client.aclose()

# Rest of the server.py code remains unchanged...