'use client';

import { useState } from 'react';
import { urlAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Upload, Plus, Trash2, CheckCircle, XCircle, Copy, Download } from 'lucide-react';

interface BulkItem {
  url: string;
  alias: string;
}

interface BulkResult {
  status: number;
  short_url?: string;
  code?: string;
  long_url?: string;
  error?: string;
}

export default function BulkCreateTab() {
  const [items, setItems] = useState<BulkItem[]>([{ url: '', alias: '' }]);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');

  const addRow = () => setItems([...items, { url: '', alias: '' }]);
  const removeRow = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: 'url' | 'alias', value: string) => {
    const updated = [...items];
    updated[i][field] = value;
    setItems(updated);
  };

  const parseCsv = () => {
    const lines = csvText.trim().split('\n').filter(Boolean);
    const parsed = lines.map((line) => {
      const [url, alias] = line.split(',').map((s) => s.trim());
      return { url: url || '', alias: alias || '' };
    });
    setItems(parsed);
    setMode('manual');
    toast.success(`${parsed.length} URLs parsed from CSV`);
  };

  const handleSubmit = async () => {
    const valid = items.filter((i) => i.url.trim());
    if (valid.length === 0) { toast.error('Add at least one URL'); return; }
    if (valid.length > 100) { toast.error('Max 100 URLs per request'); return; }

    setLoading(true);
    setResults([]);
    try {
      const res = await urlAPI.bulkCreate(
        valid.map((i) => ({ url: i.url, ...(i.alias ? { alias: i.alias } : {}) }))
      );
      setResults(res.data.results || []);
      const { success, failed } = res.data.summary;
      toast.success(`${success} created, ${failed} failed`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Bulk create failed');
    } finally { setLoading(false); }
  };

  const copyAllResults = () => {
    const text = results
      .filter((r) => r.status === 201 && r.short_url)
      .map((r) => r.short_url)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('All short URLs copied!');
  };

  const downloadCsv = () => {
    const rows = results.map((r, i) =>
      r.status === 201
        ? `${items[i]?.url || ''},${r.short_url}`
        : `${items[i]?.url || ''},ERROR: ${r.error}`
    );
    const blob = new Blob([['original_url,short_url', ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bulk-urls.csv';
    a.click();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Bulk URL Shortening</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Ek baar mein 100 URLs tak shorten karo</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${mode === 'manual' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${mode === 'csv' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          CSV Import
        </button>
      </div>

      {mode === 'csv' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <p className="text-sm text-slate-600">Paste CSV: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">url,alias(optional)</code></p>
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`https://example.com/page1,my-link\nhttps://example.com/page2\nhttps://example.com/page3,custom`}
            rows={6}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
          <button
            onClick={parseCsv}
            disabled={!csvText.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50"
          >
            Parse CSV
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{items.length} URL{items.length !== 1 ? 's' : ''}</span>
            <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Plus className="w-4 h-4" />
              Add Row
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-3">
                <span className="text-xs text-slate-400 w-5 flex-shrink-0 text-right">{i + 1}</span>
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => updateRow(i, 'url', e.target.value)}
                  placeholder="https://example.com/long-url"
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0"
                />
                <input
                  type="text"
                  value={item.alias}
                  onChange={(e) => updateRow(i, 'alias', e.target.value)}
                  placeholder="alias (opt)"
                  className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={() => removeRow(i)}
                  disabled={items.length === 1}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Upload className="w-4 h-4" />
        {loading ? 'Creating...' : `Shorten ${items.filter(i => i.url).length} URLs`}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Results</span>
            <div className="flex gap-2">
              <button onClick={copyAllResults} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded-lg transition">
                <Copy className="w-3 h-3" />
                Copy All
              </button>
              <button onClick={downloadCsv} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 px-2 py-1 bg-slate-100 rounded-lg transition">
                <Download className="w-3 h-3" />
                CSV
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                {r.status === 201 ? (
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {r.status === 201 ? (
                    <div className="flex items-center gap-2">
                      <a href={r.short_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 hover:underline truncate">
                        {r.short_url}
                      </a>
                      <button onClick={() => { navigator.clipboard.writeText(r.short_url!); toast.success('Copied!'); }} className="p-1 hover:bg-slate-100 rounded flex-shrink-0">
                        <Copy className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">{r.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
