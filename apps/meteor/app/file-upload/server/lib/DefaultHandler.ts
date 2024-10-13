import type { IMessage } from '@rocket.chat/core-typings';
import { Messages } from '@rocket.chat/models';
import { UploadHandler, PostFileData, PostFields } from './UploadHandler';
import { sendFileMessage } from '../../../file-upload/server/methods/sendFileMessage';

export class DefaultHandler extends UploadHandler {
    public async processAttachment(file: PostFileData, fields: PostFields): Promise<IMessage | null> {
		const uploadedFile = await this.insertIntoFileStore(file, fields);
        await sendFileMessage(this.uid, { roomId: this.rid, file: uploadedFile, msgData: fields });
        return await Messages.getMessageByFileIdAndUsername(uploadedFile._id, this.uid);
    }
}
