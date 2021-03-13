console.log('running background.js');

chrome.runtime.onConnect.addListener(port => {});

function GetParams(pageUrl) { //assigmentId  and studentId I get from the url
		if(pageUrl && pageUrl.includes('teacher_dropbox_assignment/grade')) {
			const assigmentId =  pageUrl.substring(pageUrl.lastIndexOf('/') + 1, pageUrl.indexOf('?'));
			const studentParamFromUrl = pageUrl.split('student=')[1].toString();
			const studentId = studentParamFromUrl.substring(0, studentParamFromUrl.indexOf('&'));

			const pageInfo = {
					studentId: studentId,
					assigmentId: assigmentId
			};
			console.log('page info', pageInfo)
			return pageInfo;
		}
		else {
		}
}
// GetParams();

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
	chrome.storage.local.get('Grading', (result) => console.log('get grading end', result));
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(tab.url && tab.url.includes('teacher_dropbox_assignment/grade') && changeInfo.status === 'complete') {
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			// console.log('tabs',tabs);
				if(tabs[0].id) {
					chrome.tabs.executeScript(tabs[0].id, {
						file: 'content.js',
						runAt: 'document_start'
					},() => {console.log('content.js is injected when update page')});
				}
		});
		//TODO: start api call for start grading
		// test response works good
		console.log('start grading call when user come to the page teacher_dropbox_assignment/grade');
		fetch('https://jsonplaceholder.typicode.com/todos/1')
			.then(response => response.json())
			.then(json => console.log(json))
			.catch(error => console.error('error:', error));
	}
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (!sender) {
		return;
	}
	// console.log('message', message, sender, sendResponse, );
	// console.log('sender url',  sender.url);

	switch (message.type) {
		case "GRADING_END":
			console.log('gragind end in bg');
			chrome.storage.local.set({ 'Grading': 'end' }, function() { console.log('Value is set'); });

			//test response send when grader cliked on save or comment button? is it right ?
			//send one api call  when user end and send as params start time = const now = new Date();
			try {
				 chrome.storage.local.get('BearerToken', (result) => {
					console.log('chrome.storage.local.gettoken in bg.js', result);
					// const data = GetParams(sender.url); // get from here studentId and AssigmentId

					const data = {
						NeoId: 6903876,
						AssigmentId: 18448372
					}
					fetch("https://admin.qa.nexford.net/api/neo/grading/start", {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${result}`,
						},
						body: JSON.stringify(data),
					}).then(response => response.json())
						.then(json => console.log(json))
						.catch(error => console.error('error:', error));
				});


				// test response works good
				// fetch('https://jsonplaceholder.typicode.com/todos/1')
				// 	.then(response => response.json())
				// 	.then(json => console.log(json))
				// 	.catch(error => console.error('error:', error));

				// sendResponse({message: 'success'});
			} catch (error) {
				console.error('Error:', error)
			}
			break;
		case "GRADING_START":
			//
			break;
		default:
			console.error("Unrecognised message: ", message);
			break;
	}
});


function listenOnExtensionStarted() {
	// Called when the user clicks on the browser action.
	chrome.browserAction.onClicked.addListener(() => {
		// get current active tab
		chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
			// create a new tab with current active tab url
			chrome.tabs.create({url: tabs[0].url}, (tab) => {
				// inject script to new created tab, start tracking javascript
				chrome.tabs.executeScript(tab.id, {
					file: 'content.js',
					runAt: 'document_end'
				})
			})
		})
	})
}

// listenOnExtensionStarted();


// (function() {
// 	const tabStorage = {};
// 	const networkFilters = {
// 		urls: [
// 			"https://jsonplaceholder.typicode.com/todos/1"
// 		]
// 	};
//
// 	chrome.webRequest.onBeforeRequest.addListener((details) => {
// 		const { tabId, requestId } = details;
// 		if (!tabStorage.hasOwnProperty(tabId)) {
// 			return;
// 		}
//
// 		tabStorage[tabId].requests[requestId] = {
// 			requestId: requestId,
// 			url: details.url,
// 			startTime: details.timeStamp,
// 			status: 'pending'
// 		};
// 		console.log(tabStorage[tabId].requests[requestId]);
// 	}, networkFilters);
//
// 	chrome.webRequest.onCompleted.addListener((details) => {
// 		const { tabId, requestId } = details;
// 		if (!tabStorage.hasOwnProperty(tabId) || !tabStorage[tabId].requests.hasOwnProperty(requestId)) {
// 			return;
// 		}
//
// 		const request = tabStorage[tabId].requests[requestId];
//
// 		Object.assign(request, {
// 			endTime: details.timeStamp,
// 			requestDuration: details.timeStamp - request.startTime,
// 			status: 'complete'
// 		});
// 		console.log(tabStorage[tabId].requests[details.requestId]);
// 	}, networkFilters);
//
// 	chrome.webRequest.onErrorOccurred.addListener((details)=> {
// 		const { tabId, requestId } = details;
// 		if (!tabStorage.hasOwnProperty(tabId) || !tabStorage[tabId].requests.hasOwnProperty(requestId)) {
// 			return;
// 		}
//
// 		const request = tabStorage[tabId].requests[requestId];
// 		Object.assign(request, {
// 			endTime: details.timeStamp,
// 			status: 'error',
// 		});
// 		console.log(tabStorage[tabId].requests[requestId]);
// 	}, networkFilters);
//
// 	chrome.tabs.onActivated.addListener((tab) => {
// 		const tabId = tab ? tab.tabId : chrome.tabs.TAB_ID_NONE;
// 		if (!tabStorage.hasOwnProperty(tabId)) {
// 			tabStorage[tabId] = {
// 				id: tabId,
// 				requests: {},
// 				registerTime: new Date().getTime()
// 			};
// 		}
// 	});
// 	chrome.tabs.onRemoved.addListener((tab) => {
// 		const tabId = tab.tabId;
// 		if (!tabStorage.hasOwnProperty(tabId)) {
// 			return;
// 		}
// 		tabStorage[tabId] = null;
// 	});
// }());
//
