const express = require("express");
const cors = require("cors");
const jsonServer = require("json-server");
const path = require("path");
const { nanoid } = require("nanoid");

const app = express();

// === CORS liberado p/ qualquer origem ===
app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: ["Content-Type"],
  })
);

// === Body parser ===
app.use(express.json());

// === json-server armazena em .json ===
const router = jsonServer.router(
  path.join(__dirname, "db.json")
);
const db = router.db; 

// Validação 
function validatePost(
  payload,
  isPartial = false
) {
  const fields = [
    "date",
    "title",
    "readTime",
  ];
  if (isPartial) {
    // PATCH: se vier, valida tipo
    for (const k of Object.keys(
      payload
    )) {
      if (!fields.includes(k))
        return `campo desconhecido: ${k}`;
      if (
        typeof payload[k] !== "string"
      )
        return `campo "${k}" deve ser texto`;
    }
    return null;
  }
  // POST/PUT: exige todos
  for (const f of fields) {
    if (!(f in payload))
      return `campo obrigatório ausente: ${f}`;
    if (typeof payload[f] !== "string")
      return `campo "${f}" deve ser texto`;
    if (!payload[f].trim())
      return `campo "${f}" não pode ser vazio`;
  }
  return null;
}

// ====== Rotas ======

// GET /api/posts (lista)
app.get("/api/posts", (req, res) => {
  const posts = db.get("posts").value();
  res.json(posts);
});

// GET /api/posts/:id (detalhe)
app.get(
  "/api/posts/:id",
  (req, res) => {
    const post = db
      .get("posts")
      .find({ id: req.params.id })
      .value();
    if (!post)
      return res
        .status(404)
        .json({
          error: "não encontrado",
        });
    res.json(post);
  }
);

// POST /api/posts (cria)
app.post("/api/posts", (req, res) => {
  const err = validatePost(req.body);
  if (err)
    return res
      .status(400)
      .json({ error: err });

  const post = {
    id: nanoid(12),
    date: req.body.date.trim(),
    title: req.body.title.trim(),
    readTime: req.body.readTime.trim(),
    createdAt: new Date().toISOString(),
  };

  db.get("posts").push(post).write();
  res.status(201).json(post);
});

// PUT /api/posts/:id 
app.put(
  "/api/posts/:id",
  (req, res) => {
    const err = validatePost(req.body);
    if (err)
      return res
        .status(400)
        .json({ error: err });

    const existing = db
      .get("posts")
      .find({ id: req.params.id })
      .value();
    if (!existing)
      return res
        .status(404)
        .json({
          error: "não encontrado",
        });

    const updated = {
      ...existing,
      date: req.body.date.trim(),
      title: req.body.title.trim(),
      readTime:
        req.body.readTime.trim(),
      updatedAt:
        new Date().toISOString(),
    };

    db.get("posts")
      .find({ id: req.params.id })
      .assign(updated)
      .write();
    res.json(updated);
  }
);

// PATCH /api/posts/:id 
app.patch(
  "/api/posts/:id",
  (req, res) => {
    const err = validatePost(
      req.body,
      true
    );
    if (err)
      return res
        .status(400)
        .json({ error: err });

    const existing = db
      .get("posts")
      .find({ id: req.params.id })
      .value();
    if (!existing)
      return res
        .status(404)
        .json({
          error: "não encontrado",
        });

    const patch = {};
    [
      "date",
      "title",
      "readTime",
    ].forEach((k) => {
      if (k in req.body)
        patch[k] = String(
          req.body[k]
        ).trim();
    });
    patch.updatedAt =
      new Date().toISOString();

    db.get("posts")
      .find({ id: req.params.id })
      .assign(patch)
      .write();
    res.json({ ...existing, ...patch });
  }
);

// DELETE /api/posts/:id 
app.delete(
  "/api/posts/:id",
  (req, res) => {
    const existing = db
      .get("posts")
      .find({ id: req.params.id })
      .value();
    if (!existing)
      return res
        .status(404)
        .json({
          error: "não encontrado",
        });

    db.get("posts")
      .remove({ id: req.params.id })
      .write();
    res.status(204).end();
  }
);


app.get("/health", (_req, res) =>
  res.json({ ok: true })
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(
    `API rodando em http://localhost:${PORT}`
  );
});
