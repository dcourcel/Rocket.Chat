import _ from 'underscore';
import type { IMessage, IUpload, IUser, MessageAttachment, MessageAttachmentDefault } from '@rocket.chat/core-typings';
import { Logger } from '@rocket.chat/logger';
import { Messages, Rooms, Users } from '@rocket.chat/models';
import { Media } from '@rocket.chat/core-services';
import { settings } from '../../../settings/server/index';
import { deleteMessage } from '../../../lib/server/functions/deleteMessage';
import { updateMessage } from '../../../lib/server/functions/updateMessage';
import { executeSendMessage } from '../../../lib/server/methods/sendMessage';
import { callbacks } from '../../../../lib/callbacks';
import { FileUpload } from './FileUpload';
import { OptionalId } from 'mongodb';


export type PostFileData = {
    filename: string,
    fileBuffer: Buffer,
    encoding: string,
    mimetype: string,
}

export type PostFields = {
    description?: string
}

export type FileStoreResult = {
    _id: string,
    name: string,
    type: string,
    size: number,
    description?: string,
    identify?: {
        size?: number
    }
}

export abstract class UploadHandler {
    public static readonly logger: any = new Logger('FileUpload');

    private conversionMsg?: IMessage;
    private roomId: string;
    private userId: string;
    private updateProgressThrotled: Function | null;

    constructor(rid: string, uid: string) {
        this.roomId = rid;
        this.userId = uid;
        this.updateProgressThrotled = null
    }

    get rid() {
        return this.roomId;
    }

    get uid() {
        return this.userId;
    }

    public abstract processAttachment(file: PostFileData, fields: PostFields): Promise<IMessage | null>;

    protected async insertIntoFileStore(file: PostFileData, fields: PostFields): Promise<IUpload> {
		const stripExif = settings.get('Message_Attachments_Strip_Exif');
        if (stripExif) {
            // No need to check mime. Library will ignore any files without exif/xmp tags (like BMP, ico, PDF, etc)
            file.fileBuffer = await Media.stripExifFromBuffer(file.fileBuffer);
        }
        const details: OptionalId<IUpload> = {
            name: file.filename,
            size: file.fileBuffer.length,
            type: file.mimetype,
            rid: this.rid,
            userId: this.uid,
        };
		const fileStore = FileUpload.getStore('Uploads');
        const uploadedFile = await fileStore.insert(details, file.fileBuffer);
        uploadedFile.description = fields.description;
        delete fields.description;
        // Note: no check is performed here for the object structure returned.
        return uploadedFile as IUpload;
    }

    protected async sendConversionMessage(): Promise<void> {
        if (this.conversionMsg !== undefined) {
            throw new Error("Conversion message already generated.");
        }

        this.conversionMsg = await executeSendMessage(this.userId, {
            rid: this.rid,
            ts: new Date(),
            groupable: false,
            attachments: [{fields: [{ title: "Conversion du vidéo", value: "0%" }]}]
        });

        const user = await Users.findOneById(this.uid);
        if (user == undefined) {
            return;
        }

        this.updateProgressThrotled = _.throttle(() => {
            const copiedMsg: any = {};
            Object.assign(copiedMsg, this.conversionMsg);
            updateMessage(copiedMsg, user);
        }, 1000, {trailing: false});
    }

    protected async updateProgress(progress: number): Promise<boolean> {
        if (this.conversionMsg == undefined) {
            throw new Error("Conversion message not generated.");
        }

        if (!await Messages.findOneById(this.conversionMsg._id)) {
            // The message does not exist anymore. Report it to the caller.
            return false;
        }

        if (((this.conversionMsg.attachments?.[0] as MessageAttachmentDefault).fields?.length ?? 0) > 0) {
            (this.conversionMsg.attachments![0] as MessageAttachmentDefault).fields![0].value = progress.toString() + "%";
        }
        this.updateProgressThrotled?.();
        return true;
    }

    protected async showErrorInAttachment(error: string, duration: number) {
        if (this.conversionMsg == undefined) {
            throw new Error("Conversion message not generated.");
        }
        const user = await Users.findOneById(this.uid);
        if (user == undefined) {
            return;
        }
        if (((this.conversionMsg.attachments?.[0] as MessageAttachmentDefault).fields?.length ?? 0) > 0) {
            (this.conversionMsg.attachments![0] as MessageAttachmentDefault).fields![0].title = "Erreur";
            (this.conversionMsg.attachments![0] as MessageAttachmentDefault).fields![0].value = error;
            const copiedMsg: any = {};
            Object.assign(copiedMsg, this.conversionMsg);
            updateMessage(copiedMsg, user);
        }

        // Automatically delete the message after the duration specified.
        if (duration > 0) {
            Meteor.setTimeout(async () => await Messages.findOneById(this.conversionMsg!._id) ? deleteMessage(this.conversionMsg!, user) : null, duration);
        }
    }

    protected async sendAttachmentMessage(fileStoreResult: IUpload, attachments: MessageAttachment[]) {
        if (this.conversionMsg == undefined) {
            throw new Error("Conversion message not generated.");
        }

        if (!Messages.findOneById(this.conversionMsg._id)) {
            // Just silently drop the result of the conversion since the conversion progress message has been destroyed.
            return;
        }

        const files = [{
            _id: fileStoreResult._id,
            name: fileStoreResult.name || "",
            type: fileStoreResult.type || "",
            format: fileStoreResult.extension || "",
            size: fileStoreResult.size || 0
        }];

        // Modify existing conversion message.
        this.conversionMsg.attachments = attachments;
        this.conversionMsg.files = files;
        const user = Meteor.users.findOne(this.uid) as IUser;
        updateMessage(this.conversionMsg, user);

        const room = await Rooms.findOneById(this.rid);
        if (!room) {
            return;
        }

        callbacks.runAsync('afterFileUpload', { user, room, message: this.conversionMsg });

    }

    protected getConversionMessage(): IMessage | undefined {
        return this.conversionMsg;
    }
}
