import { body, query } from "express-validator";
import express from "express";
import { db } from "../db.js";
import { validarId, verificarValidaciones } from "../middlewares/validaciones.js";

const router = express.Router();

// Validaciones para filtros
const validarFiltros = [
  query("nombre").isString().optional(),
  query("categoria_id").isInt({ min: 1 }).optional(),
  query("alcoholico").isBoolean().optional(),
  query("disponible").isBoolean().optional(),
];

// Validaciones para crear/actualizar producto
const validarProducto = [
  body("nombre", "Nombre inválido").isString().isLength({ min: 1, max: 100 }),
  body("descripcion", "Descripción inválida").isString().optional(),
  body("precio", "Precio inválido").isFloat({ min: 0.01 }),
  body("categoria_id", "Categoría inválida").isInt({ min: 1 }),
  body("disponible", "Disponible debe ser booleano").isBoolean().optional(),
  body("alcoholico", "Alcohólico debe ser booleano").isBoolean().optional(),
  body("imagen_url", "URL de imagen inválida").isString().optional(),
];

// GET - Listar productos con filtros
router.get("/", validarFiltros, verificarValidaciones, async (req, res) => {
  try {
    const filtros = [];
    const parametros = [];

    const { nombre, categoria_id, alcoholico, disponible } = req.query;

    if (nombre) {
      filtros.push("p.nombre LIKE ?");
      parametros.push(`%${nombre}%`);
    }

    if (categoria_id !== undefined) {
      filtros.push("p.categoria_id = ?");
      parametros.push(Number(categoria_id));
    }

    if (alcoholico !== undefined) {
      filtros.push("p.alcoholico = ?");
      parametros.push(alcoholico === 'true' ? 1 : 0);
    }

    if (disponible !== undefined) {
      filtros.push("p.disponible = ?");
      parametros.push(disponible === 'true' ? 1 : 0);
    }

    let sql = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion,
        p.precio, 
        p.disponible,
        p.alcoholico,
        p.imagen_url,
        c.nombre AS categoria 
      FROM productos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id
    `;

    if (filtros.length > 0) {
      sql += " WHERE " + filtros.join(" AND ");
    }

    sql += " ORDER BY p.categoria_id, p.nombre";

    const [rows] = await db.execute(sql, parametros);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error al listar productos:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al listar productos" 
    });
  }
});

// GET - Obtener producto por ID
router.get("/:id", validarId, verificarValidaciones, async (req, res) => {
  try {
    const id = Number(req.params.id);

    const [rows] = await db.execute(
      `SELECT 
        p.*, 
        c.nombre AS categoria 
      FROM productos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id 
      WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Producto no encontrado" 
      });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error al obtener producto:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al obtener producto" 
    });
  }
});

// POST - Crear producto
router.post("/", validarProducto, verificarValidaciones, async (req, res) => {
  try {
    const { 
      nombre, 
      descripcion, 
      precio, 
      categoria_id, 
      disponible, 
      alcoholico,
      imagen_url 
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO productos 
        (nombre, descripcion, precio, categoria_id, disponible, alcoholico, imagen_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, 
        descripcion || null, 
        precio, 
        categoria_id, 
        disponible !== undefined ? disponible : true,
        alcoholico !== undefined ? alcoholico : false,
        imagen_url || null
      ]
    );

    res.status(201).json({
      success: true,
      data: { 
        id: result.insertId, 
        nombre, 
        precio, 
        categoria_id 
      },
    });
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al crear producto" 
    });
  }
});

// PUT - Actualizar producto
router.put(
  "/:id",
  validarId,
  validarProducto,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { 
        nombre, 
        descripcion, 
        precio, 
        categoria_id, 
        disponible,
        alcoholico,
        imagen_url 
      } = req.body;

      await db.execute(
        `UPDATE productos 
        SET nombre = ?, descripcion = ?, precio = ?, categoria_id = ?, 
            disponible = ?, alcoholico = ?, imagen_url = ?
        WHERE id = ?`,
        [
          nombre, 
          descripcion || null, 
          precio, 
          categoria_id, 
          disponible !== undefined ? disponible : true,
          alcoholico !== undefined ? alcoholico : false,
          imagen_url || null,
          id
        ]
      );

      res.json({
        success: true,
        data: { id, nombre, precio, categoria_id },
      });
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al actualizar producto" 
      });
    }
  }
);

// DELETE - Eliminar producto
router.delete(
  "/:id",
  validarId,
  verificarValidaciones,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      await db.execute("DELETE FROM productos WHERE id = ?", [id]);
      
      res.json({ success: true, data: { id } });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error al eliminar producto" 
      });
    }
  }
);

export default router;