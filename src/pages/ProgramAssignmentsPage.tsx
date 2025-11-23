import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FileText } from 'lucide-react';

interface ProgramAssignment {
  program_id: string;
  program_name: string;
  user_id: string;
  user_name: string;
  user_nis: string;
  commission_name: string;
  role: string;
  program_start: string;
  program_type: string;
}

export default function ProgramAssignmentsPage() {
  const [assignments, setAssignments] = useState<ProgramAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState('all');
  const [filterMember, setFilterMember] = useState('all');

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      const { data, error } = await supabase
        .from('panitia_assignments')
        .select(`
          program_id,
          user_id,
          role,
          programs(name, type, start_datetime),
          users(name, nis),
          commissions(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: ProgramAssignment[] = (data || []).map((item: any) => ({
        program_id: item.program_id,
        program_name: item.programs?.name || 'Unknown',
        user_id: item.user_id,
        user_name: item.users?.name || 'Unknown',
        user_nis: item.users?.nis || '',
        commission_name: item.commissions?.name || 'Unknown',
        role: item.role,
        program_start: item.programs?.start_datetime || '',
        program_type: item.programs?.type || '',
      }));

      setAssignments(formatted);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  }

  const programs = Array.from(new Set(assignments.map(a => a.program_name)));
  const members = Array.from(new Set(assignments.map(a => a.user_name)));

  const filteredAssignments = assignments.filter(a => {
    const matchesProgram = filterProgram === 'all' || a.program_name === filterProgram;
    const matchesMember = filterMember === 'all' || a.user_name === filterMember;
    return matchesProgram && matchesMember;
  });

  const groupedByProgram = filteredAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.program_name]) {
      acc[assignment.program_name] = [];
    }
    acc[assignment.program_name].push(assignment);
    return acc;
  }, {} as Record<string, ProgramAssignment[]>);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading assignments...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Program Assignments History</h1>
        <p className="text-gray-600">View all program committee assignments</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Program</label>
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Programs</option>
              {programs.map(program => (
                <option key={program} value={program}>{program}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Member</label>
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Members</option>
              {members.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {Object.keys(groupedByProgram).length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Assignments Found</h3>
          <p className="text-gray-600">No committee assignments match your filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProgram).map(([programName, programAssignments]) => {
            const firstAssignment = programAssignments[0];
            return (
              <div key={programName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">{programName}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>{firstAssignment.program_type}</span>
                    <span>•</span>
                    <span>{new Date(firstAssignment.program_start).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{programAssignments.length} members</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {programAssignments.map((assignment, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{assignment.user_name}</p>
                            <p className="text-sm text-gray-600">{assignment.user_nis}</p>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {assignment.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{assignment.commission_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
