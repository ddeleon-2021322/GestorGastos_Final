import { Request, Response } from 'express'; 
import bcrypt from 'bcryptjs';
import { database } from '../config/db';
import jwt from 'jsonwebtoken';

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password } = req.body;

    const userExistente = await database.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (userExistente.rows.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordEncriptada = await bcrypt.hash(password, salt);

    const result = await database.query(
      'INSERT INTO usuarios (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordEncriptada]
    );

    res.status(201).json({ 
      message: 'Usuario registrado con éxito',
      usuario: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Hubo un error en el servidor' });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    const result = await database.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const usuario = result.rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password);
    
    if (!passwordValida) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

   const secret = process.env.JWT_SECRET || 'clave_secreta_para_mis_tokens';

const token = jwt.sign(
  { id: usuario.id, email: usuario.email }, 
  secret, 
  { expiresIn: '2m' }
);

    res.status(200).json({ message: 'Login exitoso', token });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Hubo un error en el servidor' });
  }
};