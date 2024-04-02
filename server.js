/**
 * Archivo de servidor para una aplicación web utilizando Fastify y MySQL.
 * 
 * @module servidor.js
 */

// Importación de módulos necesarios
const path = require("path");
const fastify = require("fastify")({ logger: false });
const mysql = require("mysql");
const util = require('util');
const { main } = require('./insercion');

/**
 * Configuración de la conexión a la base de datos MySQL.
 * 
 * @constant {Object} db - Objeto que representa la conexión a la base de datos MySQL.
 * @property {string} host - La dirección del servidor de la base de datos.
 * @property {string} user - El nombre de usuario para la conexión a la base de datos.
 * @property {string} password - La contraseña para la conexión a la base de datos.
 * @property {string} database - El nombre de la base de datos a la que se conectará.
 */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_ADMIN,
  password: process.env.DB_PASSWORD,
  database: process.env.DB,
});

// Utilizando la función 'promisify' para convertir la función de consulta en una función compatible con async/await
const query = util.promisify(db.query).bind(db);

/**
 * Establece la conexión a la base de datos MySQL.
 * 
 * @function
 * @name conectarBaseDeDatos
 * @param {function} callback - Función de retorno de llamada que maneja el resultado de la conexión.
 */
db.connect((err) => {
  if (err) {
    console.error('Error al conectar con MySQL:', err);
    process.exit(1);
  }
  console.log('Conectado a MySQL');
});

/**
 * Registro de plugins de Fastify.
 * 
 * @function
 * @name registrarPluginsFastify
 * @param {Object} fastify - Instancia de Fastify.
 */
fastify.register(require("@fastify/static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

fastify.register(require("@fastify/formbody"));

fastify.register(require("@fastify/view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

/**
 * Carga de datos SEO desde un archivo JSON.
 * Si la URL SEO es "glitch-default", se asigna una URL basada en el dominio del proyecto.
 * 
 * @constant {Object} seo - Objeto que contiene datos de SEO.
 * @property {string} url - La URL de la aplicación web.
 */
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

/**
 * Manejador para la ruta principal ("/") que muestra la página de inicio.
 * 
 * @function
 * @name mostrarPaginaInicio
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página de inicio.
 */
fastify.get("/", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/index.html", params);
});

/**
 * Manejador para la ruta "/acercade.html" que muestra la página "Acerca de".
 * 
 * @function
 * @name mostrarPaginaAcercaDe
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Acerca de".
 */
fastify.get("/acercade.html", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/acercade.html", params);
});

/**
 * Manejador para la ruta "/comparte.html" que muestra la página "Comparte".
 * 
 * @function
 * @name mostrarPaginaComparte
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Comparte".
 */
fastify.get("/comparte.html", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/comparte.html", params);
});

/**
 * Manejador para la ruta "/explora.html" que muestra la página "Explora".
 * 
 * @function
 * @name mostrarPaginaExplora
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Explora".
 */
fastify.get("/explora.html", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/explora.html", params);
});

/**
 * Manejador para la ruta "/dudas.html" que muestra la página "Dudas".
 * 
 * @function
 * @name mostrarPaginaDudas
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Dudas".
 */
fastify.get("/dudas.html", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/dudas.html", params);
});

/**
 * Manejador para la ruta "/estudiantes.html" que muestra datos de estudiantes obtenidos de la base de datos.
 * 
 * @function
 * @name mostrarPaginaEstudiantes
 * @async
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Estudiantes" y datos de estudiantes.
 */
fastify.get("/estudiantes.html", async function (request, reply) {
  try {
    const sql = 'SELECT titulo, apellido_paterno, apellido_materno, nombre, descripcion, materia FROM practica';
    const result = await db.query(sql);

    let params = {
      seo: seo,
      data: result,
    };

    return reply.view("/src/pages/estudiantes.html", params);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    return reply.code(500).send('Error interno del servidor');
  }
});

/**
 * Manejador para la ruta "/docentes.html" que muestra datos de docentes obtenidos de la base de datos.
 * 
 * @function
 * @name mostrarPaginaDocentes
 * @async
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Docentes" y datos de docentes.
 */
fastify.get("/docentes.html", async function (request, reply) {
  try {
    const sql = 'SELECT titulo, apellido_paterno, apellido_materno, nombre, descripcion, materia FROM practica';
    const result = await db.query(sql);

    let params = {
      seo: seo,
      data: result,
    };

    return reply.view("/src/pages/docentes.html", params);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    return reply.code(500).send('Error interno del servidor');
  }
});

