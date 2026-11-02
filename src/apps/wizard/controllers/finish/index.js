import loading from 'components/loading/loading';
import { ServerConnections } from 'lib/khylo-apiclient';

function onFinish() {
    loading.show();
    const apiClient = ServerConnections.currentApiClient();
    apiClient.ajax({
        url: apiClient.getUrl('Startup/Complete'),
        type: 'POST'
    }).then(function () {
        loading.hide();
        window.location.href = '';
    });
}

export default function (view) {
    view.querySelector('.btnWizardNext').addEventListener('click', onFinish);

    // The address people open Khylo at in a browser: this computer's address on the home network, not 127.0.0.1
    const link = view.querySelector('.khyloServerAddress');
    if (link) {
        link.href = window.location.origin + window.location.pathname;
        link.textContent = window.location.host;

        const apiClient = ServerConnections.currentApiClient();
        apiClient.getJSON(apiClient.getUrl('System/Info/Public')).then(function (info) {
            if (!info?.HomeAddress) return;
            link.href = info.HomeAddress + window.location.pathname;
            link.textContent = info.HomeAddress.replace(/^https?:\/\//, '');
        }).catch(function () { /* the address on this page still works on this computer */ });
    }
}
