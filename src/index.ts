import { startServer } from './controllers/serverController';

// 'dev' => Development environment without SSL
// 'devssl' => Development environment with SSL
// 'prod' => Development environment with SSL
const env: string = process.argv[2];    

const main = async () => {

    // Start Server
    (env === 'dev' || env === 'prod' || env === 'devssl')
    ? startServer(env)
    : console.log(`Please use any of the following commands:\n$ nodemon dev => for Development (without SSL) \n$ nodemon devssl (with SSL)=> for Development \n$ nodemon prod => for Production`);

};

main();