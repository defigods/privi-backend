import { startServer } from './controllers/server';

const env: string = process.argv[2];    // 'dev' (development), 'prod' (production)

const main = async () => {

    // Start Server
    (env === 'dev' || env === 'prod')
    ? startServer(env)
    : console.log(`Please use any of the following commands:\n$ nodemon dev => for Development \n$ nodemon prod => for Production`);

};

main();


