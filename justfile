
# clean [DIR...]
[script("node")]
clean +DIR="dist lib out src/imports":
    var fs = require('node:fs');
    "{{DIR}}".split(" ").forEach(function(dir) {
      fs.rmSync(dir, {recursive:true,force:true});
    });

# compile typescript
compile: clean
    tsc --project scripts
    node lib/bundle.js
    tsc

# package cjs module
package: compile
    esbuild --bundle --minify --platform=node --target=node24 \
        --outfile=dist/index.cjs \
        src/index.ts

# run pages workflow using nektos/act
[linux]
[script("bash")]
pages: (clean "out")
    systemctl --user start podman.socket
    export DOCKER_HOST=unix://${XDG_RUNTIME_DIR}/podman/podman.sock
    act workflow_dispatch -W .github/workflows/pages.yaml

# create simple web server to view pages
[script("node")]
serve: pages
    var http = require('node:http');
    var url = require('node:url');
    var fs = require('node:fs');
    var path = require('node:path');
    const port = 9000;
    const serveDir = path.join('{{justfile_directory()}}', 'out');
    const mimeType = {
        '.ico': 'image/x-icon',
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.eot': 'application/vnd.ms-fontobject',
        '.ttf': 'application/x-font-ttf'
    };
    const fofPath = path.join(serveDir, '404.html');
    var fofData;
    if (fs.existsSync(fofPath)) {
      fofData = fs.readFileSync(fofPath);
    }
    function getFof(pathName) {
      if (fofData) return fofData;
      return `File ${pathName} not found!`;
    }
    console.log(`Creating server: http://localhost:${port}/ ...`);
    http.createServer( (req, res) => {
        const parsedUrl = new url.URL(req.url, `http://${req.headers.host}/`);
        var pathName = decodeURIComponent(path.join(serveDir, parsedUrl.pathname));
        try {
            var stats = fs.statSync(pathName);
            if (stats.isDirectory()) {
                pathName += '/index.html';
            }
            const data = fs.readFileSync(pathName);
            const ext = path.extname(pathName);
            res.setHeader('Content-type', mimeType[ext] || 'text/plain');
            res.end(data);
        } catch (err) {
            if (err.code == 'ENOENT') {
                res.statusCode = 404;
                res.end(getFof(pathName));
            } else {
                res.statusCode = 500;
                res.end(`Error getting file '${err}'`);
            }
        }
        console.log(`${req.method} ${res.statusCode} ${req.url}`);
    }).listen(port);
