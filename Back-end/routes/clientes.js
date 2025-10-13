import { body, query } from "express-validator";
import express from "express";
import { db } from "../db.js";
import { validarId, verificarValidaciones } from "../middlewares/validaciones.js";

const router = express.Router();

// Validaciones para filtros
const validarFiltros = [
  query("nombre").isString().optional(),
  query("apellido").isString().optional(),
  query("telefono").isString().optional(),
  query("email").isEmail().optional(),
];

// Validaciones para crear/actualizar cliente
const validarCliente = [
  body("nombre", "Nombre inválido").isString().isLength({ min: 1, max: 100 }),
  body("apellido", "Apellido inválido").isString().isLength({ min: 1, max: 100 }),
  body("telefono", "Teléfono inválido").isString().isLength({ min: 7, max: 15 }),
  body("email", "Email inválido").isEmail().optional(),
];

// GET - Listar clientes con filtros
router.get("/", validarFiltros, verificarValidaciones, async (req, res) => {
  try {
    const filtros = [];
    const parametros = [];

    const { nombre, telefono, email } = req.query;

    if (nombre) {
      filtros.push("(nombre LIKE ? OR apellido LIKE ?)");
      parametros.push(`%${nombre}%`, `%${nombre}%`);
    }

    if (telefono) {
      filtros.push("telefono LIKE ?");
      parametros.push(`%${telefono}%`);
    }

    if (email) {
      filtros.push("email LIKE ?");
      parametros.push(`%${email}%`);
    }

    let sql = "SELECT * FROM clientes";

    if (filtros.length > 0) {
      sql += " WHERE " + filtros.join(" AND ");
    }

    sql += " ORDER BY apellido, nombre";

    const [rows] = await db.execute(sql, parametros);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al listar clientes:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al listar clientes" 
    });
  }
});

// GET - Obtener cliente por ID
router.get("/:id", validarId, verificarValidaciones, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.execute(
      "SELECT * FROM clientes WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Cliente no encontrado" 
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener cliente" 
    });
  }
});

// GET - Obtener reservas de un cliente
router.get("/:id/reservas", validarId, verificarValidaciones, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.execute(
      `SELECT 
        r.id,
        r.fecha_reserva,
        r.hora_inicio,
        r.hora_fin,
        r.numero_personas,
        r.tipo_reunion,
        r.estado,
        r.motivo
      FROM reservas r
      WHERE r.cliente_id = ?
      ORDER BY r.fecha_reserva DESC, r.hora_inicio DESC`,
      [id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al obtener reservas del cliente:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener reservas del cliente" 
    });
  }
});

// POST - Crear cliente
router.post("/", validarCliente, verificarValidaciones, async (req, res) => {
  try {
    const { nombre, apellido, telefono, email } = req.body;

    // Verificar si el teléfono ya existe
    const [existeTelefono] = await db.execute(
      "SELECT id FROM clientes WHERE telefono = ?",
      [telefono]
    );

    if (existeTelefono.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un cliente con ese teléfono"
      });
    }

    // Verificar si el email ya existe (solo si se proporcionó)
    if (email) {
      const [existeEmail] = await db.execute(
        "SELECT id FROM clientes WHERE email = ?",
        [email]
      );

      if (existeEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Ya existe un cliente con ese email"
        });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO clientes 
        (nombre, apellido, telefono, email) 
      VALUES (?, ?, ?, ?)`,
      [nombre, apellido, telefono, email || null]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId, 
        nombre, 
        apellido, 
        telefono,
        email: email || null
      },
    });

  } catch (error) {
    console.error("Error al crear cliente:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al crear cliente" 
    });
  }
});

// PUT - Actualizar cliente
router.put(
  "/:id",
  validarId,
  validarCliente,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { nombre, apellido, telefono, email } = req.body;

      // Verificar si el cliente existe
      const [clienteExiste] = await db.execute(
        "SELECT id FROM clientes WHERE id = ?",
        [id]
      );

      if (clienteExiste.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cliente no encontrado"
        });
      }

      // Verificar si el teléfono ya está en uso por otro cliente
      const [telefonoExiste] = await db.execute(
        "SELECT id FROM clientes WHERE telefono = ? AND id != ?",
        [telefono, id]
      );

      if (telefonoExiste.length > 0) {
        return res.status(400).json({
          success: false,
          message: "El teléfono ya está en uso por otro cliente"
        });
      }

      // Verificar si el email ya está en uso por otro cliente (solo si se proporcionó)
      if (email) {
        const [emailExiste] = await db.execute(
          "SELECT id FROM clientes WHERE email = ? AND id != ?",
          [email, id]
        );

        if (emailExiste.length > 0) {
          return res.status(400).json({
            success: false,
            message: "El email ya está en uso por otro cliente"
          });
        }
      }

      await db.execute(
        `UPDATE clientes 
        SET nombre = ?, apellido = ?, telefono = ?, email = ?
        WHERE id = ?`,
        [nombre, apellido, telefono, email || null, id]
      );

      res.json({
        success: true,
        data: { id, nombre, apellido, telefono, email: email || null },
      });

    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al actualizar cliente" 
      });
    }
  }
);

// DELETE - Eliminar cliente
router.delete(
  "/:id",
  validarId,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      // Verificar si el cliente existe
      const [clienteExiste] = await db.execute(
        "SELECT id FROM clientes WHERE id = ?",
        [id]
      );

      if (clienteExiste.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Cliente no encontrado"
        });
      }
      // implementar cuando esten todas las tablas hechas.
      /* Verificar si tiene reservas ACTIVAS
      const [reservasActivas] = await db.execute(
        `SELECT COUNT(*) as count 
         FROM reservas 
         WHERE cliente_id = ? 
         AND estado IN ('pendiente', 'confirmada', 'en_curso')`,
        [id]
      );

      if (reservasActivas[0].count > 0) {
        return res.status(400).json({
          success: false,
          message: "No se puede eliminar el cliente porque tiene reservas activas"
        });
    }*/

      // Eliminar el cliente
      await db.execute("DELETE FROM clientes WHERE id = ?", [id]);
      
      res.json({ 
        success: true, 
        message: "Cliente eliminado correctamente",
        data: { id } 
      });

    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al eliminar cliente" 
      });
    }
  }
);

export default router;