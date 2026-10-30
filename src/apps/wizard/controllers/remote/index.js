import loading from 'components/loading/loading';
import { ServerConnections } from 'lib/khylo-apiclient';
import Dashboard from 'utils/dashboard';

import 'elements/khylo-checkbox/khylo-checkbox';
import 'elements/khylo-button/khylo-button';
import 'elements/khylo-select/khylo-select';

function save(page) {
    loading.show();
    const apiClient = ServerConnections.currentApiClient();
    const config = {
        EnableRemoteAccess: page.querySelector('#chkRemoteAccess').checked
    };

    apiClient.ajax({
        type: 'POST',
        data: JSON.stringify(config),
        url: apiClient.getUrl('Startup/RemoteAccess'),
        contentType: 'application/json'
    }).then(function () {
        loading.hide();
        navigateToNextPage();
    });
}

function navigateToNextPage() {
    Dashboard.navigate('wizard/khylo');
}

function onSubmit(e) {
    save(this);
    e.preventDefault();
    return false;
}

export default function (view) {
    view.querySelector('.wizardSettingsForm').addEventListener('submit', onSubmit);
    view.addEventListener('viewshow', function () {
        document.querySelector('.skinHeader').classList.add('noHomeButtonHeader');

        // The address apps on the home network can use
        const apiClient = ServerConnections.currentApiClient();
        apiClient.getJSON(apiClient.getUrl('System/Info/Public')).then(function (info) {
            if (!info?.LocalAddress) return;
            view.querySelector('.khyloLocalAddress').textContent = info.LocalAddress;
            view.querySelector('.khyloHomeAddress').hidden = false;
        }).catch(function () { /* the tip is optional */ });
    });
    view.addEventListener('viewhide', function () {
        document.querySelector('.skinHeader').classList.remove('noHomeButtonHeader');
    });
}
