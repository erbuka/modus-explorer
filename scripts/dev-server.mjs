import express from "express";
import path from "path";
import fs from "fs";
import multer, { memoryStorage } from "multer";
import rimraf from "rimraf";
import colors from "colors";
import ncp from "ncp";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { v4 as uuidv4 } from 'uuid';

import { generateJsonSchema, generateJsonTemplate } from "./common.mjs";

const app = express();
const port = 8080;
const argv = yargs(hideBin(process.argv)).parse();

(async function () {
    const ncpWithPromise = async (src, dst) => {
        return new Promise((resolve, reject) => {
            ncp(src, dst, (err) => {
                if (err)
                    reject("There was an error while copying the files")
                else
                    resolve();
            });
        });
    };

    /** Development Server */
    {

        fs.mkdirSync(path.resolve("./assets"), { recursive: true });
        fs.mkdirSync(path.resolve("./assets/items"), { recursive: true });
        fs.mkdirSync(path.resolve("./assets/files"), { recursive: true });

        const upload = multer({ storage: memoryStorage() })

        app.post("/config", express.json(), (req, res) => {
            const data = JSON.stringify(req.body)
            fs.writeFileSync("./assets/config.json", data, { encoding: "utf-8" })
            res.send()
        })

        app.post("/files", upload.single("file"), (req, res) => {

            const itemId = req.body.itemId || "__global";

            if (req.file) {
                const dirPath = path.resolve(`./assets/files/${itemId}`);
                const fileName = req.file.originalname;
                const filePath = path.join(dirPath, fileName);
                fs.mkdirSync(dirPath, { recursive: true });
                fs.writeFileSync(filePath, req.file.buffer);
                res.json({ fileUrl: `assets/files/${itemId}/${fileName}` });
            } else {
                res.sendStatus(404);
            }

        })

        app.get("/items", (req, res) => {
            const result = fs.readdirSync(path.resolve("./assets/items"))
                .map(file => {
                    const itemPath = path.resolve(`./assets/items/${file}/item.json`);
                    if (fs.existsSync(itemPath)) {
                        const item = JSON.parse(fs.readFileSync(itemPath, { encoding: "utf-8" }));
                        return {
                            id: file,
                            title: item.title || null
                        }
                    } else return null

                }).filter(x => x !== null)
            res.json(result);
        })

        app.post("/items", express.json(), (req, res) => {
            const itemId = req.body.id || uuidv4();
            const itemFolder = path.resolve(`./assets/items/${itemId}`)
            const itemPath = path.resolve(`${itemFolder}/item.json`);
            fs.mkdirSync(itemFolder, { recursive: true })
            fs.writeFileSync(itemPath, JSON.stringify(req.body), { encoding: "utf-8" })
            res.json({ id: itemId });
        });

        // TODO: Questo è uno schifo, funziona ma va fatto meglio
        app.use("/*", (req, res) => {
            const path0 = path.resolve("./build-dev", req.originalUrl.substring(1));
            const path1 = path.resolve(".", req.originalUrl.substring(1));

            if (fs.existsSync(path0) && fs.lstatSync(path0).isFile()) res.sendFile(path0);
            else if (fs.existsSync(path1) && fs.lstatSync(path1).isFile()) res.sendFile(path1);
            else res.sendFile(path.resolve("./build-dev/index.html"));
        });

        app.listen(port);

        console.log(`${colors.green("[Dev-Server]")} - Listening on port ${port}`);
    }


    /** Item Type Schema Generator */
    if (argv.types) {


        console.log(`${colors.green("[Dev-Server]")} - Starting type schema generator`);

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
            {
                name: "ServerType",
                dest: "./src/app/types/server-schema.json",
                files: ["./src/app/types/config.ts"]
            }
        ];

        for (let type of types) {
            generateJsonSchema(type.files, type.name, r => {
                let p = path.resolve(type.dest);
                fs.writeFileSync(p, JSON.stringify(r));
                console.log(`${colors.green("[Types]")} - Rebuild ${colors.yellow(path.basename(p))}`);
            });
        }

    }

    /** Template Generator */
    if (argv.templates) {



        const dest = "./src/app/templates/templates.component.html";

        console.log(`${colors.green("[Dev-Server]")} - Starting template generator`);

        try {
            fs.mkdirSync(path.resolve("./templates"), { recursive: true });

            generateJsonTemplate("./templates", function (result) {
                let templates = result.reduce((prev, curr) => prev + `<ng-template let-data let-item="item" appTemplateDef="${curr.name}">${curr.contents}</ng-template>`, "");
                fs.writeFileSync(path.resolve(dest), templates, { encoding: "utf-8" });
                console.log(`${colors.green("[Templates]")} - Rebuild ${colors.yellow(path.basename(dest))}`);
            });
        }
        catch (e) {
            console.log(`${colors.red("[Templates]")} - ${e}`);
        }
    }
})();