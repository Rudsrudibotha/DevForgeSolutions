import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

export function generateOpenAPISpec() {
  const registry = new OpenAPIRegistry();

  // Register schemas
  registry.registerPath({
    method: 'post',
    path: '/api/auth/login',
    description: 'Authenticate user with email and password to receive JWT tokens for API access',
    summary: 'User authentication endpoint',
    tags: ['Authentication'],
    request: {
      body: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string' }
              },
              required: ['email', 'password']
            }
          }
        }
      }
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                user: { type: 'object' },
                school: { type: 'object' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' }
              }
            }
          }
        }
      },
      401: {
        description: 'Invalid credentials'
      }
    }
  });

  registry.registerPath({
    method: 'get',
    path: '/api/students',
    description: 'Retrieve a paginated list of all students enrolled in the authenticated school with their basic information',
    summary: 'Get students list',
    tags: ['Students'],
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        schema: { type: 'integer', minimum: 1, default: 1 }
      },
      {
        name: 'limit',
        in: 'query', 
        description: 'Number of students per page',
        schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
      }
    ],
    responses: {
      200: {
        description: 'List of students',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  student_no: { type: 'string' },
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  grade: { type: 'string' },
                  status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'DevForgeSolutions API',
      description: 'School Management SaaS API'
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  });
}