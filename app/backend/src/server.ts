import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import { env } from './config/env'
import { database } from './config/db'
import { inicializarBaseDatos } from './config/init-db';
import ingresosRoutes from './routes/ingresos.routes';
import gastosRoutes from './routes/gastos.routes';

const app = express();

app.use(express.json());
app.use(cors());

app.use('/api/ingresos', ingresosRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/auth', authRoutes);    

const arrancarServidor = async () => {
  await database.conectar();

  inicializarBaseDatos().then(() => {
    app.listen(3000, () => {
      console.log("Servidor Corriendo");
    });
  });
  
  app.listen(env.puerto, () => {
    console.log(`Servidor Backend corriendo en http://localhost:${env.puerto}`);
  });
};

arrancarServidor();
