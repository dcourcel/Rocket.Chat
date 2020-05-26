import fs from 'fs';

import handbrake from 'handbrake-js';
import { v4 as uuidv4 } from 'uuid';

import { settings } from '../../settings';
import { UploadTransformObj } from './UploadTransformObj';

export class VideoTransform extends UploadTransformObj {
    generateHandbrakeOptions(inputFilename) {
		const options = {
			input: inputFilename,
			output: `${ inputFilename }_converted.mp4`,
			encoder: settings.get("FileUpload_Video_Encoder"),
		};

		// Configure image size
		if (settings.get("FileUpload_Video_Configure_Image_Size")) {
			options.maxWidth = settings.get("FileUpload_Video_Max_Width");
			options.maxHeight = settings.get("FileUpload_Video_Max_Height");
		}

		// Configure frame rate and type of framerate (constant, variable, peek limited)
		if (settings.get("FileUpload_Video_Configure_Framerate")) {
			const rate = settings.get("FileUpload_Video_Framerate");
		}
		const framerateControl = settings.get("FileUpload_Video_Framerate_Control");
		options[framerateControl] = true;

		// Configure the quality of the video
		switch (settings.get("FileUpload_Video_Quality_Type")) {
			case "ConstantQuality":
				options.quality = settings.get("FileUpload_Video_Quality")
				break;

			case "Bitrate":
				options.vb = settings.get("FileUpload_Video_Bitrate");
				if (settings.get("FileUpload_Video_Two_Pass")) {
					options['two-pass'] = true;
					if (settings.get("FileUpload_Video_Turbo")) {
						options.turbo = true;
					}
					else {
						options['no-turbo'] = true;
					}
				}
				else {
					options['no-two-pass'] = true;
				}
				break;

			default:
				break;
		}

		return options;
	}

	async processFile(file) {
		const tempFilename = `/tmp/${ uuidv4() }`;
		const tempFilenameConverted = `${ tempFilename }_converted.mp4`;
		return new Promise((resolve, reject) => {
			const stream = fs.createWriteStream(tempFilename);
			file.pipe(stream);

			file.on('end', () => {
				stream.destroy();

				handbrake.run(this.generateHandbrakeOptions(tempFilename))
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
