import React, { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import { ProjectStatistics } from '../types';
import { BarChart2, CheckCircle2, AlertTriangle, Users, ArrowUpRight, TrendingUp } from 'lucide-react';

interface ReportingDashboardProps {
  projectId: string | null;
}

export default function ReportingDashboard({ projectId }: ReportingDashboardProps) {
  const [stats, setStats] = useState<ProjectStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = projectId ? `?projectId=${projectId}` : '';
        const data = await apiRequest<ProjectStatistics>(`/api/dashboard${query}`);
        if (active) {
          setStats(data);
        }
      } catch (err: any) {
        if (active) {
          setError(err.message || 'Failed to load visual reports.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    return () => {
      active = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-900"></div>
        <span className="ml-3 text-zinc-500 font-mono text-xs">Computing report metrics...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 text-center">
        {error || 'No stats found.'}
      </div>
    );
  }

  // Calculate percentages safely
  const total = stats.totalIssuesCount || 0;
  const donePercent = total > 0 ? Math.round((stats.doneCount / total) * 100) : 0;
  const progressPercent = total > 0 ? Math.round(((stats.inProgressCount + stats.reviewCount + stats.doneCount) / total) * 100) : 0;

  // Render Priorities colors
  const priorityDistribution = [
    { name: 'Completed', count: stats.doneCount, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { name: 'Under Review', count: stats.reviewCount, color: 'bg-amber-500', text: 'text-amber-700' },
    { name: 'In Progress', count: stats.inProgressCount, color: 'bg-blue-500', text: 'text-blue-700' },
    { name: 'To Do Later', count: stats.todoCount, color: 'bg-zinc-400', text: 'text-zinc-600' }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Total Issues</span>
            <BarChart2 className="h-4 w-4 text-zinc-400" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-zinc-900 tracking-tight">{stats.totalIssuesCount}</h4>
            <p className="text-xs text-zinc-500 mt-1">Accumulated in this project</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Completed Tasks</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-emerald-600 tracking-tight">{stats.doneCount}</h4>
            <p className="text-xs text-zinc-500 mt-1">{donePercent}% task closure completion rate</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Hot Items / High Priority</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-red-600 tracking-tight">{stats.highPriorityCount}</h4>
            <p className="text-xs text-zinc-500 mt-1">High/Critical tasks requiring attention</p>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider font-mono">Active Progress Index</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-blue-600 tracking-tight">{progressPercent}%</h4>
            <p className="text-xs text-zinc-500 mt-1">Tickets in-flight (non-todo)</p>
          </div>
        </div>
      </div>

      {/* Main Stats Panel Group */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Progress Meter */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 lg:col-span-2 space-y-6">
          <div className="border-b border-zinc-100 pb-3 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-zinc-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Progress Index Analysis
            </h3>
            <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-600">Total: {total}</span>
          </div>

          {/* Visual Bar representation */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-zinc-600 mb-1">
                <span>Task Closure Breakdown</span>
                <span className="font-semibold">{donePercent}% Finished</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${donePercent}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-600 mb-1">
                <span>Overall Project In-flight Index</span>
                <span className="font-semibold">{progressPercent}% in progress, review or completed</span>
              </div>
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Detailed distribution percentages */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3">
            {priorityDistribution.map(item => {
              const itemPct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.name} className="border border-zinc-100 rounded-lg p-3 bg-zinc-50/50">
                  <span className="text-xs text-zinc-500 block truncate">{item.name}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold text-zinc-800">{item.count}</span>
                    <span className="text-xs font-mono text-zinc-500">({itemPct}%)</span>
                  </div>
                  <div className="w-full bg-zinc-200 h-1.5 mt-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full`} style={{ width: `${itemPct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Team Members Load distribution */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
          <div className="border-b border-zinc-100 pb-3 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-zinc-900 tracking-tight flex items-center gap-2">
              <Users className="h-4 w-4" /> Team workload allocation
            </h3>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {Object.keys(stats.assigneeDistribution).length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs font-mono">
                No tickets assigned to team members yet.
              </div>
            ) : (
              Object.entries(stats.assigneeDistribution).map(([name, count]) => {
                const maxVal = Math.max(...(Object.values(stats.assigneeDistribution) as number[]), 1);
                const progressWidth = Math.round(((count as number) / maxVal) * 100);
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-700 truncate">{name}</span>
                      <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600 font-bold">{count} tasks</span>
                    </div>
                    <div className="w-full bg-zinc-50 h-2 rounded overflow-hidden">
                      <div 
                        className="bg-zinc-700 h-full rounded" 
                        style={{ width: `${progressWidth}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
