import { createServer } from "vite";
import { lookup } from "./shared/reference.mjs";
import { shell, examples } from "./shared/shell.mjs";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "mpa",
});
const { createServer: httpServer } = await import("node:http");
const http = httpServer(async (req, res) => {
  try {
    if (req.url === "/api/lookup" && req.method === "POST") {
      let text = "";
      for await (const chunk of req) {
        text += chunk;
        if (text.length > 8192) {
          res.writeHead(413).end();
          return;
        }
      }
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        res.writeHead(400).end();
        return;
      }
      const result = lookup(payload?.reference);
      res.writeHead(result.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }
    if (req.url?.split("?")[0] === "/conform/") {
      const { render } = await server.ssrLoadModule("/conform/server.tsx");
      const result = await render(req);
      res.writeHead(result.status, { "Content-Type": "text/html" });
      res.end(await server.transformIndexHtml("/conform/", result.html));
      return;
    }
    if (req.url === "/") {
      res.setHeader("Content-Type", "text/html");
      res.end(
        shell(
          "Reference fields in real form libraries",
          `<nav>${examples.map((p) => `<a href="/${p}/">${p}</a>`).join("")}<a href="http://127.0.0.1:5188/">superforms</a><a href="http://127.0.0.1:5189/">uniforms (React 18)</a></nav><p>The examples use RefMint 1.0.0 from npm. They preserve the entered text on errors and recheck every submitted value on the server. Existing IDs and authorization remain application responsibilities.</p>`,
        ),
      );
      return;
    }
    server.middlewares(req, res);
  } catch (error) {
    console.error(error);
    res.writeHead(500).end("Example server error");
  }
});
http.listen(Number(process.env.PORT || 5187), "127.0.0.1", () =>
  console.log("Examples: http://127.0.0.1:" + http.address().port),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    http.close();
    await server.close();
    process.exit();
  });
