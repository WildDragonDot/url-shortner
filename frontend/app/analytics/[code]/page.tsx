'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { analyticsAPI, urlAPI, abTestAPI, routingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';
import { 
  ArrowLeft, Globe, Monitor, Calendar, MousePointerClick, 
  TrendingUp, MapPin, Smartphone, Clock, ExternalLink, Copy,
  BarChart3, Activity, QrCode, Download, Lock, AlertCircle, Edit2, Trash2, ToggleLeft, ToggleRight,
  Zap, Route, Tag, Share2, Users, Eye
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [urlInfo, setUrlInfo] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [countryData, setCountryData] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [browserData, setBrowserData] = useState<any[]>([]);
  const [osData, setOsData] = useState<any[]>([]);
  const [referrerData, setReferrerData] = useState<any[]>([]);
  const [timeseriesData, setTimeseriesData] = useState<any[]>([]);
  const [abTest, setAbTest] = useState<any>(null);
  const [routingRules, setRoutingRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    long_url: '',
    expires_at: ''
  });

  useEffect(() => {
    fetchAnalytics();
    fetchUrlInfo();
    fetchAdvancedFeatures();
  }, [code]);

  const fetchUrlInfo = async () => {
    try {
      const res = await urlAPI.getAll(1, 100);
      const url = res.data.urls?.find((u: any) => u.code === code);
      if (url) {
        setUrlInfo(url);
        setEditForm({
          long_url: url.long_url,
          expires_at: url.expires_at ? new Date(url.expires_at).toISOString().slice(0, 16) : ''
        });
      }
    } catch (err) {
      // Failed to fetch URL info silently
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this URL? This action cannot be undone.')) return;
    try {
      await urlAPI.delete(code);
      toast.success('✅ URL deleted successfully');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('❌ Failed to delete URL');
    }
  };

  const handleToggle = async () => {
    try {
      await urlAPI.toggle(code);
      toast.success('✅ Status updated');
      fetchUrlInfo();
    } catch (err: any) {
      toast.error('❌ Failed to update status');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await urlAPI.update(code, {
        long_url: editForm.long_url,
        expires_at: editForm.expires_at || undefined
      });
      toast.success('✅ URL updated successfully');
      setShowEditModal(false);
      fetchUrlInfo();
    } catch (err: any) {
      toast.error('❌ Failed to update URL');
    }
  };

  const fetchAdvancedFeatures = async () => {
    try {
      // Fetch A/B test if exists
      try {
        const abTestRes = await abTestAPI.get(code);
        setAbTest(abTestRes.data);
      } catch (err: any) {
        // No A/B test configured - that's okay
        if (err.response?.status !== 404) {
          // A/B test fetch failed silently
        }
      }

      // Fetch routing rules if exist
      try {
        const routingRes = await routingAPI.getAll(code);
        setRoutingRules(routingRes.data || []);
      } catch (err: any) {
        // Routing rules fetch failed silently
      }
    } catch (err) {
      // Advanced features fetch failed silently
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const summaryRes = await analyticsAPI.getSummary(code);
      
      setSummary(summaryRes.data);
      
      // Fetch breakdown data - backend supports: country, device, browser, os, referrer
      const [countryRes, deviceRes, browserRes, osRes, referrerRes, timeseriesRes] = await Promise.all([
        analyticsAPI.getBreakdown(code, 'country'),
        analyticsAPI.getBreakdown(code, 'device'),
        analyticsAPI.getBreakdown(code, 'browser'),
        analyticsAPI.getBreakdown(code, 'os'),
        analyticsAPI.getBreakdown(code, 'referrer'),
        analyticsAPI.getTimeseries(code, 'day', 7),
      ]);

      // Transform breakdown data - backend returns 'label' not specific keys
      setCountryData((countryRes.data || []).map((item: any) => ({
        country: item.label,
        count: item.count
      })));
      
      setDeviceData((deviceRes.data || []).map((item: any) => ({
        device: item.label,
        count: item.count
      })));
      
      setBrowserData((browserRes.data || []).map((item: any) => ({
        browser: item.label,
        count: item.count
      })));

      setOsData((osRes.data || []).map((item: any) => ({
        os: item.label,
        count: item.count
      })));

      setReferrerData((referrerRes.data || []).map((item: any) => ({
        referrer: item.label === 'null' ? 'Direct' : item.label,
        count: item.count
      })));
      
      setTimeseriesData(timeseriesRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('📋 Copied to clipboard!');
  };

  const shareQRCode = async () => {
    const shortUrl = `http://localhost:3000/${code}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Short URL QR Code',
          text: `Scan this QR code to visit: ${shortUrl}`,
          url: shortUrl,
        });
        toast.success('✅ Shared successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback: copy URL
      copyToClipboard(shortUrl);
      toast.success('📋 URL copied! Share it manually.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex p-4 bg-red-100 rounded-2xl mb-4">
            <BarChart3 className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Data Available</h2>
          <p className="text-slate-600 mb-6">Unable to load analytics for this URL</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalClicks = summary.total_clicks || 0;
  const uniqueClicks = summary.unique_clicks || 0;
  const clicksToday = summary.clicks_today || 0;
  const clicksThisWeek = summary.clicks_this_week || 0;
  const clicksThisMonth = summary.clicks_this_month || 0;
  const last7DaysClicks = timeseriesData.reduce((sum, d) => sum + (d.clicks || 0), 0);

  // Calculate click rate
  const clickRate = urlInfo && urlInfo.created_at 
    ? (totalClicks / Math.max(1, Math.ceil((Date.now() - new Date(urlInfo.created_at).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with URL Details */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-3 sm:mb-4 font-medium text-sm sm:text-base"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Back to Dashboard
          </Link>
          
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Main Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">Analytics</h1>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {/* Short URL */}
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Short URL</label>
                      <div className="flex items-center gap-2">
                        <a
                          href={`http://localhost:3000/${code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-1 hover:underline text-sm sm:text-base md:text-lg break-all"
                        >
                          <span className="hidden sm:inline">http://localhost:3000/{code}</span>
                          <span className="sm:hidden">{code}</span>
                          <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        </a>
                        <button
                          onClick={() => copyToClipboard(`http://localhost:3000/${code}`)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition flex-shrink-0"
                          title="Copy URL"
                        >
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Original URL */}
                    {urlInfo && (
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Original URL</label>
                        <p className="text-xs sm:text-sm text-slate-700 truncate">{urlInfo.long_url}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {urlInfo && (
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={handleToggle}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium text-xs sm:text-sm text-slate-700"
                      title={urlInfo.status === 'active' ? 'Disable URL' : 'Enable URL'}
                    >
                      {urlInfo.status === 'active' ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                          <span className="hidden xs:inline">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                          <span className="hidden xs:inline">Disabled</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition font-medium text-xs sm:text-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Edit</span>
                    </button>

                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition font-medium text-xs sm:text-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden xs:inline">Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* URL Metadata */}
            {urlInfo && (
              <div className="p-4 sm:p-6 bg-slate-50 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Created</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-900">
                    {new Date(urlInfo.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    <MousePointerClick className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Clicks</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-900">{urlInfo.click_count || 0}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Status</span>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
                    urlInfo.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {urlInfo.status}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden xs:inline">Expiry</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                    {urlInfo.expires_at 
                      ? new Date(urlInfo.expires_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric'
                        })
                      : 'Never'}
                  </p>
                </div>

                {urlInfo.has_password && (
                  <div className="col-span-2 sm:col-span-1">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden xs:inline">Protection</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-700">
                      Protected
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Section */}
        {urlInfo && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
              <div className="relative group/qr">
                <div className="relative p-3 sm:p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
                  <QRCodeSVG 
                    id={`qr-${code}`}
                    value={`http://localhost:3000/${code}`}
                    size={140}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              
              <div className="flex-1 space-y-3 sm:space-y-4 w-full">
                <div>
                  <h3 className="font-bold text-slate-900 mb-1 flex items-center gap-2 text-sm sm:text-base">
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                    QR Code
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600">Scan to visit your short URL instantly</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`http://localhost:3000/${code}/qr?format=png&size=512`}
                    download={`qr-${code}.png`}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg sm:rounded-xl transition-all font-medium text-xs sm:text-sm shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Download PNG</span>
                    <span className="xs:hidden">PNG</span>
                  </a>
                  
                  <a
                    href={`http://localhost:3000/${code}/qr?format=svg`}
                    download={`qr-${code}.svg`}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg sm:rounded-xl transition-all font-medium text-xs sm:text-sm"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Download SVG</span>
                    <span className="xs:hidden">SVG</span>
                  </a>

                  <button
                    onClick={shareQRCode}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg sm:rounded-xl transition-all font-medium text-xs sm:text-sm"
                  >
                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Share</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            icon={<MousePointerClick className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
            label="Total Clicks"
            value={totalClicks}
            bgColor="bg-blue-100"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
            label="Unique Visitors"
            value={uniqueClicks}
            bgColor="bg-purple-100"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />}
            label="Today"
            value={clicksToday}
            bgColor="bg-green-100"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />}
            label="This Week"
            value={clicksThisWeek}
            bgColor="bg-orange-100"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-pink-600" />}
            label="This Month"
            value={clicksThisMonth}
            bgColor="bg-pink-100"
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />}
            label="Avg/Day"
            value={clickRate}
            bgColor="bg-indigo-100"
          />
        </div>

        {totalClicks === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-slate-200">
            <div className="inline-flex p-4 bg-slate-100 rounded-2xl mb-4">
              <BarChart3 className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Clicks Yet</h3>
            <p className="text-slate-600 mb-6">
              Share your short URL to start collecting analytics data
            </p>
            <button
              onClick={() => copyToClipboard(`http://localhost:3000/${code}`)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-semibold"
            >
              <Copy className="w-5 h-5" />
              Copy Short URL
            </button>
          </div>
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Timeseries Line Chart */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Clicks Over Time</h3>
                </div>
                {timeseriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={timeseriesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280" 
                        fontSize={10}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12 text-sm">No time data yet</p>
                )}
              </div>

              {/* Timeseries Area Chart */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Clicks Trend</h3>
                </div>
                {timeseriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={timeseriesData}>
                      <defs>
                        <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280" 
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="clicks" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorClicks)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No time data yet</p>
                )}
              </div>

              {/* Device Breakdown - Pie Chart */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Device Breakdown (Pie)</h3>
                </div>
                {deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={deviceData}
                        dataKey="count"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(props: any) => `${props.device}: ${(props.percent * 100).toFixed(0)}%`}
                      >
                        {deviceData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No device data yet</p>
                )}
              </div>

              {/* Device Breakdown - Radial Bar Chart */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Device Distribution (Radial)</h3>
                </div>
                {deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <RadialBarChart 
                      cx="50%" 
                      cy="50%" 
                      innerRadius="20%" 
                      outerRadius="90%" 
                      data={deviceData.map((item, index) => ({
                        ...item,
                        fill: COLORS[index % COLORS.length]
                      }))}
                    >
                      <RadialBar
                        minAngle={15}
                        label={{ position: 'insideStart', fill: '#fff', fontSize: 12 }}
                        background
                        dataKey="count"
                      />
                      <Legend 
                        iconSize={10}
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        formatter={(value, entry: any) => `${entry.payload.device}: ${entry.payload.count}`}
                      />
                      <Tooltip />
                    </RadialBarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No device data yet</p>
                )}
              </div>
            </div>

            {/* Country and Browser Breakdown */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Country Breakdown - Vertical Bar */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Top Countries (Bar)</h3>
                </div>
                {countryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countryData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="country" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No country data yet</p>
                )}
              </div>

              {/* Country Breakdown - Horizontal Bar */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Geographic Distribution</h3>
                </div>
                {countryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={countryData.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} />
                      <YAxis type="category" dataKey="country" stroke="#6b7280" fontSize={12} width={80} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No country data yet</p>
                )}
              </div>

              {/* Browser Breakdown - Vertical Bar */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Top Browsers</h3>
                </div>
                {browserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={browserData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="browser" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No browser data yet</p>
                )}
              </div>

              {/* Browser Breakdown - Pie Chart */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Browser Share</h3>
                </div>
                {browserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={browserData.slice(0, 6)}
                        dataKey="count"
                        nameKey="browser"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry: any) => `${entry.browser}: ${entry.count}`}
                      >
                        {browserData.slice(0, 6).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No browser data yet</p>
                )}
              </div>
            </div>

            {/* OS and Referrer Breakdown */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* OS Breakdown */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Operating Systems</h3>
                </div>
                {osData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={osData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="os" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-500 text-center py-12">No OS data yet</p>
                )}
              </div>

              {/* Referrer Sources */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Traffic Sources</h3>
                </div>
                {referrerData.length > 0 ? (
                  <div className="space-y-3">
                    {referrerData.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {item.referrer}
                          </p>
                          <div className="mt-1 w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-primary-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${(item.count / referrerData[0].count) * 100}%` 
                              }}
                            />
                          </div>
                        </div>
                        <span className="ml-4 text-sm font-semibold text-slate-900">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-12">No referrer data yet</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Advanced Features Section */}
        {(abTest || routingRules.length > 0) && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary-600" />
              Advanced Features
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-6">
              {/* A/B Testing */}
              {abTest && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Zap className="w-5 h-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">A/B Testing</h3>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      Active
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4">
                    Traffic is being split across {abTest.variants?.length || 0} variants
                  </p>
                  
                  <div className="space-y-3">
                    {abTest.variants?.map((variant: any, index: number) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {variant.label || `Variant ${String.fromCharCode(65 + index)}`}
                          </span>
                          <span className="text-sm font-bold text-primary-600">
                            {variant.weight}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{variant.url}</p>
                        <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all"
                            style={{ width: `${variant.weight}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Routing Rules */}
              {routingRules.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Route className="w-5 h-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Smart Routing</h3>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      {routingRules.length} {routingRules.length === 1 ? 'Rule' : 'Rules'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4">
                    Conditional redirects based on user location, device, or OS
                  </p>
                  
                  <div className="space-y-3">
                    {routingRules.slice(0, 5).map((rule: any, index: number) => (
                      <div key={index} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              rule.rule_type === 'geo' ? 'bg-green-100 text-green-700' :
                              rule.rule_type === 'device' ? 'bg-orange-100 text-orange-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {rule.rule_type.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              {rule.condition}
                            </span>
                          </div>
                          {rule.priority > 0 && (
                            <span className="text-xs text-slate-500">
                              Priority: {rule.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 truncate mt-1">
                          → {rule.target_url}
                        </p>
                      </div>
                    ))}
                    {routingRules.length > 5 && (
                      <p className="text-xs text-slate-500 text-center pt-2">
                        +{routingRules.length - 5} more rules
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UTM Parameters Info */}
        {urlInfo?.utm_source || urlInfo?.utm_medium || urlInfo?.utm_campaign && (
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Tag className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">UTM Parameters</h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {urlInfo.utm_source && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                      Source
                    </label>
                    <p className="text-sm font-medium text-slate-900">{urlInfo.utm_source}</p>
                  </div>
                )}
                {urlInfo.utm_medium && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                      Medium
                    </label>
                    <p className="text-sm font-medium text-slate-900">{urlInfo.utm_medium}</p>
                  </div>
                )}
                {urlInfo.utm_campaign && (
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                      Campaign
                    </label>
                    <p className="text-sm font-medium text-slate-900">{urlInfo.utm_campaign}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && urlInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Edit2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit URL</h2>
                  <p className="text-xs text-slate-500">Update your short URL details</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  <ExternalLink className="w-3.5 h-3.5 text-primary-600" />
                  Original URL
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={editForm.long_url}
                  onChange={(e) => setEditForm({ ...editForm, long_url: e.target.value })}
                  placeholder="https://example.com/your-url"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-primary-600" />
                  Expiry Date
                  <span className="text-xs text-slate-400">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={editForm.expires_at}
                  onChange={(e) => setEditForm({ ...editForm, expires_at: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:shadow-lg hover:shadow-primary-500/30 transition font-medium text-sm flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Update URL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  bgColor 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-2">
        <div className={`p-1.5 sm:p-2 ${bgColor} rounded-lg flex-shrink-0`}>{icon}</div>
        <span className="text-xs sm:text-sm font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
