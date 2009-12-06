const USER_AGENT = 'Explode/0.5';
const API_ROOT = 'http://api.longurl.org/v2/';
const FETCH_DELAY = 800;
const SERVICES_CACHE_TIME = 86400 * 1000;

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
    var services = JSON.parse(localStorage['services']);
    if (localStorage['extraServices']) {
        localStorage['extraServices'].split(' ').forEach(function(s) {
            services[s] = {host: s, regex: null};
        });
    }
    return services;
}

chrome.extension.onRequest.addListener(function(req, sender, callback) {
    if (req.servicesPlease) {
        if (localStorage['servicesExpire'] > Date.now()) {
            callback({services: loadCachedServices()});
        } else {
            xhrGet(apiUrl('services'), function(xhr) {
                var date = Date.parse(xhr.getResponseHeader('Date'));
                localStorage['services'] = xhr.responseText;
                localStorage['servicesExpire'] = date + SERVICES_CACHE_TIME;
                callback({services: loadCachedServices()});
            });
        }
    }
});

/* Handle a bunch of requests from the content script. We stuff the
 * callback into req so we can pull it out later. All the requests
 * should finish coming in almost immediately, at which point the first
 * req's XHR will be running and the rest will be queued up. */

chrome.extension.onConnect.addListener(function (port) {
    switch (port.name) {
    case 'explodeUrlRequest':
        port.onMessage.addListener(function (req) {
            handleReq(req, port);
        });
    }
});

function handleReq(req, port) {
    if (localStorage[req.url]) {
        console.log('cached: ' + req.url);
        updateLink({url: req.url, port: port});
    } else {
        console.log('new: ' + req.url);
        port.postMessage({url: req.url, loading: true});
        outstandingReqs.push({url: req.url, port: port});
        fetchReqs();
    }
}

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
            var res = loadResponse(xhr.responseText);
            if (res) {
                localStorage[curReq.url] = JSON.stringify(res);
                updateLink(curReq);
            } else {
                curReq.port.postMessage({url: curReq.url, failed: true});
            }
            fetchNextReq();
        });
    }
}

function fetchNextReq() {
    curReq = null;
    setTimeout(fetchReqs, FETCH_DELAY);
}

function normalize(s) {
    var textarea = document.createElement('textarea');
    if (s) textarea.innerHTML = s.replace(/\s+/g, ' ');
    return textarea.value;
}

function loadResponse(t) {
    try {
        var res = JSON.parse(t);
        if (res['long-url']) {
            return { longUrl: res['long-url'], title: normalize(res.title) };
        } else {
            console.log('error: ' + t);
        }
    } catch (e) {
        console.log('no reply: ' + curReq.url);
    }
    return null;
}

/* And here's where we actually invoke the callback once the URL and
 * title come back from LongURL. */

function updateLink(req) {
    var info = JSON.parse(localStorage[req.url]);
    info.url = req.url;
    info.munge = localStorage['mungeLinks'] == 'true';
    req.port.postMessage(info);
}
