/* I hate repeating myself. */

HTMLCollection.prototype.eltEach = function(f) {
    for (var i = 0; i < this.length; i++) f(this[i]);
}

/* Pass every URL over; the background script decides which to
 * process. */

var port = chrome.extension.connect({name: 'explodeUrlRequest'});

document.links.eltEach(function(a) {
    port.postMessage({url: a.href});
});

/* Return messages only include short/long URLs, not which nodes they
 * came from -- so if there are more than one link on the page
 * pointing to the URL we just expanded, both will be updated. */

chrome.extension.onConnect.addListener(function(port) {
    switch (port.name) {
    case 'explodeUrlDone':
        port.onMessage.addListener(updateLinks);
        break;
    }
});

function updateLinks(msg) {
    document.links.eltEach(function(a) {
        if (a.href == msg.url) {
            a.href = msg.longUrl;
            a.title = msg.title;
        }
    });
}
