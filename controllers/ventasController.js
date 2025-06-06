const db = require('../db');

// GET
const obtenerVentasPorCliente = async (req, res) => {
  try {
    const idCliente = req.query.id_cliente || req.params.id_cliente;

    // Base query
    let query = `
      SELECT V.COD_VENTA, V.ID_CLIENTE, V.TIPO_ENTREGA, V.FECHA_VENTA,
            DV.COD_PRODUCTO, DV.CANTIDAD, DV.PRECIO_UNITARIO, DV.TOTAL_PRODUCTO,
            P.NOMBRE_PRODUCTO
      FROM VENTAS V
      JOIN DETALLE_VENTA DV ON V.COD_VENTA = DV.COD_VENTA
      JOIN PRODUCTOS P ON DV.COD_PRODUCTO = P.COD_PRODUCTO
    `;
    const params = [];

    if (idCliente) {
      query += ` WHERE V.ID_CLIENTE = ?`;
      params.push(idCliente);
    }

    const [ventas] = await db.query(query, params);

    if (ventas.length === 0) {
      return res.status(200).json([]); // Devuelve arreglo vacío si no hay ventas
    }

    // Agrupar ventas
    const ventasAgrupadas = {};

    ventas.forEach(v => {
      if (!ventasAgrupadas[v.COD_VENTA]) {
        ventasAgrupadas[v.COD_VENTA] = {
          cod_venta: v.COD_VENTA,
          id_cliente: v.ID_CLIENTE,
          tipo_entrega: v.TIPO_ENTREGA,
          fecha_venta: v.FECHA_VENTA,
          productos: [],
          total_venta: 0,
        };
      }

      ventasAgrupadas[v.COD_VENTA].productos.push({
        cod_producto: v.COD_PRODUCTO,
        nombre_producto: v.NOMBRE_PRODUCTO,
        cantidad: v.CANTIDAD,
        precio_unitario: v.PRECIO_UNITARIO,
        total_producto: v.TOTAL_PRODUCTO
      });

      ventasAgrupadas[v.COD_VENTA].total_venta += parseFloat(v.TOTAL_PRODUCTO);
    });

    res.status(200).json(Object.values(ventasAgrupadas));
    
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ mensaje: 'Error del servidor' });
  }
};



// POST
const registrarVenta = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id_cliente, tipo_entrega, productos } = req.body;

    if (!id_cliente || !tipo_entrega || !productos || productos.length === 0) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }

    await connection.beginTransaction();

    const [ventaResult] = await connection.query(
      'INSERT INTO VENTAS (ID_CLIENTE, TIPO_ENTREGA) VALUES (?, ?)',
      [id_cliente, tipo_entrega]
    );

    const codVenta = ventaResult.insertId;

    const detalleValues = [];
    for (const p of productos) {
      const [[{ PRECIO }]] = await connection.query(
        'SELECT PRECIO FROM PRODUCTOS WHERE COD_PRODUCTO = ?',
        [p.cod_producto]
      );

      const totalProducto = PRECIO * p.cantidad;
      detalleValues.push([codVenta, p.cod_producto, p.cantidad, PRECIO, totalProducto]);

      await connection.query(
        'UPDATE PRODUCTOS SET STOCK = STOCK - ? WHERE COD_PRODUCTO = ?',
        [p.cantidad, p.cod_producto]
      );
    }

    await connection.query(
      'INSERT INTO DETALLE_VENTA (COD_VENTA, COD_PRODUCTO, CANTIDAD, PRECIO_UNITARIO, TOTAL_PRODUCTO) VALUES ?',
      [detalleValues]
    );

    await connection.commit();
    res.status(201).json({ mensaje: 'Venta registrada correctamente', cod_venta: codVenta });

  } catch (err) {
    await connection.rollback();
    console.error('Error al registrar venta:', err);
    res.status(500).json({ mensaje: 'Error al registrar la venta' });
  } finally {
    connection.release();
  }
};

// PUT
const editarVenta = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const cod_venta = req.params.cod_venta;
    const { productos } = req.body;

    if (!cod_venta || !productos || productos.length === 0) {
      return res.status(400).json({ mensaje: 'Datos incompletos' });
    }

    await connection.beginTransaction();

    // 1. Obtener productos anteriores
    const [productosOriginales] = await connection.query(
      'SELECT COD_PRODUCTO, CANTIDAD FROM DETALLE_VENTA WHERE COD_VENTA = ?',
      [cod_venta]
    );

    // 2. Restaurar stock de todos los productos anteriores
    for (const p of productosOriginales) {
      await connection.query(
        'UPDATE PRODUCTOS SET STOCK = STOCK + ? WHERE COD_PRODUCTO = ?',
        [p.CANTIDAD, p.COD_PRODUCTO]
      );
    }

    // 3. Eliminar detalles antiguos
    await connection.query('DELETE FROM DETALLE_VENTA WHERE COD_VENTA = ?', [cod_venta]);

    // 4. Insertar nuevos productos y actualizar stock
    const detalleValues = [];
    for (const p of productos) {
      const [[{ PRECIO }]] = await connection.query(
        'SELECT PRECIO FROM PRODUCTOS WHERE COD_PRODUCTO = ?',
        [p.cod_producto]
      );
      const totalProducto = PRECIO * p.cantidad;
      detalleValues.push([cod_venta, p.cod_producto, p.cantidad, PRECIO, totalProducto]);

      await connection.query(
        'UPDATE PRODUCTOS SET STOCK = STOCK - ? WHERE COD_PRODUCTO = ?',
        [p.cantidad, p.cod_producto]
      );
    }

    await connection.query(
      'INSERT INTO DETALLE_VENTA (COD_VENTA, COD_PRODUCTO, CANTIDAD, PRECIO_UNITARIO, TOTAL_PRODUCTO) VALUES ?',
      [detalleValues]
    );

    await connection.commit();
    res.status(200).json({ mensaje: 'Venta actualizada correctamente' });

  } catch (err) {
    await connection.rollback();
    console.error('Error al editar venta:', err);
    res.status(500).json({ mensaje: 'Error al editar la venta' });
  } finally {
    connection.release();
  }
};

// DELETE
const eliminarVenta = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const cod_venta = req.params.cod_venta;

    if (!cod_venta) {
      return res.status(400).json({ mensaje: 'ID de venta requerido' });
    }

    await connection.beginTransaction();

    const [productosVenta] = await connection.query(
      'SELECT COD_PRODUCTO, CANTIDAD FROM DETALLE_VENTA WHERE COD_VENTA = ?',
      [cod_venta]
    );

    for (const p of productosVenta) {
      await connection.query(
        'UPDATE PRODUCTOS SET STOCK = STOCK + ? WHERE COD_PRODUCTO = ?',
        [p.CANTIDAD, p.COD_PRODUCTO]
      );
    }

    await connection.query('DELETE FROM DETALLE_VENTA WHERE COD_VENTA = ?', [cod_venta]);
    await connection.query('DELETE FROM VENTAS WHERE COD_VENTA = ?', [cod_venta]);

    await connection.commit();
    res.status(200).json({ mensaje: 'Venta eliminada correctamente' });

  } catch (err) {
    await connection.rollback();
    console.error('Error al eliminar venta:', err);
    res.status(500).json({ mensaje: 'Error al eliminar la venta' });
  } finally {
    connection.release();
  }
};

module.exports = {
  obtenerVentasPorCliente,
  registrarVenta,
  editarVenta,
  eliminarVenta
};
