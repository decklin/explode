function elt(root, id) { return root.getElementById(id); }

function restore() {
    elt(document, 'munge').checked = (localStorage['mungeLinks'] == 'true');

    var nurls = 0;
    for (var k in localStorage) {
        if (k.match(/^http:/)) {
            nurls++;
            var tr = document.createElement('tr');
            var info = JSON.parse(localStorage[k]);
            tr.innerHTML = '<td>' + k + '</td>' +
                '<td><a href="' + info.longUrl + '">' +
                (info.title ? info.title : info.longUrl.split('/').pop()) +
                '</a></td>';
            elt(document, 'urldetail').appendChild(tr);
        }
    }
    elt(document, 'nurls').innerHTML = nurls;

    if (localStorage['services']) {
        var services = JSON.parse(localStorage['services']);
        var nsvcs = 0, svctext = '';
        for (var k in services) {
            nsvcs++;
            svctext += services[k].domain +
                (services[k].regex ? ' ('+services[k].regex+')': '') + ', ';
        }
        elt(document, 'nsvcs').innerHTML = nsvcs;
        elt(document, 'svctext').innerHTML = svctext;
    }

    var exp = localStorage['servicesExpire'];
    elt(document, 'svcstatus').innerHTML = exp ? 'cached until ' +
        new Date(+exp) : 'will be reloaded on use';

    if (localStorage['extraServices'])
        elt(document, 'extras').innerHTML = localStorage['extraServices'];
}

function setMunge(checked) {
    localStorage['mungeLinks'] = checked;
}

function setExtraServices(hostnames) {
    localStorage['extraServices'] = hostnames;
}

function clearUrls() {
    for (var k in localStorage) {
        if (k.match(/^http:/))
            localStorage.removeItem(k);
    }
}

function clearServices() {
    localStorage.removeItem('services');
    localStorage.removeItem('servicesExpire');
}
