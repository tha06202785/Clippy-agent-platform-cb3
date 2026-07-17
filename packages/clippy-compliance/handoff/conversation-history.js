/**
 * Conversation History — Clippy AI Copilot
 * Context preservation for human handoff
 */

/**
 * Build a conversation summary for agent handoff
 * @param {object[]} messages - Array of { role, content, timestamp }
 * @param {object} context - Current context (property, agent, etc.)
 * @returns {object}
 */
function buildHandoffSummary(messages, context = {}) {
  const recentMessages = messages.slice(-10); // Last 10 messages
  const summary = summarizeConversation(recentMessages);
  const keyPoints = extractKeyPoints(recentMessages);

  return {
    summary,
    keyPoints,
    lead: {
      name: context.customerName,
      platform: context.platform,
      firstContact: context.firstContact,
      propertyInterest: context.PROPERTY_ADDRESS
    },
    conversationLength: messages.length,
    lastMessage: recentMessages[recentMessages.length - 1]?.content?.substring(0, 200) || '',
    pendingQuestions: extractPendingQuestions(recentMessages),
    crmData: context.crmData || null,
    riskFlags: context.riskFlags || [],
    timestamp: new Date().toISOString()
  };
}

/**
 * Summarize conversation in 2-3 sentences
 * @param {object[]} messages
 * @returns {string}
 */
function summarizeConversation(messages) {
  if (!messages || messages.length === 0) return 'New conversation — no messages yet.';

  const firstMsg = messages[0]?.content || '';
  const lastMsg = messages[messages.length - 1]?.content || '';

  // Very simple summarization
  let summary = `Customer enquiry started with: "${firstMsg.substring(0, 80)}...". `;
  summary += `Most recent message: "${lastMsg.substring(0, 80)}...".`;
  return summary;
}

/**
 * Extract key decision-relevant points from conversation
 * @param {object[]} messages
 * @returns {string[]}
 */
function extractKeyPoints(messages) {
  const points = [];
  const allText = messages.map(m => m.content).join(' ');

  // Budget mentioned
  const budgetMatch = allText.match(/\$[\d,]+(\s*k|\s*million)?/i);
  if (budgetMatch) points.push(`Budget mentioned: ${budgetMatch[0]}`);

  // Timeline
  if (/ready\s+to\s+buy|immediate|urgent/i.test(allText)) points.push('Timeline: Ready to act now');
  else if (/3\s+month|browsing|just\s+look/i.test(allText)) points.push('Timeline: Not urgent');

  // Property interest
  const propMatch = allText.match(/\d+\s+\w+\s+(street|road|avenue|cl|place)/i);
  if (propMatch) points.push(`Property interest: ${propMatch[0]}`);

  // Financing
  if (/pre-approv|cash\s+buyer/i.test(allText)) points.push('Financing: Pre-approved or cash');
  else if (/not\s+approv|still\s+look/i.test(allText)) points.push('Financing: Not yet arranged');

  // Hot lead signals
  if (messages.length >= 3 && points.length >= 2) points.push('Profile: Engaged, qualified prospect');

  return points;
}

/**
 * Extract unanswered questions still pending
 * @param {object[]} messages
 * @returns {string[]}
 */
function extractPendingQuestions(messages) {
  const questions = [];
  for (const msg of messages) {
    if (msg.role === 'user') {
      const qMatches = msg.content.match(/(?:^|[.?])\s*([^.?,]+\?)/g);
      if (qMatches) questions.push(...qMatches.map(q => q.trim()));
    }
  }
  // Return last 3 unanswered questions (simple heuristic — assume last user questions are pending)
  return questions.slice(-3);
}

/**
 * Format conversation history for CRM logging
 * @param {object[]} messages
 * @returns {string}
 */
function formatForCrm(messages) {
  return messages.map(m => {
    const time = m.timestamp ? new Date(m.timestamp).toLocaleString('en-AU') : '';
    const role = m.role === 'user' ? 'Customer' : 'AI';
    return `[${time}] ${role}: ${m.content.substring(0, 500)}`;
  }).join('\n');
}

module.exports = {
  buildHandoffSummary,
  summarizeConversation,
  extractKeyPoints,
  extractPendingQuestions,
  formatForCrm
};