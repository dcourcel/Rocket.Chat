import { UploadTransformObj } from './UploadTransformObj';

export class NoTransform extends UploadTransformObj {
	async processFile(filename, file) {
		return new Promise((resolve) => {
			const fileData = [];
			const sameFilename = filename;
			file.on('data', (data) => fileData.push(data));

			file.on('end', () => { resolve({ filename: sameFilename, file: Buffer.concat(fileData) }); });
		});
	}
}
