import { Router } from 'express';
import { db } from '../services/database.js';
import { requireAuth } from '../middleware/auth.js';
import { setTenantContext, requireRole } from '../middleware/tenant.js';
import { generateContractPDF, generateDocumentHash, validateSignature } from '../services/contractPDF.js';

const r = Router();

// Get contract for signing (parent access)
r.get('/:id/sign', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT sc.*, s.first_name, s.last_name, sch.name as school_name,
              json_agg(
                json_build_object(
                  'id', cs.id,
                  'title', cs.title, 
                  'content', cs.content,
                  'is_mandatory', cs.is_mandatory,
                  'signed', sig.signed_at IS NOT NULL
                ) ORDER BY cs.sort_order
              ) as sections
       FROM student_contracts sc
       JOIN students s ON sc.student_id = s.id
       JOIN schools sch ON s.school_id = sch.id
       JOIN contract_sections cs ON sc.template_id = cs.template_id
       LEFT JOIN contract_signatures sig ON cs.id = sig.section_id AND sc.id = sig.contract_id
       WHERE sc.id = $1
       GROUP BY sc.id, s.first_name, s.last_name, sch.name`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'Contract not found' });
    }

    res.json(rows[0]);
  } catch (e: any) {
    next(e);
  }
});

// Sign contract section
r.post('/:contractId/sections/:sectionId/sign', async (req, res, next) => {
  try {
    const { contractId, sectionId } = req.params;
    const { guardian_name, guardian_email } = req.body;
    
    // ECTA compliance - validate consent
    if (!req.body.ecta_consent) {
      return res.status(400).json({ 
        ok: false, 
        error: 'ECTA consent required for electronic signature' 
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || '';
    
    // Find guardian by email
    const guardian = await db.query(
      'SELECT id FROM guardians WHERE user_id IN (SELECT id FROM users WHERE email = $1)',
      [guardian_email]
    );
    
    if (!guardian.rows.length) {
      return res.status(404).json({ ok: false, error: 'Guardian not found' });
    }

    const guardianId = guardian.rows[0].id;
    
    // Validate signature and create record
    const signatureData = validateSignature(contractId, sectionId, guardianId, ipAddress, userAgent);
    
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      // Insert signature
      await client.query(
        `INSERT INTO contract_signatures 
         (school_id, contract_id, section_id, guardian_id, signed_at, ip_address, user_agent, signature_data)
         SELECT s.school_id, $1, $2, $3, $4, $5, $6, $7
         FROM student_contracts sc
         JOIN students s ON sc.student_id = s.id
         WHERE sc.id = $1`,
        [contractId, sectionId, guardianId, signatureData.signed_at, 
         ipAddress, userAgent, JSON.stringify(signatureData)]
      );
      
      // Check if contract is complete
      const completion = await client.query(
        `SELECT 
           COUNT(cs.id) as total_sections,
           COUNT(sig.id) as signed_sections
         FROM contract_sections cs
         JOIN student_contracts sc ON cs.template_id = sc.template_id
         LEFT JOIN contract_signatures sig ON cs.id = sig.section_id AND sc.id = sig.contract_id
         WHERE sc.id = $1 AND cs.is_mandatory = true`,
        [contractId]
      );
      
      const { total_sections, signed_sections } = completion.rows[0];
      
      if (total_sections === signed_sections) {
        // Contract complete - generate final PDF
        const contractData = await client.query(
          `SELECT sc.*, s.first_name, s.last_name, sch.name as school_name
           FROM student_contracts sc
           JOIN students s ON sc.student_id = s.id  
           JOIN schools sch ON s.school_id = sch.id
           WHERE sc.id = $1`,
          [contractId]
        );
        
        const pdfData = {
          student_name: `${contractData.rows[0].first_name} ${contractData.rows[0].last_name}`,
          guardian_name,
          school_name: contractData.rows[0].school_name,
          sections: [] // Would populate from database
        };
        
        const pdfBuffer = generateContractPDF(pdfData);
        const documentHash = generateDocumentHash(pdfData);
        
        // Update contract status
        await client.query(
          `UPDATE student_contracts 
           SET status = 'completed', completed_at = NOW(), document_hash = $2
           WHERE id = $1`,
          [contractId, documentHash]
        );
        
        // Store PDF (in production, save to S3/storage)
        // await storePDF(contractId, pdfBuffer);
      }
      
      await client.query('COMMIT');
      
      // Log audit trail
      await client.query(
        `INSERT INTO audit_logs (school_id, action, resource_type, resource_id, details, ip_address, user_agent)
         SELECT s.school_id, 'contract_section_signed', 'contract', $1, $2, $3, $4
         FROM student_contracts sc
         JOIN students s ON sc.student_id = s.id
         WHERE sc.id = $1`,
        [contractId, JSON.stringify({ section_id: sectionId, guardian_email }), ipAddress, userAgent]
      );
      
      res.json({ ok: true, signature: signatureData });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    next(e);
  }
});

export default r;