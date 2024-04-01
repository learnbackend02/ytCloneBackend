import connectToDB from './dataBase/index.js';
import dotenv from 'dotenv';
import {app, port} from './app.js';
dotenv.config({path: "./.env"});

connectToDB()
.then(()=>{
    // app.get("/", (req, res)=>{
    //     res.send("Hello World!!");
    // });
    app.listen(port, ()=>{
        console.log("Server is running on port: ", port);
    });
})
.catch(err=>{console.log("Server in not running!!", err)});