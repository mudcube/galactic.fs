import { File } from './File.js'
import { Folder } from './Folder.js'
import { fireproof } from '@fireproof/core'

export class GalacticFS {
    constructor(storageId, options = {}) {
        this.ledger = fireproof(storageId)
        this.options = options

        // State properties
        this.persistent = true
        this.supported = true
        this.syncable = true
        this.writeable = true
    }

    async read(pathOrOptions) {
        let path, options
        if (typeof pathOrOptions === 'string') {
            path = pathOrOptions
            options = { as: 'blob' }
        } else {
            path = pathOrOptions.path
            options = pathOrOptions
        }

        const { depth = 0, filter, sort, as = 'blob' } = options

        // Handle glob patterns
        if (path.includes('*')) {
            return this._handleGlobPattern(path, { depth, filter, sort, as })
        }

        // Handle folder paths
        if (this._isFolder(path)) {
            return this._handleFolderRead(path, { depth, filter, sort, as })
        }

        // Handle single file
        return this._handleFileRead(path, as)
    }

    async write(path, data = null, options = {}) {
        const { append = false, overwrite = true } = options

        if (this._isFolder(path)) {
            return this._handleFolderWrite(path, data, { append, overwrite })
        } else {
            return this._handleFileWrite(path, data, { append, overwrite })
        }
    }

    async copy(fromPath, toPath, options = {}) {
        if (typeof fromPath === 'object') {
            ({ from: fromPath, to: toPath } = fromPath)
            options = fromPath
        }

        const { append = false, overwrite = true } = options

        const sourceEntry = await this.read(fromPath)
        if (sourceEntry.isFile) {
            const data = await sourceEntry.get()
            return this.write(toPath, data, { append, overwrite })
        }

        // Handle folder copy
        const entries = await sourceEntry.get('entry', 'array')
        for (const entry of entries) {
            const relativePath = entry.path.slice(fromPath.length)
            const newPath = toPath + relativePath
            if (entry.isFile) {
                const data = await entry.get()
                await this.write(newPath, data, { append, overwrite })
            } else {
                await this.write(newPath + '/', null, { overwrite })
            }
        }
    }

    async move(fromPath, toPath, options = {}) {
        if (typeof fromPath === 'object') {
            ({ from: fromPath, to: toPath } = fromPath)
            options = fromPath
        }

        await this.copy(fromPath, toPath, options)
        await this.delete(fromPath)
    }

    async delete(path) {
        if (this._isFolder(path)) {
            const { rows } = await this.ledger.query('path', {
                range: [ path, path + '\uffff' ]
            })

            for (const row of rows) {
                await this.ledger.del(row.id)
            }
        } else {
            await this.ledger.del(this._generateId(path))
        }
    }

    watch(pattern) {
        const regExp = this._globToRegExp(pattern)

        return {
            subscribe: (callback) => {
                return this.ledger.subscribe((updates) => {
                    const filteredUpdates = updates
                        .filter(doc => regExp.test(doc.path))
                        .map(doc => {
                            if (doc.type === 'file') {
                                return new File(doc.path, this, doc)
                            } else {
                                return new Folder(doc.path, this, doc)
                            }
                        })

                    if (filteredUpdates.length > 0) {
                        callback(filteredUpdates)
                    }
                })
            }
        }
    }

    async info() {
        const used = await this._calculateUsedSpace()
        const quota = await this._getQuota()

        return {
            freespace: quota - used,
            quota: quota,
            used: used
        }
    }

    // Internal Helpers
    _generateId(path) {
        return `file:${ path }`
    }

    _generateFolderId(path) {
        return `folder:${ path }`
    }

    _isFolder(path) {
        return path.endsWith('/')
    }

    async _calculateUsedSpace() {
        const { rows } = await this.ledger.allDocs()
        let total = 0
        for (const row of rows) {
            const doc = await this.ledger.get(row.id)
            if (doc.type === 'file') {
                total += (doc.content?.length || 0)
            }
        }
        return total
    }

    async _getQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate()
            return estimate.quota || Number.MAX_SAFE_INTEGER
        }

        return Number.MAX_SAFE_INTEGER
    }

    async _handleGlobPattern(pattern, options) {
        const regExp = this._globToRegExp(pattern)
        const { rows } = await this.ledger.query('path')
        let matches = rows.filter(row => regExp.test(row.doc.path))

        if (options.filter) {
            matches = matches.filter(row =>
                options.filter(new File(row.doc.path, this, row.doc))
            )
        }

        if (options.sort) {
            matches.sort((a, b) =>
                options.sort(
                    new File(a.doc.path, this, a.doc),
                    new File(b.doc.path, this, b.doc)
                )
            )
        }

        const folder = new Folder(pattern, this)
        folder.entries = matches.map(row =>
            new File(row.doc.path, this, row.doc)
        )
        return folder
    }

    async _handleFolderRead(path, options) {
        const { rows } = await this.ledger.query('path', {
            range: [ path, path + '\uffff' ]
        })

        let entries = rows.map(row => {
            if (row.doc.type === 'file') {
                return new File(row.doc.path, this, row.doc)
            } else {
                return new Folder(row.doc.path, this, row.doc)
            }
        })

        if (options.depth !== undefined) {
            const baseParts = path.split('/').filter(Boolean).length
            entries = entries.filter(entry => {
                const parts = entry.path.split('/').filter(Boolean).length - baseParts
                return parts <= options.depth
            })
        }

        if (options.filter) {
            entries = entries.filter(options.filter)
        }

        if (options.sort) {
            entries.sort(options.sort)
        }

        const folder = new Folder(path, this)
        folder.entries = entries
        return folder
    }

    async _handleFileRead(path, as) {
        try {
            const doc = await this.ledger.get(this._generateId(path))
            return new File(path, this, doc)
        } catch (e) {
            throw new Error(`File not found: ${ path }`)
        }
    }

    async _handleFolderWrite(path, data, options) {
        const folderId = this._generateFolderId(path)
        const folderDoc = {
            _id: folderId,
            type: 'folder',
            path: path,
            created: Date.now()
        }

        if (data && typeof data === 'object') {
            for (const [ name, content ] of Object.entries(data)) {
                await this.write(`${ path }${ name }`, content, options)
            }
        }

        await this.ledger.put(folderDoc)
        return new Folder(path, this, folderDoc)
    }

    async _handleFileWrite(path, data, options) {
        const fileId = this._generateId(path)
        let existingDoc = null

        try {
            existingDoc = await this.ledger.get(fileId)
            if (existingDoc && !options.overwrite) {
                throw new Error('File exists and overwrite is false')
            }
        } catch (e) {
            // File doesn't exist yet
        }

        const content = options.append && existingDoc ?
            existingDoc.content + data :
            data

        const fileDoc = {
            _id: fileId,
            type: 'file',
            path: path,
            content: content,
            modified: Date.now(),
            created: existingDoc?.created || Date.now(),
            size: content?.length || 0,
            mimetype: this._guessMimeType(path)
        }

        await this.ledger.put(fileDoc)
        return new File(path, this, fileDoc)
    }

    _guessMimeType(path) {
        const ext = path.split('.').pop().toLowerCase()
        const mimeTypes = {
            'txt': 'text/plain',
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf'
        }
        return mimeTypes[ext] || 'application/octet-stream'
    }

    _globToRegExp(pattern) {
        const escapedPattern = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
        return new RegExp(`^${escapedPattern}$`)
    }
}