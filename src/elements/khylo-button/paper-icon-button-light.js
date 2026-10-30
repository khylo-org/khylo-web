import layoutManager from '../../components/layoutManager';
import './khylo-button.scss';
import 'webcomponents.js/webcomponents-lite';

const KhyloButtonPrototype = Object.create(HTMLButtonElement.prototype);

KhyloButtonPrototype.createdCallback = function () {
    this.classList.add('paper-icon-button-light');

    if (layoutManager.tv) {
        this.classList.add('show-focus');
    }
};

document.registerElement('paper-icon-button-light', {
    prototype: KhyloButtonPrototype,
    extends: 'button'
});
