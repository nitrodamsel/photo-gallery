'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

let swaggerDocument;
try {
  const yamlPath = path.join(__dirname, '../../openapi.yaml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  swaggerDocument = yaml.load(yamlContent);
} catch (err) {
  console.warn('Could not load openapi.yaml:', err.message);
  swaggerDocument = {
    openapi: '3.1.0',
    info: { title: 'Image Gallery API', version: '1.0.0' },
    paths: {},
  };
}

// Serve raw OpenAPI JSON
router.get('/', (req, res) => {
  res.json(swaggerDocument);
});

// Serve raw OpenAPI YAML
router.get('/openapi.yaml', (req, res) => {
  const yamlPath = path.join(__dirname, '../../openapi.yaml');
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(yamlPath);
});

// Serve Swagger UI
router.use('/ui', swaggerUi.serve);
router.get('/ui', swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Image Gallery API Docs',
  customCss: '.swagger-ui .topbar { background-color: #1a1a2e; }',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));

module.exports = router;