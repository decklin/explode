const FETCH_DELAY = 1000;
var outstandingUrls = [];
var currentUrl = null;

function elts(root, t) { return root.getElementsByTagName(t); }

/* Ah, irony. */

NodeList.prototype.eltEach = function(f) {
    for (var i = 0; i < this.length; i++) f(this[i]);
}

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

/* The services list seems to be incomplete, so prefill with my
 * favorites for now. Fetch it on init so we can pick up any new
 * additions. */

var services = {
    'j.mp': true,
    'flic.kr': true
};

xhrGet('http://api.longurl.org/v2/services', function(xhr) {
    elts(xhr.responseXML, 'service').eltEach(function(s) {
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
    if (currentUrl || outstandingUrls.length == 0)
        return;
    currentUrl = outstandingUrls.shift();
    if (!localStorage[currentUrl]) {
        xhrGet(expanderUrl(currentUrl), function(xhr) {
            try {
                localStorage[currentUrl] = JSON.stringify({
                    longUrl: elts(xhr.responseXML, 'long-url')[0].textContent,
                    title: elts(xhr.responseXML, 'title')[0].textContent
                });
                sendDone(currentUrl);
            } catch (e) {
                console.log('error: ' + currentUrl);
            }
            currentUrl = null;
            setTimeout(fetchUrls, FETCH_DELAY);
        });
    } else {
        currentUrl = null;
        setTimeout(fetchUrls, FETCH_DELAY);
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
