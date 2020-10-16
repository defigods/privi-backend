import * as express from "express";

export const register = (app: express.Application) => {

    app.post("/", (req: any, res: any) => {

    });

    // Create Pod Token
    app.post("/pod/create", (req: any, res: any) => {

        res.send({status: 'OK'})
    });
    
    // Transfer Pod Token
    app.post("/pod/transfer", (req: any, res: any) => {

    });

    // Destroy Pod Token
    app.post("/pod/destroy", (req: any, res: any) => {

    });

    // Get All Pod Tokens
    app.get("/pod/getAll", (req: any, res: any) => {

    });

    // Get Pod Tokens of a user
    app.post("/pod/getOfUser", (req: any, res: any) => {

    });
};