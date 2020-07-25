import { settings } from '../../../settings';

settings.addGroup('FileUpload', function() {
	this.add('FileUpload_Enabled', true, {
		type: 'boolean',
		public: true,
	});

	this.add('FileUpload_MaxFileSize', 104857600, {
		type: 'int',
		public: true,
		i18nDescription: 'FileUpload_MaxFileSizeDescription',
	});

	this.add('FileUpload_MediaTypeWhiteList', '', {
		type: 'string',
		public: true,
		i18nDescription: 'FileUpload_MediaTypeWhiteListDescription',
	});

	this.add('FileUpload_MediaTypeBlackList', 'image/svg+xml', {
		type: 'string',
		public: true,
		i18nDescription: 'FileUpload_MediaTypeBlackListDescription',
	});

	this.add('FileUpload_ProtectFiles', true, {
		type: 'boolean',
		public: true,
		i18nDescription: 'FileUpload_ProtectFilesDescription',
	});

	this.add('FileUpload_RotateImages', true, {
		type: 'boolean',
	});

	this.add('FileUpload_Enable_json_web_token_for_files', true, {
		type: 'boolean',
		i18nLabel: 'FileUpload_Enable_json_web_token_for_files',
		i18nDescription: 'FileUpload_Enable_json_web_token_for_files_description',
		enableQuery: {
			_id: 'FileUpload_ProtectFiles',
			value: true,
		},
	});

	this.add('FileUpload_json_web_token_secret_for_files', '', {
		type: 'string',
		i18nLabel: 'FileUpload_json_web_token_secret_for_files',
		i18nDescription: 'FileUpload_json_web_token_secret_for_files_description',
		enableQuery: {
			_id: 'FileUpload_Enable_json_web_token_for_files',
			value: true,
		},
	});

	this.add('FileUpload_Storage_Type', 'GridFS', {
		type: 'select',
		values: [{
			key: 'GridFS',
			i18nLabel: 'GridFS',
		}, {
			key: 'AmazonS3',
			i18nLabel: 'AmazonS3',
		}, {
			key: 'GoogleCloudStorage',
			i18nLabel: 'GoogleCloudStorage',
		}, {
			key: 'Webdav',
			i18nLabel: 'WebDAV',
		}, {
			key: 'FileSystem',
			i18nLabel: 'FileSystem',
		}],
		public: true,
	});

	this.section('FileUpload Conversion', function() {
		this.add('FileUpload_Video_Conversion_Enabled', true, {
			type: 'boolean',
		});

		const enableVideoQuery = {
			_id: 'FileUpload_Video_Conversion_Enabled',
			value: true,
		};

		this.add('FileUpload_Video_Encoder', 'x264', {
			type: 'select',
			values: [{
				key: 'x264',
				i18nLabel: 'x264',
			}],
			enableQuery: enableVideoQuery,
		});

		this.add('FileUpload_Video_Configure_Image_Size', true, {
			type: 'boolean',
			enableQuery: enableVideoQuery,
		});
		const videoSizeQuery = [enableVideoQuery, {
			_id: 'FileUpload_Video_Configure_Image_Size',
			value: true,
		}];
		this.add('FileUpload_Video_Max_Width', 1280, {
			type: 'int',
			enableQuery: videoSizeQuery,
		});
		this.add('FileUpload_Video_Max_Height', 1280, {
			type: 'int',
			enableQuery: videoSizeQuery,
		});

		this.add('FileUpload_Video_Framerate_Control', 'pfr', {
			type: 'select',
			values: [{
				key: 'vfr',
				i18nLabel: 'vfr',
			},
			{
				key: 'cfr',
				i18nLabel: 'cfr',
			},
			{
				key: 'pfr',
				i18nLabel: 'pfr',
			}],
			i18nDescription: 'FileUpload_Video_Framerate_ControlDescription',
			enableQuery: enableVideoQuery,
		});
		const videoFramerateQuery = [enableVideoQuery, {
			_id: 'FileUpload_Video_Framerate_Control',
			value: { $ne: 'vfr' },
		}];
		this.add('FileUpload_Video_Configure_Framerate', true, {
			type: 'boolean',
			enableQuery: videoFramerateQuery,
		});
		this.add('FileUpload_Video_Framerate', 30, {
			type: 'int',
			enableQuery: videoFramerateQuery.concat({
				_id: 'FileUpload_Video_Configure_Framerate',
				value: true,
			}),
		});

		this.add('FileUpload_Video_Quality_Type', 'Bitrate', {
			type: 'select',
			values: [{
				key: 'ConstantQuality',
				i18nLabel: 'ConstantQuality',
			},
			{
				key: 'Bitrate',
				i18nLabel: 'Bitrate',
			}],
			enableQuery: enableVideoQuery,
		});
		const videoConstantQualityQuery = [enableVideoQuery, {
			_id: 'FileUpload_Video_Quality_Type',
			value: 'ConstantQuality',
		}];
		const videoBitrateQualityQuery = [enableVideoQuery, {
			_id: 'FileUpload_Video_Quality_Type',
			value: 'Bitrate',
		}];
		this.add('FileUpload_Video_Quality', 22, {
			type: 'int',
			enableQuery: videoConstantQualityQuery,
		});
		this.add('FileUpload_Video_Bitrate', 2500, {
			type: 'int',
			enableQuery: videoBitrateQualityQuery,
		});
		this.add('FileUpload_Video_Two_Pass', true, {
			type: 'boolean',
			enableQuery: videoBitrateQualityQuery,
		});
		this.add('FileUpload_Video_Turbo', true, {
			type: 'boolean',
			enableQuery: videoBitrateQualityQuery.concat({
				_id: 'FileUpload_Video_Two_Pass',
				value: true,
			}),
		});
	});

	this.section('Amazon S3', function() {
		this.add('FileUpload_S3_Bucket', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_Acl', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_AWSAccessKeyId', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			secret: true,
		});
		this.add('FileUpload_S3_AWSSecretAccessKey', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			secret: true,
		});
		this.add('FileUpload_S3_CDN', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_Region', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_BucketURL', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			i18nDescription: 'Override_URL_to_which_files_are_uploaded_This_url_also_used_for_downloads_unless_a_CDN_is_given.',
			secret: true,
		});
		this.add('FileUpload_S3_SignatureVersion', 'v4', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_ForcePathStyle', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_URLExpiryTimeSpan', 120, {
			type: 'int',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
			i18nDescription: 'FileUpload_S3_URLExpiryTimeSpan_Description',
		});
		this.add('FileUpload_S3_Proxy_Avatars', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
		this.add('FileUpload_S3_Proxy_Uploads', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'AmazonS3',
			},
		});
	});

	this.section('Google Cloud Storage', function() {
		this.add('FileUpload_GoogleStorage_Bucket', '', {
			type: 'string',
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
			secret: true,
		});
		this.add('FileUpload_GoogleStorage_AccessId', '', {
			type: 'string',
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
			secret: true,
		});
		this.add('FileUpload_GoogleStorage_Secret', '', {
			type: 'string',
			multiline: true,
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
			secret: true,
		});
		this.add('FileUpload_GoogleStorage_Proxy_Avatars', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
		});
		this.add('FileUpload_GoogleStorage_Proxy_Uploads', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'GoogleCloudStorage',
			},
		});
	});

	this.section('File System', function() {
		this.add('FileUpload_FileSystemPath', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'FileSystem',
			},
		});
	});

	this.section('WebDAV', function() {
		this.add('FileUpload_Webdav_Upload_Folder_Path', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
		this.add('FileUpload_Webdav_Server_URL', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
		this.add('FileUpload_Webdav_Username', '', {
			type: 'string',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
			secret: true,
		});
		this.add('FileUpload_Webdav_Password', '', {
			type: 'password',
			private: true,
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
			secret: true,
		});
		this.add('FileUpload_Webdav_Proxy_Avatars', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
		this.add('FileUpload_Webdav_Proxy_Uploads', false, {
			type: 'boolean',
			enableQuery: {
				_id: 'FileUpload_Storage_Type',
				value: 'Webdav',
			},
		});
	});

	this.add('FileUpload_Enabled_Direct', true, {
		type: 'boolean',
		public: true,
	});
});
