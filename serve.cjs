const http = require("http"),
  fs = require("fs"),
  path = require("path");
const root = path.join(__dirname, "dist");
http
  .createServer((req, res) => {
    let name = decodeURIComponent(req.url.split("?")[0]);
    if (name === "/") name = "/index.html";
    const target = path.resolve(root, "." + name);
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end();
      }
      res.setHeader(
        "Content-Type",
        { html: "text/html", css: "text/css", js: "text/javascript" }[
          path.extname(target).slice(1)
        ] || "application/octet-stream",
      );
      res.end(data);
    });
  })
  .listen(4173, "127.0.0.1", () => console.log("Local: http://127.0.0.1:4173"));
