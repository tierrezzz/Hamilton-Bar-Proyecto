import { query } from "express-validator";
import express from "express";
import { db } from "../db.js";
import { verificarValidaciones } from "../middlewares/validaciones.js";

const router = express.Router();

// Validaciones para consultar disponibilidad
const validarConsultaDisponibilidad = [
  query("fecha", "Fecha inválida").isISO8601().toDate(),
];

// GET - Listar todos los horarios de operación
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM horarios_disponibles 
       WHERE activo = true
       ORDER BY 
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

// GET - Consultar disponibilidad para una fecha específica (para calendario)
router.get(
  "/disponibilidad",
  validarConsultaDisponibilidad,
  verificarValidaciones,
  async (req, res) => {
    try {
      const { fecha } = req.query;
      const fechaStr = new Date(fecha).toISOString().split('T')[0];

      // Obtener el día de la semana
      const fechaObj = new Date(fechaStr + 'T00:00:00');
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const diaSemana = dias[fechaObj.getDay()];

      // Obtener horarios disponibles para ese día
      const [horarios] = await db.execute(
        `SELECT * FROM horarios_disponibles 
        WHERE dia_semana = ? AND activo = true
        ORDER BY hora_inicio`,
        [diaSemana]
      );

      // Si no hay horarios, el día está cerrado
      if (horarios.length === 0) {
        return res.json({
          success: true,
          data: {
            fecha: fechaStr,
            dia_semana: diaSemana,
            disponible: false,
            message: "El bar está cerrado este día",
            turnos: []
          }
        });
      }

      // Obtener reservas confirmadas o en curso para esa fecha
      const [reservas] = await db.execute(
        `SELECT hora_inicio, hora_fin, numero_personas, estado
        FROM reservas 
        WHERE fecha_reserva = ? AND estado IN ('confirmada', 'en_curso')
        ORDER BY hora_inicio`,
        [fechaStr]
      );

      // Calcular disponibilidad por turno
      const turnosDisponibles = horarios.map(horario => {
        // Verificar si hay conflicto con alguna reserva en este turno
        const tieneReserva = reservas.some(reserva => {
          // Hay conflicto si la reserva está dentro del turno
          return (
            reserva.hora_inicio < horario.hora_fin &&
            reserva.hora_fin > horario.hora_inicio
          );
        });

        return {
          turno: horario.observaciones || `${horario.hora_inicio} - ${horario.hora_fin}`,
          hora_inicio: horario.hora_inicio,
          hora_fin: horario.hora_fin,
          disponible: !tieneReserva
        };
      });

      const hayDisponibilidad = turnosDisponibles.some(t => t.disponible);

      res.json({
        success: true,
        data: {
          fecha: fechaStr,
          dia_semana: diaSemana,
          disponible: hayDisponibilidad,
          turnos: turnosDisponibles,
          reservas_existentes: reservas.length
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

// GET - Consultar disponibilidad de múltiples fechas (para calendario mensual)
router.get(
  "/disponibilidad/rango",
  async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({
          success: false,
          message: "Se requieren fecha_inicio y fecha_fin"
        });
      }

      // Obtener todas las reservas en el rango
      const [reservas] = await db.execute(
        `SELECT fecha_reserva, COUNT(*) as cantidad
        FROM reservas 
        WHERE fecha_reserva BETWEEN ? AND ? 
        AND estado IN ('confirmada', 'en_curso')
        GROUP BY fecha_reserva`,
        [fecha_inicio, fecha_fin]
      );

      // Crear objeto con disponibilidad por fecha
      const disponibilidadPorFecha = {};
      
      reservas.forEach(r => {
        disponibilidadPorFecha[r.fecha_reserva] = {
          tiene_reservas: true,
          cantidad_reservas: r.cantidad
        };
      });

      res.json({
        success: true,
        data: {
          rango: { inicio: fecha_inicio, fin: fecha_fin },
          fechas_con_reservas: disponibilidadPorFecha
        }
      });
    } catch (error) {
      console.error("Error al consultar rango:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al consultar rango de disponibilidad" 
      });
    }
  }
);

export default router;