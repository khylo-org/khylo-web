import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';

import { PluginType } from 'constants/pluginType';
import { ServerConnections } from 'lib/khylo-apiclient';
import browser from 'scripts/browser';
import screenSaverManager from 'scripts/screensavermanager';
import TouchHelper from 'scripts/touchHelper';

import loading from '../../components/loading/loading';
import keyboardnavigation from '../../scripts/keyboardNavigation';
import dialogHelper from '../../components/dialogHelper/dialogHelper';
import TableOfContents from './tableOfContents';
import ReaderChrome from './ReaderChrome/ReaderChrome';
import { FONTS, LINE_HEIGHTS, PAPERS, SIDE_MARGINS, announcePosition, loadBookPrefs } from './ReaderChrome/readerPrefs';
import { translateHtml } from '../../lib/globalize';
import Events from '../../utils/events.ts';
import { renderComponent } from '../../utils/reactUtils';

import 'material-design-icons-iconfont';
import '../../elements/khylo-button/paper-icon-button-light';

import html from './template.html';
import './style.scss';

export class BookPlayer {
    constructor() {
        this.name = 'Book Player';
        this.type = PluginType.MediaPlayer;
        this.id = 'bookplayer';
        this.priority = 1;
        this.prefs = loadBookPrefs();
        this.onDialogClosed = this.onDialogClosed.bind(this);
        this.openTableOfContents = this.openTableOfContents.bind(this);
        this.applyPrefs = this.applyPrefs.bind(this);
        this.seekToFraction = this.seekToFraction.bind(this);
        this.previous = this.previous.bind(this);
        this.next = this.next.bind(this);
        this.onWindowKeyDown = this.onWindowKeyDown.bind(this);
        this.addSwipeGestures = this.addSwipeGestures.bind(this);
        this.toggleFullscreen = this.toggleFullscreen.bind(this);
    }

    play(options) {
        this.progress = 0;
        this.cancellationToken = false;
        this.loaded = false;

        screenSaverManager.block();
        loading.show();
        const elem = this.createMediaElement(options);
        // Let Escape close the reader while the book is loading (bindEvents only runs once it has rendered)
        document.addEventListener('keydown', this.onWindowKeyDown);
        return this.setCurrentSrc(elem, options).catch((err) => {
            // Never leave the user stuck behind a spinner: close the reader if the book can't be opened
            if (!this.cancellationToken) {
                this.stop();
            }
            throw err;
        });
    }

    stop() {
        this.unbindEvents();
        this.unmountBookOsd?.();
        this.unmountBookOsd = null;
        screenSaverManager.unblock();

        const stopInfo = {
            src: this.item
        };

        Events.trigger(this, 'stopped', [stopInfo]);

        const elem = this.mediaElement;
        const tocElement = this.tocElement;
        const rendition = this.rendition;

        if (elem) {
            dialogHelper.close(elem);
            this.mediaElement = null;
        }

        if (tocElement) {
            tocElement.destroy();
            this.tocElement = null;
        }

        if (rendition) {
            rendition.destroy();
        }

        // hide loader in case player was not fully loaded yet
        loading.hide();
        this.loaded = false;
        this.cancellationToken = true;
        this.currentSrc = () => null;
    }

    isPlaying() {
        return Boolean(this.mediaElement && this.loaded && !this.cancellationToken);
    }

    destroy() {
        // Nothing to do here
    }

    currentItem() {
        return this.item;
    }

    currentTime() {
        return this.progress * 1000;
    }

    duration() {
        return 1000;
    }

    getBufferedRanges() {
        return [{
            start: 0,
            end: 10000000
        }];
    }

    volume() {
        return 100;
    }

    isMuted() {
        return false;
    }

    paused() {
        return false;
    }

    seekable() {
        return true;
    }

