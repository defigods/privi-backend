//import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import helmet from 'helmet';

const userRouter = require('../routes/user.ts');

export const startServer = () => {
    // initialize configuration
    //dotenv.config();

    const port = 3001;
    const app = express();

    // Set HTTP headers for security
    app.use(helmet());

    // Configure Express to parse incoming JSON data
    app.use(express.json());

    // Configure Express to use EJS
    app.set("views", path.join(__dirname, "views"));

    // Routes definition
    app.use('/user', userRouter);

    // start the express server
    app.listen(port, () => {
        // tslint:disable-next-line:no-console
        console.log(`server started at http://localhost:${port}`);
    });
};

