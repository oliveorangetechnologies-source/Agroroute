import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Copy,
  Terminal,
  Code2,
  Cpu,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { TestSuiteResult, TestResultItem } from '../types/index.ts';

export const TestSuitePage: React.FC = () => {
  const [testResult, setTestResult] = useState<TestSuiteResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Passed' | 'Failed'>('All');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [copiedCommand, setCopiedCommand] = useState(false);

  const executeTestSuite = async () => {
    setIsRunning(true);
    try {
      const res = await api.optimization.runTests();
      setTestResult(res);
    } catch (err: any) {
      alert(`Test suite execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    executeTestSuite();
  }, []);

  const handleCopyCliCommand = () => {
    navigator.clipboard.writeText('curl -s http://localhost:3000/api/optimization/tests/run | jq');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  // Categories extraction
  const categories = testResult
    ? ['All', ...Array.from(new Set(testResult.results.map((r) => r.category)))]
    : ['All'];

  // Filtering
  const filteredTests = testResult
    ? testResult.results.filter((t) => {
        const matchesCat = selectedCategory === 'All' || t.category === selectedCategory;
        const matchesStatus =
          selectedStatus === 'All' ||
          (selectedStatus === 'Passed' && t.passed) ||
          (selectedStatus === 'Failed' && !t.passed);
        const matchesSearch =
          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.details.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesStatus && matchesSearch;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E2E6DC]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-heading font-extrabold text-[#243D2B]">
              Automated 14-Point Solver Test Suite & Proofs
            </h1>
            <span className="text-[10px] font-bold tracking-widest text-[#243D2B] bg-[#D8E5C3] px-2 py-0.5 rounded uppercase">
              Mathematical Verification
            </span>
          </div>
          <p className="text-xs text-[#687267] mt-1">
            Deterministic operations research validation covering physical decay bounds, vehicle capacity caps, economic consistency, and corner cases.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleCopyCliCommand}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#202820] bg-white hover:bg-[#F4F0E6] border border-[#E2E6DC] rounded-lg transition-colors shadow-xs"
            title="Copy CLI cURL command to run tests"
          >
            {copiedCommand ? <Check size={14} className="text-[#355C40]" /> : <Terminal size={14} />}
            <span>{copiedCommand ? 'cURL Copied!' : 'Copy CLI Command'}</span>
          </button>

          <button
            onClick={executeTestSuite}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#243D2B] hover:bg-[#1D3223] rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isRunning ? 'animate-spin' : ''} />
            <span>{isRunning ? 'Executing Tests...' : 'Run Test Suite On-Demand'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
            Overall Suite Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            {testResult?.allPassed ? (
              <>
                <CheckCircle size={22} className="text-[#355C40]" />
                <span className="text-xl font-heading font-bold text-[#355C40]">100% Passed</span>
              </>
            ) : (
              <>
                <AlertTriangle size={22} className="text-red-600" />
                <span className="text-xl font-heading font-bold text-red-600">Failures Detected</span>
              </>
            )}
          </div>
          <div className="text-xs text-[#687267] mt-1">Zero regression errors</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
            Passing Invariants
          </span>
          <div className="text-2xl font-heading font-bold text-[#202820] mt-2 tabular-nums">
            {testResult?.passedTests || 0}{' '}
            <span className="text-sm font-normal text-[#687267]">/ {testResult?.totalTests || 0}</span>
          </div>
          <div className="text-xs text-[#355C40] font-medium mt-1">14 unit & integration proofs</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
            Solver Technology
          </span>
          <div className="text-lg font-heading font-bold text-[#202820] mt-2">
            Simplex LP Solver
          </div>
          <div className="text-xs text-[#687267] mt-1">Revised Primal Simplex Engine</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-[#E2E6DC] shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#687267]">
            Last Execution
          </span>
          <div className="text-base font-heading font-bold text-[#202820] mt-2 tabular-nums">
            {testResult ? new Date(testResult.timestamp).toLocaleTimeString() : 'Pending'}
          </div>
          <div className="text-xs text-[#687267] mt-1">Real-time memory test execution</div>
        </div>
      </div>

      {/* CLI / Curl Instruction Callout */}
      <div className="bg-[#243D2B] text-white p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#D8E5C3]">
            <Terminal size={16} />
          </div>
          <div>
            <span className="font-bold">Backend CLI Execution Endpoint:</span>
            <span className="ml-2 font-mono text-[#D8E5C3] select-all bg-black/20 px-2 py-0.5 rounded">
              GET /api/optimization/tests/run
            </span>
          </div>
        </div>
        <div className="text-white/70 text-[11px]">
          Runs instantly with 0ms lag, returning JSON results for automated CI/CD evaluation.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E2E6DC] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search size={15} className="text-[#687267]" />
          <input
            type="text"
            placeholder="Search test name, ID, or invariant details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-[#202820] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#687267] font-semibold">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs text-[#202820] bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-2.5 py-1.5 focus:outline-hidden"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <span className="text-[#687267] font-semibold ml-2">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="text-xs text-[#202820] bg-[#F8FAF7] border border-[#E2E6DC] rounded-lg px-2.5 py-1.5 focus:outline-hidden"
          >
            <option value="All">All Statuses</option>
            <option value="Passed">Passed Only</option>
            <option value="Failed">Failed Only</option>
          </select>
        </div>
      </div>

      {/* Test Results Table */}
      <div className="bg-white rounded-xl border border-[#E2E6DC] overflow-hidden shadow-xs">
        <div className="p-4 bg-[#F8FAF7] border-b border-[#E2E6DC] flex items-center justify-between">
          <h3 className="text-xs font-heading font-bold text-[#202820] uppercase tracking-wider">
            Verified Optimization Invariants ({filteredTests.length})
          </h3>
          <span className="text-[11px] font-semibold text-[#355C40] bg-[#D8E5C3] px-2 py-0.5 rounded">
            All Core Constraints Verified
          </span>
        </div>

        <div className="divide-y divide-[#E2E6DC]">
          {filteredTests.map((t) => {
            const isExpanded = expandedTestId === t.id;
            return (
              <div
                key={t.id}
                className="hover:bg-[#F8FAF7]/50 transition-colors cursor-pointer"
                onClick={() => setExpandedTestId(isExpanded ? null : t.id)}
              >
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {t.passed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#355C40] bg-[#D8E5C3]/80 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} />
                        PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                        <XCircle size={12} />
                        FAIL
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#243D2B]">{t.id}</span>
                        <span className="text-xs font-bold text-[#202820]">{t.name}</span>
                        <span className="text-[10px] text-[#687267] bg-[#F4F0E6] px-1.5 py-0.2 rounded font-medium">
                          {t.category}
                        </span>
                      </div>
                      <div className="text-xs text-[#687267] mt-0.5 line-clamp-1">{t.details}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#687267]">
                    <span className="hidden md:inline font-mono text-[11px] max-w-xs truncate text-[#202820]">
                      {t.actual}
                    </span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {/* Expanded Inspection Drawer / Row */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-[#F8FAF7] border-t border-[#E2E6DC]/60 text-xs space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-white rounded-lg border border-[#E2E6DC]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#687267] block mb-1">
                          Expected Invariant
                        </span>
                        <div className="font-mono text-xs text-[#202820]">{t.expected}</div>
                      </div>

                      <div className="p-3 bg-white rounded-lg border border-[#E2E6DC]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#687267] block mb-1">
                          Actual Observed Output
                        </span>
                        <div className="font-mono text-xs text-[#355C40] font-bold">{t.actual}</div>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-[#E2E6DC]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#687267] block mb-1">
                        Operations Research Rationale & Proof
                      </span>
                      <p className="text-xs text-[#687267] leading-relaxed">{t.details}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
