import { database } from './db'

export const inicializarBaseDatos = async () => {
  try {
    const queryTablas = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ingresos (
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
        titulo VARCHAR(100) NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXIST gastos(
        id SERIAL PRIMARY KEY,
        usuario_id INT REFERENCES usuarios(id) on DELETE CASCADE,
        categoria VARCHAR(100) NOT NULL DEFAULT 'Otros',
        titulo VARCHAR(100) NOT NULL,
        monto DECIMAL(10,2)NOT NULL,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await database.query(queryTablas);
    console.log('Base de datos y tablas verificadas/creadas correctamente.');
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
  }
};