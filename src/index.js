import "dotenv/config";import {app} from "./app.js";import {maintenance} from "./league.js";
const port=Number(process.env.PORT||3000);app.listen(port,"0.0.0.0",()=>console.log(`LA RED Pádel API en ${port}`));
maintenance().catch(console.error);setInterval(()=>maintenance().catch(console.error),60*60*1000).unref();