    onWindowKeyDown(e) {
        // Skip modified keys
        if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

        const key = keyboardnavigation.getKeyName(e);

        // Escape must always work, even while a book is still loading
        if (!this.loaded && key !== 'Escape') return;
        switch (key) {
            case 'KeyL':
            case 'ArrowRight':
            case 'Right':
                e.preventDefault();
                this.next();
                break;
            case 'KeyJ':
            case 'ArrowLeft':
            case 'Left':
                e.preventDefault();
                this.previous();
                break;
            case 'Escape':
                e.preventDefault();
                if (this.tocElement) {
                    // Close table of contents on ESC if it is open
                    this.tocElement.destroy();
                } else {
                    // Otherwise stop the entire book player
                    this.stop();
                }
                break;
        }
    }

    addSwipeGestures(element) {
        this.touchHelper = new TouchHelper(element);
        Events.on(this.touchHelper, 'swipeleft', () => this.next());
        Events.on(this.touchHelper, 'swiperight', () => this.previous());
    }

    onDialogClosed() {
        this.stop();
    }

    bindEvents() {
        this.mediaElement?.addEventListener('close', this.onDialogClosed, { once: true });

        document.addEventListener('keydown', this.onWindowKeyDown);
        this.rendition?.on('keydown', this.onWindowKeyDown);
        this.rendition?.on('rendered', (e, i) => this.forwardEvents(i.document));

        if (browser.safari) {
            this.addSwipeGestures(document.querySelector('#bookPlayerContainer'));
        } else {
            this.rendition?.on('rendered', (e, i) => this.addSwipeGestures(i.document.documentElement));
        }
    }

    unbindEvents() {
        document.removeEventListener('keydown', this.onWindowKeyDown);
        this.rendition?.off('keydown', this.onWindowKeyDown);
        this.mediaElement?.removeEventListener('close', this.onDialogClosed);

        if (!browser.safari) {
            this.rendition?.off('rendered', (e, i) => this.addSwipeGestures(i.document.documentElement));
        }

        this.touchHelper?.destroy();
    }

    // ensure certain iframe events are forwarded to the document for BookOsd visibility listeners
    forwardEvents(iframe) {
        // Positions inside the book frame are relative to the frame; the reader controls need screen positions
        const onScreen = (event) => {
            const rect = iframe.defaultView?.frameElement?.getBoundingClientRect();
            return {
                ...event,
                pointerType: event.pointerType,
                clientX: event.clientX + (rect?.left ?? 0),
                clientY: event.clientY + (rect?.top ?? 0)
            };
        };
        // eslint-disable-next-line compat/compat
        iframe.addEventListener('pointermove', (event) => document.dispatchEvent(new PointerEvent(event.type, onScreen(event))));
        // eslint-disable-next-line compat/compat
        iframe.addEventListener('pointerdown', (event) => document.dispatchEvent(new PointerEvent(event.type, onScreen(event))));
        iframe.addEventListener('click', (event) => {
            // Following a link inside the book is not a page turn
            if (event.target?.closest?.('a[href]')) return;
            document.dispatchEvent(new MouseEvent(event.type, onScreen(event)));
        });
    }

    openTableOfContents() {
        if (this.loaded) {
            this.tocElement = new TableOfContents(this);
        }
    }

    /** Paper, font, size, spacing, margins and pages, applied to the book and remembered for next time. */
    applyPrefs(prefs) {
        this.prefs = prefs;
        const paper = PAPERS[prefs.paper];
        const container = this.mediaElement?.querySelector('#bookPlayerContainer');

        if (this.mediaElement) {
            this.mediaElement.style.background = paper.background;
        }
        if (container) {
            container.style.left = SIDE_MARGINS[prefs.margins];
            container.style.right = SIDE_MARGINS[prefs.margins];
            container.style.width = 'auto';
        }

        if (!this.loaded || !this.rendition) return;

        const font = FONTS[prefs.font].css;
        const textRules = {
            'font-size': '1rem !important',
            'line-height': `${LINE_HEIGHTS[prefs.spacing]} !important`
        };
        if (font) textRules['font-family'] = `${font} !important`;

        const rules = {
            'html': {
                'font-size': `${Math.round(16 * prefs.fontScale)}px !important`,
                'background': `${paper.background} !important`
            },
            'body': {
                'color': `${paper.text} !important`,
                'background': `${paper.background} !important`,
                'line-height': `${LINE_HEIGHTS[prefs.spacing]} !important`,
                '-webkit-font-smoothing': 'antialiased'
            },
            'p, li, blockquote, dd, dt, td': textRules,
            'span, em, i, b, strong, div, section, h1, h2, h3, h4, h5, h6': { 'color': 'inherit !important' },
            'a, a:link, a:visited': { 'color': `${paper.dark ? '#E8A061' : '#B5581C'} !important` }
        };
        if (font) {
            rules['body, div, span, h1, h2, h3, h4, h5, h6'] = { 'font-family': `${font} !important` };
        }

        this.rendition.themes.register('default', rules);
        this.rendition.themes.update('default');
        this.rendition.spread(prefs.twoPages ? 'auto' : 'none', 800);

        if (container) {
            // The margins changed the space the book has; let it reflow
            setTimeout(() => this.rendition?.resize(container.clientWidth, container.clientHeight), 50);
        }
    }

