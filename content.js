console.log('content script starting');

// chrome.storage.local.get('tabId', function (result) {
// 	const tabId = result.tabId;
// 	console.log('tabid', tabId, result );
// });

chrome.storage.local.remove('Grading');

window.addEventListener('click', function (e) {
	if (e.target.tagName == "A" && e.target.classList.toString().indexOf('save-thread-comment') > -1) {
		chrome.storage.local.set({ 'Grading': 'end' }, function() {});
		chrome.runtime.sendMessage({ type: "GRADING_END" }, response => console.log('success',response));
		//send messafg from the page to the bg thats grading end and send api call to backend;
		console.log('grading end from the web page/ clicked "comment" button');
	}
	else if (e.target.tagName == "A" && e.target.name == 'commit' && e.target.classList.toString().indexOf('disabled') === -1) {

		chrome.storage.local.set({ 'Grading': 'end' }, function() {});
		chrome.runtime.sendMessage({ type: "GRADING_END" }, response => console.log('success',response));
		//send messafg from the page to the bg thats grading end and send api call to backend;
		console.log('grading end from the web page / cliked "save" botton');
	}

}, false);




//fix error Extension context invalidated
var port;
// Attempt to reconnect
var reconnectToExtension = function () {
	// Reset port
	port = null;
	// Attempt to reconnect after 1 second
	setTimeout(connectToExtension, 1000 * 1);
};
// Attempt to connect
var connectToExtension = function () {
	// Make the connection
	port = chrome.runtime.connect({name: "my-port"});
	// When extension is upgraded or disabled and renabled, the content scripts
	// will still be injected, so we have to reconnect them.
	// We listen for an onDisconnect event, and then wait for a second before
	// trying to connect again. Becuase chrome.runtime.connect fires an onDisconnect
	// event if it does not connect, an unsuccessful connection should trigger
	// another attempt, 1 second later.
	port.onDisconnect.addListener(reconnectToExtension);

};
// Connect for the first time
connectToExtension();





