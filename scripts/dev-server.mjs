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

    /** Create starter application if it doesn't exist */
    if (!fs.existsSync("./assets")) {
        console.log(`${colors.green("[Dev-Server]")} - Creating starter project`);
        try {
            await ncpWithPromise("./starter-project/assets", "./assets");
            await ncpWithPromise("./starter-project/templates", "./templates");
        }
        catch (e) {
            console.log(`${colors.red("[Dev-Server]")} - ${e}`);
        }
    }

    /** Development Server */
    {

        const upload = multer({ storage: memoryStorage() })

        app.post("/files", upload.single("file"), (req, res) => {

            const itemId = req.body.itemId || "__global";


            if (req.file) {
                const dirPath = path.resolve(`./assets/files/${itemId}`);
                const fileName = `${uuidv4()}${path.extname(req.file.originalname)}`;
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

        /*
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
        */
        // TODO: Questo è uno schifo, funziona ma va fatto meglio
        app.use("/*", (req, res) => {
            const path0 = path.resolve("./build-dev", req.originalUrl.substring(1));
            const path1 = path.resolve(".", req.originalUrl.substring(1));

            if (fs.existsSync(path0) && fs.lstatSync(path0).isFile()) res.sendFile(path0);
            else if (fs.existsSync(path1) && fs.lstatSync(path1).isFile()) res.sendFile(path1);
            else res.sendFile(path.resolve("./build-dev/index.html"));
        });

        /*
        app.use("/assets", express.static("assets"), (req, res) => {
            res.sendFile(path.resolve("./build-dev/index.html"))
        });
        */
        //app.use("/", express.static("build-dev"));

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