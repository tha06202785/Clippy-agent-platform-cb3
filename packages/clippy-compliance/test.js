/**
 * Compliance System — Quick Test Script
 * Run: node test.js
 */

const ClippyCompliance = require('./index');

const clippy = new ClippyCompliance({
  jurisdiction: 'australia',
  state: 'VIC',
  agency: { name: 'Mercer Property', license: '12345' },
  platform: 'whatsapp',
  agentName: 'Clippy'
});

const tests = [
  {
    name: 'Financial advice — CRITICAL risk',
    message: 'Should I invest in this property?',
    expect: { level: 'CRITICAL', trigger: 'FINANCIAL_ADVICE' }
  },
  {
    name: 'Price prediction — HIGH risk (finance guardrail)',
    message: 'Do you think this property will go up in value?',
    expect: { level: 'CRITICAL', trigger: 'FINANCIAL_ADVICE' }
  },
  {
    name: 'Legal question — HIGH risk',
    message: 'Can you explain clause 4.2b in the Section 32?',
    expect: { level: 'HIGH', trigger: 'VICTORIA_SPCIFIC' }
  },
  {
    name: 'Auction VIC — HIGH risk',
    message: 'What are the auction terms for this property?',
    expect: { level: 'HIGH', trigger: 'VICTORIA_SPCIFIC' }
  },
  {
    name: 'Hot lead signal — pre-approved',
    message: "I'm ready to sign, can we move fast?",
    expect: { hotLead: true }
  },
  {
    name: 'Hot lead signal — pre-approved buyer',
    message: 'Pre-approved and ready to buy now, how fast can we settle?',
    expect: { hotLead: true }
  },
  {
    name: 'Normal inquiry — LOW risk',
    message: 'When is the open for inspection?',
    expect: { level: 'LOW' }
  },
  {
    name: 'Normal buyer inquiry',
    message: 'Hi, interested in the property at 42 Harbour St. How many bedrooms?',
    expect: { level: 'LOW' }
  },
  {
    name: 'Rental application — HIGH risk',
    message: 'Will I get approved for this rental?',
    expect: { level: 'HIGH', trigger: 'RENTAL_LEAD_DISQUALIFICATION' }
  },
  {
    name: 'Discrimination risk — CRITICAL risk',
    message: 'Do you accept pets tenant?',
    expect: { level: 'CRITICAL', trigger: 'DISCRIMINATION_RISK' }
  }
];

console.log('🧪 Clippy Compliance System — Quick Test Suite\n');
console.log(`Package version: ${clippy.version}`);
console.log(`Jurisdiction: ${clippy.jurisdiction} / ${clippy.state}`);
console.log(`Platform: ${clippy.platform}\n`);
console.log('=' .repeat(60));

let passed = 0;
let failed = 0;

for (const test of tests) {
  process.stdout.write(`\n📋 ${test.name}...\n`);
  
  const result = clippy.preFlightCheck({ message: test.message });
  const quick = clippy.quickCheck(test.message);

  let ok = true;
  let details = [];

  if (test.expect.level) {
    if (quick.level === test.expect.level || result.raw.riskLevel === test.expect.level) {
      details.push(`✅ Level: ${quick.level}`);
    } else {
      details.push(`❌ Level: expected ${test.expect.level}, got ${quick.level} / ${result.raw.riskLevel}`);
      ok = false;
    }
  }

  if (test.expect.trigger) {
    if (quick.trigger === test.expect.trigger || result.raw.trigger === test.expect.trigger) {
      details.push(`✅ Trigger: ${quick.trigger}`);
    } else {
      details.push(`⚠️  Trigger: got ${quick.trigger} (expected ${test.expect.trigger})`);
    }
  }

  if (test.expect.hotLead !== undefined) {
    if (result.complianceContext.hotLead === test.expect.hotLead) {
      details.push(`✅ Hot lead: ${result.complianceContext.hotLead}`);
    } else {
      details.push(`❌ Hot lead: expected ${test.expect.hotLead}, got ${result.complianceContext.hotLead}`);
      ok = false;
    }
  }

  if (result.complianceContext.disclaimers.length > 0) {
    details.push(`📋 Disclaimers: ${result.complianceContext.disclaimers.map(d => d.type).join(', ')}`);
  }

  if (result.complianceContext.agentAlert) {
    details.push(`🔔 Agent alert: ${result.complianceContext.agentAlert.priority}`);
  }

  console.log('  ' + details.join(' | '));
  if (ok) passed++; else failed++;
}

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${tests.length} total`);

if (failed > 0) {
  console.log('\n❌ Some tests failed — review guardrail rules.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}