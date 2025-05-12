const express = require('express');
const router = express.Router();
const { obtenerVentasPorCliente, registrarVenta, editarVenta, eliminarVenta } = require('../controllers/ventasController');

router.get('/', obtenerVentasPorCliente);
router.get('/:id_cliente', (req, res) => {
    const id_cliente = req.params.id_cliente;
    req.query.id_cliente = id_cliente;
    obtenerVentasPorCliente(req, res);
});
router.post('/', registrarVenta);
router.put('/:cod_venta', editarVenta);
router.delete('/:cod_venta', eliminarVenta);

module.exports = router;
