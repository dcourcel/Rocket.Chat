import fs from 'fs';
import os from 'os';

import type { IUpload, IUser, RoomID, MessageAttachmentDefault } from '@rocket.chat/core-typings';
import { Logger } from '@rocket.chat/logger';
import { Messages, Uploads, Users } from '@rocket.chat/models';
import handbrake from 'handbrake-js';
import _ from 'underscore';
import { v4 as uuidv4 } from 'uuid';

import { omit } from '../../../../lib/utils/omit';
import { deleteMessage } from '../../../lib/server/functions/deleteMessage';
import { updateMessage } from '../../../lib/server/functions/updateMessage';
import { executeSendMessage } from '../../../lib/server/methods/sendMessage';
import { settings } from '../../../settings/server';
import { FileUpload } from './FileUpload';

const logger = new Logger('FileUpload');

async function sendConversionMessage(userId: IUser['_id'], roomId: RoomID) {
	const user = await Users.findOneById(userId);
	if (user === undefined || user === null) {
		return null;
	}

	const conversionMsg = await executeSendMessage(userId, {
		rid: roomId,
		ts: new Date(),
		groupable: false,
		attachments: [{ fields: [{ title: 'Conversion du vidéo', value: '0%' }] }],
	});
	const updateProgressThrotled = _.throttle(() => {
		const copiedMsg: any = {};
		Object.assign(copiedMsg, conversionMsg);
		updateMessage(copiedMsg, user);
	}, 1000, {trailing: false});

	return {
		conversionMsg,
		user,
		updateProgress: async (progress: number) => {
			if (!(await Messages.findOneById(conversionMsg._id))) {
				// The message does not exist anymore. Report it to the caller.
				return false;
			}

			if (((conversionMsg.attachments?.[0] as MessageAttachmentDefault).fields?.length ?? 0) > 0) {
				(conversionMsg.attachments![0] as MessageAttachmentDefault).fields![0].value = `${progress.toString()}%`;
			}
			updateProgressThrotled?.();
			return true;
		},
	};
}

function modifyFilename(filename: string): string {
	// Determine file output name. It should finish with a .mp4 extension.
	const fileExtensionIndex = filename.lastIndexOf('.');
	filename =
		fileExtensionIndex === -1 || fileExtensionIndex === 0
			? (filename = `${filename}.mp4`)
			: (filename = `${filename.substring(0, fileExtensionIndex)}.mp4`);
	return filename;
}

async function convert(
	file: IUpload,
	userId: IUser['_id'],
	onProgress: ((progress: number) => Promise<boolean>) | null,
): Promise<IUpload | null> {
	const tempFilename = `${os.tmpdir()}/${uuidv4()}`;
	const tempFilenameConverted = `${tempFilename}_converted.mp4`;
	try {
		let canceled = false;
		await FileUpload.copy(file, tempFilename);
		await new Promise<void>((resolve, reject) => {
			const handbrakeEvent = handbrake.spawn(generateHandbrakeOptions(tempFilename));

			if (onProgress != null) {
				const onProgressFunc = Meteor.bindEnvironment(
					async (progress: handbrake.HandbrakeProgress, handbrakeSpawn: handbrake.Handbrake) => {
						if (!(await onProgress(progress.percentComplete))) {
							canceled = true;
							handbrakeSpawn.cancel();
						}
					},
				);
				handbrakeEvent.on('progress', (progress) => {
					void onProgressFunc(progress, handbrakeEvent);
				});
			}

			handbrakeEvent.on('error', reject);

			handbrakeEvent.on('end', () => {
				resolve();
			});
		});
		if (canceled) {
			return null;
		}

		const fileBuffer = await fs.promises.readFile(tempFilenameConverted);
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 24);
		const details = {
			name: modifyFilename(file.name ?? ''),
			size: fileBuffer.length,
			type: 'video/mp4',
			rid: file.rid,
			userId,
			content: file.content,
			expiresAt,
		};

		const fileStore = FileUpload.getStore('Uploads');
		const uploadedFile = await fileStore.insert(details, fileBuffer);

		uploadedFile.path = FileUpload.getPath(`${uploadedFile._id}/${encodeURI(uploadedFile.name || '')}`);

		await Uploads.updateFileComplete(uploadedFile._id, userId, omit(uploadedFile, '_id'));

		await fileStore.deleteById(file._id);

		return uploadedFile;
	} finally {
		if (fs.existsSync(tempFilename)) {
			fs.unlinkSync(tempFilename);
		}
		if (fs.existsSync(tempFilenameConverted)) {
			fs.unlinkSync(tempFilenameConverted);
		}
	}
}

function generateHandbrakeOptions(inputFilename: string): handbrake.HandbrakeOptions {
	const options: handbrake.HandbrakeOptions = {
		input: inputFilename,
		output: `${inputFilename}_converted.mp4`,
		encoder: <string>settings.get('FileUpload_Video_Encoder'),
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

async function showErrorInAttachment(conversionMsg: any, user: IUser, error: string, duration: number) {
	if (((conversionMsg.attachments?.[0] as MessageAttachmentDefault).fields?.length ?? 0) > 0) {
		(conversionMsg.attachments![0] as MessageAttachmentDefault).fields![0].title = 'Erreur';
		(conversionMsg.attachments![0] as MessageAttachmentDefault).fields![0].value = error;
		const copiedMsg: any = {};
		Object.assign(copiedMsg, conversionMsg);
		await updateMessage(copiedMsg, user);
	}

	// Automatically delete the message after the duration specified.
	if (duration > 0) {
		Meteor.setTimeout(async () => ((await Messages.findOneById(conversionMsg._id)) ? deleteMessage(conversionMsg, user) : null), duration);
	}
}

export async function convertVideo(file: IUpload): Promise<IUpload | null> {
	if (file.userId == null || file.rid == null) {
		return null;
	}

	const data = await sendConversionMessage(file.userId, file.rid);
	return convert(file, file.userId, data?.updateProgress ?? null)
		.then(async (result) => {
			if (data != null) {
				await deleteMessage(data.conversionMsg, data.user);
			}
			return result;
		})
		.catch(async (error) => {
			if (data != null) {
				// Verify if the error is from Handbrake.
				// Investigation: I was not able to use handbrake.HandbrakeErrors because it is not an object at runtime.
				if (
					error.name === 'ValidationError' ||
					error.name === 'InvalidInput' ||
					error.name === 'InvalidPreset' ||
					error.name === 'Other' ||
					error.name === 'HandbrakeCLINotFound'
				) {
					logger.info(`Handbrake error. ${error.message}`);
					await showErrorInAttachment(data.conversionMsg, data.user, 'La conversion du vidéo a échouée.', 10000);
				} else {
					logger.error(`Unknown conversion error. ${error.toString()}`);
					await showErrorInAttachment(data.conversionMsg, data.user, 'Erreur inconnue lors de la conversion vidéo.', 10000);
				}
			}
			return null;
		});
}
