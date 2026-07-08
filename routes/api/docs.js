'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const YAML = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

let swaggerDocument;

function loadSwaggerDoc() {
  if (!swaggerDocument) {
    const yamlPath = path.join(__dirname, '../../openapi.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    swaggerDocument = YAML.load(yamlContent);
  }
  return swaggerDocument;
}

// Serve raw OpenAPI spec as JSON
router.get('/', (req, res) => {
  try {
    const doc = loadSwaggerDoc();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load API spec' } });
  }
});

// Serve raw OpenAPI spec as YAML
router.get('/openapi.yaml', (req, res) => {
  try {
    const yamlPath = path.join(__dirname, '../../openapi.yaml');
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(yamlPath);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to load API spec' } });
  }
});

// Serve Swagger UI
router.use('/ui', swaggerUi.serve);
router.get('/ui', (req, res, next) => {
  try {
    const doc = loadSwaggerDoc();
    swaggerUi.setup(doc, {
      customSiteTitle: 'Image Gallery API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
      },
    })(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;