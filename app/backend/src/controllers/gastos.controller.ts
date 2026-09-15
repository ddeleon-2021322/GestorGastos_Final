import { Response } from 'express';
import { database } from '../config/db';

export const obtenerGastos = async (req: any, res: Response): Promise<any> => {
  try {
    const usuarioId = req.usuario.id; 

    const resultado = await database.query(
      'SELECT id, categoria, titulo, monto, fecha FROM gastos WHERE usuario_id = $1 ORDER BY fecha DESC',
      [usuarioId]
    );

    const total = resultado.rows.reduce((acc, g) => acc + Number(g.monto), 0);

    res.status(200).json({
      total: total.toFixed(2),
      transacciones: resultado.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al consultar gastos' });
  }
};

export const crearGasto = async (req: any, res: Response): Promise<any> => {
  try {
    const usuarioId = req.usuario.id;
    const { titulo, monto, categoria } = req.body;

    if (!titulo || !monto || Number(monto) <= 0) {
      return res.status(400).json({ message: 'Datos de gasto inválidos' });
    }

    const catFinal = categoria || 'General';

    const insert = await database.query(
      'INSERT INTO gastos (usuario_id, categoria, titulo, monto) VALUES ($1, $2, $3, $4) RETURNING *',
      [usuarioId, catFinal, titulo, monto]
    );

    res.status(201).json({
      message: 'Gasto registrado correctamente',
      gasto: insert.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al registrar el gasto' });
  }
};