import { body, query } from "express-validator";
import express from "express";
import { db } from "../db.js";
import { validarId, verificarValidaciones } from "../middlewares/validaciones.js";

const router = express.Router();

// Validaciones para filtros
const validarFiltros = [
  query("fecha_desde").isDate({ format: 'YYYY-MM-DD' }).optional(),
  query("fecha_hasta").isDate({ format: 'YYYY-MM-DD' }).optional(),
  query("estado").isIn(['pendiente', 'confirmada', 'en_curso', 'finalizada', 'cancelada', 'no_show']).optional(),
  query("tipo_reunion").isIn(['empresarial', 'social', 'celebracion', 'networking', 'otro']).optional(),
];

// Validaciones para crear/actualizar reserva
const validarReserva = [
  body("cliente_id", "Cliente ID inválido").isInt({ min: 1 }),
  body("fecha_reserva", "Fecha inválida").isDate({ format: 'YYYY-MM-DD' }),
  body("hora_inicio", "Hora de inicio inválida").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body("hora_fin", "Hora de fin inválida").matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  body("numero_personas", "Número de personas inválido").isInt({ min: 1, max: 100 }),
  body("tipo_reunion", "Tipo de reunión inválido")
    .isIn(['empresarial', 'social', 'celebracion', 'networking', 'otro']).optional(),
  body("motivo", "Motivo inválido").isString().optional(),
  body("observaciones", "Observaciones inválidas").isString().optional(),
  body("precio_reserva", "Precio inválido").isFloat({ min: 0 }).optional(),
];

// Validaciones para cambiar estado
const validarEstado = [
  body("estado", "Estado inválido")
    .isIn(['pendiente', 'confirmada', 'en_curso', 'finalizada', 'cancelada', 'no_show']),
];

// Función auxiliar para verificar disponibilidad
async function verificarDisponibilidad(fecha, horaInicio, horaFin, reservaId = null) {
  // Validar que horaFin > horaInicio
  if (horaFin <= horaInicio) {
    return {
      disponible: false,
      motivo: "La hora de fin debe ser mayor a la hora de inicio"
    };
  }

  // Verificar que la fecha no sea pasada
  const hoy = new Date().toISOString().split('T')[0];
  if (fecha < hoy) {
    return {
      disponible: false,
      motivo: "No se pueden hacer reservas para fechas pasadas"
    };
  }

  // Obtener el día de la semana
  const fechaObj = new Date(fecha + 'T00:00:00');
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const diaSemana = dias[fechaObj.getDay()];

  // Verificar si hay horarios disponibles para ese día
  const [horarios] = await db.execute(
    `SELECT * FROM horarios_disponibles 
    WHERE dia_semana = ? AND activo = true AND hora_inicio <= ? AND hora_fin >= ?`,
    [diaSemana, horaInicio, horaFin]
  );

  if (horarios.length === 0) {
    return {
      disponible: false,
      motivo: `No hay horarios disponibles para ${diaSemana} en ese rango horario`
    };
  }

  // Verificar si hay solapamiento con otras reservas
  let sql = `
    SELECT id, hora_inicio, hora_fin 
    FROM reservas 
    WHERE fecha_reserva = ? 
    AND estado IN ('confirmada', 'en_curso')
    AND (
      (hora_inicio < ? AND hora_fin > ?) OR
      (hora_inicio >= ? AND hora_inicio < ?) OR
      (hora_fin > ? AND hora_fin <= ?)
    )
  `;

  const params = [fecha, horaFin, horaInicio, horaInicio, horaFin, horaInicio, horaFin];

  // Si es actualización, excluir la reserva actual
  if (reservaId) {
    sql += " AND id != ?";
    params.push(reservaId);
  }

  const [conflictos] = await db.execute(sql, params);

  if (conflictos.length > 0) {
    return {
      disponible: false,
      motivo: "Ya existe una reserva en ese horario",
      conflictos
    };
  }

  return { disponible: true };
}

// GET - Listar reservas con filtros
router.get("/", validarFiltros, verificarValidaciones, async (req, res) => {
  try {
    const filtros = [];
    const parametros = [];

    const { fecha_desde, fecha_hasta, estado, tipo_reunion } = req.query;

    if (fecha_desde) {
      filtros.push("r.fecha_reserva >= ?");
      parametros.push(fecha_desde);
    }

    if (fecha_hasta) {
      filtros.push("r.fecha_reserva <= ?");
      parametros.push(fecha_hasta);
    }

    if (estado) {
      filtros.push("r.estado = ?");
      parametros.push(estado);
    }

    if (tipo_reunion) {
      filtros.push("r.tipo_reunion = ?");
      parametros.push(tipo_reunion);
    }

    let sql = `
      SELECT 
        r.*,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email
      FROM reservas r
      JOIN clientes c ON r.cliente_id = c.id
    `;

    if (filtros.length > 0) {
      sql += " WHERE " + filtros.join(" AND ");
    }

    sql += " ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC";

    const [rows] = await db.execute(sql, parametros);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al listar reservas:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al listar reservas" 
    });
  }
});

