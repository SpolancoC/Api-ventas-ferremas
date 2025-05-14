const express = require('express');
const router = express.Router();
const { obtenerVentasPorCliente, registrarVenta, editarVenta, eliminarVenta } = require('../controllers/ventasController');

// Ruta para todas las ventas
router.get('/', obtenerVentasPorCliente);

// Ruta para ventas por cliente
router.get('/:id_cliente', (req, res) => {
    req.query.id_cliente = req.params.id_cliente;
    obtenerVentasPorCliente(req, res);
});

router.post('/', registrarVenta);
router.put('/:cod_venta', editarVenta);
router.delete('/:cod_venta', eliminarVenta);

module.exports = router;
