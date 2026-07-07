'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

let swaggerDocument;

function getSwaggerDocument() {
  if (!swaggerDocument) {
    try {
      const yamlPath = path.join(__dirname, '../../openapi.yaml');
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      swaggerDocument = yaml.load(yamlContent);
    } catch (err) {
      console.error('Failed to load openapi.yaml:', err);
      swaggerDocument = { openapi: '3.1.0', info: { title: 'API', version: '1.0.0' }, paths: {} };
    }
  }
  return swaggerDocument;
}

// Serve raw OpenAPI spec as JSON
router.get('/', (req, res) => {
  const accept = req.headers['accept'] || '';
  const doc = getSwaggerDocument();

  if (accept.includes('application/json')) {
    return res.json(doc);
  }

  // Default: serve YAML
  try {
    const yamlPath = path.join(__dirname, '../../openapi.yaml');
    res.setHeader('Content-Type', 'application/yaml');
    res.sendFile(yamlPath);
  } catch (err) {
    res.json(doc);
  }
});

// Swagger UI
router.use('/ui', swaggerUi.serve);
router.get('/ui', (req, res, next) => {
  const doc = getSwaggerDocument();
  swaggerUi.setup(doc, {
    customSiteTitle: 'Gallery API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  })(req, res, next);
});

module.exports = router;