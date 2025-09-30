import db from "./config/firebase.js";
import express from "express";
import userController from "./controller/userController.js";
import productController from "./controller/product.js";
import jwt from "jsonwebtoken";

const { Router } = express;
const routes = Router();
const SECRET_KEY = "cf64cae1888107c6ededc53b6cab6e08e6cae78c";

routes.get("/teste-firestore", async (req, res) => {
  try {
    const testRef = await db
      .collection("testes")
      .add({ timestamp: new Date() });
    res.json({ success: true, id: testRef.id });
  } catch (error) {
    res.status(500).json({ error });
  }
});

routes.post("/users", (req, res) => userController.create(req, res));
routes.get("/users", (req, res) => userController.read(req, res));
routes.put("/users/:id", (req, res) => userController.update(req, res));
routes.delete("/users/:id", (req, res) => userController.delete(req, res));

routes.post("/products", (req, res) => productController.create(req, res));
routes.get("/products", (req, res) => productController.read(req, res));
routes.get("/products/:id", (req, res) => productController.readOne(req, res));
routes.put("/products/:id", (req, res) => productController.update(req, res));
routes.delete("/products/:id", (req, res) => productController.delete(req, res)
);

// Rota para realizar a autentificação e gerar o token
routes.post("/login", async (req, res) => {
  try {
    const { username, email } = req.body;

    // Buscar os usuários do banco
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Verificação
    const user = users.find(
      (u) => u.username === username && u.email === email
    );

    if (user) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        SECRET_KEY,
        { expiresIn: "1h" }
      );
      return res.status(200).json({ message: token });
    } else {
      return res.status(401).json({ message: "Usuário ou senha inválido" });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ message: "Erro interno no servidor" });
  }
});


//Middleware para autenticar o token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) return res.status(403).json({ message: "Token não fornecido!" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ message: "Token inválido!" });
    req.user = user;
    next();
  });
};

//Rota autenticada
routes.get("/protected", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Bem-Vindo à rota autenticada!" });
});

//Rota autenticada e privada para o usuário admin
routes.get("/admin", authenticateToken, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Acesso Negado!" });
  } else {
    return res
      .status(200)
      .json({ message: "Bem-Vindo à área administrativa!" });
  }
});

export default routes;
