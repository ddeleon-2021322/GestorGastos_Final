import { Response } from 'express';
import { database } from '../config/db';

export const getIngresos = async (req: any, res: Response): Promise<any> => {
  try {
    const usuarioId = req.usuario.id;

    const totalQuery = await database.query(
      'SELECT COALESCE(SUM(monto), 0) AS total FROM ingresos WHERE usuario_id = $1',
      [usuarioId]
    );

    // 2. Transacciones recientes
    const transaccionesQuery = await database.query(
      'SELECT id, titulo, monto, fecha FROM ingresos WHERE usuario_id = $1 ORDER BY fecha DESC',
      [usuarioId]
    );

    res.status(200).json({
      total: parseFloat(totalQuery.rows[0].total),
      transacciones: transaccionesQuery.rows
    });
  } catch (error) {
    console.error('Error al obtener ingresos:', error);
    res.status(500).json({ message: 'Error en el servidor al consultar ingresos' });
  }
};

export const crearIngreso = async (req: any, res: Response): Promise<any> => {
  try {
    const { titulo, monto } = req.body;
    const usuarioId = req.usuario.id;

    if (!titulo || !monto) {
      return res.status(400).json({ message: 'Título y monto requeridos' });
    }

    const nuevo = await database.query(
      'INSERT INTO ingresos (usuario_id, titulo, monto, fecha) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [usuarioId, titulo, parseFloat(monto)]
    );

    res.status(201).json(nuevo.rows[0]);
  } catch (error) {
    console.error('Error al registrar ingreso:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar el ingreso' });
  }
};