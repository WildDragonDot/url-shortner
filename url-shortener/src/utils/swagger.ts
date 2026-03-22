/**
 * src/utils/swagger.ts
 *
 * Swagger / OpenAPI 3.0 documentation setup.
 *
 * Kya hai Swagger?
 *   API documentation tool — browser mein /api-docs pe jaao,
 *   saare endpoints, request/response schemas, aur live testing milta hai.
 *
 * swagger-jsdoc: Route files mein JSDoc comments se spec generate karta hai.
 * swagger-ui-express: Generated spec ko browser mein serve karta hai.
 *
 * Access: http://localhost:3000/api-docs
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'URL Shortener API',
      version:     '1.0.0',
      description: 'Production-grade URL Shortener — TypeScript + Node.js + Prisma + PostgreSQL',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url:         process.env.BASE_URL || 'http://localhost:3000',
        description: 'Current server',
      },
    ],
    // Security scheme — JWT Bearer token
    components: {
      securitySchemes: {
        BearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'JWT token ya API key (sk_xxx...) dono accept hote hain',
        },
      },
      // Reusable response schemas
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Something went wrong' },
          },
        },
        ShortUrl: {
          type: 'object',
          properties: {
            short_url:  { type: 'string', example: 'http://localhost:3000/abc1234' },
            long_url:   { type: 'string', example: 'https://very-long-url.com/path' },
            code:       { type: 'string', example: 'abc1234' },
            qr_code:    { type: 'string', example: 'data:image/png;base64,...' },
            qr_url:     { type: 'string', example: 'http://localhost:3000/abc1234/qr' },
            share_url:  { type: 'string', example: 'http://localhost:3000/abc1234/qr/share' },
            embed_url:  { type: 'string', example: 'http://localhost:3000/abc1234/qr/embed' },
            expires_at: { type: 'string', nullable: true, example: '2027-12-31T00:00:00Z' },
            created_at: { type: 'string', example: '2026-03-21T10:00:00Z' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id:    { type: 'integer', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
          },
        },
      },
    },
    // Global security — saare endpoints pe Bearer auth optional hai
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',      description: 'Register, login' },
      { name: 'URLs',      description: 'Create, manage short URLs' },
      { name: 'Redirect',  description: 'URL redirect' },
      { name: 'QR',        description: 'QR code generation aur sharing' },
      { name: 'Analytics', description: 'Click analytics' },
      { name: 'API Keys',  description: 'Programmatic access keys' },
      { name: 'Health',    description: 'Server health check' },
    ],
  },
  // Route files mein JSDoc comments scan karo
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
