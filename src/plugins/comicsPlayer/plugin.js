import { getLibraryApi } from '@khylo/sdk/lib/utils/api/library-api';
import { Archive } from 'libarchive.js';

import { PluginType } from 'constants/pluginType';
import { ServerConnections } from 'lib/khylo-apiclient';
import screenSaverManager from 'scripts/screensavermanager';

import loading from '../../components/loading/loading';
import dialogHelper from '../../components/dialogHelper/dialogHelper';
import keyboardnavigation from '../../scripts/keyboardNavigation';
import { appRouter } from '../../components/router/appRouter';
import ReaderChrome from '../bookPlayer/ReaderChrome/ReaderChrome';
import { COMIC_BACKGROUNDS, announcePosition, loadComicPrefs } from '../bookPlayer/ReaderChrome/readerPrefs';
import Events from '../../utils/events.ts';
import { renderComponent } from '../../utils/reactUtils';

import 'material-design-icons-iconfont';
import './style.scss';

// supported book file extensions
const FILE_EXTENSIONS = ['.cbr', '.cbt', '.cbz', '.cb7'];
// the comic book archive supports any kind of image format as it's just a zip archive
const IMAGE_FORMATS = ['jpg', 'jpeg', 'jpe', 'jif', 'jfif', 'jfi', 'png', 'avif', 'gif', 'bmp', 'dib', 'tiff', 'tif', 'webp'];

export class ComicsPlayer {
    constructor() {
        this.name = 'Comics Player';
        this.type = PluginType.MediaPlayer;
        this.id = 'comicsplayer';
        this.priority = 1;
        this.imageMap = new Map();

        this.previous = this.previous.bind(this);
        this.next = this.next.bind(this);
        this.applyPrefs = this.applyPrefs.bind(this);
        this.seekToFraction = this.seekToFraction.bind(this);

        this.onDialogClosed = this.onDialogClosed.bind(this);
        this.onWindowKeyDown = this.onWindowKeyDown.bind(this);
        this.toggleFullscreen = this.toggleFullscreen.bind(this);
    }

    play(options) {
        this.currentPage = 0;
        this.pageCount = 0;

        this.prefs = loadComicPrefs();

        screenSaverManager.block();
        const elem = this.createMediaElement(options);
        return this.setCurrentSrc(elem, options);
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

        this.archiveSource?.release();

        const elem = this.mediaElement;
        if (elem) {
            dialogHelper.close(elem);
            this.mediaElement = null;
        }

        loading.hide();
    }

    destroy() {
        // Nothing to do here
    }

    currentTime() {
        return this.currentPage;
    }

    duration() {
        return this.pageCount;
    }

