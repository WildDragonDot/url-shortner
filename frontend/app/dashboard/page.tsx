'use client';

import { useEffect, useState } from 'react';
import type React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { urlAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Copy, Trash2, BarChart3, ToggleLeft, ToggleRight, ExternalLink,
  Plus, Search, Filter, Download, QrCode, Lock, Calendar,
  TrendingUp, Link2, MousePointerClick, Eye, RefreshCw, ChevronDown, ChevronUp,
  Settings, Type, Key, LayoutGrid, Upload, Zap, Webhook
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ApiKeysTab from '@/components/dashboard/ApiKeysTab';
import WebhooksTab from '@/components/dashboard/WebhooksTab';
import CollectionsTab from '@/components/dashboard/CollectionsTab';
import BulkCreateTab from '@/components/dashboard/BulkCreateTab';
import AdvancedFeaturesTab from '@/components/dashboard/AdvancedFeaturesTab';

type DashboardTab = 'urls' | 'bulk' | 'advanced' | 'collections' | 'webhooks' | 'apikeys';

interface URLItem {
  code: string;
  short_url: string;
  long_url: string;
  status: string;
  click_count: number;
  created_at: string;
  expires_at?: string;
  has_password?: boolean;
  og_title?: string;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading, deleteAccount } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('urls');
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ long_url: '', custom_code: '', password: '', expires_at: '' });
  const [stats, setStats] = useState({ total: 0, active: 0, totalClicks: 0, avgClicks: 0 });
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchURLs();
  }, [isAuthenticated, isLoading, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchURLs = async () => {
    setLoading(true);
    try {
      const res = await urlAPI.getAll(page, 10);
      const urlsData = res.data.urls || [];
      setUrls(urlsData);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotalCount(res.data.pagination?.total || 0);
      const total = res.data.pagination?.total || 0;
      const active = urlsData.filter((u: URLItem) => u.status === 'active').length;
      const totalClicks = urlsData.reduce((sum: number, u: URLItem) => sum + (u.click_count || 0), 0);
      setStats({ total, active, totalClicks, avgClicks: urlsData.length > 0 ? Math.round(totalClicks / urlsData.length) : 0 });
    } catch { toast.error('Failed to load URLs'); }
    finally { setLoading(false); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  const handleDelete = async (code: string) => {
    if (!confirm('Delete this URL?')) return;
    try { await urlAPI.delete(code); toast.success('Deleted'); fetchURLs(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (code: string) => {
    try { await urlAPI.toggle(code); toast.success('Status updated'); fetchURLs(); }
    catch { toast.error('Failed to update'); }
  };

  const handleBulkDelete = async () => {
    if (selectedUrls.size === 0) return;
    if (!confirm(`Delete ${selectedUrls.size} selected URL(s)?`)) return;
    try {
      await urlAPI.bulkDelete(Array.from(selectedUrls));
      toast.success(`Deleted ${selectedUrls.size} URLs`);
      setSelectedUrls(new Set());
      fetchURLs();
    } catch { toast.error('Failed to delete some URLs'); }
  };

  const toggleSelectUrl = (code: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === filteredUrls.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredUrls.map(u => u.code)));
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure? This will permanently delete your account and ALL your URLs. This cannot be undone.')) return;
    try {
      await deleteAccount();
      router.push('/');
    } catch { /* handled in context */ }
  };

  const handleCreateURL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.long_url) { toast.error('Please enter a URL'); return; }
    try {
      const payload: { url: string; alias?: string; password?: string; expires_at?: string } = { url: createForm.long_url };
      if (createForm.custom_code) payload.alias = createForm.custom_code;
      if (createForm.password) payload.password = createForm.password;
      if (createForm.expires_at) payload.expires_at = createForm.expires_at;
      await urlAPI.create(payload);
      toast.success('URL created!');
      setShowCreateModal(false);
      setCreateForm({ long_url: '', custom_code: '', password: '', expires_at: '' });
      fetchURLs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || 'Failed to create URL');
    }
  };

  const filteredUrls = urls.filter(url => {
    const matchesSearch = url.short_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      url.long_url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || url.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getTimelineData = () => {
    const byDate = urls.reduce((acc: Record<string, number>, url) => {
      const date = new Date(url.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(byDate).map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const TABS: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
    { id: 'urls',        label: 'My URLs',     icon: Link2 },
    { id: 'bulk',        label: 'Bulk Create', icon: Upload },
    { id: 'advanced',    label: 'Advanced',    icon: Zap },
    { id: 'collections', label: 'Collections', icon: LayoutGrid },
    { id: 'webhooks',    label: 'Webhooks',    icon: Webhook },
    { id: 'apikeys',     label: 'API Keys',    icon: Key },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-sm text-slate-600 mt-0.5">Manage and track your shortened URLs</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAccountModal(true)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition text-sm font-medium"
              title="Account Settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </button>
            <button
              onClick={() => { setActiveTab('urls'); setShowCreateModal(true); }}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:shadow-lg transition-all font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Create New URL
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 overflow-x-auto pb-1">
          <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 min-w-max">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === id ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Non-URL tabs */}
        {activeTab !== 'urls' && (
          <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200">
            {activeTab === 'bulk'        && <BulkCreateTab />}
            {activeTab === 'advanced'    && <AdvancedFeaturesTab />}
            {activeTab === 'collections' && <CollectionsTab />}
            {activeTab === 'webhooks'    && <WebhooksTab />}
            {activeTab === 'apikeys'     && <ApiKeysTab />}
          </div>
        )}

        {/* URLs Tab */}
        {activeTab === 'urls' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[
                { label: 'Total URLs',   value: stats.total,       sub: `${stats.active} active`,    icon: Link2,            bg: 'bg-blue-100',   color: 'text-blue-600' },
                { label: 'Total Clicks', value: stats.totalClicks, sub: 'Across all URLs',            icon: MousePointerClick, bg: 'bg-green-100',  color: 'text-green-600' },
                { label: 'Avg Clicks',   value: stats.avgClicks,   sub: 'Per URL',                    icon: TrendingUp,        bg: 'bg-purple-100', color: 'text-purple-600' },
                { label: 'Active Rate',  value: `${stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%`, sub: 'URLs enabled', icon: Eye, bg: 'bg-orange-100', color: 'text-orange-600' },
              ].map(({ label, value, sub, icon: Icon, bg, color }) => (
                <div key={label} className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">{label}</span>
                    <div className={`p-1.5 sm:p-2 ${bg} rounded-lg flex-shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 border border-slate-200 mb-4 sm:mb-6">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search URLs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'disabled')}
                    className="flex-1 px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <button onClick={fetchURLs} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition flex-shrink-0" title="Refresh">
                    <RefreshCw className="w-4 h-4 text-slate-600" />
                  </button>
                  {filteredUrls.length > 0 && (
                    <button onClick={toggleSelectAll} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition flex-shrink-0 text-xs font-medium text-slate-600 whitespace-nowrap px-3" title="Select All">
                      {selectedUrls.size === filteredUrls.length ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Main content: chart + list */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Timeline chart */}
              <div className="lg:col-span-1 order-2 lg:order-1">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 lg:sticky lg:top-8">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-primary-600" />
                    <h3 className="text-sm font-semibold text-slate-900">URL Creation Timeline</h3>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-4 pb-3 border-b border-slate-200">
                    <span className="text-slate-500">URLs: <span className="font-semibold text-slate-900">{stats.total}</span></span>
                    <span className="text-slate-500">Clicks: <span className="font-semibold text-green-600">{stats.totalClicks}</span></span>
                    <span className="text-slate-500">Avg: <span className="font-semibold text-purple-600">{stats.avgClicks}</span></span>
                  </div>
                  {getTimelineData().length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={getTimelineData()}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                        <XAxis dataKey="date" stroke="#6b7280" fontSize={9} tickLine={false} axisLine={false}
                          tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                        <YAxis stroke="#6b7280" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '11px' }}
                          labelFormatter={(v) => new Date(v).toLocaleDateString()} formatter={(v) => [v ?? 0, 'URLs Created']} />
                        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)"
                          dot={{ fill: '#3b82f6', r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <div className="text-center">
                        <TrendingUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No data yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* URLs list */}
              <div className="lg:col-span-2 order-1 lg:order-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-primary-600" />
                    Your URLs ({totalCount})
                  </h2>
                  {selectedUrls.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{selectedUrls.size} selected</span>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                      </button>
                      <button onClick={() => setSelectedUrls(new Set())} className="text-xs text-slate-500 hover:text-slate-700">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {filteredUrls.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-10 text-center border border-slate-200">
                    <Link2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{searchQuery || filterStatus !== 'all' ? 'No URLs found' : 'No URLs yet'}</h3>
                    <p className="text-slate-500 text-sm mb-4">{searchQuery || filterStatus !== 'all' ? 'Try adjusting your search or filters' : 'Create your first short link!'}</p>
                    {!searchQuery && filterStatus === 'all' && (
                      <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold text-sm">
                        <Plus className="w-4 h-4" /> Create Short URL
                      </button>
                    )}
                  </div>
                ) : (
                  filteredUrls.map((url) => (
                    <div key={url.code} className={`bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border transition-all ${selectedUrls.has(url.code) ? 'border-primary-400 bg-primary-50/30' : 'border-slate-200 hover:border-primary-300 hover:shadow-md'}`}>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <div className="flex items-start gap-2 sm:hidden">
                          <input type="checkbox" checked={selectedUrls.has(url.code)} onChange={() => toggleSelectUrl(url.code)} className="mt-1 w-4 h-4 accent-primary-600 cursor-pointer" />
                        </div>
                        <div className="hidden sm:flex items-center">
                          <input type="checkbox" checked={selectedUrls.has(url.code)} onChange={() => toggleSelectUrl(url.code)} className="w-4 h-4 accent-primary-600 cursor-pointer" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2 flex-wrap">
                            <a href={url.short_url} target="_blank" rel="noopener noreferrer"
                              className="text-primary-600 font-bold text-sm sm:text-base hover:text-primary-700 flex items-center gap-1 hover:underline break-all flex-1 min-w-0">
                              <span className="truncate">{url.code}</span>
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                            </a>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => copyToClipboard(url.short_url)} className="p-2 hover:bg-slate-100 rounded-lg transition" title="Copy">
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                              <button onClick={() => setExpandedQR(expandedQR === url.code ? null : url.code)} className="p-2 hover:bg-slate-100 rounded-lg transition sm:hidden" title="QR">
                                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${url.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                              {url.status}
                            </span>
                            {url.has_password && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Protected
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 truncate mb-1">{url.long_url}</p>
                          {url.og_title && <p className="text-xs text-slate-400 truncate mb-2 italic">{url.og_title}</p>}
                          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 mb-3">
                            <span className="flex items-center gap-1 font-medium"><MousePointerClick className="w-3 h-3" />{url.click_count}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(url.created_at).toLocaleDateString()}</span>
                            {url.expires_at && (
                              <span className="flex items-center gap-1 text-orange-600"><Calendar className="w-3 h-3" />Exp {new Date(url.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link href={`/analytics/${url.code}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition font-medium text-xs text-slate-700">
                              <BarChart3 className="w-3.5 h-3.5" /> Analytics
                            </Link>
                            <button onClick={() => setExpandedQR(expandedQR === url.code ? null : url.code)}
                              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition font-medium text-xs text-slate-700">
                              <QrCode className="w-3.5 h-3.5" /> QR
                              {expandedQR === url.code ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => handleToggle(url.code)} className="p-2 hover:bg-slate-100 rounded-xl transition" title={url.status === 'active' ? 'Disable' : 'Enable'}>
                              {url.status === 'active' ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                            </button>
                            <button onClick={() => handleDelete(url.code)} className="p-2 hover:bg-red-50 rounded-xl transition" title="Delete">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center justify-center">
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <QRCodeSVG value={url.short_url} size={90} level="M" includeMargin={false} />
                          </div>
                        </div>
                      </div>
                      {expandedQR === url.code && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                            <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm mx-auto sm:mx-0">
                              <QRCodeSVG id={`qr-${url.code}`} value={url.short_url} size={130} level="H" includeMargin={true} />
                            </div>
                            <div className="flex-1 space-y-3">
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2"><QrCode className="w-4 h-4 text-primary-600" /> QR Code Ready</h4>
                                <p className="text-xs text-slate-500 mt-0.5">Scan to visit your short URL instantly</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <a href={`${url.short_url}/qr?format=png&size=512`} download={`qr-${url.code}.png`}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition font-medium text-xs">
                                  <Download className="w-3.5 h-3.5" /> PNG
                                </a>
                                <a href={`${url.short_url}/qr?format=svg`} download={`qr-${url.code}.svg`}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition font-medium text-xs">
                                  <Download className="w-3.5 h-3.5" /> SVG
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <span className="text-xs text-slate-500">Showing {((page - 1) * 10) + 1}–{Math.min(page * 10, totalCount)} of {totalCount}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setPage(page - 1)} disabled={page === 1}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-700 transition">
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                        return (
                          <button key={p} onClick={() => setPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${page === p ? 'bg-primary-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                            {p}
                          </button>
                        );
                      })}
                      <button onClick={() => setPage(page + 1)} disabled={page === totalPages}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-xs font-medium text-slate-700 transition">
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Create URL Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg"><Plus className="w-5 h-5 text-primary-600" /></div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Create Short URL</h2>
                    <p className="text-xs text-slate-500">Transform your long link</p>
                  </div>
                </div>
                <button onClick={() => { setShowCreateModal(false); setCreateForm({ long_url: '', custom_code: '', password: '', expires_at: '' }); }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateURL} className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                    <Link2 className="w-3.5 h-3.5 text-primary-600" /> Enter your long URL <span className="text-red-500">*</span>
                  </label>
                  <input type="url" value={createForm.long_url} onChange={(e) => setCreateForm({ ...createForm, long_url: e.target.value })}
                    placeholder="https://example.com/your-long-url" required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition" />
                </div>
                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    <Settings className="w-3.5 h-3.5" /> Advanced Options <span className="text-slate-400 normal-case">(optional)</span>
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"><Type className="w-3 h-3 text-primary-600" /> Custom Code</label>
                    <input type="text" value={createForm.custom_code} onChange={(e) => setCreateForm({ ...createForm, custom_code: e.target.value })}
                      placeholder="my-custom-link"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"><Lock className="w-3 h-3 text-primary-600" /> Password Protection</label>
                    <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition" />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5"><Calendar className="w-3 h-3 text-primary-600" /> Expiry Date</label>
                    <input type="datetime-local" value={createForm.expires_at} onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreateModal(false); setCreateForm({ long_url: '', custom_code: '', password: '', expires_at: '' }); }}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition font-medium text-sm">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:shadow-lg transition font-medium text-sm flex items-center justify-center gap-2">
                    <Link2 className="w-4 h-4" /> Create URL
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Account Settings Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary-600" /> Account Settings
                </h2>
                <button onClick={() => setShowAccountModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Danger Zone</h3>
                  <p className="text-xs text-red-600 mb-3">Permanently delete your account and all associated URLs, analytics, and data. This cannot be undone.</p>
                  <button
                    onClick={() => { setShowAccountModal(false); handleDeleteAccount(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    <Trash2 className="w-4 h-4" /> Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
