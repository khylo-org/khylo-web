import KhyloProgressRing from '../khylo-progressring/khylo-progressring';
import dom from '../../utils/dom';
import { ServerConnections } from 'lib/khylo-apiclient';
import { OutboundWebSocketMessageType } from '@khylo/sdk/lib/websocket';

import 'webcomponents.js/webcomponents-lite';

function onRefreshProgress(indicator, info) {
    if (!indicator.itemId) {
        indicator.itemId = dom.parentWithAttribute(indicator, 'data-id').getAttribute('data-id');
    }

    if (info?.ItemId === indicator.itemId) {
        const progress = parseFloat(info.Progress);

        if (progress && progress < 100) {
            indicator.classList.remove('hide');
        } else {
            indicator.classList.add('hide');
        }

        indicator.dataset.progress = progress;
    }
}

const KhyloItemRefreshIndicatorPrototype = Object.create(KhyloProgressRing);

KhyloItemRefreshIndicatorPrototype.createdCallback = function () {
    // base method
    if (KhyloProgressRing.createdCallback) {
        KhyloProgressRing.createdCallback.call(this);
    }

    const handler = ({ Data }) => onRefreshProgress(this, Data);

    const serverId = dom.parentWithAttribute(this, 'data-serverid')?.getAttribute('data-serverid');
    const apiClient = serverId ? ServerConnections.getApiClient(serverId) : ServerConnections.currentApiClient();
    this._wsUnsubscribers = [];
    if (apiClient) {
        this._wsUnsubscribers.push(apiClient.subscribe([OutboundWebSocketMessageType.RefreshProgress], handler));
    }
};

KhyloItemRefreshIndicatorPrototype.attachedCallback = function () {
    // base method
    if (KhyloProgressRing.attachedCallback) {
        KhyloProgressRing.attachedCallback.call(this);
    }
};

KhyloItemRefreshIndicatorPrototype.detachedCallback = function () {
    // base method
    if (KhyloProgressRing.detachedCallback) {
        KhyloProgressRing.detachedCallback.call(this);
    }

    this._wsUnsubscribers?.forEach(unsub => {
        unsub();
    });
    this._wsUnsubscribers = [];

    this.itemId = null;
};

document.registerElement('khylo-itemrefreshindicator', {
    prototype: KhyloItemRefreshIndicatorPrototype,
    extends: 'div'
});
