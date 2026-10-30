import type { Api } from '@khylo/sdk';
import { getMediaInfoApi } from '@khylo/sdk/lib/utils/api/media-info-api';

/** One open channel stream in Multi View: an HLS address plus what's needed to close it again. */
export interface MultiViewStream {
    url: string;
    playSessionId: string;
    liveStreamId?: string | null;
}

// Browsers play H.264/AAC over HLS everywhere. Most IPTV channels already are, so the server
// only repackages them, which is cheap enough to run four at once.
const DEVICE_PROFILE = {
    MaxStreamingBitrate: 120_000_000,
    DirectPlayProfiles: [],
    TranscodingProfiles: [
        {
            Container: 'ts',
            Type: 'Video',
            VideoCodec: 'h264',
            AudioCodec: 'aac',
            Context: 'Streaming',
            Protocol: 'hls',
            MaxAudioChannels: '2',
            BreakOnNonKeyFrames: true
        }
    ]
};

/** Tunes a channel. Fails when the channel can't start, e.g. the provider is out of connections. */
export async function openChannelStream(api: Api, userId: string, channelId: string): Promise<MultiViewStream> {
    const response = await getMediaInfoApi(api).getPostedPlaybackInfo({
        itemId: channelId,
        userId,
        autoOpenLiveStream: true,
        enableDirectPlay: false,
        enableDirectStream: false,
        playbackInfoDto: {
            UserId: userId,
            AutoOpenLiveStream: true,
            EnableDirectPlay: false,
            EnableDirectStream: false,
            DeviceProfile: DEVICE_PROFILE as never
        }
    });

    const source = response.data.MediaSources?.[0];
    if (response.data.ErrorCode || !source?.TranscodingUrl) {
        throw new Error(response.data.ErrorCode ?? 'NoStream');
    }

    return {
        url: `${api.basePath}${source.TranscodingUrl}`,
        playSessionId: response.data.PlaySessionId ?? '',
        liveStreamId: source.LiveStreamId
    };
}

/** Stops the server's work for a stream and frees the tuner or provider connection. */
export function closeChannelStream(api: Api, stream: MultiViewStream): void {
    const headers = { Authorization: api.authorizationHeader };
    const deviceId = encodeURIComponent(api.deviceInfo.id);
    // keepalive lets these finish when the page is being closed
    void fetch(`${api.basePath}/Videos/ActiveEncodings?deviceId=${deviceId}&playSessionId=${encodeURIComponent(stream.playSessionId)}`, {
        method: 'DELETE', headers, keepalive: true
    }).catch(() => undefined);
    if (stream.liveStreamId) {
        void fetch(`${api.basePath}/LiveStreams/Close?liveStreamId=${encodeURIComponent(stream.liveStreamId)}`, {
            method: 'POST', headers, keepalive: true
        }).catch(() => undefined);
    }
}
