/* My crappy XMLHttpRequest wrapper */

function xhrget(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function(resp) {
        if (xhr.readyState == 4)
            callback(xhr);
    }
    xhr.send();
}

/* The services list seems to be incomplete, so prefill for now */

var services = {'j.mp': true};
var cache = {};

/* Load the list of services supported by LongURL */

xhrget("http://api.longurl.org/v2/services", function(xhr) {
    ss = xhr.responseXML.getElementsByTagName('service');
    for (var i = 0; i < ss.length; i++) {
        services[ss.item(i).textContent] = true;
    }
});

chrome.extension.onConnect.addListener(function(port) {
    switch (port.name) {
    case "explodeUrlRequest":
        port.onMessage.addListener(handleReq);
        break;
    }
});

function handleReq(msg) {
    if (!isSupported(msg.url))
        return;
    sendLoading(msg.url);
    if (cache[msg.url]) {
        console.log("in cache: " + msg.url);
        sendDone(msg.url);
    } else {
        console.log("requesting: " + msg.url);
        xhrget(expanderUrl(msg.url), function(xhr) {
            cache[msg.url] = {
                longUrl: xhr.responseXML.
                    getElementsByTagName('long-url')[0].textContent,
                title: xhr.responseXML.
                    getElementsByTagName('title')[0].textContent
            }
            sendDone(msg.url);
        });
    }
}

function isSupported(url) {
    var a = document.createElement("a");
    a.href = url;
    return services[a.hostname];
}

function expanderUrl(url) {
    return "http://api.longurl.org/v2/expand?user-agent=Explode%2F0.1" +
        "&title=1&url=" + url;
}

function sendLoading(url) {
    chrome.tabs.getSelected(null, function(tab) {
        var port = chrome.tabs.connect(tab.id, {name: "explodeUrlLoading"});
        port.postMessage({url: url});
    });
}

function sendDone(url) {
    chrome.tabs.getSelected(null, function(tab) {
        var port = chrome.tabs.connect(tab.id, {name: "explodeUrlDone"});
        port.postMessage({
            url: url,
            longUrl: cache[url].longUrl,
            title: cache[url].title
        });
    });
}
