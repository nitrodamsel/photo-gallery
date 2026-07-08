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
      const fileContents = fs.readFileSync(yamlPath, 'utf8');
      swaggerDocument = yaml.load(fileContents);
    } catch (err) {
      console.error('Failed to load OpenAPI spec:', err);
      swaggerDocument = {
        openapi: '3.1.0',
        info: { title: 'Image Gallery API', version: '1.0.0' },
        paths: {},
      };
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
    return res.send(fileContents);
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load API spec.' },
    });
  }
});

// Also serve as JSON
router.get('/json', (req, res) => {
  return res.json(getSwaggerDocument());
});

// Serve Swagger UI
router.use('/ui', swaggerUi.serve);
router.get('/ui', swaggerUi.setup(null, {
  swaggerOptions: {
    url: '/api/docs',
  },
}));

module.exports = router;