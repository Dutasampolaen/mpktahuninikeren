import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Program, Score, ScoringRubric } from '../types';
import { FileText, Clock, CheckCircle, MessageSquare } from 'lucide-react';

export default function MyScoringPage() {
  const { user } = useAuth();
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
        .in('status', ['under_review', 'submitted'])
        .order('created_at', { ascending: false });

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
    return <ScoringForm program={selectedProgram} onBack={() => setSelectedProgram(null)} onSaved={loadPrograms} />;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Scoring Tasks</h1>
        <p className="text-gray-600">Score program proposals assigned to you</p>
      </div>

      {programs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Programs to Score</h3>
          <p className="text-gray-600">There are no programs assigned for scoring at this time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onSelect={() => setSelectedProgram(program)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProgramCard({ program, onSelect }: { program: Program; onSelect: () => void }) {
  const { user } = useAuth();
  const [scoringStatus, setScoringStatus] = useState<'not_started' | 'draft' | 'completed'>('not_started');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkScoringStatus();
  }, []);

  async function checkScoringStatus() {
    try {
      const { data } = await supabase
        .from('scores')
        .select('is_draft')
        .eq('program_id', program.id)
        .eq('grader_id', user?.id || '');

      if (!data || data.length === 0) {
        setScoringStatus('not_started');
      } else if (data.some(s => s.is_draft)) {
        setScoringStatus('draft');
      } else {
        setScoringStatus('completed');
      }
    } catch (error) {
      console.error('Error checking scoring status:', error);
    } finally {
      setLoading(false);
    }
  }

  const statusConfig = {
    not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-700', icon: Clock },
    draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  };

  const status = statusConfig[scoringStatus];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex-1">{program.name}</h3>
        <span className={`${status.color} px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1`}>
          <StatusIcon className="w-3 h-3" />
          <span>{status.label}</span>
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Type:</span> {program.type}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Category:</span> {program.category}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Date:</span>{' '}
          {new Date(program.start_datetime).toLocaleDateString()}
        </p>
      </div>

      <button
        onClick={onSelect}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {scoringStatus === 'completed' ? 'View Score' : 'Score Now'}
      </button>
    </div>
  );
}

