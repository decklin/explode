const USER_AGENT = 'Explode/0.1';
const API_ROOT = 'http://api.longurl.org/v2/';
const FETCH_DELAY = 1000;
const SERVICES_CACHE_TIME = 86400 * 1000;
const EXTRA_SERVICES = ['j.mp', 'flic.kr', 'w33.us'];

var services = {};
var outstandingUrls = [];
var currentUrl = null;

/* An overly-simple XMLHttpRequest wrapper */

function xhrGet(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function(resp) {
        if (xhr.readyState == 4)
            callback(xhr);
    };
    xhr.send();
}

function apiUrl(method, params) {
    var url = API_ROOT + method + '?format=json&user-agent=Explode%2F0.1';
    for (k in params)
        url += '&' + k + '=' + encodeURIComponent(params[k]);
    return url;
}

function loadCachedServices() {
    services = JSON.parse(localStorage['services']);
    EXTRA_SERVICES.forEach(function(s) {
        services[s] = {host: s, regex: null};
    });
}

if (localStorage['services'] && Date.now() < localStorage['servicesExpire']) {
    loadCachedServices();
} else {
    xhrGet(apiUrl('services'), function(xhr) {
        var date = Date.parse(xhr.getResponseHeader('Date'));
        localStorage['servicesExpire'] = date + SERVICES_CACHE_TIME;
        localStorage['services'] = xhr.responseText;
        loadCachedServices();
    });
}

chrome.extension.onConnect.addListener(function(port) {
    switch (port.name) {
    case 'explodeUrlRequest':
        port.onMessage.addListener(handleReq);
        break;
    }
});

function handleReq(msg) {
    if (localStorage[msg.url]) {
        console.log('cached: ' + msg.url);
        sendDone(msg.url);
    } else {
        var a = document.createElement('a');
        a.href = msg.url;
        if (services[a.hostname]) {
            console.log('new: ' + msg.url);
            outstandingUrls.push(msg.url);
            fetchUrls();
        }
    }
}

function fetchUrls() {
    if (currentUrl || outstandingUrls.length == 0)
        return;
    currentUrl = outstandingUrls.shift();
    if (localStorage[currentUrl]) {
        fetchNextUrl();
    } else {
        xhrGet(apiUrl('expand', {title: 1, url: currentUrl}), function(xhr) {
            localStorage[currentUrl] = xhr.responseText;
            sendDone(currentUrl);
            fetchNextUrl();
        });
    }
}

function fetchNextUrl() {
    currentUrl = null;
    setTimeout(fetchUrls, FETCH_DELAY);
}

function sendDone(url) {
    chrome.tabs.getSelected(null, function(tab) {
        var port = chrome.tabs.connect(tab.id, {name: 'explodeUrlDone'});
        var msg = JSON.parse(localStorage[url]);
        msg['url'] = url;
        port.postMessage(msg);
    });
}
