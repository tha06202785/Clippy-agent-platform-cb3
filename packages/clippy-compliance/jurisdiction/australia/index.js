/**
 * Australian Jurisdiction — Index
 */

const rules = require('./rules');

module.exports = {
  rules,
  STATE: rules.STATE,
  STATE_DISCLAIMERS: rules.STATE_DISCLAIMERS,
  RENTAL_RULES: rules.RENTAL_RULES,
  VALUE_RULES: rules.VALUE_RULES,
  LEGAL_RULES: rules.LEGAL_RULES,
  checkFairHousing: rules.checkFairHousing,
  detectState: rules.detectState,
  JURISDICTION_CONFIG: rules.JURISDICTION_CONFIG
};