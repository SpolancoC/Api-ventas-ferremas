const db = require('../db');

// Obtener ventas por ID de cliente
const obtenerVentasPorCliente = (req, res) => {
  const idCliente = req.query.id_cliente;

  if (!idCliente) {
    return res.status(400).json({ mensaje: 'Falta el parámetro id_cliente' });
  }

  const query = `
    SELECT V.COD_VENTA, V.ID_CLIENTE, V.TIPO_ENTREGA, V.FECHA_VENTA,
           DV.COD_PRODUCTO, DV.CANTIDAD, DV.PRECIO_UNITARIO
    FROM VENTAS V
    JOIN DETALLE_VENTA DV ON V.COD_VENTA = DV.COD_VENTA
    WHERE V.ID_CLIENTE = ?
  `;

  db.query(query, [idCliente], (err, resultados) => {
    if (err) {
      console.error('Error al obtener ventas:', err);
      return res.status(500).json({ mensaje: 'Error del servidor' });
    }

    res.status(200).json(resultados);
  });
};

module.exports = {
  obtenerVentasPorCliente,
};
