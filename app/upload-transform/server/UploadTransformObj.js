export class UploadTransformObj {
	/**
	 * Transform a stream.
	 * @param {string} filename The name of the file received from the client
	 * @param {stream.Readable} file The file content to transform
	 * @return {{string, Promise<stream.Readable|Buffer>}} The modified filename and file content
	 */
	// async processFile(filename, file) { throw new Error('processFile should be overriden.'); }
}