// GET - Obtener reserva por ID
router.get("/:id", validarId, verificarValidaciones, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.execute(
      `SELECT 
        r.*,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.telefono AS cliente_telefono,
        c.email AS cliente_email,
        c.empresa AS cliente_empresa
      FROM reservas r
      JOIN clientes c ON r.cliente_id = c.id
      WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Reserva no encontrada" 
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error al obtener reserva:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener reserva" 
    });
  }
});

// POST - Crear reserva
router.post("/", validarReserva, verificarValidaciones, async (req, res) => {
  try {
    const { 
      cliente_id, 
      fecha_reserva, 
      hora_inicio, 
      hora_fin, 
      numero_personas,
      tipo_reunion,
      motivo,
      observaciones,
      precio_reserva
    } = req.body;

    // Verificar que el cliente existe
    const [cliente] = await db.execute(
      "SELECT id FROM clientes WHERE id = ?",
      [cliente_id]
    );

    if (cliente.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Cliente no encontrado"
      });
    }

    // Verificar disponibilidad
    const disponibilidad = await verificarDisponibilidad(
      fecha_reserva, 
      hora_inicio, 
      hora_fin
    );

    if (!disponibilidad.disponible) {
      return res.status(400).json({
        success: false,
        message: disponibilidad.motivo,
        conflictos: disponibilidad.conflictos
      });
    }

    // Verificar capacidad máxima
    const [config] = await db.execute(
      "SELECT valor FROM configuracion WHERE clave = 'capacidad_maxima'"
    );

    const capacidadMaxima = parseInt(config[0]?.valor || 50);

    if (numero_personas > capacidadMaxima) {
      return res.status(400).json({
        success: false,
        message: `El número de personas excede la capacidad máxima (${capacidadMaxima})`
      });
    }

    // Crear la reserva
    const [result] = await db.execute(
      `INSERT INTO reservas 
        (cliente_id, fecha_reserva, hora_inicio, hora_fin, numero_personas, 
         tipo_reunion, motivo, observaciones, precio_reserva, estado) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        cliente_id,
        fecha_reserva,
        hora_inicio,
        hora_fin,
        numero_personas,
        tipo_reunion || 'empresarial',
        motivo || null,
        observaciones || null,
        precio_reserva || 0
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId, 
        cliente_id,
        fecha_reserva,
        hora_inicio,
        hora_fin,
        estado: 'pendiente'
      },
    });
  } catch (error) {
    console.error("Error al crear reserva:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al crear reserva" 
    });
  }
});

// PUT - Actualizar reserva
router.put(
  "/:id",
  validarId,
  validarReserva,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { 
        cliente_id, 
        fecha_reserva, 
        hora_inicio, 
        hora_fin, 
        numero_personas,
        tipo_reunion,
        motivo,
        observaciones,
        precio_reserva
      } = req.body;

      // Verificar que la reserva existe
      const [reservaExiste] = await db.execute(
        "SELECT id, estado FROM reservas WHERE id = ?",
        [id]
      );

      if (reservaExiste.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Reserva no encontrada"
        });
      }

      // No permitir editar reservas finalizadas o canceladas
      if (['finalizada', 'cancelada'].includes(reservaExiste[0].estado)) {
        return res.status(400).json({
          success: false,
          message: "No se puede editar una reserva finalizada o cancelada"
        });
      }

      // Verificar que el cliente existe
      const [cliente] = await db.execute(
        "SELECT id FROM clientes WHERE id = ?",
        [cliente_id]
      );

      if (cliente.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cliente no encontrado"
        });
      }

      // Verificar disponibilidad (excluyendo esta reserva)
      const disponibilidad = await verificarDisponibilidad(
        fecha_reserva, 
        hora_inicio, 
        hora_fin,
        id
      );

      if (!disponibilidad.disponible) {
        return res.status(400).json({
          success: false,
          message: disponibilidad.motivo,
          conflictos: disponibilidad.conflictos
        });
      }

      // Actualizar la reserva
      await db.execute(
        `UPDATE reservas 
        SET cliente_id = ?, fecha_reserva = ?, hora_inicio = ?, hora_fin = ?, 
            numero_personas = ?, tipo_reunion = ?, motivo = ?, observaciones = ?, 
            precio_reserva = ?
        WHERE id = ?`,
        [
          cliente_id,
          fecha_reserva,
          hora_inicio,
          hora_fin,
          numero_personas,
          tipo_reunion || 'empresarial',
          motivo || null,
          observaciones || null,
          precio_reserva || 0,
          id
        ]
      );

      res.json({
        success: true,
        data: { id, fecha_reserva, hora_inicio, hora_fin },
      });
    } catch (error) {
      console.error("Error al actualizar reserva:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al actualizar reserva" 
      });
    }
  }
);

// PATCH - Cambiar estado de reserva
router.patch(
  "/:id/estado",
  validarId,
  validarEstado,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { estado } = req.body;

      const [reserva] = await db.execute(
        "SELECT id FROM reservas WHERE id = ?",
        [id]
      );

      if (reserva.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Reserva no encontrada"
        });
      }

      await db.execute(
        "UPDATE reservas SET estado = ? WHERE id = ?",
        [estado, id]
      );

      res.json({
        success: true,
        data: { id, estado }
      });
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al cambiar estado" 
      });
    }
  }
);

// DELETE - Cancelar reserva
router.delete(
  "/:id",
  validarId,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      // En lugar de eliminar, cambiar estado a cancelada
      const [reserva] = await db.execute(
        "SELECT id, estado FROM reservas WHERE id = ?",
        [id]
      );

      if (reserva.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Reserva no encontrada"
        });
      }

      await db.execute(
        "UPDATE reservas SET estado = 'cancelada' WHERE id = ?",
        [id]
      );
      
      res.json({ 
        success: true, 
        data: { id, estado: 'cancelada' } 
      });
    } catch (error) {
      console.error("Error al cancelar reserva:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al cancelar reserva" 
      });
    }
  }
);

export default router;