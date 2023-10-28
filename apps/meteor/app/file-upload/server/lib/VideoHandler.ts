import fs from 'fs';
import os from 'os';
import handbrake from 'handbrake-js';
import { v4 as uuidv4 } from 'uuid';
import _ from 'underscore';

import { UploadHandler, PostFileData, PostFields } from './UploadHandler';
import { FileUpload } from './FileUpload';
import { Uploads } from '@rocket.chat/models';
import { settings } from '../../../settings/server';
import type { IMessage } from '@rocket.chat/core-typings';
import { MessageAttachment } from '@rocket.chat/core-typings';

export class VideoHandler extends UploadHandler {
    private progressAction: Promise<void> = Promise.resolve();

	constructor(rid: string, uid: string) {
		super(rid, uid);
	}

    public async processAttachment(file: PostFileData, fields: PostFields): Promise<IMessage | null> {
        this.sendConversionMessage();
        return this.convert(file).then(async (fileModified) => {
            const fileStoreResult = await this.insertIntoFileStore(fileModified, fields);
		    Uploads.updateFileComplete(fileStoreResult._id, this.uid, _.omit(fileStoreResult, '_id'));
			const fileUrl = FileUpload.getPath(`${ fileStoreResult._id }/${ encodeURI(fileStoreResult.name || '') }`);

			const attachments: MessageAttachment[] = [{
				title: fileStoreResult.name,
				type: 'file',
				description: fileStoreResult.description,
				title_link: fileUrl,
				title_link_download: true,
				video_url: fileUrl,
				video_type: fileStoreResult.type,
				video_size: fileStoreResult.size
			}];
            return this.sendAttachmentMessage(fileStoreResult, attachments);
        })
		.then((_) => this.getConversionMessage() ?? null)
		.catch((error) => {
			// Verify if the error is from Handbrake.
			// Investigation: I was not able to use handbrake.HandbrakeErrors because it is not an object at runtime.
			if (error.name === "ValidationError" ||
				error.name === "InvalidInput" ||
				error.name === "InvalidPreset" ||
				error.name === "Other" ||
				error.name === "HandbrakeCLINotFound") {
				UploadHandler.logger.info("Handbrake error. " + error.message);
				this.showErrorInAttachment("La conversion du vidéo a échouée.", 10000);
			}
			else {
				UploadHandler.logger.error("Unknown conversion error. " + error.toString());
				this.showErrorInAttachment("Erreur inconnue lors de la conversion vidéo.", 10000);
			}
			return null;
		});
    }

    private async convert(file: PostFileData): Promise<PostFileData> {
        const tempFilename = `${ os.tmpdir() }/${ uuidv4() }`;
        const tempFilenameConverted = `${ tempFilename }_converted.mp4`;
        try
        {
            await fs.promises.writeFile(tempFilename, file.fileBuffer);
            await this.processHandbrakeConversion(tempFilename);
			file.fileBuffer = await fs.promises.readFile(tempFilenameConverted);
			file.filename = this.modifyFilename(file.filename);
			file.mimetype = 'video/mp4';
			return file;
        }
        finally
        {
            if (fs.existsSync(tempFilename)) {
                fs.unlinkSync(tempFilename);
            }
            if (fs.existsSync(tempFilenameConverted)) {
                fs.unlinkSync(tempFilenameConverted);
            }
        }
    }

	private static onProgress(self: VideoHandler, progress: handbrake.HandbrakeProgress, handbrakeSpawn: handbrake.Handbrake) {
		self.progressAction = self.progressAction.then(async (_) => {
			if (!await self.updateProgress(progress.percentComplete)) {
				handbrakeSpawn.cancel();
			}
		});
	}

	private async processHandbrakeConversion(tempFilename: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const handbrakeEvent = handbrake.spawn(this.generateHandbrakeOptions(tempFilename));

			const onProgressFunc = Meteor.bindEnvironment(VideoHandler.onProgress);
			handbrakeEvent.on("progress", (progress) => {
				onProgressFunc(this, progress, handbrakeEvent);
			});

			handbrakeEvent.on("error", reject);

			handbrakeEvent.on("end", resolve);
		});
	}

    private modifyFilename(filename: string): string {
		// Determine file output name. It should finish with a .mp4 extension.
		const fileExtensionIndex = filename.lastIndexOf('.');
		filename = fileExtensionIndex === -1 || fileExtensionIndex === 0
			? filename = `${ filename }.mp4`
			: filename = `${ filename.substring(0, fileExtensionIndex) }.mp4`;
		return filename;
	}

	private generateHandbrakeOptions(inputFilename: string): handbrake.HandbrakeOptions {
		const options: handbrake.HandbrakeOptions = {
			input: inputFilename,
			output: `${ inputFilename }_converted.mp4`,
			encoder: <string>settings.get('FileUpload_Video_Encoder')
		};

		// Configure image size
		if (settings.get('FileUpload_Video_Configure_Image_Size')) {
			options.maxWidth = <number>settings.get('FileUpload_Video_Max_Width');
			options.maxHeight = <number>settings.get('FileUpload_Video_Max_Height');
		}

		// Configure frame rate and type of framerate (constant, variable, peek limited)
		if (settings.get('FileUpload_Video_Configure_Framerate')) {
			options.rate = <number>settings.get('FileUpload_Video_Framerate');
		}
		const framerateControl = <string>settings.get('FileUpload_Video_Framerate_Control');
		options[framerateControl] = true;

		// Configure the quality of the video
		switch (settings.get('FileUpload_Video_Quality_Type')) {
			case 'ConstantQuality':
				options.quality = <number>settings.get('FileUpload_Video_Quality');
				break;

			case 'Bitrate':
				options.vb = <number>settings.get('FileUpload_Video_Bitrate');
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
}
