import mysql from "mysql2/promise";
import dotenv from 'dotenv';

dotenv.config();

export let db;

export async function conectarDB() {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT 
        });
        
        console.log('Conectado a MySQL Railway');
        console.log(`Base de datos: ${process.env.DB_NAME}`);
        return db;
    } catch (error) {
        console.error('Error conectando a MySQL:', error.message);
        throw error;
    }
}

// Función para cerrar la conexión
export async function cerrarDB() {
    if (db) {
        await db.end();
        console.log('Conexión cerrada');
    }
}