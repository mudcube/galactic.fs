WIP

# GalacticFS

Promise-based File Store API built on top of [Fireproof](https://fireproof.storage/).

# Installation

```bash
npm install galactic-fs
```

# Getting Started

## Basic Usage

```javascript
const fs = new GalacticFS('MyStorageId') // creates filestore with specified name

/* read entry(s) */
fs.read('/path/to/file')      // read file
fs.read('/path/to/folder/')   // read folder
fs.read('/path*')             // read all matches

/* write entry(s) */
fs.write('/path/to/file')           // create empty file
fs.write('/path/to/file', data)     // create file with content
fs.write('/path/to/folder/')        // create empty folder
fs.write('/path/to/folder/', data)  // create folder with content

/* copy entry(s) */
fs.copy('/path/from/file', '/path/to/file')       // copy file contents
fs.copy('/path/from/file', '/path/to/folder/')    // copy file into folder
fs.copy('/path/from/folder/', '/path/to/folder/') // copy folder contents
fs.copy('/path*', '/path/to/folder/')             // copy all matches into folder

/* move entry(s) and delete original(s) */
fs.move('/path/from/file', '/path/to/file')       // move file contents
fs.move('/path/from/file', '/path/to/folder/')    // move file into folder
fs.move('/path/from/folder/', '/path/to/folder/') // move folder contents
fs.move('/path*', '/path/to/folder/')             // move all matches into folder

/* delete entry(s) */
fs.delete('/path/to/file')     // delete file
fs.delete('/path/to/folder/')  // delete folder and its content
fs.delete('/path*')            // delete all matches
```

## Advanced Usage

### fs.{state}

```javascript
fs.supported  // local filestore is supported by device [boolean readonly]
fs.persistent // local filestore is persistent [boolean readonly]
fs.syncable   // local filestore can sync to remote [boolean readonly]
fs.writeable  // local filestore is writable [boolean readonly]
```

### fs.info

```javascript
const info = await fs.info()
console.log(info.freespace)  // available space
console.log(info.quota)      // storage quota
console.log(info.used)       // used space
```

### fs.read

```javascript
/* read single file with options */
const file = await fs.read({
    path: '/path/to/file',  // required
    as: 'blob'  // 'arrayBuffer' | 'blob' | 'json' | 'url' | 'string'
})

/* read folder with options */
const folder = await fs.read({
    path: '/path/to/folder/',  // required
    depth: 3,  // how deep to traverse
    as: 'blob',  // format for file contents
    filter: file => file.name.endsWith('s'),  // filter entries
    sort: (a, b) => a.size - b.size  // sort entries
})
```

### fs.write

```javascript
/* file operations */
await fs.write('/path/to/file', 'Hello World', {
    append: false,    // append instead of overwrite
    overwrite: true   // allow overwriting existing
})

/* folder operations */
await fs.write('/path/to/folder/', {
    overwrite: true  // allow overwriting existing
})

/* batch operations */
await fs.write('/path/to/folder/', {
    'file1.txt': 'content1',
    'file2.txt': 'content2'
}, {
    append: false,
    overwrite: true
})
```

### fs.copy and fs.move

```javascript
/* copy with options */
await fs.copy({
    from: '/source/folder/',
    to: '/dest/folder/',
    append: false,
    overwrite: true
})

/* move with options */
await fs.move({
    from: '/source/folder/',
    to: '/dest/folder/',
    append: false,
    overwrite: true
})
```

## Working with Files and Folders

### File Objects

```javascript
file.isFolder   // always false
file.isFile     // always true
file.path       // full path to file
file.name       // file name
file.size       // size in bytes
file.type       // mimetype

// Get file contents in different formats
await file.as('entry')       // returns self
await file.as('blob')        // as blob
await file.as('json')        // as json
await file.as('string')      // as string
await file.as('arrayBuffer') // as arrayBuffer
await file.as('url')         // as url
```

### Folder Objects

```javascript
folder.isFolder  // always true
folder.isFile    // always false
folder.path      // full path
folder.name      // folder name

// Folder operations
await folder.read('subpath/subfile')       // read relative path
await folder.write('subpath/subfile', data)   // write to relative path

// Get folder contents
await folder.as('entry', 'array') // as array
await folder.as('entry', 'tree')  // as tree structure

// Process contents
await folder.forEach(async file => {
    const data = await file.as()
    // process data
})
```

### Content Structures

```javascript
// Array format (folder.as('entry', 'array'))
const array = [
    file1,
    folder1,
    file2,
    // ...
]

// Tree format (folder.as('entry', 'tree'))
const tree = {
    'file1.txt': file1,
    'folder1': {
        'file2.txt': file2,
        // ...
    }
}
```

## Error Handling

All async operations throw standard Error objects:

```javascript
try {
    await fs.read('/nonexistent')
} catch (error) {
    console.error('File not found:', error.message)
}
```
