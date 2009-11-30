const USER_AGENT = 'Explode/0.3';
const API_ROOT = 'http://api.longurl.org/v2/';
const FETCH_DELAY = 1000;
const SERVICES_CACHE_TIME = 86400 * 1000;
const EXTRA_SERVICES = ['j.mp', 'flic.kr', 'w33.us'];

var services = {};
var outstandingReqs = [];
var curReq = null;

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
    var url = API_ROOT + method + '?format=json&user-agent=' +
        encodeURIComponent(USER_AGENT);
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

chrome.extension.onRequest.addListener(function(req, sender, callback) {
    req.callback = callback;
    if (localStorage[req.url]) {
        console.log('cached: ' + req.url);
        sendDone(req);
    } else {
        if (isShortenedUrl(req.url)) {
            console.log('new: ' + req.url);
            outstandingReqs.push(req);
            fetchReqs();
        }
    }
});

function isShortenedUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    var svc = services[a.hostname];
    return svc ? (svc.regex ? svc.regex.match(url) : true) : false;
}

function fetchReqs() {
    if (curReq || outstandingReqs.length == 0)
        return;
    curReq = outstandingReqs.shift();
    if (localStorage[curReq.url]) {
        fetchNextReq();
    } else {
        xhrGet(apiUrl('expand', {title: 1, url: curReq.url}), function(xhr) {
            try {
                var resp = JSON.parse(xhr.responseText);
                if (resp['long-url']) {
                    localStorage[curReq.url] = xhr.responseText;
                    sendDone(curReq);
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

function sendDone(req) {
    req.callback(JSON.parse(localStorage[req.url]));
}
