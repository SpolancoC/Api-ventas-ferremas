const express = require('express');
const router = express.Router();
const { obtenerVentasPorCliente } = require('../controllers/ventasController');

// Ruta: /api/ventas?id_cliente=1
router.get('/', obtenerVentasPorCliente);

module.exports = router;
