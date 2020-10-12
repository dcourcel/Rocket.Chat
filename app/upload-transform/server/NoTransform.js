export class NoTransform {
	async processFile(fileInfo) {
		return new Promise((resolve) => {
			const result = fileInfo;
			const fileData = [];
			fileInfo.file.on('data', (data) => fileData.push(data));

			fileInfo.file.on('end', () => {
				result.file = Buffer.concat(fileData);
				resolve(result);
			});
		});
	}
}
