import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Program } from '../types';
import { CheckSquare, Square, Users } from 'lucide-react';

export default function BulkPanitiaPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  async function loadPrograms() {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .in('status', ['approved', 'submitted'])
        .order('start_datetime', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error loading programs:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleProgram(programId: string) {
    setSelectedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  }

  function toggleAll() {
    if (selectedPrograms.size === programs.length) {
      setSelectedPrograms(new Set());
    } else {
      setSelectedPrograms(new Set(programs.map(p => p.id)));
    }
  }

  async function generateBulkPanitia() {
    if (selectedPrograms.size === 0) {
      alert('Please select at least one program');
      return;
    }

    setGenerating(true);
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const programId of Array.from(selectedPrograms)) {
        try {
          const program = programs.find(p => p.id === programId);
          if (!program) continue;

          const availableMembers = await api.users.list();
          const activeMembers = availableMembers.filter((u: any) => u.is_active);

          if (!activeMembers || activeMembers.length < 4) {
            errors.push(`${program.name}: Not enough available members`);
            errorCount++;
            continue;
          }

          const requiredRoles = ['ketua', 'sekretaris', 'bendahara', 'divisi_acara'];
          const newAssignments = [];
          const assignedUserIds = new Set<string>();

          for (let i = 0; i < Math.min(requiredRoles.length, activeMembers.length); i++) {
            const member = activeMembers[i];
            if (!assignedUserIds.has(member.id)) {
              newAssignments.push({
                program_id: programId,
                user_id: member.id,
                role: requiredRoles[i],
                commission_id: member.commission_id,
                is_required_role: true,
                is_locked: false,
              });
              assignedUserIds.add(member.id);
            }
          }

          if (newAssignments.length >= 3) {
            const existingAssignments = await api.panitiaAssignments.list({ program_id: programId });
            for (const assignment of existingAssignments) {
              await api.panitiaAssignments.delete(assignment.id);
            }

            await api.panitiaAssignments.bulkCreate(newAssignments);
            successCount++;
          } else {
            errors.push(`${program.name}: Could not generate minimum members`);
            errorCount++;
          }
        } catch (error: any) {
          errors.push(`${program.name}: ${error.message}`);
          errorCount++;
        }
      }

      let message = `Bulk generation complete!\n`;
      message += `✅ Success: ${successCount} programs\n`;
      if (errorCount > 0) {
        message += `❌ Failed: ${errorCount} programs\n\n`;
        if (errors.length > 0) {
          message += `Errors:\n${errors.slice(0, 5).join('\n')}`;
          if (errors.length > 5) {
            message += `\n... and ${errors.length - 5} more`;
          }
        }
      }

      alert(message);
      setSelectedPrograms(new Set());
      await loadPrograms();
    } catch (error) {
      console.error('Error in bulk generation:', error);
      alert('Failed to generate bulk panitia');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading programs...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bulk Panitia Assignment</h1>
        <p className="text-gray-600">Assign committee members to multiple programs at once</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleAll}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedPrograms.size === programs.length ? (
                <CheckSquare className="w-5 h-5" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span>Select All</span>
            </button>
            <span className="text-gray-600">{selectedPrograms.size} selected</span>
          </div>
          <button
            onClick={generateBulkPanitia}
            disabled={selectedPrograms.size === 0 || generating}
            className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <Users className="w-4 h-4" />
            <span>{generating ? 'Generating...' : 'Generate for Selected'}</span>
          </button>
        </div>

        <div className="space-y-2">
          {programs.map((program) => (
            <div
              key={program.id}
              onClick={() => toggleProgram(program.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedPrograms.has(program.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                {selectedPrograms.has(program.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{program.name}</h3>
                  <p className="text-sm text-gray-600">
                    {program.type} • {new Date(program.start_datetime).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
