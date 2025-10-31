import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';

const r = Router();

// Health check with detailed metrics
r.get('/health', async (req, res) => {
  const start = Date.now();
  
  try {
    // Database connectivity test
    const dbResult = await db.query('SELECT NOW() as timestamp, version() as version');
    const dbLatency = Date.now() - start;
    
    // Check critical tables
    const tableChecks = await Promise.all([
      db.query('SELECT COUNT(*) FROM schools'),
      db.query('SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL \'24 hours\''),
      db.query('SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL \'1 hour\'')
    ]);
    
    const metrics = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        latency_ms: dbLatency,
        version: dbResult.rows[0].version.split(' ')[1]
      },
      metrics: {
        total_schools: tableChecks[0].rows[0].count,
        new_users_24h: tableChecks[1].rows[0].count,
        audit_logs_1h: tableChecks[2].rows[0].count
      },
      slo: {
        api_latency_p95_target: 300,
        current_latency: dbLatency,
        uptime_target: 99.9
      }
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
      latency_ms: Date.now() - start
    });
  }
});

// System metrics (platform owner only)
r.get('/metrics', requireAuth, async (req, res, next) => {
  try {
    if (req.user?.school_id) {
      return res.status(403).json({ ok: false, error: 'Platform access required' });
    }
    
    const metrics = await Promise.all([
      // Error rates
      db.query(`
        SELECT COUNT(*) as error_count
        FROM audit_logs 
        WHERE action LIKE '%error%' AND created_at > NOW() - INTERVAL '1 hour'
      `),
      
      // Queue backlogs (simulated)
      db.query(`
        SELECT COUNT(*) as pending_emails
        FROM audit_logs 
        WHERE action = 'email_queued' AND created_at > NOW() - INTERVAL '5 minutes'
      `),
      
      // AR aging
      db.query(`
        SELECT 
          SUM(CASE WHEN due_date > CURRENT_DATE THEN total_cents - paid_cents ELSE 0 END) as current,
          SUM(CASE WHEN due_date BETWEEN CURRENT_DATE - 30 AND CURRENT_DATE THEN total_cents - paid_cents ELSE 0 END) as overdue_30,
          SUM(CASE WHEN due_date < CURRENT_DATE - 30 THEN total_cents - paid_cents ELSE 0 END) as overdue_60_plus
        FROM invoices 
        WHERE status IN ('open', 'partial')
      `),
      
      // Storage usage
      db.query(`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as db_size,
          COUNT(*) as total_records
        FROM audit_logs
      `)
    ]);
    
    res.json({
      error_rate_1h: metrics[0].rows[0].error_count,
      email_queue_backlog: metrics[1].rows[0].pending_emails,
      ar_aging: metrics[2].rows[0],
      storage: metrics[3].rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    next(e);
  }
});

// Performance test endpoint
r.get('/perf-test', async (req, res) => {
  const start = Date.now();
  
  try {
    // Simulate typical workload
    await Promise.all([
      db.query('SELECT COUNT(*) FROM schools'),
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM students'),
      db.query('SELECT COUNT(*) FROM invoices WHERE created_at > CURRENT_DATE - 7')
    ]);
    
    const latency = Date.now() - start;
    const status = latency < 300 ? 'pass' : 'fail';
    
    res.json({
      latency_ms: latency,
      target_ms: 300,
      status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      latency_ms: Date.now() - start,
      error: 'Performance test failed'
    });
  }
});

export default r;