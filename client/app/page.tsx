"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ApiUser } from "../lib/api";

type Alert = { type: "error" | "success" | "info"; text: string };

const DOC_TYPES = ["passport", "transcript", "english_test"];

const PIPELINE_STAGES = [
  { id: "new_app", label: "New App" },
  { id: "qa_review", label: "QA Review" },
  { id: "app_review", label: "App Review" },
  { id: "decision", label: "Decision" },
  { id: "deposit", label: "Deposit" },
  { id: "cas_review", label: "CAS Review" },
  { id: "enrolment", label: "Enrolment" },
] as const;

const TERMINAL_STAGES = new Set(["app_rejected", "closed_lost"]);

function roleClass(role: string) {
  return `role-tag role-${role.replace(/[^a-z_]/g, "")}`;
}

function Pipeline({ currentStage }: { currentStage: string }) {
  if (TERMINAL_STAGES.has(currentStage)) {
    const label = currentStage === "app_rejected" ? "Rejected" : "Closed Lost";
    return (
      <div className="pipeline">
        <div className="pipeline-track">
          <div className="pipeline-step terminal">
            <div className="pipeline-dot">!</div>
            <span className="pipeline-label">{label}</span>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="pipeline">
      <div className="pipeline-track">
        {PIPELINE_STAGES.map((stage, i) => {
          const isDone = currentIndex > i;
          const isCurrent = stage.id === currentStage;
          const stepClass = [
            "pipeline-step",
            isDone ? "done" : "",
            isCurrent ? "current" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <span key={stage.id} style={{ display: "contents" }}>
              {i > 0 && (
                <div
                  className={`pipeline-connector${isDone || isCurrent ? " done" : ""}`}
                />
              )}
              <div className={stepClass}>
                <div className="pipeline-dot">{isDone ? "✓" : i + 1}</div>
                <span className="pipeline-label">{stage.label}</span>
              </div>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function StatusMeta({
  appDetail,
  isInternal,
}: {
  appDetail: Record<string, unknown>;
  isInternal: boolean;
}) {
  const appStatus = String(
    appDetail.status ?? appDetail.applicationStatus ?? "active",
  );
  const chips: Array<{ key: string; label: string; className: string }> = [];

  if (appStatus === "deferred" || appDetail.transitionsPaused) {
    chips.push({
      key: "deferred",
      label: "Deferred — transitions paused",
      className: "status-chip deferred",
    });
  }
  if (appDetail.closedReason) {
    chips.push({
      key: "closed",
      label: `Closed: ${String(appDetail.closedReason).replace(/_/g, " ")}`,
      className: "status-chip closed",
    });
  }
  if (appDetail.refundFlag) {
    chips.push({
      key: "refund",
      label: "Refund flagged",
      className: "status-chip refund",
    });
  }
  if (appDetail.rejectionStage && isInternal) {
    chips.push({
      key: "rejected",
      label: `Rejected at ${String(appDetail.rejectionStage).replace(/_/g, " ")}`,
      className: "status-chip rejected",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="status-meta">
      {chips.map((c) => (
        <span key={c.key} className={c.className}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function DetailList({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ key: string; primary: string; secondary?: string }>;
  empty: string;
}) {
  return (
    <div className="detail-list">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p className="muted list-empty">{empty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <span className="list-primary">{item.primary}</span>
              {item.secondary ? (
                <span className="list-secondary">{item.secondary}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AlertIcon({ type }: { type: Alert["type"] }) {
  if (type === "success") {
    return (
      <svg
        className="alert-icon"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg
        className="alert-icon"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <svg
      className="alert-icon"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function DemoPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [applications, setApplications] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [appDetail, setAppDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [alert, setAlert] = useState<Alert | null>(null);
  const [noteText, setNoteText] = useState("");
  const [reviewNote, setReviewNote] = useState(false);
  const [loading, setLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "agent",
  });
  const [newApp, setNewApp] = useState({
    studentName: "",
    studentEmail: "",
    nationality: "",
    courseName: "",
    university: "",
    intake: "",
  });
  const [editCourse, setEditCourse] = useState({
    name: "",
    university: "",
    intake: "",
  });

  const selectedUser = users.find((u) => u.id === selectedUserId);

  const showError = (err: unknown) => {
    setAlert({
      type: "error",
      text: err instanceof Error ? err.message : "Something went wrong",
    });
  };

  const showSuccess = (text: string) => setAlert({ type: "success", text });

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [alert]);

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
          "Application";
        return {
          id: app.id as string,
          label: `${student?.name ?? "Student"} — ${label}`,
        };
      }),
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
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/bootstrap/users`,
        );
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

  useEffect(() => {
    if (!appDetail?.course) return;
    const course = appDetail.course as {
      name?: string;
      university?: string;
      intake?: string;
    };
    setEditCourse({
      name: course.name ?? "",
      university: course.university ?? "",
      intake: course.intake ?? "",
    });
  }, [appDetail?.course, selectedAppId]);

  async function handleCreateUser() {
    setLoading(true);
    try {
      const created = await api.createUser(newUser);
      setSelectedUserId(created.id);
      setUsers((prev) => [...prev, created]);
      showSuccess(`User created: ${created.name} (${created.role})`);
      setNewUser({ name: "", email: "", role: "agent" });
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateApp() {
    if (!selectedUserId)
      return showError(new Error("Select or create a user first."));
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
      const res = await api.transition(
        selectedUserId,
        selectedAppId,
        targetStage,
      );
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
      const payload =
        action === "change_course"
          ? {
              course: {
                name: editCourse.name,
                university: editCourse.university,
                intake: editCourse.intake,
              },
            }
          : undefined;
      const res = await api.action(
        selectedUserId,
        selectedAppId,
        action,
        payload,
      );
      setAppDetail(res.data);
      showSuccess(res.message);
      await refreshApplications();
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshAi() {
    if (!selectedUserId || !selectedAppId) return;
    setLoading(true);
    try {
      const res = await api.refreshAi(selectedUserId, selectedAppId);
      setAppDetail(res.data);
      showSuccess(res.message);
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
      const res = await api.addNote(
        selectedUserId,
        selectedAppId,
        noteText,
        reviewNote,
      );
      setAppDetail(res.data);
      setNoteText("");
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
      const res = await api.uploadDocument(
        selectedUserId,
        selectedAppId,
        type,
        file,
      );
      setAppDetail(res.data);
      showSuccess(res.hint ? `${res.message} ${res.hint}` : res.message);
    } catch (err) {
      showError(err);
    } finally {
      setLoading(false);
    }
  }

  const isInternal = selectedUser && selectedUser.role !== "agent";
  const transitions =
    (appDetail?.availableTransitions as Array<Record<string, unknown>>) ?? [];
  const actions =
    (appDetail?.availableActions as Array<Record<string, unknown>>) ?? [];
  const aiAssessment = appDetail?.aiAssessment as Record<
    string,
    unknown
  > | null;
  const currentStage = String(appDetail?.stage ?? "");
  const student = appDetail?.student as
    | { name?: string; email?: string; nationality?: string }
    | undefined;
  const documents =
    (appDetail?.documents as Array<{
      type?: string;
      url?: string;
      uploadedAt?: string;
    }>) ?? [];
  const notes =
    (appDetail?.notes as Array<{
      text?: string;
      createdAt?: string;
      isReviewNote?: boolean;
      authorRole?: string;
    }>) ?? [];
  const canEditCourse =
    isInternal &&
    (currentStage === "qa_review" || currentStage === "app_review") &&
    ["counsellor", "admission_officer"].includes(selectedUser?.role ?? "");

  return (
    <>
      {loading && (
        <div className="loading-overlay" aria-live="polite" aria-busy="true">
          <div className="loading-spinner" />
        </div>
      )}

      {alert && (
        <div className="alert-stack">
          <div className={`alert ${alert.type}`} role="alert">
            <AlertIcon type={alert.type} />
            <span>{alert.text}</span>
          </div>
        </div>
      )}

      <main>
        <div className="page-hero">
          <h1>Workflow Demo</h1>
          <p>
            Switch users to test role permissions across the admissions
            pipeline. Errors include plain-English hints so you can self-correct
            during the demo.
          </p>
        </div>

        <div className="grid-2">
          <section className="card">
            <div className="card-header">
              <span className="step-badge">1</span>
              <div className="card-header-text">
                <h2>Users &amp; Roles</h2>
                <p>
                  Select an active user — sent as the X-User-Id header on every
                  request.
                </p>
              </div>
            </div>

            <div className="field">
              <label htmlFor="userSelect">Active user</label>
              <select
                id="userSelect"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.role}
                  </option>
                ))}
              </select>
            </div>

            {selectedUser && (
              <div className="user-context">
                <span>Signed in as</span>
                <strong>{selectedUser.name}</strong>
                <span className={roleClass(selectedUser.role)}>
                  {selectedUser.role}
                </span>
              </div>
            )}

            <h3>Create user</h3>
            <div className="row">
              <div className="field">
                <label htmlFor="newUserName">Name</label>
                <input
                  id="newUserName"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  placeholder="Agent Two"
                />
              </div>
              <div className="field">
                <label htmlFor="newUserEmail">Email</label>
                <input
                  id="newUserEmail"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  placeholder="agent2@partner.com"
                />
              </div>
              <div className="field field-sm">
                <label htmlFor="newUserRole">Role</label>
                <select
                  id="newUserRole"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value })
                  }>
                  <option value="agent">agent</option>
                  <option value="counsellor">counsellor</option>
                  <option value="qa_officer">qa_officer</option>
                  <option value="admission_officer">admission_officer</option>
                </select>
              </div>
            </div>
            <div className="btn-row">
              <button onClick={handleCreateUser} disabled={loading}>
                Create user
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <span className="step-badge">2</span>
              <div className="card-header-text">
                <h2>Create Application</h2>
                <p>Agents submit new student applications into the pipeline.</p>
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label htmlFor="studentName">Student name</label>
                <input
                  id="studentName"
                  value={newApp.studentName}
                  onChange={(e) =>
                    setNewApp({ ...newApp, studentName: e.target.value })
                  }
                  placeholder="Jane Doe"
                />
              </div>
              <div className="field">
                <label htmlFor="studentEmail">Student email</label>
                <input
                  id="studentEmail"
                  value={newApp.studentEmail}
                  onChange={(e) =>
                    setNewApp({ ...newApp, studentEmail: e.target.value })
                  }
                  placeholder="jane@example.com"
                />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="courseName">Course</label>
                <input
                  id="courseName"
                  value={newApp.courseName}
                  onChange={(e) =>
                    setNewApp({ ...newApp, courseName: e.target.value })
                  }
                  placeholder="MSc Computer Science"
                />
              </div>
              <div className="field">
                <label htmlFor="university">University</label>
                <input
                  id="university"
                  value={newApp.university}
                  onChange={(e) =>
                    setNewApp({ ...newApp, university: e.target.value })
                  }
                  placeholder="University of Example"
                />
              </div>
            </div>
            <div className="row">
              <div className="field field-sm">
                <label htmlFor="nationality">Nationality</label>
                <input
                  id="nationality"
                  value={newApp.nationality}
                  onChange={(e) =>
                    setNewApp({ ...newApp, nationality: e.target.value })
                  }
                  placeholder="Nigeria"
                />
              </div>
              <div className="field field-sm">
                <label htmlFor="intake">Intake</label>
                <input
                  id="intake"
                  value={newApp.intake}
                  onChange={(e) =>
                    setNewApp({ ...newApp, intake: e.target.value })
                  }
                  placeholder="Sep 2026"
                />
              </div>
            </div>
            <div className="btn-row">
              <button
                onClick={handleCreateApp}
                disabled={loading || !selectedUserId}>
                Create application
              </button>
            </div>
          </section>
        </div>

        <section className="card">
          <div className="card-header">
            <span className="step-badge">3</span>
            <div className="card-header-text">
              <h2>Application Detail</h2>
              <p>
                View status, run transitions, upload documents, and add notes.
              </p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="appSelect">Select application</label>
            <select
              id="appSelect"
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}>
              <option value="">Choose an application…</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          {!appDetail && (
            <div className="empty-state">
              <div className="empty-state-icon" aria-hidden="true">
                📋
              </div>
              <p>
                Select an application above to view its pipeline status and
                available actions.
              </p>
            </div>
          )}

          {appDetail && (
            <>
              <div className="status-banner">
                <span className="status-label">
                  {(appDetail.statusLabel as string) ??
                    (appDetail.stageLabel as string)}
                </span>
                {isInternal && appDetail.stage != null ? (
                  <span className="status-internal">
                    {String(appDetail.stage)}
                  </span>
                ) : null}
              </div>

              <StatusMeta
                appDetail={appDetail}
                isInternal={Boolean(isInternal)}
              />

              {(student || editCourse.name) && (
                <div className="app-info-grid">
                  {student && (
                    <div className="info-card">
                      <h3>Student</h3>
                      <p>
                        <strong>{student.name}</strong>
                      </p>
                      <p className="muted">{student.email}</p>
                      {student.nationality ? (
                        <p className="muted">{student.nationality}</p>
                      ) : null}
                    </div>
                  )}
                  <div className="info-card">
                    <h3>Course</h3>
                    {canEditCourse ? (
                      <>
                        <div className="field">
                          <label htmlFor="editCourseName">Course name</label>
                          <input
                            id="editCourseName"
                            value={editCourse.name}
                            onChange={(e) =>
                              setEditCourse({
                                ...editCourse,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="editUniversity">University</label>
                          <input
                            id="editUniversity"
                            value={editCourse.university}
                            onChange={(e) =>
                              setEditCourse({
                                ...editCourse,
                                university: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="editIntake">Intake</label>
                          <input
                            id="editIntake"
                            value={editCourse.intake}
                            onChange={(e) =>
                              setEditCourse({
                                ...editCourse,
                                intake: e.target.value,
                              })
                            }
                          />
                        </div>
                        <p className="muted form-hint">
                          Edit fields above, then use Change Course to apply and
                          refresh AI.
                        </p>
                      </>
                    ) : (
                      <>
                        <p>
                          <strong>{editCourse.name || "—"}</strong>
                        </p>
                        <p className="muted">{editCourse.university}</p>
                        {editCourse.intake ? (
                          <p className="muted">Intake: {editCourse.intake}</p>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              )}

              {isInternal && currentStage && (
                <Pipeline currentStage={currentStage} />
              )}

              {isInternal && transitions.length > 0 && (
                <div className="action-group">
                  <p className="action-group-title">Stage transitions</p>
                  <div className="action-chips">
                    {transitions.map((t) => (
                      <button
                        key={String(t.targetStage)}
                        className="secondary"
                        disabled={loading || Boolean(t.blocked)}
                        title={String(t.hint ?? t.reason ?? "")}
                        onClick={() => runTransition(String(t.targetStage))}>
                        → {String(t.label)}
                        {t.blocked ? (
                          <span className="blocked-hint"> (blocked)</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {actions.length > 0 && (
                <div className="action-group">
                  <p className="action-group-title">Contextual actions</p>
                  <div className="action-chips">
                    {actions.map((a) => (
                      <button
                        key={String(a.action)}
                        className={
                          String(a.action).includes("reject")
                            ? "danger"
                            : "secondary"
                        }
                        disabled={loading || Boolean(a.blocked)}
                        title={String(a.hint ?? a.reason ?? "")}
                        onClick={() => runAction(String(a.action))}>
                        {String(a.label ?? a.action)}
                        {a.blocked ? (
                          <span className="blocked-hint"> (blocked)</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isInternal && (
                <div className="ai-panel">
                  <div className="ai-panel-header">
                    <strong>AI Assessment</strong>
                    <span className="ai-badge">Advisory</span>
                    <button
                      className="secondary ai-refresh-btn"
                      disabled={loading}
                      onClick={handleRefreshAi}>
                      Refresh AI
                    </button>
                  </div>
                  {aiAssessment ? (
                    <>
                      <p>{String(aiAssessment.summary)}</p>
                      <div className="ai-meta">
                        <span className="ai-stat">
                          Readiness:{" "}
                          <strong>{String(aiAssessment.readinessScore)}</strong>
                        </span>
                        <span className="ai-stat">
                          Recommendation:{" "}
                          <strong>{String(aiAssessment.recommendation)}</strong>
                        </span>
                        <span className="ai-stat">
                          Provider:{" "}
                          <strong>{String(aiAssessment.provider)}</strong>
                          {aiAssessment.model
                            ? ` / ${String(aiAssessment.model)}`
                            : ""}
                        </span>
                        {aiAssessment.status ? (
                          <span className="ai-stat">
                            Status:{" "}
                            <strong>{String(aiAssessment.status)}</strong>
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="muted">
                      No AI assessment for this stage yet. Use Refresh AI after
                      uploads or course changes.
                    </p>
                  )}
                </div>
              )}

              <DetailList
                title="Uploaded documents"
                empty="No documents uploaded yet."
                items={documents.map((d, i) => ({
                  key: `${d.type}-${i}`,
                  primary: String(d.type ?? "document").replace(/_/g, " "),
                  secondary: d.uploadedAt
                    ? new Date(String(d.uploadedAt)).toLocaleString()
                    : undefined,
                }))}
              />

              <h3>Upload documents</h3>
              <div className="doc-grid">
                {DOC_TYPES.map((type) => (
                  <div key={type} className="doc-upload">
                    <label htmlFor={`doc-${type}`}>
                      {type.replace("_", " ")}
                    </label>
                    <input
                      id={`doc-${type}`}
                      type="file"
                      onChange={(e) =>
                        handleUpload(type, e.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                ))}
              </div>

              <DetailList
                title="Notes"
                empty="No notes yet."
                items={[...notes].reverse().map((n, i) => ({
                  key: `note-${i}`,
                  primary: String(n.text ?? ""),
                  secondary: [
                    n.isReviewNote ? "Review note" : null,
                    n.authorRole,
                    n.createdAt
                      ? new Date(String(n.createdAt)).toLocaleString()
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                }))}
              />

              <div className="note-section">
                <h3>Add note</h3>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note visible to internal staff…"
                />
                {selectedUser?.role === "admission_officer" && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={reviewNote}
                      onChange={(e) => setReviewNote(e.target.checked)}
                    />
                    Mark as admission review note (required before Decision)
                  </label>
                )}
                <div className="btn-row">
                  <button
                    onClick={handleAddNote}
                    disabled={loading || !noteText.trim()}>
                    Add note
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
