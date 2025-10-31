import { db } from '../services/database.js';

// Critical tenant isolation tests
export async function runTenantIsolationTests(): Promise<boolean> {
  console.log('🔒 Running tenant isolation tests...');
  
  try {
    // Create test schools
    const school1 = await db.query(
      `INSERT INTO schools (name, slug, contact_email, status) 
       VALUES ('Test School 1', 'test-1', 'test1@example.com', 'active') 
       RETURNING id`
    );
    
    const school2 = await db.query(
      `INSERT INTO schools (name, slug, contact_email, status) 
       VALUES ('Test School 2', 'test-2', 'test2@example.com', 'active') 
       RETURNING id`
    );
    
    const school1Id = school1.rows[0].id;
    const school2Id = school2.rows[0].id;
    
    // Test 1: User from School A cannot see School B data
    const client1 = await db.connect();
    const client2 = await db.connect();
    
    try {
      // Set tenant context for school 1
      await client1.query('SELECT app.set_school($1)', [school1Id]);
      
      // Create student in school 1
      await client1.query(
        `INSERT INTO students (school_id, student_no, first_name, last_name) 
         VALUES ($1, 'S001', 'John', 'Doe')`,
        [school1Id]
      );
      
      // Set tenant context for school 2  
      await client2.query('SELECT app.set_school($1)', [school2Id]);
      
      // Try to access school 1's student from school 2 context
      const result = await client2.query('SELECT * FROM students WHERE student_no = $1', ['S001']);
      
      if (result.rows.length > 0) {
        console.error('❌ CRITICAL: Tenant isolation failed - School 2 can see School 1 data');
        return false;
      }
      
      console.log('✅ Test 1 passed: Cross-tenant data access blocked');
      
      // Test 2: Verify RLS is active
      await client1.query('SET row_security = off');
      const rlsTest = await client1.query('SHOW row_security');
      
      if (rlsTest.rows[0].row_security === 'off') {
        console.error('❌ CRITICAL: Row Level Security can be disabled');
        return false;
      }
      
      console.log('✅ Test 2 passed: RLS cannot be disabled by users');
      
      // Test 3: Verify tenant context is required
      const client3 = await db.connect();
      try {
        const noContextResult = await client3.query('SELECT COUNT(*) FROM students');
        if (noContextResult.rows[0].count > 0) {
          console.error('❌ CRITICAL: Data accessible without tenant context');
          return false;
        }
      } catch (e) {
        // Expected to fail without tenant context
      } finally {
        client3.release();
      }
      
      console.log('✅ Test 3 passed: Tenant context required for data access');
      
      return true;
      
    } finally {
      client1.release();
      client2.release();
      
      // Cleanup test data
      await db.query('DELETE FROM schools WHERE slug IN ($1, $2)', ['test-1', 'test-2']);
    }
    
  } catch (error) {
    console.error('❌ Tenant isolation test failed:', error);
    return false;
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTenantIsolationTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}