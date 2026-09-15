import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { database } from '../config/db'; // Revisa tu importación habitual de la BD
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 1. Tu función de registro existente
export const register = async (req: Request, res: Response): Promise<any> => {
  // ... tu código actual de register ...
};

// 2. Tu función de login tradicional (la que falta ahora)
export const login = async (req: Request, res: Response): Promise<any> => {
  // ... tu código actual de login ...
};

// 3. La nueva función para Google
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