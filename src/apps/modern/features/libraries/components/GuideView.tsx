import React, { FC, useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Guide from 'components/guide/guide';
import 'material-design-icons-iconfont';
import 'elements/khylo-programcell/khylo-programcell';
import 'elements/khylo-button/khylo-button';
import 'elements/khylo-button/paper-icon-button-light';
import 'elements/khylo-tabs/khylo-tabs';
import 'elements/khylo-scroller/khylo-scroller';
import 'components/guide/guide.scss';
import 'components/guide/programs.scss';
import 'styles/scrollstyles.scss';
import 'styles/flexstyles.scss';

const GuideView: FC = () => {
    const guideInstance = useRef<Guide | null>();
    const tvGuideContainerRef = useRef<HTMLDivElement>(null);

    const initGuide = useCallback((element: HTMLDivElement) => {
        guideInstance.current = new Guide({
            element: element,
            serverId: window.ApiClient.serverId()
        });
    }, []);

    useEffect(() => {
        const element = tvGuideContainerRef.current;
        if (!element) {
            console.error('Unexpected null reference');
            return;
        }
        if (!guideInstance.current) {
            initGuide(element);
        }
    }, [initGuide]);

    useEffect(() => {
        if (guideInstance.current) {
            guideInstance.current.resume();
        }

        return () => {
            if (guideInstance.current) {
                guideInstance.current.pause();
            }
        };
    }, [initGuide]);

    return <Box
        ref={tvGuideContainerRef}
        className='absolutePageTabContent'
        sx={{
            display: 'flex !important',
            width: 'auto',
            paddingTop: '0',
            paddingBottom: '0 !important',
            top: '0 !important'
        }}
    />;
};

export default GuideView;
