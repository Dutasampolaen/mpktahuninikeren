import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FileText, Users, ClipboardCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Stats {
  totalPrograms: number;
  pendingScores: number;
  activeAssignments: number;
  overloadedMembers: number;
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalPrograms: 0,
    pendingScores: 0,
    activeAssignments: 0,
    overloadedMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const [programs, scores, assignments, users] = await Promise.all([
        api.programs.list(),
        api.scores.list({ grader_id: user?.id }),
        api.panitiaAssignments.list(),
        api.users.list(),
      ]);

      const pendingScores = scores.filter((s: any) => s.is_draft && s.grader_id === user?.id);
      const overloadedMembers = users.filter((u: any) => u.is_active && u.total_assigned_programs > 5);

      setStats({
        totalPrograms: programs.length,
        pendingScores: pendingScores.length,
        activeAssignments: assignments.length,
        overloadedMembers: overloadedMembers.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      name: 'Total Programs',
      value: stats.totalPrograms,
      icon: FileText,
      color: 'bg-blue-500',
      show: isAdmin,
    },
    {
      name: 'Pending Scores',
      value: stats.pendingScores,
      icon: ClipboardCheck,
      color: 'bg-yellow-500',
      show: true,
    },
    {
      name: 'Active Assignments',
      value: stats.activeAssignments,
      icon: Users,
      color: 'bg-green-500',
      show: isAdmin,
    },
    {
      name: 'Overloaded Members',
      value: stats.overloadedMembers,
      icon: AlertCircle,
      color: 'bg-red-500',
      show: isAdmin,
    },
  ].filter(card => card.show);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {isAdmin && (
              <>
                <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                  <p className="font-medium text-blue-900">Create New Program</p>
                  <p className="text-sm text-blue-700">Submit a new program proposal</p>
                </button>
                <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <p className="font-medium text-green-900">Assign Panitia</p>
                  <p className="text-sm text-green-700">Generate committee assignments</p>
                </button>
              </>
            )}
            <button className="w-full text-left px-4 py-3 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
              <p className="font-medium text-yellow-900">View My Scoring Tasks</p>
              <p className="text-sm text-yellow-700">Complete pending score submissions</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="text-sm text-gray-600 italic">No recent activity</div>
          </div>
        </div>
      </div>
    </div>
  );
}
