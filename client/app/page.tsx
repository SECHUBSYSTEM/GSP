'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type ApiUser } from '../lib/api';

type Alert = { type: 'error' | 'success' | 'info'; text: string };

const DOC_TYPES = ['passport', 'transcript', 'english_test'];

export default function DemoPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [applications, setApplications] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [appDetail, setAppDetail] = useState<Record<string, unknown> | null>(null);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [noteText, setNoteText] = useState('');
  const [reviewNote, setReviewNote] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'agent' });
  const [newApp, setNewApp] = useState({
    studentName: '',
    studentEmail: '',
    nationality: '',
    courseName: '',
    university: '',
    intake: '',
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const showError = (err: unknown) => {
    setAlert({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' });
  };

  const showSuccess = (text: string) => setAlert({ type: 'success', text });

  const refreshUsers = useCallback(async () => {
    if (!selectedUserId) return;
    try {
      const res = await api.listUsers(selectedUserId);
      setUsers(res.data);
    } catch {
      /* first load may fail for agent — ignore */
    }
  }, [selectedUserId]);

  const refreshApplications = useCallback(async () => {
    if (!selectedUserId) return;
    const res = await api.listApplications(selectedUserId);
    setApplications(
      res.data.map((a) => {
        const app = a as Record<string, unknown>;
        const student = app.student as { name?: string } | undefined;
        const label =
          (app.statusLabel as string) ??
          (app.stageLabel as string) ??
          'Application';
        return {
          id: app.id as string,
          label: `${student?.name ?? 'Student'} — ${label}`,
        };
      })
    );
  }, [selectedUserId]);

  const refreshAppDetail = useCallback(async () => {
    if (!selectedUserId || !selectedAppId) return;
    const res = await api.getApplication(selectedUserId, selectedAppId);
    setAppDetail(res.data);
  }, [selectedUserId, selectedAppId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/bootstrap/users`);
        if (res.ok) {
          const body = await res.json();
          setUsers(body.data ?? []);
        }
      } catch {
        /* API may be offline */
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedUserId) void refreshApplications().catch(showError);
  }, [selectedUserId, refreshApplications]);

  useEffect(() => {
    if (selectedAppId) void refreshAppDetail().catch(showError);
  }, [selectedAppId, refreshAppDetail]);

  async function handleCreateUser() {
    setLoading(true);
    try {
      const created = await api.createUser(newUser);
      setSelectedUserId(created.id);
      setUsers((prev) => [...prev, created]);
      showSuccess(`User created. ID copied to selector: ${created.name} (${created.role})`);
      setNewUser({ name: '', email: '', role: 'agent' });
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApp() {
    if (!selectedUserId) return showError(new Error('Select or create a user first.'));
    setLoading(true);
    try {
      const res = await api.createApplication(selectedUserId, {
        student: {
          name: newApp.studentName,
          email: newApp.studentEmail,
          nationality: newApp.nationality,
        },
        course: {
          name: newApp.courseName,
          university: newApp.university,
          intake: newApp.intake,
        },
      });
      setSelectedAppId(res.data.id as string);
      await refreshApplications();
      showSuccess(res.message);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function runTransition(targetStage: string) {
    if (!selectedUserId || !selectedAppId) return;
    setLoading(true);
    try {
      const res = await api.transition(selectedUserId, selectedAppId, targetStage);
      setAppDetail(res.data);
      showSuccess(res.message);
      await refreshApplications();
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: string) {
    if (!selectedUserId || !selectedAppId) return;
    setLoading(true);
    try {
      const res = await api.action(selectedUserId, selectedAppId, action);
      setAppDetail(res.data);
      showSuccess(res.message);
      await refreshApplications();
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddNote() {
    if (!selectedUserId || !selectedAppId || !noteText.trim()) return;
    setLoading(true);
    try {
      const res = await api.addNote(selectedUserId, selectedAppId, noteText, reviewNote);
      setAppDetail(res.data);
      setNoteText('');
      showSuccess(res.message);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(type: string, file: File | null) {
    if (!selectedUserId || !selectedAppId || !file) return;
    setLoading(true);
    try {
      const res = await api.uploadDocument(selectedUserId, selectedAppId, type, file);
      setAppDetail(res.data);
      showSuccess(res.hint ? `${res.message} ${res.hint}` : res.message);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  const isInternal = selectedUser && selectedUser.role !== 'agent';
  const transitions = (appDetail?.availableTransitions as Array<Record<string, unknown>>) ?? [];
  const actions = (appDetail?.availableActions as Array<Record<string, unknown>>) ?? [];
  const aiAssessment = appDetail?.aiAssessment as Record<string, unknown> | null;

  return (
    <main>
      <h1>GSP Workflow Demo</h1>
      <p className="muted">
        Switch users to test role permissions. Errors show plain-English hints to help you self-correct.
      </p>

      {alert && (
        <div className={`alert ${alert.type}`} role="alert">
          {alert.text}
        </div>
      )}

      <div className="grid-2">
        <section className="card">
          <h2>1. Users &amp; Roles</h2>
          <div className="row">
            <div style={{ flex: 1, minWidth: 200 }}>
              <label htmlFor="userSelect">Active user (X-User-Id)</label>
              <select
                id="userSelect"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedUser && (
            <p className="muted">
              Role: <span className="tag">{selectedUser.role}</span>
            </p>
          )}

          <h3>Create user (Postman: POST /users)</h3>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Name</label>
              <input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Agent Two"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Email</label>
              <input
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="agent2@partner.com"
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="agent">agent</option>
                <option value="counsellor">counsellor</option>
                <option value="qa_officer">qa_officer</option>
                <option value="admission_officer">admission_officer</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreateUser} disabled={loading}>
            Create user
          </button>
        </section>

        <section className="card">
          <h2>2. Create application</h2>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Student name</label>
              <input
                value={newApp.studentName}
                onChange={(e) => setNewApp({ ...newApp, studentName: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>Student email</label>
              <input
                value={newApp.studentEmail}
                onChange={(e) => setNewApp({ ...newApp, studentEmail: e.target.value })}
              />
            </div>
          </div>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label>Course</label>
              <input
                value={newApp.courseName}
                onChange={(e) => setNewApp({ ...newApp, courseName: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label>University</label>
              <input
                value={newApp.university}
                onChange={(e) => setNewApp({ ...newApp, university: e.target.value })}
              />
            </div>
          </div>
          <button onClick={handleCreateApp} disabled={loading || !selectedUserId}>
            Create application
          </button>
        </section>
      </div>

      <section className="card">
        <h2>3. Application detail</h2>
        <label htmlFor="appSelect">Select application</label>
        <select
          id="appSelect"
          value={selectedAppId}
          onChange={(e) => setSelectedAppId(e.target.value)}
        >
          <option value="">Select…</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>

        {appDetail && (
          <>
            <p>
              <strong>Status:</strong>{' '}
              {(appDetail.statusLabel as string) ?? (appDetail.stageLabel as string)}
              {isInternal && appDetail.stage && (
                <span className="muted"> (internal: {String(appDetail.stage)})</span>
              )}
            </p>

            {isInternal && transitions.length > 0 && (
              <div>
                <h3>Stage transitions</h3>
                <div className="row">
                  {transitions.map((t) => (
                    <button
                      key={String(t.targetStage)}
                      className="secondary"
                      disabled={loading || Boolean(t.blocked)}
                      title={String(t.hint ?? t.reason ?? '')}
                      onClick={() => runTransition(String(t.targetStage))}
                    >
                      → {String(t.label)}
                      {t.blocked ? ' (blocked)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {actions.length > 0 && (
              <div>
                <h3>Contextual actions</h3>
                <div className="row">
                  {actions
                    .filter((a) => !a.blocked)
                    .map((a) => (
                      <button
                        key={String(a.action)}
                        className={String(a.action).includes('reject') ? 'danger' : 'secondary'}
                        disabled={loading}
                        onClick={() => runAction(String(a.action))}
                      >
                        {String(a.label ?? a.action)}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {isInternal && aiAssessment && (
              <div className="alert info">
                <strong>AI assessment (advisory)</strong>
                <p>{String(aiAssessment.summary)}</p>
                <p className="muted">
                  Score: {String(aiAssessment.readinessScore)} — Recommendation:{' '}
                  {String(aiAssessment.recommendation)}
                </p>
              </div>
            )}

            <h3>Documents</h3>
            <div className="row">
              {DOC_TYPES.map((type) => (
                <div key={type} style={{ flex: 1, minWidth: 180 }}>
                  <label>{type}</label>
                  <input
                    type="file"
                    onChange={(e) => handleUpload(type, e.target.files?.[0] ?? null)}
                  />
                </div>
              ))}
            </div>

            <h3>Add note</h3>
            <textarea
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
            />
            {selectedUser?.role === 'admission_officer' && (
              <label>
                <input
                  type="checkbox"
                  checked={reviewNote}
                  onChange={(e) => setReviewNote(e.target.checked)}
                />{' '}
                Mark as admission review note (required before Decision)
              </label>
            )}
            <button onClick={handleAddNote} disabled={loading || !noteText.trim()}>
              Add note
            </button>
          </>
        )}
      </section>
    </main>
  );
}
