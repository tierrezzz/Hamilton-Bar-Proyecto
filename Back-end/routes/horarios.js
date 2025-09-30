import { body, query } from "express-validator";
import express from "express";
import { db } from "../db.js";
import { validarId, verificarValidaciones } from "../middlewares/validaciones.js";

const router = express.Router();

// Validaciones para crear/actualizar horario
const validarHorario = [
  body("dia_semana", "Día de semana inválido")
    .isIn(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
  body("hora_inicio", "Hora de inicio inválida").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body("hora_fin", "Hora de fin inválida").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body("activo", "Activo debe ser booleano").isBoolean().optional(),
  body("observaciones", "Observaciones inválidas").isString().optional(),
];

// Validaciones para consultar disponibilidad
const validarConsultaDisponibilidad = [
  query("fecha", "Fecha inválida").isDate({ format: 'YYYY-MM-DD' }),
];

// GET - Listar todos los horarios
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM horarios_disponibles ORDER BY 
        FIELD(dia_semana, 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'),
        hora_inicio`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al listar horarios:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al listar horarios" 
    });
  }
});

// GET - Obtener horario por ID
router.get("/:id", validarId, verificarValidaciones, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.execute(
      "SELECT * FROM horarios_disponibles WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Horario no encontrado" 
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error al obtener horario:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener horario" 
    });
  }
});

// GET - Consultar disponibilidad para una fecha específica
router.get(
  "/disponibilidad/fecha",
  validarConsultaDisponibilidad,
  verificarValidaciones,
  async (req, res) => {
    try {
      const { fecha } = req.query;

      // Obtener el día de la semana en español
      const fechaObj = new Date(fecha + 'T00:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const diaSemana = dias[fechaObj.getDay()];

      // Obtener horarios disponibles para ese día
      const [horarios] = await db.execute(
        `SELECT * FROM horarios_disponibles 
        WHERE dia_semana = ? AND activo = true
        ORDER BY hora_inicio`,
        [diaSemana]
      );

      if (horarios.length === 0) {
        return res.json({
          success: true,
          data: {
            fecha,
            dia_semana: diaSemana,
            disponible: false,
            message: "No hay horarios disponibles para este día"
          }
        });
      }

      // Obtener reservas para esa fecha
      const [reservas] = await db.execute(
        `SELECT hora_inicio, hora_fin, estado 
        FROM reservas 
        WHERE fecha_reserva = ? AND estado IN ('confirmada', 'en_curso')
        ORDER BY hora_inicio`,
        [fecha]
      );

      res.json({
        success: true,
        data: {
          fecha,
          dia_semana: diaSemana,
          horarios_operacion: horarios,
          reservas_existentes: reservas,
          disponible: reservas.length === 0
        }
      });
    } catch (error) {
      console.error("Error al consultar disponibilidad:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al consultar disponibilidad" 
      });
    }
  }
);

// POST - Crear horario
router.post("/", validarHorario, verificarValidaciones, async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, activo, observaciones } = req.body;

    // Validar que hora_fin > hora_inicio
    if (hora_fin <= hora_inicio) {
      return res.status(400).json({
        success: false,
        message: "La hora de fin debe ser mayor a la hora de inicio"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO horarios_disponibles 
        (dia_semana, hora_inicio, hora_fin, activo, observaciones) 
      VALUES (?, ?, ?, ?, ?)`,
      [
        dia_semana, 
        hora_inicio, 
        hora_fin, 
        activo !== undefined ? activo : true,
        observaciones || null
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId, 
        dia_semana, 
        hora_inicio, 
        hora_fin 
      },
    });
  } catch (error) {
    console.error("Error al crear horario:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al crear horario" 
    });
  }
});

// PUT - Actualizar horario
router.put(
  "/:id",
  validarId,
  validarHorario,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { dia_semana, hora_inicio, hora_fin, activo, observaciones } = req.body;

      // Validar que hora_fin > hora_inicio
      if (hora_fin <= hora_inicio) {
        return res.status(400).json({
          success: false,
          message: "La hora de fin debe ser mayor a la hora de inicio"
        });
      }

      await db.execute(
        `UPDATE horarios_disponibles 
        SET dia_semana = ?, hora_inicio = ?, hora_fin = ?, activo = ?, observaciones = ?
        WHERE id = ?`,
        [
          dia_semana, 
          hora_inicio, 
          hora_fin, 
          activo !== undefined ? activo : true,
          observaciones || null,
          id
        ]
      );

      res.json({
        success: true,
        data: { id, dia_semana, hora_inicio, hora_fin },
      });
    } catch (error) {
      console.error("Error al actualizar horario:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al actualizar horario" 
      });
    }
  }
);

// DELETE - Eliminar horario
router.delete(
  "/:id",
  validarId,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      await db.execute("DELETE FROM horarios_disponibles WHERE id = ?", [id]);
      
      res.json({ success: true, data: { id } });
    } catch (error) {
      console.error("Error al eliminar horario:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al eliminar horario" 
      });
    }
  }
);

export default router;