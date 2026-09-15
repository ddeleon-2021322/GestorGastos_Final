import { Request, Response } from 'express';
import { database } from '../config/db';

export const obtenerGastos = async (req: Request, res: Response): Promise<any> => {
  try {
    const usuarioId = (req as any).usuario?.id || (req as any).user?.id;

    if (!usuarioId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const result = await database.query(
      'SELECT * FROM gastos WHERE usuario_id = $1 ORDER BY fecha DESC',
      [usuarioId]
    );

    const total = result.rows.reduce((acc: number, item: any) => acc + parseFloat(item.monto || 0), 0);

    res.status(200).json({
      total,
      transacciones: result.rows
    });
  } catch (error) {
    console.error('Error en obtenerGastos:', error);
    res.status(500).json({ message: 'Error interno al consultar gastos' });
  }
};

export const crearGasto = async (req: Request, res: Response): Promise<any> => {
  try {
    const usuarioId = (req as any).usuario?.id || (req as any).user?.id;
    const { titulo, descripcion, monto, categoria, fecha } = req.body;

    if (!usuarioId) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    const concepto = titulo || descripcion || 'Gasto general';
    const montoNum = parseFloat(monto);
    const cat = categoria || 'Otros';
    const fechaGasto = fecha || new Date();

    if (isNaN(montoNum) || montoNum <= 0) {
      return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
    }

    const ingresosRes = await database.query(
      'SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos WHERE usuario_id = $1',
      [usuarioId]
    );
    const totalIngresos = parseFloat(ingresosRes.rows[0].total);

    const gastosRes = await database.query(
      'SELECT COALESCE(SUM(monto), 0) AS total FROM gastos WHERE usuario_id = $1',
      [usuarioId]
    );
    const totalGastos = parseFloat(gastosRes.rows[0].total);

    const saldoDisponible = totalIngresos - totalGastos;
    if (montoNum > saldoDisponible) {
      return res.status(400).json({
        message: `Saldo insuficiente. Saldo disponible: Q ${saldoDisponible.toFixed(2)}`
      });
    }

    const nuevoGasto = await database.query(
      `INSERT INTO gastos (titulo, monto, fecha, categoria, usuario_id) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [concepto, montoNum, fechaGasto, cat, usuarioId]
    );

    res.status(201).json({
      message: 'Gasto registrado con éxito',
      gasto: nuevoGasto.rows[0]
    });

  } catch (error) {
    console.error('Error detallado en crearGasto:', error);
    res.status(500).json({ message: 'Error interno del servidor al procesar el gasto' });
  }
};