function restore() {
    var nurls = 0;
    for (var k in localStorage) {
        if (k.match(/^http:/)) {
            nurls++;
            var tr = document.createElement('tr');
            var info = JSON.parse(localStorage[k]);
            tr.innerHTML = '<td>' + k + '</td><td><a href="' +
                info['long-url'] + '">' + info.title + '</a></td>';
            document.getElementById('urldetail').appendChild(tr);
        }
    }
    document.getElementById('nurls').innerHTML = nurls;

    if (localStorage['services']) {
        var services = JSON.parse(localStorage['services']);
        var nsvcs = 0;
        for (var k in services) {
            nsvcs++;
            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + services[k].domain + '</td><td>' +
                services[k].regex + '</td>';
            document.getElementById('svcdetail').appendChild(tr);
        }
        document.getElementById('nsvcs').innerHTML = nsvcs;
    }

    var exp = localStorage['servicesExpire'];
    document.getElementById('svcstatus').innerHTML =
        exp ? 'cached until ' + new Date(+exp) : 'not cached';
}
