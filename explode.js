/* Just create a ton of closures. The background script will only hold on
 * to the ones representing shortened URLs. This saves us from having to
 * track which tab a request came from or doing any more DOM searching. */

function elts(root, t) { return root.getElementsByTagName(t); }
function each(list, f) { for (var i = 0; i < list.length; i++) f(list[i]); }

function reqLinks(root) {
    each(elts(root, 'a'), function(a) {
        chrome.extension.sendRequest({url: a.href}, function(resp) {
            a.href = resp['long-url'];
            if (resp.mungeUrl && a.textContent == resp.mungeUrl)
                a.textContent = resp['long-url'];
            if (resp.title && !a.title)
                a.title = resp.title.replace(/\s+/g, ' ');
        });
    });
}

/* Must do that once on init and again when a new node is inserted (e.g.
 * twitter.com AJAX updates) */

reqLinks(document);

document.body.addEventListener('DOMNodeInserted', function(ev) {
    if (ev.srcElement.nodeType != 3)
        reqLinks(ev.srcElement);
});
