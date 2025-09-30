import { param, validationResult } from "express-validator";

// Validación genérica de ID
export const validarId = param("id").isInt({ min: 1 });

// Middleware para verificar los resultados de las validaciones
export const verificarValidaciones = (req, res, next) => {
  const validacion = validationResult(req);
  
  if (!validacion.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errores: validacion.array() 
    });
  }
  
  next();
};