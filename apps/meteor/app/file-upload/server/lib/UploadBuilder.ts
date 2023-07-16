import { UploadHandler } from './UploadHandler';
import { DefaultHandler } from './DefaultHandler';
import { VideoHandler } from './VideoHandler';

export function getHandlerFromMimeType(mimetype: string, rid: string, uid: string): UploadHandler {
    if (/^video\/.+/.test(mimetype)) {
        return new VideoHandler(rid, uid);
    }
    else {
        return new DefaultHandler(rid, uid);
    }
}
