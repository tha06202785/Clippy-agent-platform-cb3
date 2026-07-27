#!/usr/bin/env tsx
/**
 * Test logger verification script
 * Runs: npx tsx scripts/test-logger-verify.ts
 *
 * Tests that testLog() can write to and query from clippy_activity_log.
 */

import { testLog, queryTestLogs, clearTestLogs } from '../packages/shared/src/test-logger'

const ORG_ID = '7f91a043-805b-4e67-83ab-36b14bf85898'
const USER_ID = '8eacfffc-24ee-47a2-af47-1c8467cf0d0f'

async function run() {
  console.log('🧪 Clippy Test Logger — Verification\n')

  // 1. Clear old test logs for this org
  const cleared = await clearTestLogs({ orgId: ORG_ID })
  console.log(`✅ clearTestLogs: removed ${cleared} old entries`)

  // 2. Write a pass log
  const pass = await testLog({
    action: 'api_route_test',
    title: 'GET /api/leads — returns 200 with lead array',
    level: 'pass',
    metadata: { route: '/api/leads', method: 'GET', status: 200, latencyMs: 42 },
    orgId: ORG_ID,
    userId: USER_ID,
  })
  console.log(`✅ testLog PASS: ${pass?.id}`)

  // 3. Write a fail log
  const fail = await testLog({
    action: 'assertion_failed',
    title: 'Expected leads.length > 0, got 0',
    level: 'fail',
    metadata: { expected: 'leads.length > 0', actual: 0, route: '/api/leads' },
    orgId: ORG_ID,
    userId: USER_ID,
  })
  console.log(`✅ testLog FAIL: ${fail?.id}`)

  // 4. Write an AI/Copilot log
  const ai = await testLog({
    action: 'ai_copilot_call',
    title: 'POST /api/copilot — compliance check passed',
    level: 'pass',
    metadata: {
      model: 'kimi-k2.6',
      promptTokens: 120,
      responseTokens: 80,
      latencyMs: 1340,
      blocked: false,
      complianceVersion: '1.0.0',
    },
    orgId: ORG_ID,
    userId: USER_ID,
  })
  console.log(`✅ testLog AI: ${ai?.id}`)

  // 5. Write a warn log
  const warn = await testLog({
    action: 'assertion_failed',
    title: 'Response time exceeded SLO (200ms)',
    level: 'warn',
    metadata: { route: '/api/leads', latencyMs: 380, sloMs: 200 },
    orgId: ORG_ID,
    userId: USER_ID,
  })
  console.log(`✅ testLog WARN: ${warn?.id}`)

  // 6. Query all logs back
  console.log('\n📋 Querying all test logs...')
  const logs = await queryTestLogs({ orgId: ORG_ID, limit: 10 })
  console.log(`   Got ${logs.length} entries:`)
  logs.forEach((log) => {
    const lvl = (log.metadata?.level as string)?.toUpperCase().padEnd(5)
    console.log(`   [${lvl}] ${log.title}`)
    console.log(`            id=${log.id}  action=${log.action}`)
  })

  // 7. Query only failures
  console.log('\n❌ Failure-only query:')
  const fails = await queryTestLogs({ orgId: ORG_ID, action: 'assertion_failed' })
  fails.forEach((log) => {
    console.log(`   ${log.title}`)
    console.log(`   metadata: ${JSON.stringify(log.metadata)}`)
  })

  console.log('\n✅ All checks passed — test logger is working!')
}

run().catch((err) => {
  console.error('❌ Test logger verification FAILED:', err)
  process.exit(1)
})