function ScoringForm({ program, onBack, onSaved }: { program: Program; onBack: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [rubrics, setRubrics] = useState<ScoringRubric[]>([]);
  const [scores, setScores] = useState<Record<string, { value: number; comment: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    loadRubricsAndScores();
  }, []);

  async function loadRubricsAndScores() {
    try {
      const [rubricsRes, scoresRes] = await Promise.all([
        supabase
          .from('scoring_rubrics')
          .select('*')
          .eq('program_type', program.type)
          .order('standard_code'),
        supabase
          .from('scores')
          .select('*')
          .eq('program_id', program.id)
          .eq('grader_id', user?.id || ''),
      ]);

      if (rubricsRes.error) throw rubricsRes.error;

      setRubrics(rubricsRes.data || []);

      const existingScores: Record<string, { value: number; comment: string }> = {};
      (scoresRes.data || []).forEach((score: Score) => {
        existingScores[score.standard_code] = {
          value: score.score_value,
          comment: score.comment || '',
        };
        if (!score.is_draft) {
          setIsCompleted(true);
        }
      });
      setScores(existingScores);
    } catch (error) {
      console.error('Error loading rubrics:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateScore(standardCode: string, value: number) {
    try {
      const numValue = isNaN(value) ? 0 : Number(value);
      setScores(prev => ({
        ...prev,
        [standardCode]: {
          value: numValue,
          comment: prev[standardCode]?.comment || ''
        },
      }));
    } catch (error) {
      console.error('Error updating score:', error);
    }
  }

  function updateComment(standardCode: string, comment: string) {
    try {
      setScores(prev => ({
        ...prev,
        [standardCode]: {
          value: prev[standardCode]?.value || 0,
          comment: comment || ''
        },
      }));
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  }

  function calculateFinalScore(): number {
    let total = 0;
    rubrics.forEach(rubric => {
      const score = scores[rubric.standard_code];
      if (score && score.value) {
        total += (score.value * rubric.weight) / 100;
      }
    });
    return Math.round(total * 100) / 100;
  }

  async function saveScores(isDraft: boolean) {
    if (!user) return;

    setSaving(true);
    try {
      const scoresToSave = rubrics
        .filter(rubric => scores[rubric.standard_code]?.value > 0)
        .map(rubric => {
          const score = scores[rubric.standard_code];
          return {
            program_id: program.id,
            grader_id: user.id,
            standard_code: rubric.standard_code,
            score_value: score.value,
            comment: score.comment || null,
            is_draft: isDraft,
          };
        });

      if (scoresToSave.length === 0) {
        alert('Please enter at least one score');
        return;
      }

      const { error } = await supabase
        .from('scores')
        .upsert(scoresToSave, {
          onConflict: 'program_id,grader_id,standard_code'
        });

      if (error) {
        console.error('Upsert error:', error);
        throw error;
      }

      alert(isDraft ? 'Scores saved as draft' : 'Scores submitted successfully!');
      if (!isDraft) {
        setIsCompleted(true);
      }
      onSaved();
    } catch (error: any) {
      console.error('Error saving scores:', error);
      alert('Failed to save scores: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading scoring form...</div>;
  }

  if (!rubrics || rubrics.length === 0) {
    return (
      <div>
        <button onClick={onBack} className="mb-6 text-blue-600 hover:text-blue-700 font-medium">
          ← Back to Programs
        </button>
        <div className="text-center py-12 text-gray-500">
          No scoring rubrics found for this program type
        </div>
      </div>
    );
  }

  const finalScore = calculateFinalScore();
  const allScored = rubrics.every(r => scores[r.standard_code]?.value > 0);

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
            <span className="font-medium text-gray-700">Type:</span>
            <p className="text-gray-900">{program.type}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Category:</span>
            <p className="text-gray-900">{program.category}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Date:</span>
            <p className="text-gray-900">{new Date(program.start_datetime).toLocaleDateString()}</p>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <p className="text-gray-900">{program.status}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Scoring Rubrics</h2>

        <div className="space-y-6">
          {rubrics.map((rubric) => {
            const score = scores[rubric.standard_code] || { value: 0, comment: '' };
            const scoreValue = Number(score.value) || 0;
            const weighted = rubric.weight > 0 ? (scoreValue * rubric.weight / 100).toFixed(2) : '0.00';

            return (
              <div key={rubric.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{rubric.standard_code.toUpperCase()}</h3>
                    <p className="text-sm text-gray-600 mt-1">{rubric.description}</p>
                  </div>
                  <span className="text-sm text-gray-500 ml-4">Weight: {rubric.weight}%</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Score (Max: {rubric.max_score})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={rubric.max_score}
                      value={score.value || ''}
                      onChange={(e) => updateScore(rubric.standard_code, Number(e.target.value))}
                      disabled={isCompleted}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                      placeholder="0"
                    />
                  </div>
                  <div className="md:col-span-2 flex items-end">
                    <div className="bg-blue-50 px-4 py-2 rounded-lg">
                      <p className="text-sm text-gray-600">Weighted Score</p>
                      <p className="text-2xl font-bold text-blue-700">{weighted}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Comment (Optional)</span>
                    <span className="text-gray-500 font-normal">
                      {(score.comment || '').length}/1000
                    </span>
                  </label>
                  <textarea
                    value={score.comment || ''}
                    onChange={(e) => updateComment(rubric.standard_code, e.target.value)}
                    disabled={isCompleted}
                    maxLength={1000}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="Add explanation or justification for this score..."
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Final Weighted Score</h3>
            <div className="text-4xl font-bold text-blue-600">{finalScore}</div>
          </div>

          {!isCompleted && (
            <div className="flex space-x-4">
              <button
                onClick={() => saveScores(true)}
                disabled={saving}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </button>
              <button
                onClick={() => saveScores(false)}
                disabled={saving || !allScored}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Final Score'}
              </button>
            </div>
          )}

          {isCompleted && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center">
              Score has been submitted and cannot be edited.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
