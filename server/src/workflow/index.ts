import type {
  ApplicationSnapshot,
  AuthContext,
  AvailableAction,
  AvailableTransition,
  ContextualAction,
  Stage,
} from './types.js';
import { listAllActions } from './actions.js';
import { toAgentStatusLabel } from './agentStatusMap.js';
import { roleHasPermission } from './permissions.js';
import {
  evaluateRules,
  firstFailedRule,
  getTransitionKey,
  TRANSITION_RULES,
} from './rules.js';
import { isTerminalStage, STAGE_LABELS } from './stages.js';
import {
  canRoleTransition,
  getAllowedTargetStages,
  isSequentialTransition,
} from './transitions.js';

export { toAgentStatusLabel } from './agentStatusMap.js';

export function canTransition(
  app: ApplicationSnapshot,
  targetStage: Stage,
  auth: AuthContext
): { allowed: boolean; reason?: string; rule?: string; hint?: string } {
  if (app.stage === targetStage) {
    return {
      allowed: true,
      reason: 'Application is already at this stage.',
      hint: 'No change needed.',
    };
  }

  if (isTerminalStage(app.stage)) {
    return {
      allowed: false,
      reason: 'This application is closed.',
      hint: 'No further stage changes are possible on closed applications.',
    };
  }

  if (app.transitionsPaused || app.status === 'deferred') {
    return {
      allowed: false,
      reason: 'This application is deferred.',
      hint: 'Resume the application before changing stages.',
    };
  }

  if (!canRoleTransition(app.stage, targetStage, auth.role)) {
    return {
      allowed: false,
      reason: 'Your role cannot perform this stage change.',
      hint: `Switch to a user with permission for ${STAGE_LABELS[targetStage]}.`,
    };
  }

  if (!isSequentialTransition(app.stage, targetStage)) {
    return {
      allowed: false,
      reason: 'You cannot skip stages in the pipeline.',
      hint: 'Move to the next stage in order along the defined pipeline.',
    };
  }

  const ruleIds = TRANSITION_RULES[getTransitionKey(app.stage, targetStage)] ?? [
    'notTerminal',
    'notDeferred',
  ];
  const failed = firstFailedRule(evaluateRules(app, ruleIds));
  if (failed) {
    return {
      allowed: false,
      reason: failed.reason,
      rule: failed.rule,
      hint: failed.hint,
    };
  }

  return { allowed: true };
}

export function getAvailableTransitions(
  app: ApplicationSnapshot,
  auth: AuthContext
): AvailableTransition[] {
  if (!roleHasPermission(auth.role, 'TRANSITION')) return [];

  const targets = getAllowedTargetStages(app.stage, auth.role);
  return targets.map((targetStage) => {
    const result = canTransition(app, targetStage, auth);
    return {
      targetStage,
      label: STAGE_LABELS[targetStage],
      blocked: !result.allowed || app.stage === targetStage,
      reason: result.reason,
      rule: result.rule,
      hint: result.hint,
    };
  });
}

export function canPerformAction(
  app: ApplicationSnapshot,
  action: ContextualAction,
  auth: AuthContext
): { allowed: boolean; reason?: string; hint?: string } {
  const def = listAllActions().find((a) => a.id === action);
  if (!def) {
    return { allowed: false, reason: 'Unknown action.', hint: 'Use a valid action id.' };
  }

  if (isTerminalStage(app.stage)) {
    return {
      allowed: false,
      reason: 'This application is closed.',
      hint: 'No further actions are possible on closed applications.',
    };
  }

  if (!def.allowedStages.includes(app.stage)) {
    return {
      allowed: false,
      reason: `Action "${def.label}" is not available at this stage.`,
      hint: `This action is only available during specific stages of the pipeline.`,
    };
  }

  if (!def.allowedRoles.includes(auth.role)) {
    return {
      allowed: false,
      reason: 'Your role cannot perform this action.',
      hint: `Switch to a user with permission to ${def.label.toLowerCase()}.`,
    };
  }

  if (action === 'withdraw' && auth.role === 'agent') {
    if (app.agentId !== auth.agentId && app.agentId !== auth.userId) {
      return {
        allowed: false,
        reason: 'You can only act on your own applications.',
        hint: 'Use the Agent account that submitted this application.',
      };
    }
  }

  return { allowed: true };
}

export function getAvailableActions(
  app: ApplicationSnapshot,
  auth: AuthContext
): AvailableAction[] {
  if (!roleHasPermission(auth.role, 'CONTEXTUAL_ACTION')) return [];

  return listAllActions()
    .filter((def) => {
      if (auth.role === 'agent') {
        return def.id === 'withdraw';
      }
      return true;
    })
    .map((def) => {
      const result = canPerformAction(app, def.id, auth);
      return {
        action: def.id,
        label: def.label,
        blocked: !result.allowed,
        reason: result.reason,
        hint: result.hint,
      };
    });
}

export function agentCanAccessApplication(
  app: ApplicationSnapshot,
  auth: AuthContext
): boolean {
  if (auth.role !== 'agent') return true;
  const agentKey = auth.agentId ?? auth.userId;
  return app.agentId === agentKey;
}
