
# clean [DIR...]
[script("node")]
clean +DIR:
    var fs = require('node:fs');
    "{{DIR}}".split(" ").forEach(function(dir) {
      fs.rmSync(dir, {recursive:true,force:true});
    });

# compile typescript
compile: (clean "artifact" "dist" "lib" "local_dev" "out" "scripts/bin" "imports")
    tsc --project scripts
    node scripts/bin/bundle.js
    tsc

# package cjs module
package: compile
    esbuild --bundle --minify --platform=node \
        --outfile=dist/index.cjs \
        src/index.ts
