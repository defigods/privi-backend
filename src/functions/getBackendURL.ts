
/**
 * Determines the back-end URL depending on two factors:
 * 
 * @returns URL to connect to the backend
 */
const URL = (): string => {
	const env: string = process.argv[2];
	var backendUrl = "http://localhost:3000"; // default for dev env
	if (env == "prod") {
		backendUrl = "https://priviweb.tech:3000";
	} else if (env == "devssl") {
		backendUrl = "https://localhost:3000";
	}
	return backendUrl;
};

export default URL;

