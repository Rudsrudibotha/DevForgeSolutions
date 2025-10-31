import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';
import { DataSubjectRequestType, LawfulBasis } from '../middleware/popia.js';

const r = Router();

// Submit data subject request
r.post('/data-request', async (req, res, next) => {
  try {
    const { email, request_type, details } = req.body;
    
    if (!Object.values(DataSubjectRequestType).includes(request_type)) {
      return res.status(400).json({ ok: false, error: 'Invalid request type' });
    }
    
    const { rows } = await db.query(
      `INSERT INTO data_subject_requests (email, request_type, details, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id`,
      [email, request_type, details]
    );
    
    // Log the request
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, details, ip_address)
       VALUES ('data_subject_request', 'privacy', $1, $2, $3)`,
      [rows[0].id, JSON.stringify({ email, request_type }), req.ip]
    );
    
    res.json({ 
      ok: true, 
      request_id: rows[0].id,
      message: 'Data subject request submitted. We will respond within 30 days as required by POPIA.'
    });
  } catch (e: any) {
    next(e);
  }
});

// Get privacy policy
r.get('/policy', (req, res) => {
  res.json({
    policy: {
      title: 'Privacy Policy - DevForgeSolutions',
      last_updated: '2024-01-01',
      sections: [
        {
          title: 'Information We Collect',
          content: 'We collect personal information necessary for school management including student records, guardian contact details, and financial information.'
        },
        {
          title: 'Lawful Basis for Processing',
          content: 'We process personal information based on contract performance, legal obligations, and legitimate interests in providing school management services.'
        },
        {
          title: 'Your Rights Under POPIA',
          content: 'You have the right to access, correct, delete, or object to processing of your personal information. Contact us to exercise these rights.'
        },
        {
          title: 'Data Security',
          content: 'We implement appropriate technical and organizational measures to protect personal information against unauthorized access, alteration, disclosure, or destruction.'
        },
        {
          title: 'Contact Information',
          content: 'For privacy-related inquiries, contact our Information Officer at privacy@devforgesolutions.com'
        }
      ]
    }
  });
});

// Data breach notification (internal)
r.post('/breach', requireAuth, async (req, res, next) => {
  try {
    const { description, affected_records, severity, containment_actions } = req.body;
    
    const { rows } = await db.query(
      `INSERT INTO data_breaches (school_id, description, affected_records, severity, 
                                  containment_actions, reported_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'investigating', NOW())
       RETURNING id`,
      [req.user?.school_id, description, affected_records, severity, containment_actions, req.user?.sub]
    );
    
    // Auto-escalate high severity breaches
    if (severity === 'high' || severity === 'critical') {
      // In production: send immediate alerts to security team
      console.log(`CRITICAL BREACH ALERT: ${description}`);
    }
    
    res.json({ ok: true, breach_id: rows[0].id });
  } catch (e: any) {
    next(e);
  }
});

export default r;