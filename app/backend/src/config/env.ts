import dotenv from 'dotenv';

dotenv.config();

class Environment {
  public readonly puerto: number;
  public readonly corsPermitido: string;
  
  public readonly dbHost: string;
  public readonly dbPuerto: number;
  public readonly dbNombre: string;
  public readonly dbUsuario: string;
  public readonly dbPassword: string;
  
  public readonly jwtSecret: string;
  public readonly jwtExpiracion: string;

  constructor() {
    // Variables con valor por defecto
    this.puerto = parseInt(process.env.PORT || '3000', 10);
    this.corsPermitido = process.env.CORS_ORIGIN || 'http://localhost:4200';
    this.dbPuerto = parseInt(process.env.DB_PORT || '5432', 10);
    this.jwtExpiracion = process.env.JWT_EXPIRES_IN || '2m';

    this.dbHost = this.obtenerVariableObligatoria('DB_HOST');
    this.dbNombre = this.obtenerVariableObligatoria('DB_NAME');
    this.dbUsuario = this.obtenerVariableObligatoria('DB_USER');
    this.dbPassword = this.obtenerVariableObligatoria('DB_PASSWORD');
    this.jwtSecret = this.obtenerVariableObligatoria('JWT_SECRET');
  }

  private obtenerVariableObligatoria(llave: string): string {
    const valor = process.env[llave];
    if (!valor) {
      throw new Error(`[GestorDeGastos - Error]: Falta la variable obligatoria "${llave}" en tu archivo .env`);
    }
    return valor;
  }
}

export const env = new Environment();