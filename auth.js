console.log('auth');

// Set the redirect URI to the chromiumapp.com provided by Chromium
const redirectUri = typeof chrome !== "undefined" && chrome.identity ?
	chrome.identity.getRedirectURL() :
	`${window.location.origin}/index.html`;

let msalInstance = new msal.PublicClientApplication({
	auth: {
		authority: "https://login.microsoftonline.com/bdf1795a-c7bb-4599-bac9-f8d3335bef69",
		clientId: "22473745-b0f0-43af-98c1-eea2ab47088e",
		redirectUri,
		postLogoutRedirectUri: redirectUri
	},
	cache: {
		cacheLocation: "localStorage"
	}
});

/*** Sign in button */
document.getElementById("sign-in").addEventListener("click", async () => {
	await login();
});

/*** Sign out button*/
document.getElementById("sign-out").addEventListener("click", async () => {
	const logoutUrl = await getLogoutUrl();
	await launchWebAuthFlow(logoutUrl);

	// chrome.runtime.sendMessage({ message: "logout", payload: { result: null } }, function() {});
	document.getElementById("username").innerHTML = "";
	document.getElementById("displayname").innerHTML = "";
	document.getElementById("user-block").style.display = "none";
});

async function getLoginUrl(request, reject) {
	return new Promise((resolve) => {
		msalInstance.loginRedirect({
			...request,
			onRedirectNavigate: (url) => {
				resolve(url);
				return false;
			}
		}).catch(reject);
	});
}

async function getLogoutUrl(request) {
	return new Promise((resolve, reject) => {
		msalInstance.logout({
			...request,
			onRedirectNavigate: (url) => {
				resolve(url);
				return false;
			}
		}).catch(reject);
	});
}

async function login() {
	document.getElementById("user-block").style.display = "block";
	document.getElementById("username").innerHTML = '...';
	document.getElementById("displayname").innerHTML = '...';

	const url = await getLoginUrl();
	const result = await launchWebAuthFlow(url);

	document.getElementById("username").innerHTML = result.account.username;
	document.getElementById("displayname").innerHTML = result.account.name;
}

/**
 * Launch the Chromium web auth UI.
 * @param {*} url AAD url to navigate to.
 * @param {*} interactive Whether or not the flow is interactive
 */
async function launchWebAuthFlow(url) {

	return new Promise((resolve, reject) => {

		chrome.identity.launchWebAuthFlow({
			interactive: true,
			url
		}, (responseUrl) => {
			// Response urls includes a hash (login, acquire token calls)
			if (responseUrl && responseUrl.includes("#")) {
				msalInstance.handleRedirectPromise(`#${responseUrl.split("#")[1]}`)
					.then(result => {
						if (result && result.account) {
							resolve(result);
						} else {
							console.log('not Loading msal ');
							resolve(null);
						}

					}).catch(reject)
			} else {
				// Logout calls
				resolve(null);
			}
		})
	})
}

/**
 * Returns the user sign into the browser.
 */
async function getSignedInUser() {
	return new Promise((resolve, reject) => {
		if (chrome && chrome.identity) {
			// Running in extension popup
			chrome.identity.getProfileUserInfo((user) => {
				if (user) {
					resolve(user);
				} else {
					resolve(null);
				}
			});
		} else {
			// Running on localhost
			resolve(null);
		}
	})
}

const getBearerToken = async () => {
	 if (msalInstance.getAllAccounts()[0]) {
		const tokenRequest = {
			scopes: [ "api://nxutestadmin/user_impersonation" ], // from admin-ui test and this and this
			account: msalInstance.getAllAccounts()[0]
		};
		try {
			const response = await msalInstance.acquireTokenSilent(tokenRequest);
			chrome.storage.local.set({ 'BearerToken': response.accessToken }, function() {});
			return response.accessToken;
		} catch (error) {
			if (error.name === 'InteractionRequiredAuthError') {
				msalInstance.acquireTokenRedirect(tokenRequest);
			}
			chrome.storage.local.remove('BearerToken', function() {});
			throw error;
		}
	}
	throw new Error('Not Authenticated');
};

async function sendWebMessage(type, data) {
	const token = await getBearerToken();
	chrome.runtime.sendMessage({ type, data, token }, response => console.log('success',response));
}

// why is accounts always null?
let signedIn = false;
const accounts = msalInstance.getAllAccounts();
if (accounts && accounts.length) {
	const foo = {
		scopes: [ 'api://nxutestadmin/user_impersonation' ],
		account: accounts[0]
	};
	msalInstance.acquireTokenSilent({ foo }).then((res) => {
		console.log('Silent Login Success: ', res)

		// set token in sessionStorage
		const { username, name } = res;
		document.getElementById("username").innerHTML = 'acquired silently ' + username;
		document.getElementById("displayname").innerHTML = name;
		document.getElementById("user-block").style.display = "block";
		signedIn = true;
	})
	.catch((err) => console.log(err))
}

if (!signedIn) {
	login()

	// This is for debugging. Remove once working
		.then(() => { sendWebMessage("API_TEST", { NeoId: "6765294", AssignmentId: "12785489" }); });
}


//TODO:
//fix show icon plugin just on the learnstg
//fix auth problems somehtings work  not form first time autentification
// call api

// how trigger start time grading ?