    currentItem() {
        return this.item;
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

    onDialogClosed() {
        this.stop();
    }

    /** Fit, one or two pages, reading direction and background, remembered for every comic. */
    applyPrefs(prefs) {
        const before = this.prefs;
        this.prefs = prefs;
        const elem = this.mediaElement;
        if (elem) {
            elem.style.background = COMIC_BACKGROUNDS[prefs.background].color;
            elem.classList.toggle('comicsPlayer--fitWidth', prefs.fit === 'width');
        }

        const swiper = this.swiperInstance;
        if (!swiper || !before) return;

        const currentPage = this.currentPage;
        if (before.rightToLeft !== prefs.rightToLeft) {
            swiper.changeLanguageDirection(prefs.rightToLeft ? 'rtl' : 'ltr');
        }
        const view = prefs.twoPages ? 2 : 1;
        swiper.params.slidesPerView = view;
        swiper.params.slidesPerGroup = view;
        this.reload(currentPage);
    }

    seekToFraction(fraction) {
        if (!this.swiperInstance || !this.pageCount) return;
        const page = Math.min(this.pageCount - 1, Math.max(0, Math.round(fraction * (this.pageCount - 1))));
        this.swiperInstance.slideTo(page);
    }

    announce() {
        if (!this.pageCount) return;
        const page = this.currentPage + 1;
        announcePosition({
            fraction: this.pageCount > 1 ? this.currentPage / (this.pageCount - 1) : 1,
            label: `Page ${page} of ${this.pageCount}`
        });
    }

    reload(currentPage) {
        const effect = this.swiperInstance.params.effect;

        this.swiperInstance.params.effect = 'none';
        this.swiperInstance.update();

        this.swiperInstance.slideNext();
        this.swiperInstance.slidePrev();

        if (this.currentPage != currentPage) {
            this.swiperInstance.slideTo(currentPage);
            this.swiperInstance.update();
        }

        this.swiperInstance.params.effect = effect;
        this.swiperInstance.update();
    }

    onWindowKeyDown(e) {
        // Skip modified keys
        if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;

        const key = keyboardnavigation.getKeyName(e);
        if (key === 'Escape') {
            e.preventDefault();
            this.stop();
        }
    }

    bindEvents() {
        this.mediaElement?.addEventListener('close', this.onDialogClosed, { once: true });
        document.addEventListener('keydown', this.onWindowKeyDown);
    }

    unbindEvents() {
        this.mediaElement?.removeEventListener('close', this.onDialogClosed);
        document.removeEventListener('keydown', this.onWindowKeyDown);
    }

    toggleFullscreen() {
        setTimeout(() => this.swiperInstance?.update(), 200);
    }

    createMediaElement(options) {
        let elem = this.mediaElement;
        if (elem) {
            return elem;
        }

        elem = document.getElementById('comicsPlayer');
        if (!elem) {
            elem = dialogHelper.createDialog({
                exitAnimationDuration: 400,
                size: 'fullscreen',
                autoFocus: false,
                scrollY: false,
                exitAnimation: 'fadeout',
                removeOnClose: true
            });

            elem.id = 'comicsPlayer';
            elem.classList.add('slideshowDialog');
            elem.innerHTML = `<div id="bookOsdMount"></div><div dir="${this.prefs.rightToLeft ? 'rtl' : 'ltr'}" class="slideshowSwiperContainer">
                                <div class="swiper-wrapper"></div>
                            </div>`;

            dialogHelper.open(elem);
        }

        this.mediaElement = elem;
        this.unmountBookOsd = renderComponent(ReaderChrome, {
            item: options.items[0],
            kind: 'comic',
            onExit: this.onDialogClosed,
            onPrevious: this.previous,
            onNext: this.next,
            onSeek: this.seekToFraction,
            onComicPrefs: this.applyPrefs,
            onToggleFullscreen: this.toggleFullscreen
        }, elem.querySelector('#bookOsdMount'));
        this.applyPrefs(this.prefs);

        this.bindEvents();
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

        loading.show();

        Archive.init({
            workerUrl: appRouter.baseUrl() + '/libraries/worker-bundle.js'
        });

        const api = ServerConnections.getApi(item.ServerId);
        if (!api) {
            console.error('[ComicsPlayer] no Api instance available for server', item.ServerId);
            return;
        }

        const downloadUrl = getLibraryApi(api).getDownloadUrl({ itemId: item.Id });
        this.archiveSource = new ArchiveSource(downloadUrl);

        //eslint-disable-next-line import/no-unresolved
        import('swiper/css/bundle');

        return this.archiveSource.load()
            // eslint-disable-next-line import/no-unresolved
            .then(() => import('swiper/bundle'))
            .then(({ Swiper }) => {
                loading.hide();

                this.pageCount = this.archiveSource.urls.length;
                this.currentPage = options.startPositionTicks / 10000 || 0;
                this.currentSrc = () => downloadUrl;

                this.swiperInstance = new Swiper(elem.querySelector('.slideshowSwiperContainer'), {
                    direction: 'horizontal',
                    // loop is disabled due to the lack of Swiper support in virtual slides
                    loop: false,
                    zoom: {
                        minRatio: 1,
                        toggle: true,
                        containerClass: 'slider-zoom-container'
                    },
                    autoplay: false,
                    keyboard: {
                        enabled: true
                    },
                    preloadImages: true,
                    slidesPerView: this.prefs.twoPages ? 2 : 1,
                    slidesPerGroup: this.prefs.twoPages ? 2 : 1,
                    slidesPerColumn: 1,
                    initialSlide: this.currentPage,
                    // reduces memory consumption for large libraries while allowing preloading of images
                    virtual: {
                        slides: this.archiveSource.urls,
                        cache: true,
                        renderSlide: this.getImgFromUrl,
                        addSlidesBefore: 1,
                        addSlidesAfter: 1
                    }
                });

                // save current page ( a page is an image file inside the archive )
                this.swiperInstance.on('slideChange', () => {
                    this.currentPage = this.swiperInstance.activeIndex;
                    this.announce();
                    Events.trigger(this, 'pause');
                });
                this.announce();
            });
    }

    next() {
        this.swiperInstance?.slideNext();
    }

    previous() {
        this.swiperInstance?.slidePrev();
    }

    getImgFromUrl(url) {
        return `<div class="swiper-slide">
                   <div class="slider-zoom-container">
                       <img src="${url}" class="swiper-slide-img">
                   </div>
               </div>`;
    }

    canPlayMediaType(mediaType) {
        return (mediaType || '').toLowerCase() === 'book';
    }

    canPlayItem(item) {
        return item.Path && FILE_EXTENSIONS.some(ext => item.Path.endsWith(ext));
    }
}

class ArchiveSource {
    constructor(url) {
        this.url = url;
        this.files = [];
        this.urls = [];
    }

    async load() {
        const res = await fetch(this.url);
        if (!res.ok) {
            return;
        }

        const blob = await res.blob();
        this.archive = await Archive.open(blob);
        this.raw = await this.archive.getFilesArray();
        await this.archive.extractFiles();

        let files = await this.archive.getFilesArray();

        // metadata files and files without a file extension should not be considered as a page
        files = files.filter((file) => {
            const name = file.file.name;
            const index = name.lastIndexOf('.');
            return index !== -1 && IMAGE_FORMATS.includes(name.slice(index + 1).toLowerCase());
        });
        files.sort((a, b) => {
            if (a.file.name < b.file.name) {
                return -1;
            } else {
                return 1;
            }
        });

        for (const file of files) {
            const url = URL.createObjectURL(file.file);
            this.urls.push(url);
        }
    }

    release() {
        this.files = [];
        this.urls.forEach(URL.revokeObjectURL);
        this.urls = [];
    }
}

export default ComicsPlayer;
