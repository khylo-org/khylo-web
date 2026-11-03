import axios from 'axios';

/**
 * Uploads a program guide file (XMLTV, .xml or .xml.gz) from this computer. Resolves to where the server saved it, which is
 * what the guide source then points at.
 */
export async function uploadGuideFile(base: string, authorization: string, file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);

    const response = await axios.post<{ Path: string }>(`${base}/LiveTv/ListingProviders/Xmltv/Upload`, body, {
        headers: { Authorization: authorization }
    });
    return response.data.Path;
}
