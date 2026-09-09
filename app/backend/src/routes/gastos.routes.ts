import { Router } from "express";
import { obtenerGastos, crearGasto } from "../controllers/gastos.controller";
import { verificarToken } from "../middlewares/auth.middleware"; 

const router = Router();

router.get('/', verificarToken, obtenerGastos);
router.post('/', verificarToken, crearGasto);

export default router;