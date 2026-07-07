'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

let swaggerDocument;

function loadSwaggerDoc() {
  if (!swaggerDocument) {
    try {
      const yamlPath = path.join(__dirname, '../../openapi.yaml');
      const fileContents = fs.readFileSync(yamlPath, 'utf8');
      swaggerDocument = yaml.load(fileContents);
    } catch (err) {
      console.error('Failed to load openapi.yaml:', err.message);
      swaggerDocument = { openapi: '3.1.0', info: { title: 'API', version: '1.0.0' }, paths: {} };
    }
  }
  return swaggerDocument;
}

// Serve raw OpenAPI YAML spec
router.get('/', (req, res) => {
  try {
    const yamlPath = path.join(__dirname, '../../openapi.yaml');
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    res.set('Content-Type', 'application/yaml');
    res.send(fileContents);
  } catch (err) {
    res.status(500).json({ error: { code: 'SPEC_NOT_FOUND', message: 'OpenAPI spec not found' } });
  }
});

// Also serve JSON version
router.get('/json', (req, res) => {
  res.json(loadSwaggerDoc());
});

// Serve Swagger UI
router.use('/ui', swaggerUi.serve);
router.get('/ui', swaggerUi.setup(null, {
  swaggerOptions: {
    url: '/api/docs/json',
  },
}));

module.exports = router;