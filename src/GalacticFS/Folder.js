export class Folder {
    constructor(path, fs, doc) {
        this.path = path
        this.name = path.split('/').filter(Boolean).pop() || '/'
        this.fs = fs
        this.doc = doc
        this.isFile = false
        this.isFolder = true
        this.entries = []
        this.created = doc?.created || Date.now()
    }

    async get(as = 'entry', into = 'tree') {
        if (into === 'array') {
            return this.entries
        }

        const tree = {}
        for (const entry of this.entries) {
            const relativePath = entry.path.slice(this.path.length)
            const parts = relativePath.split('/').filter(Boolean)

            let current = tree
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {}
                }
                current = current[parts[i]]
            }

            if (parts.length > 0) {
                current[parts[parts.length - 1]] = entry
            }
        }

        return tree
    }

    async read(relativePath) {
        return this.fs.read(this.path + relativePath)
    }

    async write(relativePath, data, options) {
        return this.fs.write(this.path + relativePath, data, options)
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

    async forEach(callback) {
        for (const entry of this.entries) {
            await callback(entry)
        }
    }

    watch(pattern = '**') {
        const fullPattern = this.path + pattern
        return this.fs.watch(fullPattern)
    }
}