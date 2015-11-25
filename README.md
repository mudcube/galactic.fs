WIP

# galactic.fs(...)

#### *Promise based Syncable File Store for Javascript*

##### Backends supported:
* [CouchDB](http://couchdb.apache.org/) using [PouchDB](http://pouchdb.com)
* [Google Drive](https://www.google.com/drive/) using [chrome.syncFileSystem](https://developer.chrome.com/apps/fileSystem)
* [LevelDB](http://leveldb.org/) using [PouchDB](http://pouchdb.com)

# Getting started
## API: Basic Usage
```js
var fs = new galactic.fs('MyStorageId'); // creates filestore with specified name

/* read entry(s) */
fs.read('/path/to/file'); // read file
fs.read('/path/to/folder/'); // read folder
fs.read('/path*'); // read all matches

/* write entry(s) */
fs.write('/path/to/file'); // create empty file
fs.write('/path/to/file', data); // create file with content
fs.write('/path/to/folder/'); // create empty folder
fs.write('/path/to/folder/', data); // create folder with content

/* copy entry(s) */
fs.copy('/path/from/file', '/path/to/file'); // copy file contents
fs.copy('/path/from/file', '/path/to/folder/'); // copy file into folder
fs.copy('/path/from/folder/', '/path/to/folder/'); // copy folder contents
fs.copy('/path*', '/path/to/folder/'); // copy all matches into folder

/* move entry(s) and delete original(s) */
fs.move('/path/from/file', '/path/to/file'); // move file contents
fs.move('/path/from/file', '/path/to/folder/'); // move file into folder
fs.move('/path/from/folder/', '/path/to/folder/'); // move folder contents
fs.move('/path*', '/path/to/folder/'); // move all matches into folder

/* delete entry(s) */
fs.delete('/path/to/file'); // delete file
fs.delete('/path/to/folder/'); // delete folder and its content
fs.delete('/path*'); // delete all matches
```

## API: Advanced Usage

### fs

```js
var fs = new galactic.fs('MyStorageId', {
	adapter: 'idb' // 'idb' | 'leveldb' | 'fsapi' - use a specific adapter [defaults to best match]
});
```

### fs.{state}

```js
fs.persistent; // local filestore is persistent (LevelDB or FilesystemAPI) [boolean readonly]
fs.supported; // local filestore is supported by the device (IndexedDB, LevelDB or FilesystemAPI) [boolean readonly]
fs.syncable; // local filestore is connected & syncable to remote filestore [boolean readonly]
fs.writeable; // local filestore is available to be written to [boolean readonly]
```

### fs.info

```js
/* filestore information */
fs.info().then(function(info) { //- from fs.df()
	info.freespace;
	info.quota;
	info.used;
	// ...
});
```

### fs.batch / fs.commit
```js
/* batch commands into single commit */
fs.batch().then(function(fs) {
	fs.read('/path/to/folder').then(function() { // add fs.write changes
		return fs.write('/path/to/newFolder');
	}).then(function() { // add fs.move changes
		return fs.move('/path/from/file', '/path/to/newFile');
	}).then(function() { // commit changes to datastore
		return fs.commit();
	});
});
```

### fs.read 

```js
/* read one file */
fs.read({ // longhand options
	path: '/path/to/file', // [required]
	as: 'blob' // 'buffer' | 'blob' | 'json' | 'url' | 'string' [default=blob]
}).then(function(file) { // the type of 'entry' is defined by the 'as' arg

});

/* read multiple files */
fs.read({ // longhand options
	path: '/path/to/folder/', // [required]
	depth: 3, // how far down the tree to read sub-folders [default=0]
	as: 'blob', // 'buffer' | 'blob' | 'json' | 'url' | 'string' [default=blob]
	filter: function(file) { // filter entries that match your criteria [default=undefined]
		return file.name.endsWith('s');
	},
	sort: function(a, b) { // sort entries [default=undefined]
		return a.size < b.size;
	}
}).then(function(folder) {

});
```

### fs.write 

```js
/* create file or overwrite existing file */
fs.write({ // longhand options
	path: '/path/to/file', // [required]
	append: false, // append data to the file [default=false]
	overwrite: false, // disable overwriting an existing file [default=true]
	data: 'Hello world!' // ArrayBuffer | Blob | String [default=undefined]
}).then(function(file) {

});

/* create folder or overwrite existing folder with empty folder */
fs.write({ // longhand options
	path: '/path/to/folder/' // [required]
	overwrite: false // disable overwriting an existing folder [default=true]
}).then(function(folder) {

});

/* create or overwite multiple files and/or folders */
fs.write({ // longhand options
	path: '/path/to/folder/', // [required]
	append: false, // append data to file entries listed in data [default=false]
	overwrite: false, // overwrite existing file or folder [default=true]
	data: [] // Array | Tree - defined below under 'structures'
}).then(function(/* empty */) {

});
```

### fs.copy 

```js
/* copy all descendants of source to destination */
fs.copy({
	from: '/path/from/source/',
	to: '/path/to/destination/',
	append: false, // append data to file entries listed in data [default=false]
	overwrite: false // overwrite destination if it exists [default=true]
}).then(function(/* empty */) { //- from fs.duplicate

});
```

### fs.move 

```js
/* move all descendants of source to destination */
fs.move({
	from: '/path/from/source/',
	to: '/path/to/destination/',
	append: false, // append data to file entries listed in data [default=false]
	overwrite: false // overwrite destination if it exists [default=true]
}).then(function(/* empty */) { //- from fs.mv

});
```

### fs.delete

```js
/* delete a file */
fs.delete('/path/to/file').then(function(/* empty */) { //- from fs.rm

});

/* delete a folder */
fs.delete('/path/to/folder/').then(function(/* empty */) { //- from fs.rmdir

});
```

# API: Classes

## fs.File

```js
fs.File
	/* parameters */
	.isFolder; // always false on files
	.isFile; // always true on files
	.path; // full path to this file
	.name; // file name
	.doc; // pouchdb document related to parent folder (not available w/ FilesystemAPI)

	.digest; // file fingerprint ex. 'md5-{hash}'
	.size; // file size in bytes
	.type; // file mimetype

	/* methods */
	// promise to retrieve file data as specific type
	// _as can be 'buffer' | 'blob' | 'json' | 'url' | 'string' | 'entry' [default 'blob']
	.get(_as);
```

## fs.Folder

```js
fs.Folder
	/* parameters */
	.isFolder; // always true on folders
	.isFile; // always false on folders
	.path; // full path to this folder
	.name; // folder name
	.doc; // pouchdb document related to this folder (not available w/ FilesystemAPI)

	/* methods */
	// promise to retrieve data for entries
	// _as can be 'buffer' | 'blob' | 'json' | 'url' | 'string' | 'entry' [default 'blob']
	// _into can be 'array' | 'tree' [default 'tree']
	.get(_as, _into);

	// iterates over entries with promises
	.forEach(function(file) {
		return file.get('buffer').then(function(buffer) {
			// forEach wont progress to next file until promise resolves
		});
	});
```

```js
/* folder.get('entry', 'array'); */
array [
	file, folder, ...
]
```

```js
/* folder.get('entry', 'tree'); */
tree {
	someFileName: file,
	anotherFileName: file,
	someFolderName: {
		someFileName: file
		anotherFileName: file,
		...
	}
}
```
