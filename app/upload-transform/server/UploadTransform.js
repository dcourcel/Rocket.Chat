import { GenericTransform } from './GenericTransform';
import { VideoTransform } from './VideoTransform';

/**
 * Get an object that will transform the received file according to its mime type.
 * @param {string} mimeType The type of the file received in header.
 * @returns {UploadTransformObj} An object that can transform a file with the mime type specified.
 */
export function getFromMimeType(mimeType) {
	if (/^video.*/.test(mimeType)) {
		return new VideoTransform();
	}

	return new GenericTransform();
}
