/**
 * Clippy Compliance — Facebook Full Pipeline Test
 * Run: node test-facebook-pipeline.js
 */

const ClippyCompliance = require('./index');

const clippy = new ClippyCompliance({
  jurisdiction: 'australia',
  state: 'VIC',
  platform: 'facebook',
  agency: { name: 'Prestige Real Estate' },
  agentName: 'Sarah'
});

const facebookLead = {
  id: 'fb-lead-4829103',
  name: 'Michael Chen',
  source: 'facebook',
  phone: '+61412345678',
  interest: 'buyer',
  propertyInterest: '22 Hope Street, Abbotsford VIC',
  financing_status: 'pre_approved'
};

// Simulated inbound messages from Facebook lead
const tests = [
  {
    name: 'Normal property inquiry',
    inbound: "Hi! Is 22 Hope Street in Abbotsford still available?",
    aiResponse: "Yes, it's still available! Beautiful Victorian terrace, 3BR, 2BA. Would you like to book an inspection?",
    expect: { hotLead: false, block: false }
  },
  {
    name: 'Price + offer question (needs disclaimer)',
    inbound: "What's the price? And would they accept an offer below asking?",
    aiResponse: "It's listed at $1.2M. I can present any offer to the vendor. What situation are you in?",
    expect: { disclaimer: true, block: false }
  },
  {
    name: 'Broker referral question',
    inbound: "Can you recommend a good mortgage broker in Melbourne?",
    aiResponse: "Happy to suggest some brokers — I can share a few names if helpful!",
    expect: { disclaimer: false, block: false }
  },
  {
    name: 'Hot lead — pre-approved buyer',
    inbound: "We're pre-approved and ready to go — can we inspect this weekend?",
    aiResponse: "Excellent! Pre-approval makes you a strong buyer. I can arrange Saturday or Sunday — which suits?",
    expect: { hotLead: true, block: false }
  },
  {
    name: 'Discrimination attempt — MUST BLOCK',
    inbound: "We only want to see properties in areas with specific ethnic demographics.",
    aiResponse: "I can certainly help you find the right property — let me know what areas you're interested in!",
    expect: { block: true, hotLead: false }
  }
];

async function runTests() {
  console.log('\n=== CLIPPY COMPLIANCE — Facebook Pipeline Test ===\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    process.stdout.write(`Test: ${test.name}... `);

    // Step 1: preFlightCheck (scans inbound)
    const pre = clippy.preFlightCheck({
      message: test.inbound,
      lead: facebookLead,
      platform: 'facebook'
    });

    // Step 2: gateResponse (filters AI response before sending)
    const gated = clippy.gateResponse({
      response: test.aiResponse,
      platform: 'facebook'
    });

    let ok = true;
    let notes = [];

    if (test.expect.block) {
      if (!pre.complianceContext.shouldEscalate) {
        ok = false;
        notes.push('FAIL: should have escalated (block)');
      }
    } else {
      if (pre.complianceContext.shouldEscalate) {
        ok = false;
        notes.push('FAIL: escalated unexpectedly');
      }
    }

    if (test.expect.hotLead) {
      if (!pre.complianceContext.hotLead) {
        ok = false;
        notes.push('FAIL: hot lead not detected');
      }
    }

    if (test.expect.disclaimer) {
      if (gated.disclaimersApplied.length === 0) {
        ok = false;
        notes.push('FAIL: no disclaimer applied');
      }
    }

    if (ok) {
      console.log(`✅ PASS`);
      passed++;
    } else {
      console.log(`❌ FAIL — ${notes.join(' | ')}`);
      failed++;
    }

    if (pre.complianceContext.disclaimers?.length > 0) {
      console.log(`   Disclaimer(s): ${pre.complianceContext.disclaimers.map(d => d.type).join(', ')}`);
    }
    if (pre.complianceContext.hotLead) {
      console.log(`   🔥 Hot lead detected`);
    }
    if (gated.wasModified) {
      console.log(`   📋 Response modified: ${gated.disclaimersApplied.map(d => `[${d.type}]`).join(' ')}`);
    }
    console.log(`   Risk: ${pre.complianceContext.riskLevel} | Escalate: ${pre.complianceContext.shouldEscalate}`);
  }

  console.log(`\n${passed} passed / ${tests.length} total`);
  console.log(failed === 0 ? '\n✅ All Facebook pipeline tests passed!' : `\n⚠️  ${failed} test(s) failed`);
}

runTests().catch(console.error);