const USER_AGENT = 'Explode/0.4';
const API_ROOT = 'http://api.longurl.org/v2/';
const FETCH_DELAY = 800;
const SERVICES_CACHE_TIME = 86400 * 1000;
const EXTRA_SERVICES = ['j.mp', 'flic.kr', 'w33.us', 'guao.cc', 'jan.io'];

var services = {};
var outstandingReqs = [];
var curReq = null;

/* Functions for dealing with the LongURL API */

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
    var url = API_ROOT + method + '?format=json&user-agent=' +
        encodeURIComponent(USER_AGENT);
    for (k in params)
        url += '&' + k + '=' + encodeURIComponent(params[k]);
    return url;
}

/* Setup the service list; fetch and cache again if needed */

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

/* Handle a bunch of requests from the content script. We stuff the
 * callback into req so we can pull it out later. All the requests
 * should finish coming in almost immediately, at which point the first
 * req's XHR will be running and the rest will be queued up. */

function isShortenedUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    var svc = services[a.hostname];
    return svc ? (svc.regex ? svc.regex.match(url) : true) : false;
}

chrome.extension.onRequest.addListener(function(req, sender, callback) {
    req.callback = callback;
    if (localStorage[req.url]) {
        console.log('cached: ' + req.url);
        updateLink(req);
    } else {
        if (isShortenedUrl(req.url)) {
            console.log('new: ' + req.url);
            outstandingReqs.push(req);
            fetchReqs();
        }
    }
});

/* The main loop, so to speak. */

function fetchReqs() {
    if (curReq || outstandingReqs.length == 0)
        return;
    curReq = outstandingReqs.shift();
    if (localStorage[curReq.url]) {
        updateLink(curReq);
        fetchNextReq();
    } else {
        xhrGet(apiUrl('expand', {title: 1, url: curReq.url}), function(xhr) {
            try {
                var resp = JSON.parse(xhr.responseText);
                if (resp['long-url']) {
                    localStorage[curReq.url] = xhr.responseText;
                    updateLink(curReq);
                }
            } catch (e) {
                console.log('error: ' + curReq.url);
            }
            fetchNextReq();
        });
    }
}

function fetchNextReq() {
    curReq = null;
    setTimeout(fetchReqs, FETCH_DELAY);
}

/* And here's where we actually invoke the callback once the URL and
 * title come back from LongURL. */

function updateLink(req) {
    var info = JSON.parse(localStorage[req.url]);
    if (localStorage['mungeLinks'] == 'true') info.mungeUrl = req.url;
    req.callback(info);
}
