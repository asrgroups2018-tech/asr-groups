import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('FAIL: Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN.');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function runTests() {
  console.log('========================================');
  console.log('   TURSO DATABASE INTEGRATION TESTS');
  console.log('========================================');

  // Test 1: Query Tables
  console.log('\n[Test 1] Querying tables in Turso Cloud...');
  const tables = ['users', 'roles', 'customers', 'borrower_companies', 'loans', 'approval_rules', 'audit_logs', 'system_settings', 'permission_matrix'];
  for (const t of tables) {
    const res = await client.execute(`SELECT COUNT(*) as count FROM ${t}`);
    console.log(`  ✓ Table '${t}' exists. Rows: ${res.rows[0].count}`);
  }

  // Test 2: Insert, Update, Read, Delete a test user
  console.log('\n[Test 2] Testing User CRUD on Turso...');
  const testUserId = `TEST-${Date.now()}`;
  await client.execute({
    sql: `INSERT INTO users (id, name, email, phone, assigned_role_ids, primary_role_id, status, department, designation, joined_date, created_at, last_login, two_factor_enabled, sessions, is_customer)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      testUserId,
      'Test Integration User',
      `${testUserId}@test.com`,
      '+91 90000 00000',
      JSON.stringify([2]),
      2,
      'Active',
      'QA',
      'Test Engineer',
      '2026-09-12',
      '2026-09-12 12:00',
      'Never',
      0,
      '[]',
      0,
    ],
  });
  console.log(`  ✓ Inserted test user: ${testUserId}`);

  const fetchRes = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [testUserId],
  });
  if (fetchRes.rows.length !== 1 || fetchRes.rows[0].name !== 'Test Integration User') {
    throw new Error('Failed to read inserted user');
  }
  console.log(`  ✓ Read user '${fetchRes.rows[0].name}' successfully.`);

  await client.execute({
    sql: 'UPDATE users SET designation = ? WHERE id = ?',
    args: ['Senior QA Lead', testUserId],
  });
  const updatedRes = await client.execute({
    sql: 'SELECT designation FROM users WHERE id = ?',
    args: [testUserId],
  });
  if (updatedRes.rows[0].designation !== 'Senior QA Lead') {
    throw new Error('Update failed');
  }
  console.log('  ✓ Updated user designation to Senior QA Lead.');

  await client.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [testUserId],
  });
  const deleteRes = await client.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [testUserId],
  });
  if (deleteRes.rows.length !== 0) {
    throw new Error('Delete failed');
  }
  console.log('  ✓ Deleted test user successfully.');

  // Test 3: Test Transaction Batching (Atomic writes)
  console.log('\n[Test 3] Testing Transaction / Batching on Turso...');
  const testAuditId = `AUD-TEST-${Date.now()}`;
  await client.batch(
    [
      {
        sql: `INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role_id, action, target, ip_address, device, is_sensitive)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [testAuditId, '2026-09-12 12:00', 'TEST', 'Tester', 0, 'Triggered Backup', 'Integration Test Target', '127.0.0.1', 'Script', 0],
      },
      {
        sql: `DELETE FROM audit_logs WHERE id = ?`,
        args: [testAuditId],
      },
    ],
    'write'
  );
  console.log('  ✓ Transaction batch write executed successfully.');

  console.log('\n========================================');
  console.log('   ALL TURSO INTEGRATION TESTS PASSED! ');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
