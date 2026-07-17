/**
 * Human Handoff Protocol — Clippy AI Copilot
 * When/how to hand off conversations to human agents
 */

const HANDOFF_REASONS = {
  CRITICAL_RISK: {
    reason: 'CRITICAL_RISK',
    priority: 'URGENT',
    notifyAgent: true,
    pauseAI: true,
    message: 'I\'ve flagged this for my human colleague and they\'ll be in touch shortly.'
  },
  LEGAL_QUESTION: {
    reason: 'LEGAL_QUESTION',
    priority: 'HIGH',
    notifyAgent: true,
    pauseAI: false,
    message: 'This is a great question for {{AGENT_NAME}} — they\'ll be able to give you specific advice. I\'ve passed this on!'
  },
  PRICE_NEGOTIATION: {
    reason: 'PRICE_NEGOTIATION',
    priority: 'NORMAL',
    notifyAgent: true,
    pauseAI: false,
    message: 'Let me get {{AGENT_NAME}} involved for this one — they\'re best placed to handle negotiations.'
  },
  EMOTIONAL_CUSTOMER: {
    reason: 'EMOTIONAL_CUSTOMER',
    priority: 'NORMAL',
    notifyAgent: true,
    pauseAI: false,
    message: 'I can hear you\'re feeling frustrated — I\'m looping in {{AGENT_NAME}} who can help directly.'
  },
  UNCERTAIN_AI: {
    reason: 'UNCERTAIN_AI',
    priority: 'LOW',
    notifyAgent: true,
    pauseAI: false,
    message: 'Good question! Let me check with the team and get back to you.'
  },
  REQUESTED_HUMAN: {
    reason: 'REQUESTED_HUMAN',
    priority: 'HIGH',
    notifyAgent: true,
    pauseAI: true,
    message: 'Absolutely! {{AGENT_NAME}} will be in touch shortly. Thanks for your patience.'
  },
  ESCALATION_TRIGGER: {
    reason: 'ESCALATION_TRIGGER',
    priority: 'HIGH',
    notifyAgent: true,
    pauseAI: false,
    message: 'I\'ve passed this to {{AGENT_NAME}} at {{AGENCY_NAME}} who will follow up with you directly.'
  }
};

/**
 * Determine if a conversation should hand off to a human
 * @param {object} params
 * @returns {{ shouldHandoff: boolean, reason: string, handoffConfig: object }}
 */
function shouldHandoff({ riskLevel, message, context, customerRequested, aiConfidence, escalationTrigger }) {
  // Customer explicitly requested human
  if (customerRequested) {
    return {
      shouldHandoff: true,
      reason: 'REQUESTED_HUMAN',
      handoffConfig: HANDOFF_REASONS.REQUESTED_HUMAN
    };
  }

  // Critical risk — always hand off
  if (riskLevel === 'CRITICAL') {
    return {
      shouldHandoff: true,
      reason: 'CRITICAL_RISK',
      handoffConfig: HANDOFF_REASONS.CRITICAL_RISK
    };
  }

  // Escalation trigger from guardrails
  if (escalationTrigger) {
    return {
      shouldHandoff: true,
      reason: 'ESCALATION_TRIGGER',
      handoffConfig: HANDOFF_REASONS.ESCALATION_TRIGGER
    };
  }

  // Legal question
  if (/legal\s+advice|contract\s+interpretation|what\s+does\s+the\s+law\s+say/i.test(message)) {
    return {
      shouldHandoff: true,
      reason: 'LEGAL_QUESTION',
      handoffConfig: HANDOFF_REASONS.LEGAL_QUESTION
    };
  }

  // Price negotiation (agent should handle)
  if (/negotiat|counter\s+offer|lower\s+offer|below\s+asking/i.test(message)) {
    return {
      shouldHandoff: true,
      reason: 'PRICE_NEGOTIATION',
      handoffConfig: HANDOFF_REASONS.PRICE_NEGOTIATION
    };
  }

  // Low AI confidence
  if (aiConfidence && aiConfidence < 0.5) {
    return {
      shouldHandoff: true,
      reason: 'UNCERTAIN_AI',
      handoffConfig: HANDOFF_REASONS.UNCERTAIN_AI
    };
  }

  return {
    shouldHandoff: false,
    reason: null,
    handoffConfig: null
  };
}

/**
 * Build handoff notification payload for agent
 * @param {object} params
 * @returns {object}
 */
function buildHandoffNotification({ handoffReason, leadId, conversationId, message, context, platform }) {
  const config = HANDOFF_REASONS[handoffReason] || HANDOFF_REASONS.ESCALATION_TRIGGER;

  return {
    type: 'AGENT_NOTIFICATION',
    priority: config.priority,
    timestamp: new Date().toISOString(),
    reason: handoffReason,
    lead: leadId,
    conversation: conversationId,
    platform,
    originalMessage: message,
    context: {
      property_address: context.PROPERTY_ADDRESS,
      agent_name: context.AGENT_NAME,
      agency_name: context.AGENCY_NAME,
      customer_name: context.customerName,
      conversation_history: context.conversationHistory || []
    },
    action: {
      pauseAI: config.pauseAI,
      notifyAgent: config.notifyAgent,
      suggestedResponse: config.message
        .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || 'the team')
        .replace(/{{AGENCY_NAME}}/g, context.AGENCY_NAME || '')
    },
    hotLead: context.isHotLead || false
  };
}

/**
 * Build the AI response message when handing off
 * @param {string} reason
 * @param {object} context
 * @returns {string}
 */
function buildHandoffResponse(reason, context = {}) {
  const config = HANDOFF_REASONS[reason] || HANDOFF_REASONS.ESCALATION_TRIGGER;
  return config.message
    .replace(/{{AGENT_NAME}}/g, context.AGENT_NAME || 'the team')
    .replace(/{{AGENCY_NAME}}/g, context.AGENCY_NAME || '');
}

module.exports = {
  HANDOFF_REASONS,
  shouldHandoff,
  buildHandoffNotification,
  buildHandoffResponse
};