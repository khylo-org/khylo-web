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

    // The address people open Khylo at in a browser (this same web app)
    const link = view.querySelector('.khyloServerAddress');
    if (link) {
        link.href = window.location.origin + window.location.pathname;
        link.textContent = window.location.host;
    }
}
