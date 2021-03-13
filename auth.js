console.log('auth');

// Set the redirect URI to the chromiumapp.com provided by Chromium
const redirectUri = typeof chrome !== "undefined" && chrome.identity ?
	chrome.identity.getRedirectURL() :
	`${window.location.origin}/index.html`;
// console.log("This url must be registered in the Azure portal as a single-page application redirect uri, and as the post logout url");
debugger;
const msalInstance = new msal.PublicClientApplication({
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

// debugger;
// Set currently logged in account
const accounts = msalInstance.getAllAccounts();
if (accounts.length) {
	document.getElementById("username").innerHTML = accounts[0].username;
	document.getElementById("displayname").innerHTML = accounts[0].name;
	document.getElementById("user-block").style.display = "block";
}

/*** Adds a sign in button for the user signed into the browser*/
getSignedInUser()
	.then(async (user) => {
		if (user) {
			const signInHintButton = document.getElementById("sign-in-hint");
			signInHintButton.innerHTML = `Sign In (w/ ${user.email})`;
			signInHintButton.addEventListener("click", async () => {
				const url = await getLoginUrl({
					loginHint: user.email
				});

				const result = await launchWebAuthFlow(url);
				//document.getElementById("username").innerHTML = result.account.username;
			});
			signInHintButton.classList.remove("hidden");
		}
	})

/*** Sign in */
document.getElementById("sign-in").addEventListener("click", async () => {

	const url = await getLoginUrl();
	const result = await launchWebAuthFlow(url);
	document.getElementById("user-block").style.display = "block";
	document.getElementById("username").innerHTML = result.account.username;
	document.getElementById("displayname").innerHTML = result.account.name;

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

/*** Makes an http request to the MS graph Me endpoint*/
async function callGraphMeEndpoint() {
	const {
		accessToken
	} = await acquireToken({
		scopes: [ 'api://nxutestadmin/user_impersonation'],
		account: msalInstance.getAllAccounts()[0]
	})

	return callMSGraph("https://graph.microsoft.com/v1.0/me", accessToken);
}

/*** Makes an http request to the given MS graph endpoint*/
async function callMSGraph(endpoint, accessToken) {
	const headers = new Headers();
	const bearer = `Bearer ${accessToken}`;

	headers.append("Authorization", bearer);

	const options = {
		method: "GET",
		headers
	};

	return fetch(endpoint, options)
		.then(response => response.json())
		.then(json => {
			localStorage.setItem('info', json);
		})
		.catch(error => console.log(error));
}

/*** Attempts to silent acquire an access token, falling back to interactive.*/
const anotherTokenRequest = {
	scopes: [ "api://nxutestadmin/user_impersonation" ]
}
async function acquireToken(acquireToken) {
	return msalInstance.acquireTokenSilent(anotherTokenRequest)
		.then((request) => {
			return anotherTokenRequest.accessToken;
		})
		.catch(async (error) => {
			console.error(error);
			const acquireTokenUrl = await getAcquireTokenUrl(request);
			return launchWebAuthFlow(acquireTokenUrl);
		})
}

/** Generates an acquire token url */
async function getAcquireTokenUrl(request) {
	return new Promise((resolve, reject) => {
		msalInstance.acquireTokenRedirect({
			...request,
			onRedirectNavigate: (url) => {
				resolve(url);
				return false;
			}
		}).catch(reject);
	});
}

/**
 * Launch the Chromium web auth UI.
 * @param {*} url AAD url to navigate to.
 * @param {*} interactive Whether or not the flow is interactive
 */
let msalLoading = true;
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
						msalLoading = false;
						if (result) {
							// If result is truthy, your app returned from a redirect operation,// and it completed successfully
							document.getElementById("username").innerHTML = result.account.username;
							document.getElementById("displayname").innerHTML = result.account.name;
							localStorage.setItem('userGrader', result.account.username);
							localStorage.setItem('token', result.accessToken);
							chrome.storage.local.set({ 'token': result.accessToken }, function() {});
							//this token its wrong token for the api call ?
							getBearerToken();

							//test getBearerToken for api call msalInstance.acquireTokenSilent(tokenRequest)
							// write here in localstorage token
							// chrome.runtime.sendMessage({ type: "LOGIN" }, function() {});
							document.getElementById("user-block").style.display = "block";
						} else {
							console.log('not Loading msal ');
							localStorage.removeItem('userGrader');
							localStorage.removeItem('token');
							chrome.storage.local.remove('token', function() {});
						}
					}).catch(reject)
			} else {
				// Logout calls
				localStorage.removeItem('userGrader');
				localStorage.removeItem('token');
				document.getElementById("user-block").style.display = "none";
				resolve();
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
			scopes: ["user.read"],
			// scopes: [ "api://nxutestadmin/user_impersonation" ] // from admin-ui test and this and this
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

// function isUserSignIn () {
// 	   	    return new Promise(resolve => {
// 		        chrome.storage.local.get('userSignIn', function (response) {
// 					if(crome.runtime.lastError) resolve({userSignIn: false})
// 		        })
// 	        })
// 	   }





//TODO:
//fix show icon plugin just on the learnstg
//fix auth problems somehtings work  not form first time autentification
// call api

// how trigger start time grading ?






