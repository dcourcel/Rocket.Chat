export class UploadTransformObj {
	/**
	 * Transform a stream.
	 * @param {stream.Readable} file The file content to transform
	 * @return {Promise<stream.Readable|Buffer>} The transformed content
	 */
	async processFile(file) { throw new Error("processFile should be overriden."); }
}
