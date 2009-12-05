function elts(root, t) { return root.getElementsByTagName(t); }
function each(list, f) { for (var i = 0; i < list.length; i++) f(list[i]); }

/* All we send over the port is the URL; the background page decides if
 * it needs expansion. */

var port = chrome.extension.connect({name: 'explodeUrlRequest'});

function reqLinks(root) {
    each(elts(root, 'a'), function(a) {
        port.postMessage({url: a.href});
    });
}

/* Must do that once on init and again when a new node is inserted (e.g.
 * twitter.com AJAX updates) */

reqLinks(document);

document.body.addEventListener('DOMNodeInserted', function(ev) {
    if (ev.srcElement.nodeType != 3)
        reqLinks(ev.srcElement);
});

function clean(s) {
    return s ? s.replace(/\s+/g, ' ') : null;
}

port.onMessage.addListener(function (msg) {
    each(elts(document, 'a'), function (a) {
        if (a.href == msg.url) {
            if (msg.loading) {
                a.origTitle = a.title;
                a.title = 'Loading URL...';
            } else {
                a.href = msg['long-url'];
                a.title = a.origTitle || clean(msg.title);
                if (msg.munge && a.textContent == msg.url)
                    a.textContent = msg['long-url'];
            }
        }
    });
});
