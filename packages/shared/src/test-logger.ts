/**
 * Clippy Test Logger
 * Writes test log entries to Supabase `clippy_activity_log` (category = 'test').
 * Also creates a `test_logs` shadow table via migration when Supabase allows DDL.
 *
 * Usage:
 *   import { testLog } from '@clippy/shared/test-logger'
 *
 *   // Log a test result
 *   await testLog({
 *     action: 'api_route_test',
 *     title: 'GET /api/leads - returns 200',
 *     metadata: { route: '/api/leads', method: 'GET', status: 200, latencyMs: 45 },
 *     orgId: '...',
 *     userId: '...',
 *   })
 *
 *   // Log a failed assertion
 *   await testLog({
 *     action: 'assertion_failed',
 *     title: 'Expected leads.length > 0',
 *     metadata: { expected: '> 0', actual: 0, route: '/api/leads' },
 *     orgId: '...',
 *     userId: '...',
 *   })
 *
 *   // Log AI/Copilot call
 *   await testLog({
 *     action: 'ai_copilot_call',
 *     title: 'POST /api/copilot - compliance passed',
 *     metadata: { model: 'kimi-k2.6', promptTokens: 120, responseTokens: 80, blocked: false },
 *     orgId: '...',
 *     userId: '...',
 *   })
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://mqydieqeybgxtjqogrwh.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''

// Server-side client (bypasses RLS)
export const testLoggerDb = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { db: { schema: 'public' } })
  : null

export type TestLogLevel = 'info' | 'warn' | 'error' | 'pass' | 'fail'

export interface TestLogInput {
  action: string
  title: string
  metadata?: Record<string, unknown>
  orgId: string
  userId: string
  level?: TestLogLevel
}

export interface TestLogEntry extends TestLogInput {
  id: string
  createdAt: string
}

/**
 * Write a test log entry to clippy_activity_log (category = 'test').
 * Gracefully no-ops if Supabase is unavailable or keys are missing.
 */
export async function testLog(input: TestLogInput): Promise<TestLogEntry | null> {
  if (!testLoggerDb) {
    console.warn('[testLog] Supabase service key not configured, skipping log')
    return null
  }

  const { data, error } = await testLoggerDb
    .from('clippy_activity_log')
    .insert({
      action: input.action,
      title: input.title,
      category: 'test',
      org_id: input.orgId,
      user_id: input.userId,
      metadata: {
        level: input.level ?? 'info',
        ...input.metadata,
      },
    })
    .select()
    .single()

  if (error) {
    console.error('[testLog] Failed to write test log:', error.message)
    return null
  }

  return {
    id: data.id,
    action: data.action,
    title: data.title,
    metadata: data.metadata,
    orgId: data.org_id,
    userId: data.user_id,
    createdAt: data.created_at,
  }
}

/**
 * Query test logs from clippy_activity_log.
 * Use for reading back test results.
 */
export async function queryTestLogs(params: {
  orgId?: string
  userId?: string
  action?: string
  level?: TestLogLevel
  limit?: number
  since?: Date
}): Promise<TestLogEntry[]> {
  if (!testLoggerDb) return []

  let query = testLoggerDb
    .from('clippy_activity_log')
    .select('*')
    .eq('category', 'test')
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.orgId) query = query.eq('org_id', params.orgId)
  if (params.userId) query = query.eq('user_id', params.userId)
  if (params.action) query = query.eq('action', params.action)
  if (params.since) query = query.gte('created_at', params.since.toISOString())

  const { data, error } = await query

  if (error || !data) return []

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    action: row.action as string,
    title: row.title as string,
    metadata: row.metadata as Record<string, unknown>,
    orgId: row.org_id as string,
    userId: row.user_id as string,
    createdAt: row.created_at as string,
  }))
}

/**
 * Clear all test logs (for test isolation).
 */
export async function clearTestLogs(params?: { orgId?: string; before?: Date }): Promise<number> {
  if (!testLoggerDb) return 0

  let query = testLoggerDb.from('clippy_activity_log').delete().eq('category', 'test')

  if (params?.orgId) query = query.eq('org_id', params.orgId)
  if (params?.before) query = query.lt('created_at', params.before.toISOString())

  const { data, error } = await query.select('id')

  if (error) {
    console.error('[clearTestLogs] Failed:', error.message)
    return 0
  }

  return data?.length ?? 0
}
