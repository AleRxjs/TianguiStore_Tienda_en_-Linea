/**
 * TianguiStore | Backend Express Server
 * --------------------------------------
 * @version     0.2.1
 * @description Servidor principal de TianguiStore
 * @author      I.S.C. Erick Renato Vega Ceron
 */

// ─────────────────────────────────────────────────────────────
// IMPORTACIONES BÁSICAS 🛠️
// ─────────────────────────────────────────────────────────────
const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const helmet = require("helmet");
const hpp = require("hpp");
const ProgressBar = require("progress");
const chalk = require("chalk");
const pool = require("./db/connection");
const cors = require("cors");

// ─────────────────────────────────────────────────────────────
// VARIABLES DE ENTORNO 🌐
// ─────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, ".env") });

const ENV = process.env.NODE_ENV || "development";
const IS_DEV = ENV !== "production";
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";

// ─────────────────────────────────────────────────────────────
// VALIDACIÓN ENV 🌍
// ─────────────────────────────────────────────────────────────
const REQUIRED_VARS = ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"];
const missing = REQUIRED_VARS.filter(v => !process.env[v]);

if (missing.length) {
  console.error(chalk.red(`❌ Faltan variables: ${missing.join(", ")}`));
  process.exit(1);
}

if (!process.env.DB_PASSWORD) {
  process.env.DB_PASSWORD = "";
}

// ─────────────────────────────────────────────────────────────
// APP EXPRESS 🧠
// ─────────────────────────────────────────────────────────────
const app = express();
const progressBar = new ProgressBar(":bar :percent", { total: 100 });

// ─────────────────────────────────────────────────────────────
// SEGURIDAD 🛡️
// ─────────────────────────────────────────────────────────────
app.use(helmet());
app.disable("x-powered-by");

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
    styleSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "'unsafe-inline'"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
    imgSrc: ["'self'", "data:"],
  }
}));

if (!IS_DEV) {
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }));
}

// ─────────────────────────────────────────────────────────────
// MIDDLEWARES 🔐
// ─────────────────────────────────────────────────────────────
app.use(hpp());

app.use(cors({
  origin: IS_DEV ? "*" : process.env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));

// ─────────────────────────────────────────────────────────────
// ARCHIVOS ESTÁTICOS 📁
// ─────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, "..", "public");
app.use(express.static(PUBLIC_DIR));

// ❤️ HEALTHCHECK (ESTO ES LO QUE FALTABA)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ─────────────────────────────────────────────────────────────
// RUTAS API 📦
// ─────────────────────────────────────────────────────────────
app.use("/auth", require("./routes/auth.routes"));
app.use("/productos", require("./routes/productos.routes"));
app.use("/carrito", require("./routes/carrito.routes"));
app.use("/pedidos", require("./routes/pedido.routes"));
app.use("/categorias", require("./routes/categorias.routes"));
app.use("/marcas", require("./routes/marcas.routes"));
app.use("/marketing", require("./routes/marketing.routes"));
app.use("/usuarios", require("./routes/usuarios.routes"));
app.use("/configuracion", require("./routes/configuracion.routes"));
app.use("/estadisticas", require("./routes/estadisticas.routes"));
app.use("/api/test", require("./routes/test.routes"));

// ─────────────────────────────────────────────────────────────
// PÁGINAS PÚBLICAS 🌍
// ─────────────────────────────────────────────────────────────
["", "login", "carrito", "registro"].forEach(page => {
  const file = `${page || "index"}.html`;
  app.get(`/${page}`, (req, res) =>
    res.sendFile(path.join(PUBLIC_DIR, file))
  );
});

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"));
});

// ─────────────────────────────────────────────────────────────
// ERRORES ⛑️
// ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    mensaje: "Error interno",
    ...(IS_DEV && { detalle: err.message })
  });
});

// ─────────────────────────────────────────────────────────────
// DB CHECK 🔌
// ─────────────────────────────────────────────────────────────
async function verificarConexionDB() {
  try {
    await pool.query("SELECT 1");
    console.log(chalk.green("✅ DB conectada"));
  } catch (e) {
    console.error(chalk.red("❌ Error DB"));
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// INICIO 🚀
// ─────────────────────────────────────────────────────────────
async function iniciarServidor() {
  console.log(chalk.yellow("🟡 Iniciando backend..."));
  await verificarConexionDB();

  app.listen(PORT, () => {
    console.log(chalk.green(`🟢 Servidor activo en http://${HOST}:${PORT}`));
  });
}

iniciarServidor();
