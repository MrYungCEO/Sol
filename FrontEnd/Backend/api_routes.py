```python
import json
import os
from flask import Blueprint, jsonify, request
from pathlib import Path

api_bp = Blueprint('api', __name__)

def load_endpoints():
    """Load API endpoints from JSON file"""
    try:
        endpoints_file = Path(__file__).parent / 'api_endpoints.json'
        with open(endpoints_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading endpoints: {e}")
        return {"endpoints": []}

def save_endpoints(endpoints):
    """Save API endpoints to JSON file"""
    try:
        endpoints_file = Path(__file__).parent / 'api_endpoints.json'
        with open(endpoints_file, 'w') as f:
            json.dump(endpoints, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving endpoints: {e}")
        return False

@api_bp.route('/api/endpoints', methods=['GET'])
def get_endpoints():
    """Get all API endpoints"""
    try:
        endpoints = load_endpoints()
        return jsonify(endpoints)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/endpoints', methods=['POST'])
def update_endpoints():
    """Update API endpoints"""
    try:
        endpoints = request.json
        if save_endpoints(endpoints):
            return jsonify({"message": "Endpoints updated successfully"})
        return jsonify({"error": "Failed to save endpoints"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/endpoints/<endpoint_id>', methods=['GET'])
def get_endpoint(endpoint_id):
    """Get a specific API endpoint"""
    try:
        endpoints = load_endpoints()
        endpoint = next((e for e in endpoints["endpoints"] if e["id"] == endpoint_id), None)
        if endpoint:
            return jsonify(endpoint)
        return jsonify({"error": "Endpoint not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/endpoints/<endpoint_id>', methods=['PUT'])
def update_endpoint(endpoint_id):
    """Update a specific API endpoint"""
    try:
        endpoints = load_endpoints()
        endpoint_data = request.json
        
        # Find and update the endpoint
        for i, endpoint in enumerate(endpoints["endpoints"]):
            if endpoint["id"] == endpoint_id:
                endpoints["endpoints"][i] = {**endpoint, **endpoint_data}
                if save_endpoints(endpoints):
                    return jsonify({"message": "Endpoint updated successfully"})
                return jsonify({"error": "Failed to save endpoint"}), 500
                
        return jsonify({"error": "Endpoint not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/api/endpoints/<endpoint_id>', methods=['DELETE'])
def delete_endpoint(endpoint_id):
    """Delete a specific API endpoint"""
    try:
        endpoints = load_endpoints()
        
        # Filter out the endpoint to delete
        endpoints["endpoints"] = [e for e in endpoints["endpoints"] if e["id"] != endpoint_id]
        
        if save_endpoints(endpoints):
            return jsonify({"message": "Endpoint deleted successfully"})
        return jsonify({"error": "Failed to delete endpoint"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500
```