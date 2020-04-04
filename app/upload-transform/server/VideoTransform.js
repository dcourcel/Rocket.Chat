import fs from 'fs';

import handbrake from 'handbrake-js';
import { v4 as uuidv4 } from 'uuid';

import { UploadTransformObj } from './UploadTransformObj';

export class VideoTransform extends UploadTransformObj {
	async processFile(file) {
		const tempFilename = `/tmp/${ uuidv4() }`;
		const tempFilenameConverted = `${ tempFilename }_converted.mp4`;
		return new Promise((resolve, reject) => {
			const stream = fs.createWriteStream(tempFilename);
			file.pipe(stream);

			file.on('end', () => {
				stream.destroy();

				handbrake.run({ input: tempFilename, output: tempFilenameConverted, encoder: 'x264', vb: 2048, 'two-pass': true })
					.then(() => {
						fs.readFile(tempFilenameConverted, (err, data) => {
							if (err) {
								reject(err);
							} else {
								resolve(data);
							}
						});
					})
					.catch(reject);
			});
		}).finally(() => {
			if (fs.existsSync(tempFilename)) {
				fs.unlinkSync(tempFilename);
			}
			if (fs.existsSync(tempFilenameConverted)) {
				fs.unlinkSync(tempFilenameConverted);
			}
		});
	}
}
