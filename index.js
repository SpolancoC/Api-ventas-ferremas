const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
app.use(cors());
const ventasRoutes = require('./routes/ventas');

app.use(express.json());

app.use('/api/ventas', ventasRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
