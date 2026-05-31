import type { IApplication } from '../models/Application.js';
import { getAvailableActions } from '../workflow/index.js';
import { toAgentStatusLabel } from '../workflow/agentStatusMap.js';
import type { AuthContext } from '../workflow/types.js';
import { toApplicationSnapshot } from '../utils/applicationMapper.js';

export function toAgentView(app: IApplication, auth: AuthContext) {
  const snapshot = toApplicationSnapshot(app);
  const actions = getAvailableActions(snapshot, auth).filter((a) => !a.blocked);

  return {
    id: app._id.toString(),
    statusLabel: toAgentStatusLabel(snapshot.stage),
    applicationStatus: app.status,
    student: app.student,
    course: {
      name: app.course!.name,
      university: app.course!.university,
      intake: app.course!.intake,
    },
    documents: app.documents.map((d) => ({ type: d.type, url: d.url, uploadedAt: d.uploadedAt })),
    notes: app.notes.map((n) => ({ text: n.text, createdAt: n.createdAt })),
    availableActions: actions.map((a) => ({ action: a.action, label: a.label })),
    updatedAt: app.updatedAt,
  };
}
