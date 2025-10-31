import { Router } from 'express';
import { z } from 'zod';
import { db, setTenant } from '../services/database.js';
import { requireAuth, setTenantFromJwt } from '../middleware/index.js';
import type { Request } from 'express';

type AuthRequest = Request & { user: any; school_id: string };

const router = Router();

const createStudentSchema = z.object({
  studentNo: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  grade: z.string().optional(),
  classGroup: z.string().optional()
});

// Get all students
router.get('/', requireAuth, setTenantFromJwt, async (req: AuthRequest, res, next) => {
  try {
    const client = await db.connect();
    try {
      await setTenant(client, req.school_id);
      const result = await client.query(
        `SELECT id, student_no, first_name, last_name, grade, class_group, status
         FROM students 
         WHERE deleted_at IS NULL
         ORDER BY first_name, last_name`
      );
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

// Create student
router.post('/', authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const data = createStudentSchema.parse(req.body);

    const result = await Database.query(
      `INSERT INTO students (school_id, student_no, first_name, last_name, grade, class_group)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, student_no, first_name, last_name, grade, class_group, status`,
      [req.user!.schoolId, data.studentNo, data.firstName, data.lastName, data.grade, data.classGroup],
      req.user!.schoolId
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get student by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const result = await Database.query(
      `SELECT s.*, 
              json_agg(
                json_build_object(
                  'id', g.id,
                  'fullName', u.full_name,
                  'email', u.email,
                  'relationship', g.relationship
                )
              ) FILTER (WHERE g.id IS NOT NULL) as guardians
       FROM students s
       LEFT JOIN student_guardians sg ON s.id = sg.student_id
       LEFT JOIN guardians g ON sg.guardian_id = g.id
       LEFT JOIN users u ON g.user_id = u.id
       WHERE s.id = $1 AND s.deleted_at IS NULL
       GROUP BY s.id`,
      [req.params.id],
      req.user!.schoolId
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update student
router.put('/:id', authenticateToken, requireRole(['school_admin', 'staff']), async (req: AuthRequest, res, next) => {
  try {
    const data = createStudentSchema.partial().parse(req.body);
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const dbKey = key === 'studentNo' ? 'student_no' : 
                     key === 'firstName' ? 'first_name' :
                     key === 'lastName' ? 'last_name' :
                     key === 'classGroup' ? 'class_group' : key;
        updates.push(`${dbKey} = $${paramCount++}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(req.params.id);
    
    const result = await Database.query(
      `UPDATE students 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount} AND deleted_at IS NULL
       RETURNING id, student_no, first_name, last_name, grade, class_group, status`,
      values,
      req.user!.schoolId
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Soft delete student
router.delete('/:id', authenticateToken, requireRole(['school_admin']), async (req: AuthRequest, res, next) => {
  try {
    const result = await Database.query(
      'UPDATE students SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id',
      [req.params.id],
      req.user!.schoolId
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as studentsRouter };