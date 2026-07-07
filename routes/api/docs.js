'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

// Load the OpenAPI spec
let swaggerDocument;
try {
  const specPath = path.join(__dirname, '../../openapi.yaml');
  const fileContents = fs.readFileSync(specPath, 'utf8');
  swaggerDocument = yaml.load(fileContents);
} catch (err) {
  console.error('Failed to load OpenAPI spec:', err.message);
  swaggerDocument = { openapi: '3.1.0', info: { title: 'API', version: '1.0.0' }, paths: {} };
}

// Serve raw OpenAPI spec as JSON
router.get('/', (req, res) => {
  res.json(swaggerDocument);
});

// Serve raw OpenAPI spec as YAML
router.get('/yaml', (req, res) => {
  res.type('text/yaml').send(yaml.dump(swaggerDocument));
});

// Serve Swagger UI
router.use('/ui', swaggerUi.serve);
router.get('/ui', swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Gallery API Docs',
  customCss: '.swagger-ui .topbar { background-color: #2c3e50; }',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

module.exports = router;