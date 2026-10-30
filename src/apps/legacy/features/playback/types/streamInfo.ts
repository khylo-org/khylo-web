import type { BaseItemDto } from '@khylo/sdk/lib/generated-client/models/base-item-dto';
import type { MediaSourceInfo } from '@khylo/sdk/lib/generated-client/models/media-source-info';
import type { MediaType } from '@khylo/sdk/lib/generated-client/models/media-type';
import type { PlayMethod } from '@khylo/sdk/lib/generated-client/models/play-method';

export interface StreamInfo {
    ended?: boolean
    fullscreen?: boolean
    item?: BaseItemDto
    lastMediaInfoQuery?: number
    liveStreamId?: string
    mediaSource?: MediaSourceInfo
    mediaType?: MediaType
    mimeType?: string
    playMethod?: PlayMethod
    playSessionId?: string
    playbackStartTimeTicks?: number
    playerStartPositionTicks?: number
    resetSubtitleOffset?: boolean
    started?: boolean
    textTracks?: TrackInfo[]
    title?: string
    tracks?: TrackInfo[]
    transcodingOffsetTicks?: number
    url?: string
}

interface TrackInfo {
    url: string
    language: string
    isDefault: boolean
    index: number
    format: string
}
