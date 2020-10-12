import fs from 'fs';
import os from 'os';

import handbrake from 'handbrake-js';
import { v4 as uuidv4 } from 'uuid';

import { settings } from '../../settings';

export class VideoTransform {
	modifyFilename(filename) {
		// Determine file output name. It should finish with a .mp4 extension.
		const fileExtensionIndex = filename.lastIndexOf('.');
		filename = fileExtensionIndex === -1 || fileExtensionIndex === 0
			? filename = `${ filename }.mp4`
			: filename = `${ filename.substr(0, fileExtensionIndex) }.mp4`;
		return filename;
	}

	generateHandbrakeOptions(inputFilename) {
		const options = {
			input: inputFilename,
			output: `${ inputFilename }_converted.mp4`,
			encoder: settings.get('FileUpload_Video_Encoder'),
		};

		// Configure image size
		if (settings.get('FileUpload_Video_Configure_Image_Size')) {
			options.maxWidth = settings.get('FileUpload_Video_Max_Width');
			options.maxHeight = settings.get('FileUpload_Video_Max_Height');
		}

		// Configure frame rate and type of framerate (constant, variable, peek limited)
		if (settings.get('FileUpload_Video_Configure_Framerate')) {
			options.rate = settings.get('FileUpload_Video_Framerate');
		}
		const framerateControl = settings.get('FileUpload_Video_Framerate_Control');
		options[framerateControl] = true;

		// Configure the quality of the video
		switch (settings.get('FileUpload_Video_Quality_Type')) {
			case 'ConstantQuality':
				options.quality = settings.get('FileUpload_Video_Quality');
				break;

			case 'Bitrate':
				options.vb = settings.get('FileUpload_Video_Bitrate');
				if (settings.get('FileUpload_Video_Two_Pass')) {
					options['two-pass'] = true;
					if (settings.get('FileUpload_Video_Turbo')) {
						options.turbo = true;
					} else {
						options['no-turbo'] = true;
					}
				} else {
					options['no-two-pass'] = true;
				}
				break;

			default:
				break;
		}

		return options;
	}

	async processFile(fileInfo) {
		const tempFilename = `${ os.tmpdir() }/${ uuidv4() }`;
		const tempFilenameConverted = `${ tempFilename }_converted.mp4`;
		return new Promise((resolve, reject) => {
			const result = {
				fieldname: fileInfo.fieldname,
				filename: this.modifyFilename(fileInfo.filename),
				encoding: fileInfo.encoding,
				mimetype: 'video/mp4',
			};
			const stream = fs.createWriteStream(tempFilename);
			fileInfo.file.pipe(stream);

			fileInfo.file.on('end', () => {
				stream.destroy();

				handbrake.run(this.generateHandbrakeOptions(tempFilename))
					.then(() => {
						fs.readFile(tempFilenameConverted, (err, convertedData) => {
							if (err) {
								reject(err);
							} else {
								result.file = convertedData;
								resolve(result);
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
