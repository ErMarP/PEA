const { google } = require('googleapis');
const mysql = require('mysql');
const util = require('util');
const axios = require('axios');
require('dotenv').config();

// Configuración de la conexión a la base de datos MySQL
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_ADMIN,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
};
const connection = mysql.createConnection(dbConfig);

// Función para promisificar la función de consulta de MySQL
const queryAsync = util.promisify(connection.query).bind(connection);

/**
 * Función para autorizar y obtener autenticación
 * @async
 * @function
 * @returns {Object} auth - Objeto de autenticación para la API de Google Sheets.
 */
async function authorize() {
  const { CLIENT_EMAIL, PRIVATE_KEY } = process.env;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

/**
 * Función para obtener nuevas respuestas del formulario de Google Sheets
 * @async
 * @function
 * @returns {Array} response.data.values - Matriz de nuevas respuestas o matriz vacía si no hay nuevas respuestas.
 * @throws {Error} Si hay un error al obtener nuevas respuestas.
 */
async function fetchNewResponses() {
  try {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const range = 'Hoja1!B2:P'; // Definir el rango de datos en la hoja de cálculo

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    throw new Error('Error al obtener nuevas respuestas: ' + error.message);
  }
}

/**
 * Función para descargar un archivo desde una URL
 * @param {string} url - URL del archivo para descargar
 * @returns {Promise<Buffer>} - Promesa que resuelve al contenido del archivo como un Buffer
 */
async function downloadFile(url) {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data, 'binary');
}

/**
 * Función para insertar datos en la base de datos MySQL
 * @async
 * @function
 * @param {Array} data - Matriz de datos a insertar en la base de datos.
 * @param {Object} sheets - Objeto de autenticación para la API de Google Sheets.
 * @param {string} spreadsheetId - ID de la hoja de cálculo de Google.
 */
async function insertIntoDatabase(data, sheets, spreadsheetId) {
  const query = `INSERT INTO practica (correo, tipo_contenido, titulo, materia, descripcion, descarga, privacidad, audiencia, nombre, apellido_paterno, apellido_materno, nacionalidad, institucion, carta_autorizacion) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  // Iniciar una transacción
  await queryAsync('START TRANSACTION');

  for (const row of data) {
    try {
      if (!row[0] || typeof row[0] !== 'string' || row[0].trim() === '') {
        console.log('Fila vacia o correo no válido:', row);
        console.log('Correo:', row[0]);
        continue;
      }

      // Descargar el archivo desde la URL en la columna 'carta_autorizacion'
      const cartaAutorizacionUrl = row[13];
      let cartaAutorizacionContenido = null;
      if (cartaAutorizacionUrl) {
        cartaAutorizacionContenido = await downloadFile(cartaAutorizacionUrl);
      }

      // Descargar el archivo desde la URL en la columna 'descarga'
      const descargaUrl = row[5];
      let descargaContenido = null;
      if (descargaUrl) {
        descargaContenido = await downloadFile(descargaUrl);
      }

      // Insertar los contenidos de los archivos en la base de datos
      const insertedRowId = await queryAsync(query, [
        row[0], 
        row[1],
        row[2], 
        row[3],
        row[4],
        descargaContenido,
        row[6],
        row[7],
        row[8], 
        row[9], 
        row[10], 
        row[11],
        row[12],
        cartaAutorizacionContenido
      ]);
      console.log('Datos insertados en la base de datos:', insertedRowId);

      await deleteRowFromSpreadsheet(sheets, spreadsheetId, 'Hoja1');
    } catch (error) {
      console.error('Error al insertar datos en la base de datos:', error);

      // Retroceder la transacción en caso de error
      await queryAsync('ROLLBACK');
      return;
    }
  }

  // Confirmar la transacción después de las inserciones exitosas
  await queryAsync('COMMIT');
}



/**
 * Función para eliminar una fila de la hoja de cálculo de Google Sheets
 * @async
 * @function
 * @param {Object} sheets - Objeto de autenticación para la API de Google Sheets.
 * @param {string} spreadsheetId - ID de la hoja de cálculo de Google.
 * @param {string} sheetName - Nombre de la hoja de cálculo.
 */
async function deleteRowFromSpreadsheet(sheets, spreadsheetId, sheetName) {
  try {
    // Limpiar el rango de datos completo (excluyendo la fila de encabezado)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:P`, 
    });

    console.log('Datos eliminados de la hoja de cálculo de Google.');
  } catch (error) {
    console.error('Error al borrar datos de la hoja de cálculo de Google:', error.message);
  }
}

/**
 * Función para procesar las respuestas periódicamente
 * @async
 * @function
 */
async function processResponsesAtIntervals() {
  while (true) {
    try {
      const newResponses = await fetchNewResponses();
      if (newResponses && newResponses.length > 0) {
        const auth = await authorize();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.SPREADSHEET_ID;
        await insertIntoDatabase(newResponses, sheets, spreadsheetId);
      } else {
        console.log('No se encontraron nuevas respuestas. Esperando el siguiente intervalo...');
      }
    } catch (err) {
      console.error('Error al procesar nuevas respuestas:', err);
    } finally {
      // Dormir durante un intervalo especificado (por ejemplo, 1 minuto)
      await sleep(60 * 1000); 
    }
  }
}

/**
 * Función para dormir durante un tiempo especificado en milisegundos
 * @param {number} ms - Tiempo en milisegundos para dormir
 * @returns {Promise} - Promesa que se resolverá después de dormir el tiempo especificado
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Función principal para iniciar el proceso de procesamiento periódico de respuestas
 * @async
 * @function
 */
async function main() {
  try {
    await processResponsesAtIntervals();
  } catch (err) {
    console.error('Error en main:', err);
  } finally {
    connection.end(); 
  }
}

main();
