import { UploadTransformObj } from './UploadTransformObj';

export class GenericTransform extends UploadTransformObj {
	async processFile(file) {
		return new Promise((resolve) => {
			const fileData = [];
			file.on('data', (data) => fileData.push(data));

			file.on('end', () => { resolve(Buffer.concat(fileData)); });
		});
	}
}
