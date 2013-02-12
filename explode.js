function elts(root, t) { return root.getElementsByTagName(t); }
function each(list, f) { for (var i = 0; i < list.length; i++) f(list[i]); }

/* As of 0.6, the content script is responsible for knowing about which
 * services are available. This lets us cut down dramatically on the number
 * of requests sent to the background page (which requests seem to leak
 * memory, as of r33808). */

chrome.extension.sendRequest({servicesPlease: true}, function(res) {
    reqLinks(document, res.services);
    document.body.addEventListener('DOMNodeInserted', function(ev) {
        if (ev.srcElement.nodeType != 3 && ev.srcElement.nodeType != 8)
            reqLinks(ev.srcElement, res.services);
    });
});

/* Open the channel and send stuff over. */

var port = chrome.extension.connect({name: 'explodeUrlRequest'});

function reqLinks(root, services) {
    each(elts(root, 'a'), function(a) {
        if (a.hostname in services &&
                a.href.match(new RegExp(a.hostname+'(/[a-z])?/[^/?#]+$')))
            port.postMessage({url: a.href});
    });
}

/* When we get a message back, update every anchor with a matching href. */

port.onMessage.addListener(function (msg) {
    each(elts(document, 'a'), function (a) {
        if (a.href == msg.url) {
            if (msg.loading && !a.loading) {
                a.loading = true;
                a.origTitle = a.title || null;
                a.title = 'Loading URL...';
            } else if (msg.failed) {
                a.title = 'Error loading URL';
            } else if (msg.longUrl) {
                a.href = msg.longUrl;
                a.title = a.origTitle || msg.title;
                if (msg.munge && a.textContent == msg.url)
                    a.textContent = msg.longUrl;
            }
        }
    });
});