    toggleFullscreen() {
        const player = document.querySelector('#bookPlayerContainer');

        // needs to be executed with a slight delay to give NativeShell time to process the request
        setTimeout(() => this.rendition.resize(player.clientWidth, player.clientHeight), 200);
    }

    seekToFraction(fraction) {
        const book = this.rendition?.book;
        if (!book) return;
        const f = Math.min(Math.max(fraction, 0), 1);
        if (book.locations?.length?.() > 0) {
            this.rendition.display(book.locations.cfiFromPercentage(f));
        } else if (book.spine?.length) {
            const section = book.spine.get(Math.min(book.spine.length - 1, Math.floor(f * book.spine.length)));
            if (section) this.rendition.display(section.href);
        }
    }

    chapterFor(href) {
        if (!href || !this.rendition?.book?.navigation) return undefined;
        const target = href.split('#')[0];
        let found;
        const walk = (items) => items?.forEach((chapter) => {
            const link = (chapter.href || '').split('#')[0].replace(/^\.\.\//, '');
            if (link && (target.endsWith(link) || link.endsWith(target))) found = chapter.label?.trim();
            walk(chapter.subitems);
        });
        walk(this.rendition.book.navigation.toc);
        return found;
    }

    /** Tell the reader controls where we are: progress, chapter, and pages left in it. */
    announce(location) {
        if (!location?.start) return;
        const book = this.rendition?.book;
        let fraction = location.start.percentage || 0;
        if (book?.locations?.length?.() > 0 && location.start.cfi) {
            try {
                fraction = book.locations.percentageFromCfi(location.start.cfi);
            } catch {
                // locations aren't ready yet
            }
        }
        const page = location.start.displayed?.page;
        const total = location.start.displayed?.total;
        let label = '';
        if (page && total) {
            const left = total - page;
            const pages = left === 1 ? 'page' : 'pages';
            label = left <= 0 ? 'Last page in chapter' : `${left} ${pages} left in chapter`;
        }
        announcePosition({ fraction, label, chapter: this.chapterFor(location.start.href) });
    }

    previous(e) {
        e?.preventDefault();
        if (this.rendition) {
            this.rendition.book.package.metadata.direction === 'rtl' ? this.rendition.next() : this.rendition.prev();
        }
    }

    next(e) {
        e?.preventDefault();
        if (this.rendition) {
            this.rendition.book.package.metadata.direction === 'rtl' ? this.rendition.prev() : this.rendition.next();
        }
    }

    createMediaElement(options) {
        let elem = this.mediaElement;
        if (elem) {
            return elem;
        }

        elem = document.getElementById('bookPlayer');
        if (!elem) {
            elem = dialogHelper.createDialog({
                exitAnimationDuration: 400,
                size: 'fullscreen',
                autoFocus: false,
                scrollY: false,
                exitAnimation: 'fadeout',
                removeOnClose: true
            });

            elem.id = 'bookPlayer';
            elem.innerHTML = translateHtml(html);

            dialogHelper.open(elem);
        }

        this.mediaElement = elem;
        this.unmountBookOsd = renderComponent(ReaderChrome, {
            item: options.items[0],
            kind: 'book',
            onExit: this.onDialogClosed,
            onPrevious: this.previous,
            onNext: this.next,
            onSeek: this.seekToFraction,
            onOpenContents: this.openTableOfContents,
            onBookPrefs: this.applyPrefs,
            onToggleFullscreen: this.toggleFullscreen
        }, elem.querySelector('#bookOsdMount'));
        this.applyPrefs(this.prefs);

        return elem;
    }

    setCurrentSrc(elem, options) {
        const item = options.items[0];
        this.item = item;
        this.streamInfo = {
            started: true,
            ended: false,
            item: this.item,
            mediaSource: {
                Id: item.Id
            }
        };

        return new Promise((resolve, reject) => {
            import('epubjs').then((epubMod) => {
                let epubFn = epubMod;
                if (typeof epubFn !== 'function') {
                    epubFn = epubMod?.default;
                }
                if (typeof epubFn !== 'function') {
                    epubFn = epubMod?.default?.default;
                }
                if (typeof epubFn !== 'function') {
                    epubFn = epubMod?.Book || epubMod?.default?.Book;
                }

                if (typeof epubFn !== 'function') {
                    console.error('[BookPlayer] Cannot find epubjs constructor in module', epubMod);
                    loading.hide();
                    return reject(new Error('epubjs constructor not found'));
                }

                const api = ServerConnections.getApi(item.ServerId) || ServerConnections.getApiClient(item.ServerId)?.api || ServerConnections.currentApiClient()?.api || ServerConnections.getApi();
                if (!api) {
                    console.error('[BookPlayer] no Api instance available for server', item.ServerId);
                    loading.hide();
                    return reject(new Error('No Api instance available'));
                }
                const apiClient = ServerConnections.getApiClient(item.ServerId) || ServerConnections.currentApiClient();
                const token = apiClient?.accessToken?.() || api?.accessToken;
                let downloadHref = apiClient?.getUrl ? apiClient.getUrl('Items/' + item.Id + '/File', token ? { api_key: token, ApiKey: token } : {}) : (getLibraryApi(api).getDownloadUrl ? getLibraryApi(api).getDownloadUrl({ itemId: item.Id }) : `/Items/${item.Id}/File`);
                if (token) {
                    if (!downloadHref.includes('api_key=')) {
                        downloadHref += (downloadHref.includes('?') ? '&' : '?') + 'api_key=' + encodeURIComponent(token);
                    }
                    if (!downloadHref.includes('ApiKey=')) {
                        downloadHref += '&ApiKey=' + encodeURIComponent(token);
                    }
                }

                this.currentSrc = () => downloadHref;

                const headers = {};
                if (token) {
                    headers['X-Emby-Token'] = token;
                }

                // Fetch the EPUB file as an ArrayBuffer directly
                fetch(downloadHref, { headers })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error(`Failed to download book: HTTP ${res.status}`);
                        }
                        return res.arrayBuffer();
                    })
                    .then((arrayBuffer) => {
                        if (this.cancellationToken) {
                            loading.hide();
                            return reject();
                        }

                        // An EPUB is a ZIP archive ("PK" signature). Anything else (e.g. MOBI) makes epub.js hang forever.
                        const signature = new Uint8Array(arrayBuffer, 0, Math.min(2, arrayBuffer.byteLength));
                        if (signature[0] !== 0x50 || signature[1] !== 0x4B) {
                            throw new Error('File is not a valid EPUB');
                        }

                        const book = epubFn(arrayBuffer);

                        const rendition = book.renderTo('bookPlayerContainer', {
                            width: '100%',
                            height: '100%',
                            flow: 'paginated',
                            spread: this.prefs.twoPages ? 'auto' : 'none',
                            minSpreadWidth: 800
                        });

                        this.rendition = rendition;

                        // Check saved CFI first for precise paragraph resume
                        const savedCfi = localStorage.getItem(`khylo_book_cfi_${item.Id}`);
                        const targetLocation = savedCfi || undefined;

                        return rendition.display(targetLocation).then(() => {
                            this.bindEvents();
                            // setTheme ignores calls until the book is loaded, so mark it loaded first
                            this.loaded = true;
                            this.applyPrefs(this.prefs);
                            this.announce(rendition.currentLocation());
                            loading.hide();
                            resolve();

                            // Asynchronously generate locations in background for progress bar without blocking reader display
                            this.rendition.book.locations.generate(1024).then(() => {
                                console.debug('[BookPlayer] locations generated');
                                this.announce(this.rendition?.currentLocation());
                                if (!savedCfi) {
                                    const percentageTicks = (options.startPositionTicks || 0) / 10000000;
                                    if (percentageTicks > 0.0) {
                                        try {
                                            const resumeLoc = book.locations.cfiFromPercentage(percentageTicks);
                                            if (resumeLoc) {
                                                rendition.display(resumeLoc);
                                            }
                                        } catch (pctErr) {
                                            console.warn('[BookPlayer] Failed to restore percentage CFI', pctErr);
                                        }
                                    }
                                }
                            }).catch((locErr) => {
                                console.warn('[BookPlayer] Locations generation warning:', locErr);
                            });

                            rendition.on('relocated', (locations) => {
                                this.announce(locations);
                                const currentCfi = locations?.start?.cfi;
                                if (currentCfi) {
                                    localStorage.setItem(`khylo_book_cfi_${item.Id}`, currentCfi);
                                    localStorage.setItem(`khylo_book_read_date_${item.Id}`, String(Date.now()));
                                }
                                if (book.locations && locations?.start?.cfi) {
                                    try {
                                        this.progress = book.locations.percentageFromCfi(locations.start.cfi);
                                        const pct = Math.round(this.progress * 100);
                                        localStorage.setItem(`khylo_book_pct_${item.Id}`, String(pct));
                                        window.dispatchEvent(new CustomEvent('khylo-book-progress-updated', {
                                            detail: { itemId: item.Id, cfi: currentCfi, percentage: pct }
                                        }));
                                    } catch (err) {
                                        // Ignore if locations not yet available
                                    }
                                    Events.trigger(this, 'pause');
                                }
                            });
                        }, (dispErr) => {
                            console.error('[BookPlayer] failed to display epub', dispErr);
                            loading.hide();
                            return reject(dispErr);
                        });
                    })
                    .catch((err) => {
                        console.error('[BookPlayer] failed to load epub ArrayBuffer', err);
                        loading.hide();
                        return reject(err);
                    });
            }).catch((err) => {
                console.error('[BookPlayer] failed to import epubjs', err);
                loading.hide();
                return reject(err);
            });
        });
    }

    canPlayMediaType(mediaType) {
        return (mediaType || '').toLowerCase() === 'book';
    }

    canPlayItem(item) {
        if (!item) return false;
        const p = (item.Path || '').toLowerCase();
        const c = (item.Container || '').toLowerCase();
        const type = item.Type || '';
        const mediaType = item.MediaType || '';

        // Exclude audio files and audio books completely
        if (type === 'AudioBook' || mediaType === 'AudioBook' || mediaType === 'Audio') return false;
        if (p.endsWith('.mp3') || p.endsWith('.m4b') || p.endsWith('.m4a') || c === 'mp3' || c === 'm4b' || c === 'm4a') return false;
        if (p.endsWith('.pdf') || c === 'pdf') return false;
        if (p.endsWith('.cbr') || p.endsWith('.cbz') || c === 'cbr' || c === 'cbz') return false;
        if (p.endsWith('.mobi') || c === 'mobi' || p.endsWith('.azw') || p.endsWith('.azw3') || c === 'azw' || c === 'azw3') return false;
        // Only EPUB can be rendered by epub.js. Without a known path/container we can't tell the format,
        // so don't claim the item (a MOBI handed to epub.js never finishes loading).
        return (p.endsWith('.epub') || c === 'epub') && (type === 'Book' || mediaType === 'Book' || !type);
    }
}

export default BookPlayer;
