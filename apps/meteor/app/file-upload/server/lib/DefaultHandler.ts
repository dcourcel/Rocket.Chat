import { UploadHandler, PostFileData, PostFields } from './UploadHandler';

export class DefaultHandler extends UploadHandler {
    public async processAttachment(file: PostFileData, fields: PostFields): Promise<object> {
		const uploadedFile = this.insertIntoFileStore(file, fields);
        return Meteor.call('sendFileMessage', this.rid, null, uploadedFile, fields);
    }
}