/**
 * Manejador para la ruta "/investigadores.html" que muestra datos de investigadores obtenidos de la base de datos.
 * 
 * @function
 * @name mostrarPaginaInvestigadores
 * @async
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Investigadores" y datos de docentes.
 */
fastify.get("/investigadores.html", async function (request, reply) {
  try {
    const sql = 'SELECT titulo, apellido_paterno, apellido_materno, nombre, descripcion, materia FROM practica';
    const result = await db.query(sql);

    let params = {
      seo: seo,
      data: result,
    };

    return reply.view("/src/pages/investigadores.html", params);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    return reply.code(500).send('Error interno del servidor');
  }
});

/**
 * Ruta "/estudiantes.html/data" para obtener datos de estudiantes de forma independiente.
 * 
 * @function
 * @name obtenerDatosEstudiantes
 * @async
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con datos de estudiantes.
 */
fastify.get("/estudiantes.html/data", async function (request, reply) {
  try {
    const sql = 'SELECT * FROM practica';
    const result = await query(sql);

    return reply.send(result);
  } catch (error) {
    console.error('Error al obtener datos:', error);
    return reply.code(500).send('Error interno del servidor');
  }
});

/**
 * Manejador de ruta para obtener un PDF asociado a un ID específico.
 * @param {Object} request - Objeto de solicitud HTTP.
 * @param {Object} reply - Objeto de respuesta HTTP.
 * @returns {Object} - Respuesta HTTP con el contenido del PDF.
 */
fastify.get("/estudiantes.html/data/:id", async function (request, reply) {
  try {
    const id = request.params.id;
    const sql = 'SELECT descarga FROM practica WHERE id = ?'; 
    const result = await query(sql, [id]); 

    // Verificar si se encontró el PDF
    if (result.length === 0) {
      return reply.code(404).send('No se encontró el PDF');
    }

    // Obtener los datos del PDF desde la base de datos
    const pdfData = result[0].descarga;

    // Establecer el tipo de contenido en la respuesta como PDF
    reply.header('Content-Type', 'application/pdf');
    
    // Enviar los datos del PDF como respuesta
    reply.send(pdfData);
  } catch (error) {
    // Manejar cualquier error que pueda ocurrir durante el proceso
    console.error('Error al obtener el PDF:', error);
    return reply.code(500).send('Error interno del servidor');
  }
});


/**
 * Manejador de cierre de la aplicación, cierra la conexión a la base de datos.
 * 
 * @function
 * @name cerrarConexionBaseDeDatos
 * @param {Object} instance - Instancia de Fastify.
 * @param {function} done - Función de retorno de llamada que indica que el cierre se ha completado.
 */
fastify.addHook('onClose', (instance, done) => {
  db.end((err) => {
    if (err) {
      console.error('Error al cerrar la conexión con MySQL:', err);
    } else {
      console.log('Conexión con MySQL cerrada');
    }
    done();
  });
});

/**
 * Manejador para una ruta que se encarga de activar la función principal.
 * Esta ruta se puede invocar para iniciar el proceso de inserción de datos en la base de datos MySQL y la eliminación de filas en la hoja de cálculo de Google.
 * 
 * @function
 * @name activarFuncionPrincipal
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta indicando que la función principal ha sido activada.
 */
fastify.get("/activar-funcion-principal", async function (request, reply) {
  try {
    await main();
    return reply.send("Función principal activada correctamente.");
  } catch (error) {
    console.error('Error al activar la función principal:', error);
    return reply.code(500).send('Error interno del servidor al activar la función principal');
  }
});

/**
 * Configuración y arranque del servidor Fastify.
 * 
 * @function
 * @name iniciarServidor
 * @param {number} port - El número de puerto en el que escuchará el servidor.
 * @param {string} host - La dirección IP en la que escuchará el servidor.
 */
fastify.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Tu aplicación está escuchando en ${address}`);
  }
);

/**
 * Manejador para la ruta "/deinteres.html" que muestra la página "Dudas".
 * 
 * @function
 * @name mostrarPaginaDudas
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Dudas".
 */
fastify.get("/deinteres.html", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/deinteres.html", params);
});

/**
 * Manejador para la ruta "/practica.html" que muestra la página "Explora".
 * 
 * @function
 * @name mostrarPaginaExplora
 * @param {Object} request - Objeto de solicitud de Fastify.
 * @param {Object} reply - Objeto de respuesta de Fastify.
 * @returns {Object} Respuesta con la vista de la página "Explora".
 */
fastify.get("/practica.html", function (request, reply) {
  let params = { seo: seo };
  return reply.view("/src/pages/practica.html", params);
});
