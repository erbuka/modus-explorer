const express = require("express");
const path = require("path");
const fs = require("fs");
const rimraf = require("rimraf");
const colors = require("colors");

const app = express();
const port = 8080;

const common = require("./common");



/** Development Server */
{
    app.delete("/assets/*", (req, res) => {
        let dirPath = path.resolve(path.join("./", req.url));

        if (fs.lstatSync(dirPath).isDirectory()) {
            let files = path.join(dirPath, "*");
            rimraf(files, (error) => {
                if (error) {
                    res.statusCode = 400;
                    res.send(error);
                } else {
                    res.statusCode = 200;
                    res.send(dirPath);
                }
            });
        } else {
            res.statusCode = 400;
            res.send(`Not a valid directory: ${dirPath}`);
        }

    });

    app.post("/assets/*", express.raw({ type: ["text/html", "application/octet-stream"], limit: "512mb" }), (req, res, next) => {
        let filePath = path.resolve(path.join("./", req.url));
        fs.writeFile(filePath, req.body, () => {
            res.statusCode = 200;
            res.send();
        });
    });
    app.use("/assets", express.static("assets"), (req, res) => {
        res.sendFile(path.resolve("./build-dev/index.html"))
    });
    app.use("/", express.static("build-dev"));

    app.listen(port);

    console.log(`${colors.green("[Dev-Server]")} - Listening on port ${port}`);
}


/** Item Type Schema Generator */
{


    const types = [
        {
            name: "Item",
            dest: "./src/app/types/item-schema.json",
            files: [
                "./src/app/types/item.ts",
                "./src/app/types/deep-zoom-item.ts",
                "./src/app/types/block-list-item.ts",
                "./src/app/types/page-item.ts",
                "./src/app/types/slideshow-item.ts",
                "./src/app/types/three-viewer-item.ts",
            ]
        },
        {
            name: "Config",
            dest: "./src/app/types/config-schema.json",
            files: ["./src/app/types/config.ts"]
        },
    ];

    for(let type of types) {
        common.generateJsonSchema(type.files, type.name, r => {
            let p = path.resolve(type.dest);
            fs.writeFileSync(p, JSON.stringify(r));
            console.log(`${colors.green("[Types]")} - Rebuild ${colors.yellow(path.basename(p))}`);
        });
    }

}

/** Template Generator */
{
    const dest = "./src/app/templates/templates.component.html";

    try {
        common.generateJsonTemplate("./templates", function (result) {
            let templates = result.reduce((prev, curr) => prev + `<ng-template let-data let-item="item" appTemplateDef="${curr.name}">${curr.contents}</ng-template>`, "");
            fs.writeFileSync(path.resolve(dest), templates, { encoding: "utf-8" });
            console.log(`${colors.green("[Templates]")} - Rebuild ${colors.yellow(path.basename(dest))}`);
        });
    }
    catch (e) {
        console.log(`${colors.red("[Templates]")} - ${e}`);
    }
}