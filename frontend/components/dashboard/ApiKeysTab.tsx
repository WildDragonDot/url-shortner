'use client';

import { useEffect, useState } from 'react';
import { apiKeyAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Key, Plus, Trash2, Copy, AlertTriangle, Clock } from 'lucide-react';

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await apiKeyAPI.getAll();
      setKeys(res.data || []);
    } catch { toast.error('Failed to load API keys'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await apiKeyAPI.create(newKeyName || 'API Key', newKeyExpiry || undefined);
      setCreatedKey(res.data.key);
      setNewKeyName('');
      setNewKeyExpiry('');
      setShowCreate(false);
      fetchKeys();
    } catch { toast.error('Failed to create API key'); }
    finally { setCreating(false); }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await apiKeyAPI.revoke(id);
      toast.success('API key revoked');
      fetchKeys();
    } catch { toast.error('Failed to revoke key'); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">API Keys</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Programmatic access ke liye keys manage karo</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Key</span>
        </button>
      </div>

      {/* Newly created key — show once */}
      {createdKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm mb-1">Save this key now — it won't be shown again</p>
              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                <code className="text-xs text-slate-700 flex-1 truncate">{createdKey}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdKey); toast.success('Copied!'); }}
                  className="p-1 hover:bg-amber-100 rounded transition flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-700" />
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setCreatedKey(null)} className="mt-3 text-xs text-amber-700 hover:underline">
            I've saved it, dismiss
          </button>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
      ) : keys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Key className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No API keys yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a key to access the API programmatically</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => (
            <div key={key.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">
                <Key className="w-4 h-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{key.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <code className="text-xs text-slate-500">{key.keyPrefix}...</code>
                  {key.lastUsed && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last used {new Date(key.lastUsed).toLocaleDateString()}
                    </span>
                  )}
                  {key.expiresAt && (
                    <span className="text-xs text-orange-600">
                      Expires {new Date(key.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRevoke(key.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                title="Revoke key"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Usage example */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Usage</p>
        <code className="text-xs text-slate-700 block">
          Authorization: Bearer sk_your_api_key_here
        </code>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create API Key</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Key"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Expiry Date (optional)</label>
                <input
                  type="datetime-local"
                  value={newKeyExpiry}
                  onChange={(e) => setNewKeyExpiry(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
