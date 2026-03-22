'use client';

import { useEffect, useState } from 'react';
import { webhookAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Webhook, Plus, Trash2, AlertTriangle, Copy, Globe } from 'lucide-react';

interface WebhookItem {
  id: string;
  endpoint: string;
  shortUrl: string | null;
  events: string[];
  createdAt: string;
}

export default function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ endpoint: '', short_url: '', events: 'click' });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchWebhooks(); }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const res = await webhookAPI.getAll();
      setWebhooks(res.data || []);
    } catch { toast.error('Failed to load webhooks'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.endpoint) { toast.error('Endpoint URL required'); return; }
    setCreating(true);
    try {
      const res = await webhookAPI.create({
        endpoint:  form.endpoint,
        short_url: form.short_url || undefined,
        events:    [form.events],
      });
      setCreatedSecret(res.data.secret);
      setForm({ endpoint: '', short_url: '', events: 'click' });
      setShowCreate(false);
      fetchWebhooks();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create webhook');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhookAPI.delete(id);
      toast.success('Webhook deleted');
      fetchWebhooks();
    } catch { toast.error('Failed to delete webhook'); }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Webhooks</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">URL click hone pe apne server ko notify karo</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Webhook</span>
        </button>
      </div>

      {/* Secret reveal */}
      {createdSecret && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-amber-800 text-sm mb-1">Save this secret — it won't be shown again</p>
              <p className="text-xs text-amber-700 mb-2">Use this to verify the <code>X-Signature</code> header on incoming requests.</p>
              <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
                <code className="text-xs text-slate-700 flex-1 truncate">{createdSecret}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdSecret); toast.success('Copied!'); }}
                  className="p-1 hover:bg-amber-100 rounded transition flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-700" />
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setCreatedSecret(null)} className="mt-3 text-xs text-amber-700 hover:underline">
            I've saved it, dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
      ) : webhooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No webhooks configured</p>
          <p className="text-slate-400 text-sm mt-1">Add a webhook to get notified on URL clicks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Globe className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{wh.endpoint}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {wh.events.join(', ')}
                    </span>
                    {wh.shortUrl ? (
                      <span className="text-xs text-slate-500">For: <code>{wh.shortUrl}</code></span>
                    ) : (
                      <span className="text-xs text-slate-400">All URLs</span>
                    )}
                    <span className="text-xs text-slate-400">{new Date(wh.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(wh.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payload example */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Payload Example</p>
        <pre className="text-xs text-slate-700 overflow-x-auto">{JSON.stringify({
          event: 'click', short_url: 'abc1234', long_url: 'https://example.com',
          clicked_at: new Date().toISOString(), country: 'IN', device: 'mobile', source: 'direct'
        }, null, 2)}</pre>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Webhook</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Endpoint URL *</label>
                <input
                  type="url"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://yourserver.com/webhook"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Short URL Code (optional)</label>
                <input
                  type="text"
                  value={form.short_url}
                  onChange={(e) => setForm({ ...form, short_url: e.target.value })}
                  placeholder="abc1234 (leave empty for all URLs)"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Event</label>
                <select
                  value={form.events}
                  onChange={(e) => setForm({ ...form, events: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="click">click</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50">
                  {creating ? 'Adding...' : 'Add Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
