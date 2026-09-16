import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../config/db';
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const checkUser = await database.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await database.query(
      'INSERT INTO usuarios (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name || email.split('@')[0], email, hashedPassword]
    );

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      usuario: insertResult.rows[0]
    });
  } catch (error) {
    console.error('Error en register:', error);
    return res.status(500).json({ message: 'Error al registrar usuario' });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña requeridos' });
    }

    const result = await database.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const secret = process.env.JWT_SECRET || 'clave_secreta_para_mis_tokens';
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      secret,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: { id: usuario.id, name: usuario.name, email: usuario.email }
    });
  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<any> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Token de Google requerido' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const { email, name } = payload;

    let userResult = await database.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    let usuario = userResult.rows[0];

    if (!usuario) {
      const passwordAleatoria = await bcrypt.hash(Math.random().toString(36), 10);
      const insertResult = await database.query(
        'INSERT INTO usuarios (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name || 'Usuario Google', email, passwordAleatoria]
      );
      usuario = insertResult.rows[0];
    }

    const secret = process.env.JWT_SECRET || 'clave_secreta_para_mis_tokens';
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      secret,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: { id: usuario.id, name: usuario.name, email: usuario.email }
    });
  } catch (error) {
    console.error('Error en Google Auth:', error);
    return res.status(500).json({ message: 'Error al autenticar con Google' });
  }
};