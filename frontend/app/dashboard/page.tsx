'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { urlAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  Copy, Trash2, BarChart3, ToggleLeft, ToggleRight, ExternalLink, 
  Plus, Search, Filter, Download, QrCode, Lock, Calendar,
  TrendingUp, Link2, MousePointerClick, Eye, RefreshCw, ChevronDown, ChevronUp,
  Settings, Type
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface URL {
  code: string;
  short_url: string;
  long_url: string;
  status: string;
  click_count: number;
  created_at: string;
  expires_at?: string;
  has_password?: boolean;
}

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [urls, setUrls] = useState<URL[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'disabled'>('all');
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    long_url: '',
    custom_code: '',
    password: '',
    expires_at: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalClicks: 0,
    avgClicks: 0
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login...');
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      console.log('✅ Authenticated, fetching URLs...');
      fetchURLs();
    }
  }, [isAuthenticated, isLoading, page]);

  const fetchURLs = async () => {
    setLoading(true);
    try {
      console.log('Fetching URLs from API...');
      const res = await urlAPI.getAll(page, 10);
      console.log('API Response:', res.data);
      const urlsData = res.data.urls || [];
      console.log('URLs Data:', urlsData);
      setUrls(urlsData);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotalCount(res.data.pagination?.total || 0);
      
      const total = res.data.pagination?.total || 0;
      const active = urlsData.filter((u: URL) => u.status === 'active').length;
      const totalClicks = urlsData.reduce((sum: number, u: URL) => sum + (u.click_count || 0), 0);
      const avgClicks = urlsData.length > 0 ? Math.round(totalClicks / urlsData.length) : 0;
      
      setStats({ total, active, totalClicks, avgClicks });
    } catch (err) {
      console.error('Failed to load URLs:', err);
      toast.error('Failed to load URLs');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('📋 Copied to clipboard!');
  };

  const handleDelete = async (code: string) => {
    if (!confirm('Are you sure you want to delete this URL? This action cannot be undone.')) return;
    try {
      await urlAPI.delete(code);
      toast.success('✅ URL deleted successfully');
      fetchURLs();
    } catch {
      toast.error('❌ Failed to delete URL');
    }
  };

  const handleToggle = async (code: string) => {
    try {
      await urlAPI.toggle(code);
      toast.success('✅ Status updated');
      fetchURLs();
    } catch {
      toast.error('❌ Failed to update status');
    }
  };

  const handleCreateURL = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.long_url) {
      toast.error('Please enter a URL');
      return;
    }

    try {
      const payload: {
        url: string;
        alias?: string;
        password?: string;
        expires_at?: string;
      } = { url: createForm.long_url };
      
      if (createForm.custom_code) payload.alias = createForm.custom_code;
      if (createForm.password) payload.password = createForm.password;
      if (createForm.expires_at) payload.expires_at = createForm.expires_at;

      await urlAPI.create(payload);
      toast.success('✅ URL created successfully!');
      setShowCreateModal(false);
      setCreateForm({ long_url: '', custom_code: '', password: '', expires_at: '' });
      fetchURLs();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      toast.error(error.response?.data?.error || '❌ Failed to create URL');
    }
  };

  const filteredUrls = urls.filter(url => {
    const matchesSearch = url.short_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         url.long_url.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || url.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getCreationTimelineData = () => {
    // Group URLs by creation date
    const urlsByDate = urls.reduce((acc: Record<string, number>, url) => {
      const date = new Date(url.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Convert to array and sort by date
    return Object.entries(urlsByDate)
      .map(([date, count]) => ({
        date,
        count
      }))
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">Dashboard</h1>
              <p className="text-sm sm:text-base text-slate-600">Manage and track your shortened URLs</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all font-semibold text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">Create New URL</span>
              <span className="xs:hidden">Create</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">Total URLs</span>
                <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Link2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats.active} active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">Total Clicks</span>
                <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <MousePointerClick className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.totalClicks}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">Across all URLs</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">Avg Clicks</span>
                <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">{stats.avgClicks}</p>
                <p className="text-xs text-slate-500 mt-0.5">Per URL</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium text-slate-600 truncate">Active Rate</span>
                <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-orange-600" />
                </div>
              </div>
              <div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
                  {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">URLs enabled</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 mb-4 sm:mb-6">
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search URLs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'disabled')}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition appearance-none bg-no-repeat bg-right pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundSize: '1.25rem',
                    backgroundPosition: 'right 0.5rem center'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <button
                onClick={fetchURLs}
                className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition flex items-center justify-center flex-shrink-0"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          {/* Graph - Full width on mobile, 1/3 on desktop */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 lg:sticky lg:top-8">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                <h3 className="text-sm sm:text-base font-semibold text-slate-900">URL Creation Timeline</h3>
              </div>
              
              {/* Quick Stats */}
              <div className="mb-3 sm:mb-4 pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">URLs:</span>
                    <span className="font-semibold text-slate-900">{stats.total}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Clicks:</span>
                    <span className="font-semibold text-green-600">{stats.totalClicks}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Avg:</span>
                    <span className="font-semibold text-purple-600">{stats.avgClicks}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-3 sm:mb-4">URLs created over time</p>
              {getCreationTimelineData().length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={getCreationTimelineData()}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280" 
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      dy={10}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      fontSize={9} 
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e5e7eb', 
                        backgroundColor: 'white', 
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      formatter={(value) => [value ?? 0, 'URLs Created']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCount)"
                      name="URLs Created"
                      dot={{ fill: '#3b82f6', r: 3, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 5, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <div className="text-center">
                    <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-slate-500">No data yet</p>
                    <p className="text-xs text-slate-400">Create URLs to see the timeline</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* URLs List - Full width on mobile, 2/3 on desktop */}
          <div className="lg:col-span-2 order-1 lg:order-2 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                <span className="hidden xs:inline">Your URLs ({totalCount})</span>
                <span className="xs:hidden">URLs ({totalCount})</span>
              </h2>
            </div>
            {/* URLs List */}
            <div className="space-y-3">
              {filteredUrls.length === 0 ? (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-8 sm:p-12 text-center border border-slate-200">
                  <div className="inline-flex p-3 sm:p-4 bg-slate-100 rounded-2xl mb-3 sm:mb-4">
                    <Link2 className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">
                    {searchQuery || filterStatus !== 'all' ? 'No URLs found' : 'No URLs yet'}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6">
                    {searchQuery || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'Create your first short link to get started!'}
                  </p>
                  {!searchQuery && filterStatus === 'all' && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold text-sm sm:text-base"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                      Create Short URL
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {filteredUrls.map((url) => (
                  <div
                    key={url.code}
                    className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4 md:p-6 border border-slate-200 hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        {/* URL Header */}
                        <div className="flex items-start gap-2 mb-2 flex-wrap">
                          <a
                            href={url.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 font-bold text-sm sm:text-base md:text-lg hover:text-primary-700 flex items-center gap-1 hover:underline break-all flex-1 min-w-0"
                          >
                            <span className="hidden sm:inline truncate">{url.short_url.replace('http://localhost:3000/', '')}</span>
                            <span className="sm:hidden truncate">{url.code}</span>
                            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                          </a>
                          
                          {/* Action Buttons - Mobile */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => copyToClipboard(url.short_url)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition active:scale-95"
                              title="Copy URL"
                            >
                              <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                            </button>
                            <button
                              onClick={() => setExpandedQR(expandedQR === url.code ? null : url.code)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition sm:hidden active:scale-95"
                              title="View QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                          <span
                            className={`px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${
                              url.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {url.status}
                          </span>
                          {url.has_password && (
                            <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden xs:inline">Protected</span>
                            </span>
                          )}
                        </div>

                        {/* Long URL */}
                        <p className="text-xs sm:text-sm text-slate-600 truncate mb-2 sm:mb-3">{url.long_url}</p>
                        
                        {/* Stats */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs text-slate-500 mb-3">
                          <span className="flex items-center gap-1 font-medium">
                            <MousePointerClick className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            {url.click_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden xs:inline">{new Date(url.created_at).toLocaleDateString()}</span>
                            <span className="xs:hidden">{new Date(url.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </span>
                          {url.expires_at && (
                            <span className="flex items-center gap-1 text-orange-600">
                              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span className="hidden sm:inline">Exp {new Date(url.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <span className="sm:hidden">Exp {new Date(url.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <Link
                          href={`/analytics/${url.code}`}
                          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-xl transition font-medium text-xs sm:text-sm text-slate-700 active:scale-95"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden xs:inline">Analytics</span>
                        </Link>
                        
                        <button
                          onClick={() => setExpandedQR(expandedQR === url.code ? null : url.code)}
                          className="hidden sm:flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 rounded-lg sm:rounded-xl transition font-medium text-xs sm:text-sm text-slate-700 active:scale-95"
                          title="Show QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="hidden md:inline">QR</span>
                          {expandedQR === url.code ? (
                            <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleToggle(url.code)}
                          className="p-2 sm:p-2.5 hover:bg-slate-100 rounded-lg sm:rounded-xl transition active:scale-95"
                          title={url.status === 'active' ? 'Disable URL' : 'Enable URL'}
                        >
                          {url.status === 'active' ? (
                            <ToggleRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleDelete(url.code)}
                          className="p-2 sm:p-2.5 hover:bg-red-50 rounded-lg sm:rounded-xl transition active:scale-95"
                          title="Delete URL"
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                        </button>
                        </div>
                      </div>

                      {/* QR Code on Right Side - Hidden on mobile */}
                      <div className="hidden sm:flex items-center justify-center">
                        <div className="p-2 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl hover:shadow-md transition-shadow cursor-pointer" title="Click QR button to expand">
                          <QRCodeSVG 
                            value={url.short_url}
                            size={100}
                            level="M"
                            includeMargin={false}
                          />
                        </div>
                      </div>
                    </div>

                    {expandedQR === url.code && (
                      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                          <div className="relative group/qr mx-auto sm:mx-0">
                            <div className="relative p-3 sm:p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                              <QRCodeSVG 
                                id={`qr-${url.code}`}
                                value={url.short_url} 
                                size={140}
                                level="H"
                                includeMargin={true}
                              />
                            </div>
                          </div>
                          
                          <div className="flex-1 space-y-3 sm:space-y-4 w-full">
                            <div>
                              <h4 className="font-bold text-slate-900 mb-1 flex items-center gap-2 text-sm sm:text-base">
                                <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                                QR Code Ready
                              </h4>
                              <p className="text-xs sm:text-sm text-slate-600">Scan to visit your short URL instantly</p>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`${url.short_url}/qr?format=png&size=512`}
                                download={`qr-${url.code}.png`}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg sm:rounded-xl transition-all font-medium text-xs sm:text-sm shadow-sm hover:shadow-md"
                              >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Download PNG</span>
                                <span className="xs:hidden">PNG</span>
                              </a>
                              
                              <a
                                href={`${url.short_url}/qr?format=svg`}
                                download={`qr-${url.code}.svg`}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl transition-all font-medium text-xs sm:text-sm"
                              >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Download SVG</span>
                                <span className="xs:hidden">SVG</span>
                              </a>
                              
                              <button
                                onClick={() => {
                                  const canvas = document.createElement('canvas');
                                  const svg = document.querySelector(`#qr-${url.code}`) as SVGSVGElement;
                                  if (svg) {
                                    canvas.width = 512;
                                    canvas.height = 512;
                                    const ctx = canvas.getContext('2d');
                                    const img = new Image();
                                    const svgData = new XMLSerializer().serializeToString(svg);
                                    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                                    const url2 = URL.createObjectURL(svgBlob);
                                    img.onload = () => {
                                      ctx?.drawImage(img, 0, 0, 512, 512);
                                      canvas.toBlob((blob) => {
                                        if (blob) {
                                          navigator.clipboard.write([
                                            new ClipboardItem({ 'image/png': blob })
                                          ]).then(() => {
                                            toast.success('📋 QR Code copied to clipboard!');
                                          });
                                        }
                                      });
                                      URL.revokeObjectURL(url2);
                                    };
                                    img.src = url2;
                                  }
                                }}
                                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl transition-all font-medium text-xs sm:text-sm"
                              >
                                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden xs:inline">Copy Image</span>
                                <span className="xs:hidden">Copy</span>
                              </button>
                            </div>
                            
                            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-200">
                              <p className="font-medium text-slate-700 mb-1">💡 Pro Tip:</p>
                              <p className="hidden sm:block">Print this QR code on flyers, business cards, or posters for easy sharing!</p>
                              <p className="sm:hidden">Print on flyers or cards for easy sharing!</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            </div>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-4 sm:mt-6 px-2 sm:px-4 gap-3 sm:gap-0">
            <div className="text-xs sm:text-sm text-slate-600 order-2 sm:order-1">
              Showing {((page - 1) * 10) + 1} to {Math.min(page * 10, totalCount)} of {totalCount} URLs
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 sm:px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-xs sm:text-sm text-slate-700"
              >
                <span className="hidden xs:inline">Previous</span>
                <span className="xs:hidden">Prev</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-semibold transition text-xs sm:text-sm ${
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 sm:px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-xs sm:text-sm text-slate-700"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create URL Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 xs:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl xs:rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 xs:p-4 sm:p-5 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-2 xs:gap-3 min-w-0">
                <div className="p-1.5 xs:p-2 bg-primary-100 rounded-lg shrink-0">
                  <Plus className="w-4 h-4 xs:w-5 xs:h-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base xs:text-lg font-bold text-slate-900 truncate">Create Short URL</h2>
                  <p className="text-xs text-slate-500 hidden xs:block">Transform your long link</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateForm({ long_url: '', custom_code: '', password: '', expires_at: '' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateURL} className="p-3 xs:p-4 sm:p-5 space-y-3 xs:space-y-4 overflow-y-auto">
              {/* Long URL Input */}
              <div>
                <label className="flex items-center gap-1.5 text-xs xs:text-sm font-medium text-slate-700 mb-2">
                  <Link2 className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-primary-600" />
                  Enter your long URL
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={createForm.long_url}
                  onChange={(e) => setCreateForm({ ...createForm, long_url: e.target.value })}
                  placeholder="https://example.com/your-long-url"
                  className="w-full px-3 xs:px-3.5 py-2 xs:py-2.5 text-xs xs:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                  required
                />
              </div>

              {/* Advanced Options - Compact */}
              <div className="space-y-2.5 xs:space-y-3 p-3 xs:p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  <Settings className="w-3 h-3 xs:w-3.5 xs:h-3.5" />
                  Advanced Options
                  <span className="text-slate-400 normal-case">(optional)</span>
                </div>

                {/* Custom Code */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                    <Type className="w-3 h-3 text-primary-600" />
                    Custom Code
                  </label>
                  <input
                    type="text"
                    value={createForm.custom_code}
                    onChange={(e) => setCreateForm({ ...createForm, custom_code: e.target.value })}
                    placeholder="my-custom-link"
                    className="w-full px-2.5 xs:px-3 py-2 text-xs xs:text-sm bg-white border border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                    <Lock className="w-3 h-3 text-primary-600" />
                    Password Protection
                  </label>
                  <input
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Enter password"
                    className="w-full px-2.5 xs:px-3 py-2 text-xs xs:text-sm bg-white border border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
                    <Calendar className="w-3 h-3 text-primary-600" />
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.expires_at}
                    onChange={(e) => setCreateForm({ ...createForm, expires_at: e.target.value })}
                    className="w-full px-2.5 xs:px-3 py-2 text-xs xs:text-sm bg-white border border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 xs:gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({ long_url: '', custom_code: '', password: '', expires_at: '' });
                  }}
                  className="flex-1 px-3 xs:px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-xs xs:text-sm active:scale-95 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 xs:px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:shadow-primary-500/30 transition font-medium text-xs xs:text-sm flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
                >
                  <Link2 className="w-3.5 h-3.5 xs:w-4 xs:h-4" />
                  Create URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
