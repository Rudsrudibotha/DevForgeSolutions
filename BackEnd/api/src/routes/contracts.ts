import { Router } from 'express';
import { z } from 'zod';
import { Database } from '../services/database.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const csrfProtection = (req: any, res: any, next: any) => {
  const token = req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'];
  if (!token || typeof token !== 'string') {
    return res.status(403).json({ ok: false, error: { code: 'CSRF_REQUIRED', message: 'CSRF token required' } });
  }
  next();
};

const router = Router();

const contractSchema = z.object({
  templateId: z.string().uuid(),
  studentId: z.string().uuid(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

// Get contracts
router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { studentId, status } = req.query;
    
    let query = `
      SELECT sc.*, s.first_name, s.last_name, s.student_no, ct.name as template_name
      FROM student_contracts sc
      JOIN students s ON sc.student_id = s.id
      JOIN contract_templates ct ON sc.template_id = ct.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramCount = 1;
    
    if (studentId) {
      query += ` AND sc.student_id = $${paramCount++}`;
      params.push(studentId);
    }
    
    if (status) {
      query += ` AND sc.status = $${paramCount++}`;
      params.push(status);
    }
    
    query += ' ORDER BY sc.created_at DESC';

    const result = await Database.query(query, params, req.user!.schoolId);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create contract from template
router.post('/', csrfProtection, authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const data = contractSchema.parse(req.body);

    const result = await Database.transaction(async (client) => {
      // Get template details
      const templateResult = await client.query(
        'SELECT * FROM contract_templates WHERE id = $1 AND status = $2',
        [data.templateId, 'published']
      );

      if (templateResult.rows.length === 0) {
        throw new Error('Template not found or not published');
      }

      const template = templateResult.rows[0];

      // Create contract
      const contractResult = await client.query(
        `INSERT INTO student_contracts (school_id, template_id, student_id, version, status, issued_at, due_date, created_by)
         VALUES ($1, $2, $3, $4, 'issued', now(), $5, $6)
         RETURNING *`,
        [req.user!.schoolId, data.templateId, data.studentId, template.version, data.dueDate, req.user!.id]
      );

      const contract = contractResult.rows[0];

      // Copy template sections
      const sectionsResult = await client.query(
        'SELECT * FROM contract_template_sections WHERE template_id = $1 ORDER BY seq',
        [data.templateId]
      );

      for (const section of sectionsResult.rows) {
        await client.query(
          `INSERT INTO student_contract_sections (school_id, student_contract_id, template_section_id, seq, title, body_rendered)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user!.schoolId, contract.id, section.id, section.seq, section.title, section.body_md]
        );
      }

      // Copy template signers
      const signersResult = await client.query(
        'SELECT * FROM contract_template_signers WHERE template_id = $1',
        [data.templateId]
      );

      for (const signer of signersResult.rows) {
        let userId = null, guardianId = null, staffId = null;

        if (signer.signer_role === 'guardian') {
          // Find student's guardians
          const guardianResult = await client.query(
            `SELECT g.id, g.user_id, u.full_name, u.email
             FROM guardians g
             JOIN users u ON g.user_id = u.id
             JOIN student_guardians sg ON g.id = sg.guardian_id
             WHERE sg.student_id = $1`,
            [data.studentId]
          );

          if (guardianResult.rows.length > 0) {
            const guardian = guardianResult.rows[0];
            guardianId = guardian.id;
            userId = guardian.user_id;
          }
        }

        await client.query(
          `INSERT INTO student_contract_signers (school_id, student_contract_id, signer_role, relation_hint, user_id, guardian_id, staff_id, full_name, email, must_sign)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            req.user!.schoolId,
            contract.id,
            signer.signer_role,
            signer.relation_hint,
            userId,
            guardianId,
            staffId,
            'TBD', // Will be updated when actual signer is assigned
            null,
            signer.must_sign
          ]
        );
      }

      return contract;
    }, req.user!.schoolId);

    res.status(201).json(result);
  } catch (error: any) {
    req.log?.error({ error: error.message }, 'Contract creation failed');
    next(error);
  }
});

// Get contract details
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const contractResult = await Database.query(
      `SELECT sc.*, s.first_name, s.last_name, ct.name as template_name
       FROM student_contracts sc
       JOIN students s ON sc.student_id = s.id
       JOIN contract_templates ct ON sc.template_id = ct.id
       WHERE sc.id = $1`,
      [req.params.id],
      req.user!.schoolId
    );

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const sectionsResult = await Database.query(
      `SELECT scs.*, 
              json_agg(
                json_build_object(
                  'id', sig.id,
                  'signed_at', sig.signed_at,
                  'signature_type', sig.signature_type
                )
              ) FILTER (WHERE sig.id IS NOT NULL) as signatures
       FROM student_contract_sections scs
       LEFT JOIN student_contract_section_signatures sig ON scs.id = sig.section_instance_id
       WHERE scs.student_contract_id = $1
       GROUP BY scs.id
       ORDER BY scs.seq`,
      [req.params.id],
      req.user!.schoolId
    );

    const signersResult = await Database.query(
      'SELECT * FROM student_contract_signers WHERE student_contract_id = $1',
      [req.params.id],
      req.user!.schoolId
    );

    const contract = contractResult.rows[0];
    contract.sections = sectionsResult.rows;
    contract.signers = signersResult.rows;

    res.json(contract);
  } catch (error) {
    next(error);
  }
});

// Sign contract section
router.post('/:id/sections/:sectionId/sign', csrfProtection, authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { signatureType, signatureSvg } = req.body;

    // Find signer for this user
    const signerResult = await Database.query(
      `SELECT scs.id as signer_id
       FROM student_contract_signers scs
       WHERE scs.student_contract_id = $1 AND scs.user_id = $2`,
      [req.params.id, req.user!.id],
      req.user!.schoolId
    );

    if (signerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized to sign this contract' });
    }

    const signerId = signerResult.rows[0].signer_id;

    const result = await Database.query(
      `INSERT INTO student_contract_section_signatures (school_id, section_instance_id, signer_id, signature_type, signature_svg, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (school_id, section_instance_id, signer_id)
       DO UPDATE SET signature_type = EXCLUDED.signature_type, signature_svg = EXCLUDED.signature_svg, signed_at = now()
       RETURNING *`,
      [
        req.user!.schoolId,
        req.params.sectionId,
        signerId,
        signatureType,
        signatureSvg,
        req.ip,
        req.get('User-Agent')
      ],
      req.user!.schoolId
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    req.log?.error({ error: error.message }, 'Contract signing failed');
    next(error);
  }
});

export { router as contractsRouter };