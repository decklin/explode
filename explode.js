/* My convenience function */

function path_each(path, f) {
    s = document.evaluate(path, document, null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    for (i = 0; node = s.snapshotItem(i); i++)
        f(node);
}

/* Set up our connection to the background page. When a link is hovered
 * over, we send the URL. */

var port = chrome.extension.connect({name: "explodeUrlRequest"});
path_each('//a', function(a) {
    a.addEventListener('mouseover', function() {
        port.postMessage({url: this.href});
    }, false)
});

/* When we get messages back, we either highlight the link to show that
 * it's loading, or change the style back to normal and update it with the
 * expanded URL. Messages only include URLs, not which nodes they came
 * from -- so if there are more than one link on the page pointing to the
 * URL we just expanded, both will be updated. */

chrome.extension.onConnect.addListener(function(port) {
    switch (port.name) {
    case "explodeUrlLoading":
        port.onMessage.addListener(highlightLinks);
        break;
    case "explodeUrlDone":
        port.onMessage.addListener(updateLinks);
        break;
    }
});

function highlightLinks(msg) {
    path_each('//a', function(a) {
        if (a.href == msg.url && !a.exploding) {
            a.appendChild(document.createTextNode("…"));
            a.exploding = true;
        }
    });
}

function updateLinks(msg) {
    path_each('//a', function(a) {
        if (a.href == msg.url) {
            a.exploding = false;
            a.removeChild(a.lastChild);
            a.href = msg.longUrl;
            a.title = msg.title;
        }
    });
}
