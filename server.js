require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const planRoutes = require('./src/routes/planRoutes');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.json());
app.use('/api/plans', planRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
