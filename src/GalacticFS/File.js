export class File {
    constructor(path, fs, doc) {
        this.path = path
        this.name = path.split('/').pop()
        this.fs = fs
        this.doc = doc
        this.isFile = true
        this.isFolder = false
        this.size = doc?.size || 0
        this.type = doc?.mimetype || 'application/octet-stream'
        this.created = doc?.created || Date.now()
        this.modified = doc?.modified || Date.now()
    }

    async get(as = 'blob') {
        const doc = await this.fs.ledger.get(this.fs._generateId(this.path))

        switch (as) {
            case 'arrayBuffer':
                return new TextEncoder().encode(doc.content).buffer
            case 'blob':
                return new Blob([doc.content], { type: this.type })
            case 'json':
                try {
                    return JSON.parse(doc.content)
                } catch (e) {
                    throw new Error(`Failed to parse content as JSON: ${e.message}`)
                }
            case 'string':
                return doc.content
            case 'url':
                try {
                    const blob = new Blob([doc.content], { type: this.type })
                    const url = URL.createObjectURL(blob)
                    // Clean up URL when no longer needed
                    setTimeout(() => URL.revokeObjectURL(url), 0)
                    return url
                } catch (e) {
                    throw new Error(`Failed to create URL: ${e.message}`)
                }
            case 'entry':
                return this
            default:
                throw new Error(`Unsupported format: ${as}`)
        }
    }

    async delete() {
        return this.fs.delete(this.path)
    }

    async copy(destination) {
        return this.fs.copy(this.path, destination)
    }

    async move(destination) {
        return this.fs.move(this.path, destination)
    }
}