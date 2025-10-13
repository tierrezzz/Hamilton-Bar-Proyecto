import { body, query } from "express-validator";
import express from "express";
import { db } from "../db.js";
import { validarId, verificarValidaciones } from "../middlewares/validaciones.js";

const router = express.Router();

// Validaciones para filtros
const validarFiltros = [
  query("nombre").isString().optional(),
  query("categoria_id").isInt({ min: 1 }).optional(),
];

// Validaciones para crear/actualizar producto
const validarProducto = [
  body("nombre", "Nombre inválido").isString().isLength({ min: 1, max: 100 }),
  body("descripcion", "Descripción inválida").isString().optional(),
  body("precio", "Precio inválido").isFloat({ min: 0.01 }),
  body("categoria_id", "Categoría inválida").isInt({ min: 1 }),
];

// GET - Listar productos con filtros
router.get("/", validarFiltros, verificarValidaciones, async (req, res) => {
  try {
    const filtros = [];
    const parametros = [];

    const { nombre, categoria_id} = req.query;

    if (nombre) {
      filtros.push("p.nombre LIKE ?");
      parametros.push(`%${nombre}%`);
    }

    if (categoria_id !== undefined) {
      filtros.push("p.categoria_id = ?");
      parametros.push(Number(categoria_id));
    }

    let sql = `
      SELECT 
        p.id, 
        p.nombre, 
        p.descripcion,
        p.precio, 
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
      categoria_id
    } = req.body;

    // Verificar si ya existe un producto con ese nombre
    const [existe] = await db.execute(
      "SELECT id, nombre FROM productos WHERE nombre = ?",
      [nombre]
    );

    if (existe.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe un producto con ese nombre"
      });
    }

    // Verificar que la categoría existe
    const [categoriaExiste] = await db.execute(
      "SELECT id FROM categorias WHERE id = ?",
      [categoria_id]
    );

    if (categoriaExiste.length === 0) {
      return res.status(404).json({
        success: false,
        message: "La categoría no existe"
      });
    }

    const [result] = await db.execute(
      `INSERT INTO productos 
        (nombre, descripcion, precio, categoria_id) 
      VALUES (?, ?, ?, ?)`,
      [
        nombre, 
        descripcion || null, 
        precio, 
        categoria_id
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
      } = req.body;

      // Verificar si el producto existe
      const [productoExiste] = await db.execute(
        "SELECT id, nombre FROM productos WHERE id = ?",
        [id]
      );

      if (productoExiste.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado"
        });
      }

      // Solo verificar nombre duplicado si está cambiando el nombre
      if (nombre !== productoExiste[0].nombre) {
        const [nombreExiste] = await db.execute(
          "SELECT id FROM productos WHERE nombre = ? AND id != ?",
          [nombre, id]
        );

        if (nombreExiste.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Ya existe otro producto con ese nombre"
          });
        }
      }

      // Verificar que la categoría existe
      const [categoriaExiste] = await db.execute(
        "SELECT id FROM categorias WHERE id = ?",
        [categoria_id]
      );

      if (categoriaExiste.length === 0) {
        return res.status(404).json({
          success: false,
          message: "La categoría no existe"
        });
      }

      await db.execute(
        `UPDATE productos 
        SET nombre = ?, descripcion = ?, precio = ?, categoria_id = ?
        WHERE id = ?`,
        [
          nombre, 
          descripcion || null, 
          precio, 
          categoria_id, 
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

      // Verificar si el producto existe
      const [productoExiste] = await db.execute(
        "SELECT id FROM productos WHERE id = ?",
        [id]
      );

      if (productoExiste.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Producto no encontrado"
        });
      }

      await db.execute("DELETE FROM productos WHERE id = ?", [id]);
      
      res.json({ 
        success: true, 
        message: "Producto eliminado correctamente",
        data: { id } 
      });
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