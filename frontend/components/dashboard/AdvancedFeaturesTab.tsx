'use client';

import { useEffect, useState } from 'react';
import { urlAPI, abTestAPI, routingAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { Zap, Route, Plus, Trash2, X, ChevronDown } from 'lucide-react';

interface URLItem {
  code: string;
  short_url: string;
  long_url: string;
}

interface ABVariant {
  url: string;
  weight: number;
  label: string;
}

interface RoutingRule {
  id: string;
  rule_type: string;
  condition: string;
  target_url: string;
  priority: number;
}

export default function AdvancedFeaturesTab() {
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [activeSection, setActiveSection] = useState<'abtest' | 'routing'>('abtest');

  // A/B Test state
  const [abTest, setAbTest] = useState<{ variants: ABVariant[] } | null>(null);
  const [abVariants, setAbVariants] = useState<ABVariant[]>([
    { url: '', weight: 50, label: 'A' },
    { url: '', weight: 50, label: 'B' },
  ]);
  const [savingAB, setSavingAB] = useState(false);

  // Routing Rules state
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [ruleForm, setRuleForm] = useState({ rule_type: 'geo', condition: '', target_url: '', priority: 0 });
  const [addingRule, setAddingRule] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);

  useEffect(() => {
    fetchUrls();
  }, []);

  useEffect(() => {
    if (selectedCode) {
      fetchABTest();
      fetchRules();
    }
  }, [selectedCode]);

  const fetchUrls = async () => {
    try {
      const res = await urlAPI.getAll(1, 100);
      setUrls(res.data.urls || []);
    } catch {}
  };

  const fetchABTest = async () => {
    try {
      const res = await abTestAPI.get(selectedCode);
      setAbTest(res.data);
      setAbVariants(res.data.variants || []);
    } catch (err: any) {
      if (err.response?.status === 404) setAbTest(null);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await routingAPI.getAll(selectedCode);
      setRules(res.data || []);
    } catch {}
  };

  const handleSaveABTest = async () => {
    const total = abVariants.reduce((s, v) => s + v.weight, 0);
    if (total !== 100) { toast.error('Weights must sum to 100'); return; }
    if (abVariants.some((v) => !v.url)) { toast.error('All variant URLs required'); return; }

    setSavingAB(true);
    try {
      await abTestAPI.create(selectedCode, abVariants);
      toast.success('A/B test saved!');
      fetchABTest();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save A/B test');
    } finally { setSavingAB(false); }
  };

  const handleDeleteABTest = async () => {
    if (!confirm('Delete A/B test?')) return;
    try {
      await abTestAPI.delete(selectedCode);
      toast.success('A/B test removed');
      setAbTest(null);
      setAbVariants([{ url: '', weight: 50, label: 'A' }, { url: '', weight: 50, label: 'B' }]);
    } catch { toast.error('Failed to delete'); }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.condition || !ruleForm.target_url) { toast.error('All fields required'); return; }
    setAddingRule(true);
    try {
      await routingAPI.create(selectedCode, ruleForm as any);
      toast.success('Routing rule added!');
      setRuleForm({ rule_type: 'geo', condition: '', target_url: '', priority: 0 });
      setShowRuleForm(false);
      fetchRules();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add rule');
    } finally { setAddingRule(false); }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await routingAPI.delete(selectedCode, ruleId);
      toast.success('Rule deleted');
      fetchRules();
    } catch { toast.error('Failed to delete rule'); }
  };

  const updateVariant = (i: number, field: keyof ABVariant, value: string | number) => {
    const updated = [...abVariants];
    (updated[i] as any)[field] = value;
    setAbVariants(updated);
  };

  const conditionPlaceholder = ruleForm.rule_type === 'geo'
    ? 'Country code (e.g. IN, US, GB)'
    : ruleForm.rule_type === 'device'
    ? 'mobile / desktop / tablet'
    : 'iOS / Android / Windows';

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">Advanced Features</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">A/B Testing aur Smart Routing configure karo</p>
      </div>

      {/* URL Selector */}
      <div>
        <label className="text-sm font-medium text-slate-700 block mb-1.5">Select URL</label>
        <div className="relative">
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white pr-8"
          >
            <option value="">-- Select a URL --</option>
            {urls.map((u) => (
              <option key={u.code} value={u.code}>
                {u.code} — {u.long_url.substring(0, 50)}{u.long_url.length > 50 ? '...' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {selectedCode && (
        <>
          {/* Section tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveSection('abtest')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeSection === 'abtest'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              A/B Testing
            </button>
            <button
              onClick={() => setActiveSection('routing')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
                activeSection === 'routing'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Route className="w-4 h-4" />
              Smart Routing
              {rules.length > 0 && (
                <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">{rules.length}</span>
              )}
            </button>
          </div>

          {/* A/B Test Section */}
          {activeSection === 'abtest' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Traffic ko multiple destinations pe split karo</p>
                {abTest && (
                  <button onClick={handleDeleteABTest} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />
                    Remove Test
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {abVariants.map((v, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {v.label || String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        value={v.label}
                        onChange={(e) => updateVariant(i, 'label', e.target.value)}
                        placeholder="Variant label"
                        className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {abVariants.length > 2 && (
                        <button onClick={() => setAbVariants(abVariants.filter((_, idx) => idx !== i))} className="p-1 hover:bg-red-50 rounded-lg">
                          <X className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="url"
                          value={v.url}
                          onChange={(e) => updateVariant(i, 'url', e.target.value)}
                          placeholder="https://destination-url.com"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={v.weight}
                          onChange={(e) => updateVariant(i, 'weight', parseInt(e.target.value) || 0)}
                          min={1}
                          max={99}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <span className="text-sm text-slate-500 flex-shrink-0">%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setAbVariants([...abVariants, { url: '', weight: 0, label: String.fromCharCode(65 + abVariants.length) }])}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Variant
                </button>
                <span className={`text-sm font-medium ${abVariants.reduce((s, v) => s + v.weight, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {abVariants.reduce((s, v) => s + v.weight, 0)}%
                </span>
              </div>

              <button
                onClick={handleSaveABTest}
                disabled={savingAB}
                className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-medium text-sm hover:bg-primary-700 transition disabled:opacity-50"
              >
                {savingAB ? 'Saving...' : abTest ? 'Update A/B Test' : 'Create A/B Test'}
              </button>
            </div>
          )}

          {/* Smart Routing Section */}
          {activeSection === 'routing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Geo/Device ke basis pe alag URLs pe redirect karo</p>
                <button
                  onClick={() => setShowRuleForm(!showRuleForm)}
                  className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Rule
                </button>
              </div>

              {showRuleForm && (
                <form onSubmit={handleAddRule} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Rule Type</label>
                      <select
                        value={ruleForm.rule_type}
                        onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value, condition: '' })}
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="geo">Geo (Country)</option>
                        <option value="device">Device</option>
                        <option value="os">OS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-1">Condition</label>
                      <input
                        type="text"
                        value={ruleForm.condition}
                        onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                        placeholder={conditionPlaceholder}
                        required
                        className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Target URL</label>
                    <input
                      type="url"
                      value={ruleForm.target_url}
                      onChange={(e) => setRuleForm({ ...ruleForm, target_url: e.target.value })}
                      placeholder="https://destination.com"
                      required
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowRuleForm(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={addingRule} className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition disabled:opacity-50">
                      {addingRule ? 'Adding...' : 'Add Rule'}
                    </button>
                  </div>
                </form>
              )}

              {rules.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                  <Route className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No routing rules yet</p>
                  <p className="text-xs text-slate-400 mt-1">Example: India users → Hindi page, iOS → App Store</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <div key={rule.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            rule.rule_type === 'geo' ? 'bg-blue-100 text-blue-700' :
                            rule.rule_type === 'device' ? 'bg-purple-100 text-purple-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {rule.rule_type}
                          </span>
                          <span className="text-sm font-semibold text-slate-800">{rule.condition}</span>
                          <span className="text-slate-400 text-xs">→</span>
                          <span className="text-xs text-slate-600 truncate">{rule.target_url}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 hover:bg-red-50 rounded-lg flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {!selectedCode && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Zap className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Select a URL above to configure advanced features</p>
        </div>
      )}
    </div>
  );
}
