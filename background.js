const FETCH_DELAY = 1000;
var outstandingUrls = [];
var currentUrl = null;

/* Ah, irony. */

NodeList.prototype.eltEach = function(f) {
    for (var i = 0; i < this.length; i++) f(this[i]);
}

/* An overly-simple XMLHttpRequest wrapper */

function xhrGet(url, callback) {
    var xhr = new XMLHttpRequest();
    console.log('xhr: ' + url);
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function(resp) {
        if (xhr.readyState == 4)
            callback(xhr);
    };
    xhr.send();
}

/* The services list seems to be incomplete, so prefill with my
 * favorites for now. Fetch it on init so we can pick up any new
 * additions. */

var services = {
    'j.mp': true,
    'flic.kr': true
};

xhrGet('http://api.longurl.org/v2/services', function(xhr) {
    xhr.responseXML.getElementsByTagName('service').eltEach(function(s) {
        services[s.textContent] = true;
    });
});

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
    } else if (services[hostForUrl(msg.url)]) {
        console.log('new: ' + msg.url);
        outstandingUrls.push(msg.url);
        fetchUrls();
    }
}

function hostForUrl(url) {
    var a = document.createElement('a');
    a.href = url;
    return a.hostname;
}

function expanderUrl(url) {
    return 'http://api.longurl.org/v2/expand?user-agent=Explode%2F0.1' +
        '&title=1&url=' + url;
}

function fetchUrls() {
    if (!currentUrl && outstandingUrls.length > 0) {
        currentUrl = outstandingUrls.shift();
        var url = currentUrl;
        xhrGet(expanderUrl(url), function(xhr) {
            localStorage[url] = JSON.stringify({
                longUrl: xhr.responseXML.
                    getElementsByTagName('long-url')[0].textContent,
                title: xhr.responseXML.
                    getElementsByTagName('title')[0].textContent
            });
            sendDone(url);
            currentUrl = null;
            setTimeout(fetchUrls, FETCH_DELAY);
        });
    }
}

function sendDone(url) {
    chrome.tabs.getSelected(null, function(tab) {
        var port = chrome.tabs.connect(tab.id, {name: 'explodeUrlDone'});
        var info = JSON.parse(localStorage[url]);
        port.postMessage({
            url: url,
            longUrl: info.longUrl,
            title: info.title
        });
    });
}
