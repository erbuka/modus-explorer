import { ServerType } from "./app/types/config";

const server: ServerType = require("../server.json")

export default function getServer() { return server }