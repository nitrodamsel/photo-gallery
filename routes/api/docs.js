'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

let swaggerUi;
let swaggerUiAvailable = false;

try {
  swaggerUi = require('swagger-ui-express');
  swaggerUiAvailable = true;
} catch (e) {
  console.warn('swagger-ui-express not installed; /api/docs/ui will not be available');
}

// Load the OpenAPI spec
const specPath = path.join(__dirname, '../../openapi.yaml');

function loadSpec() {
  try {
    const raw = fs.readFileSync(specPath, 'utf8');
    return yaml.load(raw);
  } catch (e) {
    console.error('Failed to load openapi.yaml:', e.message);
    return null;
  }
}

// Serve the raw OpenAPI YAML/JSON
router.get('/', (req, res) => {
  const accept = req.headers['accept'] || '';
  if (accept.includes('application/json')) {
    const spec = loadSpec();
    if (!spec) return res.status(500).json({ error: 'Could not load OpenAPI spec' });
    return res.json(spec);
  }
  // Default: serve YAML
  try {
    const raw = fs.readFileSync(specPath, 'utf8');
    res.set('Content-Type', 'text/yaml');
    return res.send(raw);
  } catch (e) {
    return res.status(500).json({ error: 'Could not load OpenAPI spec' });
  }
});

// Swagger UI
if (swaggerUiAvailable) {
  const spec = loadSpec();
  if (spec) {
    router.use('/ui', swaggerUi.serve);
    router.get('/ui', swaggerUi.setup(spec, {
      customSiteTitle: 'Photo Gallery API Docs',
      customCss: '.swagger-ui .topbar { background-color: #2d3748; }',
    }));
  }
} else {
  router.get('/ui', (req, res) => {
    res.status(503).send('Swagger UI not available. Install swagger-ui-express.');
  });
}

module.exports = router;