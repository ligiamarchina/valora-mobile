require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const lancamentosRoutes = require("./routes/lancamentos");
const relatoriosRoutes = require("./routes/relatorios");
const alertasRoutes = require("./routes/alertas");
const categoriasRoutes = require("./routes/categorias");
const precosRoutes = require("./routes/precos");



const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/lancamentos", lancamentosRoutes);
app.use("/relatorios", relatoriosRoutes);
app.use("/alertas", alertasRoutes);
app.use("/categorias", categoriasRoutes);
app.use("/precos-medios", precosRoutes);
app.use('/dispositivos', require('./routes/dispositivos'));
app.use('/cron', require('./routes/cron'));


app.get("/", (req, res) => {
  res.json({ status: "ok", mensagem: "API MEI rodando 🚀" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API rodando em http://localhost:${PORT}`);
});
