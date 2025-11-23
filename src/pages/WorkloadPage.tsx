import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Commission } from '../types';
import { AlertCircle, Award } from 'lucide-react';

export default function WorkloadPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRes, commissionsRes] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('is_active', true)
          .order('total_assigned_programs', { ascending: false }),
        supabase.from('commissions').select('*'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (commissionsRes.error) throw commissionsRes.error;

      setUsers(usersRes.data || []);
      setCommissions(commissionsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading workload data...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Member Workload</h1>
        <p className="text-gray-600">Monitor committee member assignments and balance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Total Members</h3>
            <Award className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{users.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Avg Assignments</h3>
            <Award className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {users.length > 0
              ? (users.reduce((sum, u) => sum + u.total_assigned_programs, 0) / users.length).toFixed(1)
              : 0}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Overloaded</h3>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {users.filter(u => u.total_assigned_programs > 5).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                NIS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Commission
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Programs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const commission = commissions.find(c => c.id === user.commission_id);
              const isOverloaded = user.total_assigned_programs > 5;
              const isHeavy = user.total_assigned_programs > 3;

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.nis}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {commission?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-lg font-semibold text-gray-900">
                      {user.total_assigned_programs}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isOverloaded ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        Overloaded
                      </span>
                    ) : isHeavy ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        Heavy
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        Available
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
