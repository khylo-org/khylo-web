import './loading.scss';

let loader: HTMLDivElement | undefined;

function createLoader(): HTMLDivElement {
    const elem = document.createElement('div');
    elem.className = 'docspinner';
    elem.setAttribute('role', 'progressbar');
    elem.setAttribute('aria-label', 'Loading');
    elem.innerHTML = '<span class="docspinner__ring"></span>';

    document.body.appendChild(elem);
    return elem;
}

export function show() {
    if (!loader) {
        loader = createLoader();
    }
    loader.classList.add('docspinner--active');
}

export function hide() {
    if (loader) {
        loader.classList.remove('docspinner--active');
    }
}

const loading = {
    show,
    hide
};

window.Loading = loading;

export default loading;
