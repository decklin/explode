/* I hate repeating myself. */

HTMLCollection.prototype.eltEach = function(f) {
    for (var i = 0; i < this.length; i++) f(this[i]);
}

/* Just create a ton of closures. The background script will only hold on
 * to the ones representing shortened URLs. This saves us from having to
 * track which tab a request came from or doing any more DOM searching. */

document.links.eltEach(function(a) {
    chrome.extension.sendRequest({url: a.href}, function(resp) {
        a.href = resp['long-url'];
        if (resp.mungeUrl && a.textContent == resp.mungeUrl)
            a.textContent = resp['long-url'];
        if (resp.title && !a.title)
            a.title = resp.title;
    });
});
