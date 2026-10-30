import 'webcomponents.js/webcomponents-lite';

import { appHost } from 'components/apphost';
import layoutManager from 'components/layoutManager';
import { appRouter } from 'components/router/appRouter';
import { AppFeature } from 'constants/appFeature';
import { removeEventListener, addEventListener } from 'utils/dom';
import shell from 'scripts/shell';

import './khylo-button.scss';

const KhyloButtonPrototype = Object.create(HTMLButtonElement.prototype);
const KhyloLinkButtonPrototype = Object.create(HTMLAnchorElement.prototype);

function onAnchorClick(e) {
    const href = this.getAttribute('href') || '';
    if (href !== '#') {
        if (this.getAttribute('target')) {
            if (!appHost.supports(AppFeature.TargetBlank)) {
                e.preventDefault();
                shell.openUrl(href);
            }
        } else {
            e.preventDefault();
            appRouter.show(href);
        }
    } else {
        e.preventDefault();
    }
}

KhyloButtonPrototype.createdCallback = function () {
    if (this.classList.contains('khylo-button')) {
        return;
    }

    this.classList.add('khylo-button');
    // TODO replace all instances of element-showfocus with this method
    if (layoutManager.tv) {
        // handles all special css for tv layout
        // this method utilizes class chaining
        this.classList.add('show-focus');
    }
};

KhyloButtonPrototype.attachedCallback = function () {
    if (this.tagName === 'A') {
        removeEventListener(this, 'click', onAnchorClick, {});
        addEventListener(this, 'click', onAnchorClick, {});

        if (this.getAttribute('data-autohide') === 'true') {
            if (appHost.supports(AppFeature.ExternalLinks)) {
                this.classList.remove('hide');
            } else {
                this.classList.add('hide');
            }
        }
    }
};

KhyloButtonPrototype.detachedCallback = function () {
    removeEventListener(this, 'click', onAnchorClick, {});
};

KhyloLinkButtonPrototype.createdCallback = KhyloButtonPrototype.createdCallback;
KhyloLinkButtonPrototype.attachedCallback = KhyloButtonPrototype.attachedCallback;

document.registerElement('khylo-button', {
    prototype: KhyloButtonPrototype,
    extends: 'button'
});

document.registerElement('khylo-linkbutton', {
    prototype: KhyloLinkButtonPrototype,
    extends: 'a'
});

export default KhyloButtonPrototype;
