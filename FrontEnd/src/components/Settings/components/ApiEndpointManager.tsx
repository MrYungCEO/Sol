import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Play, Loader } from 'lucide-react';

interface ApiEndpoint {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description?: string;
}

interface ApiEndpointManagerProps {
  endpoints: ApiEndpoint[];
  onUpdate: (endpoints: ApiEndpoint[]) => void;
}

export const ApiEndpointManager: React.FC<ApiEndpointManagerProps> = ({
  endpoints,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newEndpoint, setNewEndpoint] = useState<Partial<ApiEndpoint>>({
    method: 'GET'
  });
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{[key: string]: { success: boolean; message: string }}>({});

  const handleAdd = () => {
    if (!newEndpoint.name || !newEndpoint.path) return;

    const endpoint: ApiEndpoint = {
      id: Date.now().toString(),
      name: newEndpoint.name,
      path: newEndpoint.path,
      method: newEndpoint.method || 'GET',
      description: newEndpoint.description
    };

    onUpdate([...endpoints, endpoint]);
    setNewEndpoint({ method: 'GET' });
  };

  const handleEdit = (endpoint: ApiEndpoint) => {
    const updatedEndpoints = endpoints.map(e => 
      e.id === endpoint.id ? endpoint : e
    );
    onUpdate(updatedEndpoints);
    setIsEditing(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(endpoints.filter(e => e.id !== id));
  };

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    setTestingEndpoint(endpoint.id);
    setTestResults(prev => ({ ...prev, [endpoint.id]: { success: false, message: 'Testing...' } }));

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8005';
      const url = `${baseUrl}${endpoint.path}`;
      
      let response;
      if (endpoint.method === 'GET') {
        response = await fetch(url);
      } else {
        // For POST/PUT/DELETE, send an empty body
        response = await fetch(url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
      }

      const data = await response.json();
      
      if (response.ok) {
        setTestResults(prev => ({
          ...prev,
          [endpoint.id]: {
            success: true,
            message: 'Test successful'
          }
        }));
      } else {
        throw new Error(data.error || 'Test failed');
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [endpoint.id]: {
          success: false,
          message: error instanceof Error ? error.message : 'Test failed'
        }
      }));
    } finally {
      setTestingEndpoint(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add New Endpoint */}
      <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-400">Add New Endpoint</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Endpoint Name"
            value={newEndpoint.name || ''}
            onChange={e => setNewEndpoint(prev => ({ ...prev, name: e.target.value }))}
            className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
          <input
            type="text"
            placeholder="Path (e.g., /api/trades)"
            value={newEndpoint.path || ''}
            onChange={e => setNewEndpoint(prev => ({ ...prev, path: e.target.value }))}
            className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={newEndpoint.method || 'GET'}
            onChange={e => setNewEndpoint(prev => ({ ...prev, method: e.target.value as ApiEndpoint['method'] }))}
            className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newEndpoint.description || ''}
            onChange={e => setNewEndpoint(prev => ({ ...prev, description: e.target.value }))}
            className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!newEndpoint.name || !newEndpoint.path}
          className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <Plus size={16} />
          <span>Add Endpoint</span>
        </button>
      </div>

      {/* Endpoints List */}
      <div className="space-y-3">
        {endpoints.map(endpoint => (
          <div key={endpoint.id} className="bg-gray-800/50 rounded-lg p-4">
            {isEditing === endpoint.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={endpoint.name}
                    onChange={e => handleEdit({ ...endpoint, name: e.target.value })}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500/50"
                  />
                  <input
                    type="text"
                    value={endpoint.path}
                    onChange={e => handleEdit({ ...endpoint, path: e.target.value })}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={endpoint.method}
                    onChange={e => handleEdit({ ...endpoint, method: e.target.value as ApiEndpoint['method'] })}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={endpoint.description || ''}
                    onChange={e => handleEdit({ ...endpoint, description: e.target.value })}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-lg py-2 px-3 text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setIsEditing(null)}
                    className="px-3 py-1.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleEdit(endpoint)}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        endpoint.method === 'GET' ? 'bg-green-500/20 text-green-400' :
                        endpoint.method === 'POST' ? 'bg-blue-500/20 text-blue-400' :
                        endpoint.method === 'PUT' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {endpoint.method}
                      </span>
                      <span className="text-white font-medium">{endpoint.name}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-400">{endpoint.path}</div>
                    {endpoint.description && (
                      <div className="mt-1 text-sm text-gray-500">{endpoint.description}</div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testEndpoint(endpoint)}
                      disabled={testingEndpoint === endpoint.id}
                      className={`p-2 rounded-lg transition-colors ${
                        testingEndpoint === endpoint.id
                          ? 'bg-blue-500/20 text-blue-400 cursor-wait'
                          : 'bg-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      title="Test endpoint"
                    >
                      {testingEndpoint === endpoint.id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => setIsEditing(endpoint.id)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(endpoint.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {testResults[endpoint.id] && (
                  <div className={`mt-2 text-sm ${
                    testResults[endpoint.id].success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {testResults[endpoint.id].message}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};