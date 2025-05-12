const db = require('../db');

// GET
const obtenerVentasPorCliente = (req, res) => {
    const idCliente = req.query.id_cliente || req.params.id_cliente;
  
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
  
 

//POST

const registrarVenta = (req, res) => {
    const { id_cliente, tipo_entrega, productos } = req.body;
  
    if (!id_cliente || !tipo_entrega || !productos || productos.length === 0) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }
  
    db.beginTransaction(err => {
      if (err) return res.status(500).json({ mensaje: 'Error al iniciar transacción' });
  
      // Insertar en tabla VENTAS
      const ventaQuery = 'INSERT INTO VENTAS (ID_CLIENTE, TIPO_ENTREGA) VALUES (?, ?)';
      db.query(ventaQuery, [id_cliente, tipo_entrega], (err, resultVenta) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ mensaje: 'Error al insertar venta' });
          });
        }
  
        const codVenta = resultVenta.insertId;
  
        // Preparar inserciones en DETALLE_VENTA
        const detalleQuery = 'INSERT INTO DETALLE_VENTA (COD_VENTA, COD_PRODUCTO, CANTIDAD, PRECIO_UNITARIO) VALUES ?';
        const detalleValues = productos.map(p => [
          codVenta,
          p.cod_producto,
          p.cantidad,
          p.precio_unitario
        ]);
  
        db.query(detalleQuery, [detalleValues], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ mensaje: 'Error al insertar detalles' });
            });
          }
  
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ mensaje: 'Error al confirmar la venta' });
              });
            }
  
            res.status(201).json({ mensaje: 'Venta registrada correctamente', cod_venta: codVenta });
          });
        });
      });
    });
};

//PUT

const editarVenta = (req, res) => {
    const codVenta = req.params.cod_venta;
    const { tipo_entrega, productos } = req.body;
  
    if (!tipo_entrega || !productos || productos.length === 0) {
      return res.status(400).json({ mensaje: 'Datos incompletos para actualizar' });
    }
  
    db.beginTransaction(err => {
      if (err) return res.status(500).json({ mensaje: 'Error al iniciar transacción' });
  
      // 1. Actualizar la venta
      const updateVenta = 'UPDATE VENTAS SET TIPO_ENTREGA = ? WHERE COD_VENTA = ?';
      db.query(updateVenta, [tipo_entrega, codVenta], (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ mensaje: 'Error al actualizar la venta' });
          });
        }
  
        // 2. Eliminar productos anteriores
        const deleteDetalles = 'DELETE FROM DETALLE_VENTA WHERE COD_VENTA = ?';
        db.query(deleteDetalles, [codVenta], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ mensaje: 'Error al eliminar productos anteriores' });
            });
          }
  
          // 3. Insertar nuevos productos
          const insertDetalles = `
            INSERT INTO DETALLE_VENTA (COD_VENTA, COD_PRODUCTO, CANTIDAD, PRECIO_UNITARIO) VALUES ?
          `;
          const detalleValues = productos.map(p => [
            codVenta,
            p.cod_producto,
            p.cantidad,
            p.precio_unitario
          ]);
  
          db.query(insertDetalles, [detalleValues], (err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ mensaje: 'Error al insertar nuevos productos' });
              });
            }
  
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ mensaje: 'Error al confirmar los cambios' });
                });
              }
  
              res.status(200).json({ mensaje: 'Venta actualizada exitosamente' });
            });
          });
        });
      });
    });
};
  
const eliminarVenta = (req, res) => {
    const codVenta = req.params.cod_venta;
  
    db.beginTransaction(err => {
      if (err) return res.status(500).json({ mensaje: 'Error al iniciar transacción' });
  
      // 1. Eliminar los detalles de la venta
      const deleteDetalles = 'DELETE FROM DETALLE_VENTA WHERE COD_VENTA = ?';
      db.query(deleteDetalles, [codVenta], (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ mensaje: 'Error al eliminar detalles de venta' });
          });
        }
  
        // 2. Eliminar la venta en sí
        const deleteVenta = 'DELETE FROM VENTAS WHERE COD_VENTA = ?';
        db.query(deleteVenta, [codVenta], (err, resultado) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ mensaje: 'Error al eliminar venta' });
            });
          }
  
          if (resultado.affectedRows === 0) {
            return db.rollback(() => {
              res.status(404).json({ mensaje: 'Venta no encontrada' });
            });
          }
  
          db.commit(err => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ mensaje: 'Error al confirmar eliminación' });
              });
            }
  
            res.status(200).json({ mensaje: 'Venta eliminada exitosamente' });
          });
        });
      });
    });
};
    
module.exports = {
    obtenerVentasPorCliente,
    registrarVenta,
    editarVenta,
    eliminarVenta
};