require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const planRoutes = require('./src/routes/planRoutes');
const { createIndex } = require('./src/utilities/elasticsearchClient'); 
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.json());
app.use('/api/plans', planRoutes);

// Create the Elasticsearch index before starting the server
createIndex()
  .then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
  })
  .catch(error => {
    console.error('Failed to create Elasticsearch index:', error);
    process.exit(1);
  });
