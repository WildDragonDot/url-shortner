'use client';

import { useEffect, useState } from 'react';
import { collectionAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { LayoutGrid, Plus, Trash2, ExternalLink, Link2, Edit2, X } from 'lucide-react';

interface Collection {
  id: string;
  slug: string;
  title: string | null;
  theme: string;
  link_count: number;
  page_url: string;
  created_at: string;
}

export default function CollectionsTab() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAddLink, setShowAddLink] = useState<string | null>(null); // slug
  const [form, setForm] = useState({ slug: '', title: '', description: '', theme: 'default' });
  const [linkForm, setLinkForm] = useState({ short_url: '', label: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchCollections(); }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await collectionAPI.getAll();
      setCollections(res.data || []);
    } catch { toast.error('Failed to load collections'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug) { toast.error('Username/slug required'); return; }
    setCreating(true);
    try {
      await collectionAPI.create(form);
      toast.success('Collection created!');
      setForm({ slug: '', title: '', description: '', theme: 'default' });
      setShowCreate(false);
      fetchCollections();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create collection');
    } finally { setCreating(false); }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Delete this collection?')) return;
    try {
      await collectionAPI.delete(slug);
      toast.success('Collection deleted');
      fetchCollections();
    } catch { toast.error('Failed to delete'); }
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddLink || !linkForm.short_url) return;
    try {
      await collectionAPI.addLink(showAddLink, linkForm);
      toast.success('Link added!');
      setLinkForm({ short_url: '', label: '' });
      setShowAddLink(null);
      fetchCollections();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add link');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Link-in-Bio Collections</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Linktree jaisa page — multiple links ek jagah</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Collection</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Loading...</div>
      ) : collections.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <LayoutGrid className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No collections yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a Link-in-Bio page for your social profiles</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {collections.map((col) => (
            <div key={col.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-primary-300 transition">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{col.title || `@${col.slug}`}</p>
                  <p className="text-xs text-slate-500 mt-0.5">@{col.slug} · {col.link_count} links</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setShowAddLink(col.slug)}
                    className="p-1.5 hover:bg-blue-50 rounded-lg transition"
                    title="Add link"
                  >
                    <Link2 className="w-3.5 h-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(col.slug)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
              <a
                href={col.page_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {col.page_url}
              </a>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  col.theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {col.theme} theme
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Collection Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create Collection</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Username / Slug *</label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                  <span className="px-3 py-2.5 bg-slate-50 text-slate-500 text-sm border-r border-slate-300">@</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="johndoe"
                    required
                    className="flex-1 px-3 py-2.5 text-sm focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="My Links"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="All my important links"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Theme</label>
                <select
                  value={form.theme}
                  onChange={(e) => setForm({ ...form, theme: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="default">Default (Light)</option>
                  <option value="dark">Dark</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {showAddLink && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Link to @{showAddLink}</h3>
              <button onClick={() => setShowAddLink(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAddLink} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Short URL Code *</label>
                <input
                  type="text"
                  value={linkForm.short_url}
                  onChange={(e) => setLinkForm({ ...linkForm, short_url: e.target.value })}
                  placeholder="abc1234"
                  required
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Label</label>
                <input
                  type="text"
                  value={linkForm.label}
                  onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                  placeholder="My YouTube Channel"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddLink(null)} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition">
                  Add Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
