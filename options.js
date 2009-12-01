function elt(root, id) { return root.getElementById(id); }

function restore() {
    elt(document, 'munge').checked = (localStorage['mungeLinks'] == 'true');

    var nurls = 0;
    for (var k in localStorage) {
        if (k.match(/^http:/)) {
            nurls++;
            var tr = document.createElement('tr');
            var info = JSON.parse(localStorage[k]);
            tr.innerHTML = '<td>' + k + '</td><td><a href="' +
                info['long-url'] + '">' +
                (info.title ? info.title : info['long-url'].split('/').pop()) +
                '</a></td>';
            elt(document, 'urldetail').appendChild(tr);
        }
    }
    elt(document, 'nurls').innerHTML = nurls;

    if (localStorage['services']) {
        var services = JSON.parse(localStorage['services']);
        var nsvcs = 0;
        for (var k in services) {
            nsvcs++;
            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + services[k].domain + '</td><td>' +
                (services[k].regex ? services[k].regex : '') + '</td>';
            elt(document, 'svcdetail').appendChild(tr);
        }
        elt(document, 'nsvcs').innerHTML = nsvcs;
    }

    var exp = localStorage['servicesExpire'];
    elt(document, 'svcstatus').innerHTML = exp ? 'cached until ' +
        new Date(+exp) : 'not cached';
}

function setMunge(checked) {
    localStorage['mungeLinks'] = checked;
}

function clearUrls() {
    for (var k in localStorage) {
        if (k.match(/^http:/))
            localStorage.removeItem(k);
    }
}

function fetchServices() {
    /* Implement this for real (i.e. send a message to the background
     * script, wait for it to xhr) later. */
    localStorage.removeItem('services');
    localStorage.removeItem('servicesExpire');
}
