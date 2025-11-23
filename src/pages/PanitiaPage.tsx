import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Program, PanitiaAssignment, User, Commission } from '../types';
import { Users, RefreshCw, Save, Lock, Unlock, AlertTriangle, Plus } from 'lucide-react';
import { PANITIA_ROLES } from '../types';

export default function PanitiaPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading programs...</div>;
  }

  if (selectedProgram) {
    return (
      <PanitiaAssignmentForm
        program={selectedProgram}
        onBack={() => setSelectedProgram(null)}
        onSaved={() => {
          setSelectedProgram(null);
          loadPrograms();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Panitia Assignment</h1>
        <p className="text-gray-600">Assign committee members to programs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <div
            key={program.id}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setSelectedProgram(program)}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{program.name}</h3>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Type: {program.type}</p>
              <p>Date: {new Date(program.start_datetime).toLocaleDateString()}</p>
              <p>Status: {program.status}</p>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Manage Panitia</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanitiaAssignmentForm({
  program,
  onBack,
  onSaved,
}: {
  program: Program;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [assignments, setAssignments] = useState<PanitiaAssignment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('panitia-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'panitia_assignments',
        filter: `program_id=eq.${program.id}`
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [program.id]);

  async function loadData() {
    try {
      const [assignmentsRes, usersRes, commissionsRes] = await Promise.all([
        supabase
          .from('panitia_assignments')
          .select('*')
          .eq('program_id', program.id),
        supabase
          .from('users')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('commissions')
          .select('*')
          .order('name'),
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (usersRes.error) throw usersRes.error;
      if (commissionsRes.error) throw commissionsRes.error;

      setAssignments(assignmentsRes.data || []);
      setUsers(usersRes.data || []);
      setCommissions(commissionsRes.data || []);

      await checkConflicts(assignmentsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkConflicts(currentAssignments: PanitiaAssignment[]) {
    try {
      const conflictList: any[] = [];

      for (const assignment of currentAssignments) {
        const { data, error } = await supabase.rpc('check_time_conflicts', {
          p_user_id: assignment.user_id,
          p_start_datetime: program.start_datetime,
          p_end_datetime: program.end_datetime,
          p_exclude_program_id: program.id,
        });

        if (error) {
          console.error('Error checking conflicts:', error);
          continue;
        }

        if (data && data.length > 0) {
          const user = users.find(u => u.id === assignment.user_id);
          conflictList.push({
            user,
            assignment,
            conflicts: data,
          });
        }
      }

      setConflicts(conflictList);
    } catch (error) {
      console.error('Error checking conflicts:', error);
    }
  }

  async function generatePanitia() {
    setGenerating(true);
    try {
      const { data: availableMembers, error } = await supabase.rpc(
        'get_available_members_for_timerange',
        {
          p_start_datetime: program.start_datetime,
          p_end_datetime: program.end_datetime,
        }
      );

      if (error) throw error;

      if (!availableMembers || availableMembers.length < 3) {
        alert('Not enough available members to form a committee for this program!');
        return;
      }

      const commissionGroups = new Map<string, User[]>();
      availableMembers.forEach((member: any) => {
        if (!commissionGroups.has(member.commission_id)) {
          commissionGroups.set(member.commission_id, []);
        }
        commissionGroups.get(member.commission_id)!.push(member);
      });

      if (commissionGroups.size < 3) {
        alert('Not enough commission diversity. Need at least 3 different commissions!');
        return;
      }

      const requiredRoles = ['ketua', 'sekretaris', 'bendahara', 'divisi_acara'];
      const newAssignments: Partial<PanitiaAssignment>[] = [];
      const assignedUserIds = new Set<string>();

      const komisiBMembers = availableMembers.filter((m: any) =>
        commissions.find(c => c.id === m.commission_id && c.name === 'Komisi B')
      );

      if (komisiBMembers.length === 0) {
        alert('No Komisi B members available! Komisi B is required for divisi_acara role.');
        return;
      }

      for (const role of requiredRoles) {
        let selectedMember: any = null;

        if (role === 'divisi_acara') {
          selectedMember = komisiBMembers.find((m: any) => !assignedUserIds.has(m.id));
        } else {
          selectedMember = availableMembers.find((m: any) => !assignedUserIds.has(m.id));
        }

        if (selectedMember) {
          newAssignments.push({
            program_id: program.id,
            user_id: selectedMember.id,
            role,
            commission_id: selectedMember.commission_id,
            is_required_role: true,
            is_locked: false,
          });
          assignedUserIds.add(selectedMember.id);
        }
      }

      if (newAssignments.length < 3) {
        alert('Could not generate minimum required committee members!');
        return;
      }

      await supabase.from('panitia_assignments').delete().eq('program_id', program.id);

      const { error: insertError } = await supabase
        .from('panitia_assignments')
        .insert(newAssignments);

      if (insertError) throw insertError;

      alert('Panitia generated successfully!');
      await loadData();
    } catch (error) {
      console.error('Error generating panitia:', error);
      alert('Failed to generate panitia');
    } finally {
      setGenerating(false);
    }
  }

  async function toggleLock(assignmentId: string, currentLockState: boolean) {
    try {
      const { error } = await supabase
        .from('panitia_assignments')
        .update({ is_locked: !currentLockState })
        .eq('id', assignmentId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  }

  async function removeAssignment(assignmentId: string) {
    try {
      const { error } = await supabase
        .from('panitia_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading panitia assignments...</div>;
  }

  const assignedCommissions = new Set(assignments.map(a => a.commission_id));
  const hasKomisiB = assignments.some(a => {
    const commission = commissions.find(c => c.id === a.commission_id);
    return commission?.name === 'Komisi B' && a.role === 'divisi_acara';
  });

  return (
    <div>
      <button onClick={onBack} className="mb-6 text-blue-600 hover:text-blue-700 font-medium">
        ← Back to Programs
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{program.name}</h1>
        <p className="text-gray-600 mb-4">{program.description}</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Start:</span>
            <p className="text-gray-900">{new Date(program.start_datetime).toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">End:</span>
            <p className="text-gray-900">{new Date(program.end_datetime).toLocaleString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Type:</span>
            <p className="text-gray-900">{program.type}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <p className="text-gray-900">{program.status}</p>
          </div>
        </div>
      </div>

      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2">Time Conflicts Detected!</h3>
              <div className="space-y-2 text-sm text-red-800">
                {conflicts.map((conflict, idx) => (
                  <div key={idx}>
                    <strong>{conflict.user?.name}</strong> has {conflict.conflicts.length} conflicting program(s)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Committee Assignments</h2>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className={assignedCommissions.size >= 3 ? 'text-green-600' : 'text-red-600'}>
                {assignedCommissions.size}/3 commissions
              </span>
              <span className={hasKomisiB ? 'text-green-600' : 'text-red-600'}>
                {hasKomisiB ? '✓' : '✗'} Komisi B in divisi_acara
              </span>
              <span className={assignments.length >= 3 ? 'text-green-600' : 'text-red-600'}>
                {assignments.length} members
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>Bulk Add</span>
            </button>
            <button
              onClick={generatePanitia}
              disabled={generating}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generating...' : 'Generate Panitia'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No assignments yet. Click Generate Panitia to create assignments automatically.
            </div>
          ) : (
            assignments.map((assignment) => {
              const user = users.find(u => u.id === assignment.user_id);
              const commission = commissions.find(c => c.id === assignment.commission_id);

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium text-gray-900">{user?.name}</p>
                        <p className="text-sm text-gray-600">
                          {user?.nis} • {commission?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {assignment.role}
                    </span>
                    <button
                      onClick={() => toggleLock(assignment.id, assignment.is_locked)}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      {assignment.is_locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeAssignment(assignment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAddModal && (
        <AddMemberModal
          users={users}
          commissions={commissions}
          programId={program.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {showBulkModal && (
        <BulkAddModal
          users={users}
          commissions={commissions}
          programId={program.id}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  users,
  commissions,
  programId,
  onClose,
  onSuccess,
}: {
  users: User[];
  commissions: Commission[];
  programId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      console.log('Starting add member process...');
      console.log('Selected user ID:', selectedUserId);
      console.log('Selected role:', selectedRole);

      const user = users.find(u => u.id === selectedUserId);
      if (!user) {
        console.error('User not found in list');
        throw new Error('User not found');
      }
      if (!user.commission_id) {
        console.error('User has no commission:', user);
        throw new Error('User must be assigned to a commission');
      }

      console.log('Inserting assignment:', {
        program_id: programId,
        user_id: selectedUserId,
        role: selectedRole,
        commission_id: user.commission_id,
      });

      const { data, error } = await supabase.from('panitia_assignments').insert({
        program_id: programId,
        user_id: selectedUserId,
        role: selectedRole,
        commission_id: user.commission_id,
        is_required_role: false,
        is_locked: false,
      }).select();

      if (error) {
        console.error('Insert error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Insert successful:', data);
      alert('Member added successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert('Failed to add member: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Committee Member</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Member</label>
            <select
              required
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a member...</option>
              {users.filter(u => u.commission_id).map((user) => {
                const commission = commissions.find(c => c.id === user.commission_id);
                return (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.nis}) - {commission?.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              required
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a role...</option>
              {PANITIA_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkAddModal({
  users,
  commissions,
  programId,
  onClose,
  onSuccess,
}: {
  users: User[];
  commissions: Commission[];
  programId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bulkInput, setBulkInput] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const lines = bulkInput.trim().split('\n').filter(line => line.trim());
      const assignments = [];

      for (const line of lines) {
        const [nisOrName, role] = line.split(',').map(s => s.trim());
        if (!nisOrName || !role) continue;

        const user = users.find(u =>
          u.nis === nisOrName ||
          u.name.toLowerCase() === nisOrName.toLowerCase()
        );

        if (!user) {
          alert(`User not found: ${nisOrName}`);
          continue;
        }

        if (!user.commission_id) {
          alert(`User ${user.name} has no commission assigned`);
          continue;
        }

        assignments.push({
          program_id: programId,
          user_id: user.id,
          role: role,
          commission_id: user.commission_id,
          is_required_role: false,
          is_locked: false,
        });
      }

      if (assignments.length === 0) {
        alert('No valid assignments to add');
        return;
      }

      const { error } = await supabase.from('panitia_assignments').insert(assignments);

      if (error) {
        console.error('Bulk insert error:', error);
        throw error;
      }

      alert(`Successfully added ${assignments.length} members!`);
      onSuccess();
    } catch (error: any) {
      console.error('Error bulk adding members:', error);
      alert('Failed to add members: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bulk Add Committee Members</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste member data (one per line: NIS or Name, Role)
            </label>
            <textarea
              required
              rows={10}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder="12345, ketua
67890, sekretaris
John Doe, bendahara"
            />
            <p className="text-xs text-gray-500 mt-2">
              Format: NIS or Name, Role (e.g., "12345, ketua" or "John Doe, sekretaris")
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Available roles: {PANITIA_ROLES.map(r => r.value).join(', ')}
            </p>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add Members'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
