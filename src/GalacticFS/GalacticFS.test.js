import { describe, it, beforeEach, afterEach, expect } from 'vitest'
import { GalacticFS } from './GalacticFS.js'

describe('GalacticFireproof', () => {
    let fs

    beforeEach(() => {
        fs = new GalacticFS('test-storage')
    })

    afterEach(async () => {
        // Delete everything matching glob pattern
        const root = await fs.read('/*')
        const entries = await root.get('entry', 'array')
        for (const entry of entries) {
            await fs.delete(entry.path)
        }
    })

    // Basic Usage Tests
    describe('Basic Operations', () => {
        it('should create and read a file', async () => {
            await fs.write('/test.txt', 'Hello World')
            const file = await fs.read('/test.txt')
            expect(await file.get('string')).toBe('Hello World')
        })

        it('should create and read an empty file', async () => {
            await fs.write('/empty.txt')
            const file = await fs.read('/empty.txt')
            expect(await file.get('string')).toBe(null)
        })

        it('should create and read a folder', async () => {
            await fs.write('/folder/', {
                'file1.txt': 'Content 1',
                'file2.txt': 'Content 2'
            })

            const folder = await fs.read('/folder/')
            const files = await folder.get('entry', 'array')
            expect(files.length).toBe(2)
            expect(await files[0].get('string')).toBe('Content 1')
            expect(await files[1].get('string')).toBe('Content 2')
        })

        it('should match files using glob pattern', async () => {
            await fs.write('/test1.txt', 'one')
            await fs.write('/test2.txt', 'two')
            await fs.write('/other.txt', 'other')

            const matches = await fs.read('/test*')
            const files = await matches.get('entry', 'array')
            expect(files.length).toBe(2)
            expect(files.map(f => f.name).sort()).toEqual([ 'test1.txt', 'test2.txt' ])
        })
    })

    describe('File Operations', () => {
        it('should copy a file', async () => {
            await fs.write('/source.txt', 'test content')
            await fs.copy('/source.txt', '/dest.txt')

            const source = await fs.read('/source.txt')
            const dest = await fs.read('/dest.txt')
            expect(await source.get('string')).toBe('test content')
            expect(await dest.get('string')).toBe('test content')
        })

        it('should move a file', async () => {
            await fs.write('/source.txt', 'test content')
            await fs.move('/source.txt', '/dest.txt')

            const dest = await fs.read('/dest.txt')
            expect(await dest.get('string')).toBe('test content')
            await expect(fs.read('/source.txt')).rejects.toThrow()
        })

        it('should delete a file', async () => {
            await fs.write('/test.txt', 'test content')
            await fs.delete('/test.txt')
            await expect(fs.read('/test.txt')).rejects.toThrow()
        })

        it('should handle file options correctly', async () => {
            await fs.write('/test.txt', 'initial')
            await fs.write('/test.txt', '-appended', { append: true })
            const file = await fs.read('/test.txt')
            expect(await file.get('string')).toBe('initial-appended')

            await expect(
                fs.write('/test.txt', 'new', { overwrite: false })
            ).rejects.toThrow()
        })
    })

    describe('Folder Operations', () => {
        beforeEach(async () => {
            await fs.write('/folder/', {
                'file1.txt': 'content1',
                'subfolder/': {
                    'file2.txt': 'content2',
                    'file3.txt': 'content3'
                }
            })
        })

        it('should read folder with depth', async () => {
            const folder = await fs.read({
                path: '/folder/',
                depth: 2
            })

            const tree = await folder.get('entry', 'tree')
            expect(tree['file1.txt']).toBeDefined()
            expect(tree.subfolder['file2.txt']).toBeDefined()
            expect(tree.subfolder['file3.txt']).toBeDefined()
        })

        it('should filter folder contents', async () => {
            const folder = await fs.read({
                path: '/folder/',
                depth: 2,
                filter: (entry) => entry.name.includes('2')
            })

            const files = await folder.get('entry', 'array')
            expect(files.length).toBe(1)
            expect(files[0].name).toBe('file2.txt')
        })

        it('should sort folder contents', async () => {
            const folder = await fs.read({
                path: '/folder/',
                depth: 2,
                sort: (a, b) => b.name.localeCompare(a.name)
            })

            const files = await folder.get('entry', 'array')
            expect(files.map(f => f.name)).toEqual([ 'file3.txt', 'file2.txt', 'file1.txt' ])
        })

        it('should copy folders recursively', async () => {
            await fs.copy('/folder/', '/folder-copy/')
            const copy = await fs.read({
                path: '/folder-copy/',
                depth: 2
            })

            const tree = await copy.get('entry', 'tree')
            expect(tree['file1.txt']).toBeDefined()
            expect(tree.subfolder['file2.txt']).toBeDefined()
            expect(tree.subfolder['file3.txt']).toBeDefined()
        })

        it('should move folders recursively', async () => {
            await fs.move('/folder/', '/folder-moved/')

            const moved = await fs.read({
                path: '/folder-moved/',
                depth: 2
            })
            const tree = await moved.get('entry', 'tree')
            expect(tree['file1.txt']).toBeDefined()
            expect(tree.subfolder['file2.txt']).toBeDefined()

            await expect(fs.read('/folder/')).rejects.toThrow()
        })

        it('should delete folders recursively', async () => {
            await fs.delete('/folder/')
            await expect(fs.read('/folder/')).rejects.toThrow()
        })
    })

    describe('Advanced Features', () => {
        it('should provide storage information', async () => {
            const info = await fs.info()
            expect(info).toHaveProperty('freespace')
            expect(info).toHaveProperty('quota')
            expect(info).toHaveProperty('used')
        })

        it('should support file data formats', async () => {
            const content = { test: 'data' }
            await fs.write('/test.json', JSON.stringify(content))

            const file = await fs.read('/test.json')
            expect(await file.get('json')).toEqual(content)
            expect(await file.get('blob')).toBeInstanceOf(Blob)
            expect(await file.get('arrayBuffer')).toBeInstanceOf(ArrayBuffer)
            expect(await file.get('string')).toBe(JSON.stringify(content))
            expect(await file.get('url')).toMatch(/^blob:/)
        })
    })

    describe('State Properties', () => {
        it('should have correct state properties', () => {
            expect(fs.supported).toBe(true)
            expect(fs.persistent).toBe(true)
            expect(fs.syncable).toBe(true)
            expect(fs.writeable).toBe(true)
        })
    })
})