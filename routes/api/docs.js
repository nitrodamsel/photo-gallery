'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

// Try to load swagger-ui-express
let swaggerUi;
try {
  swaggerUi = require('swagger-ui-express');
} catch (e) {
  console.warn('swagger-ui-express not installed. Swagger UI will not be available.');
}

// Load OpenAPI spec
const specPath = path.join(__dirname, '../../openapi.yaml');

let swaggerDocument;
try {
  const specContent = fs.readFileSync(specPath, 'utf8');
  swaggerDocument = yaml.load(specContent);
} catch (e) {
  console.warn('Could not load openapi.yaml:', e.message);
  swaggerDocument = { openapi: '3.1.0', info: { title: 'API', version: '1.0.0' }, paths: {} };
}

// Serve raw OpenAPI spec as JSON
router.get('/', (req, res) => {
  res.json(swaggerDocument);
});

// Serve raw OpenAPI spec as YAML
router.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  try {
    res.send(fs.readFileSync(specPath, 'utf8'));
  } catch (e) {
    res.status(500).json({ error: 'Could not load OpenAPI spec' });
  }
});

// Serve Swagger UI
if (swaggerUi) {
  router.use('/ui', swaggerUi.serve);
  router.get('/ui', swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Photo Gallery API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  }));
} else {
  router.get('/ui', (req, res) => {
    res.status(503).send(`
      <html>
        <body>
          <h1>Swagger UI Not Available</h1>
          <p>swagger-ui-express is not installed. Run: npm install swagger-ui-express</p>
          <p><a href="/api/docs">View raw API spec (JSON)</a></p>
        </body>
      </html>
    `);
  });
}

module.exports = router;