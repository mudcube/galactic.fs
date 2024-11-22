<script>
    import { fireproof } from '@fireproof/core'

    // Global Test Configuration
    const DB_NAME = 'storage-test'
    const DOC_SIZE_MB = 1
    const NUM_DOCS = 5
    const TEST_PATTERN = 'random' // 'random', 'sequential', or 'repeating'
    const TEST_TYPE = 'multiple' // 'multiple' or 'cycle'

    const db = fireproof(DB_NAME)

    // Helper to measure IndexedDB size
    async function getIDBSize() {
        const estimate = await navigator.storage.estimate()
        return {
            usage: (estimate.usage / (1024 * 1024)).toFixed(2),
            quota: (estimate.quota / (1024 * 1024)).toFixed(2)
        }
    }

    // Measure data size in memory
    function getSize(data) {
        const bytes = new TextEncoder().encode(JSON.stringify(data)).length
        return {
            bytes,
            mb: (bytes / (1024 * 1024)).toFixed(2)
        }
    }

    // Generate data patterns
    function generatePattern(pattern, length) {
        switch (pattern) {
            case 'random':
                const chunk = 65536
                let data = ''
                for (let i = 0; i < length; i += chunk) {
                    const size = Math.min(chunk, length - i)
                    const array = new Uint8Array(size)
                    crypto.getRandomValues(array)
                    data += String.fromCharCode.apply(null, array)
                }
                return btoa(data)

            case 'sequential':
                return btoa(Array.from(
                    { length },
                    (_, i) => String.fromCharCode(i % 256)
                ).join(''))

            case 'repeating':
                const template = 'x'.repeat(1024)
                let result = ''
                while (result.length < length) {
                    result += template
                }
                return btoa(result.slice(0, length))

            default:
                throw new Error('Invalid pattern type')
        }
    }

    // Generate test document
    function generateDocument() {
        const targetBytes = DOC_SIZE_MB * 1024 * 1024
        const rawBytes = Math.ceil(targetBytes * 0.75)

        const doc = {
            _id: 'large-file',
            message: 'Test Document',
            timestamp: new Date().toISOString(),
            pattern: TEST_PATTERN,
            largeData: generatePattern(TEST_PATTERN, rawBytes)
        }

        return { doc, size: getSize(doc) }
    }

    // Log progress with storage info
    async function logProgress(phase, index) {
        const { usage, quota } = await getIDBSize()
        console.log(
            `[${phase}] ${index}/${NUM_DOCS}`,
            `Storage: ${usage}MB / ${quota}MB`,
            `(${((usage / quota) * 100).toFixed(1)}%)`
        )
    }

    // Test multiple writes
    async function testMultipleWrites() {
        console.log('🚀 Starting Multiple Writes Test\n', {
            DB_NAME,
            DOC_SIZE_MB,
            NUM_DOCS,
            TEST_PATTERN,
            TEST_TYPE
        })

        for (let i = 0; i < NUM_DOCS; i++) {
            const { doc, size } = generateDocument()
            await db.put(doc)
            await logProgress('Write', i + 1)
        }
    }

    // Test write/delete cycle
    async function testWriteDeleteCycle() {
        console.log('🔄 Starting Write/Delete Cycle Test\n', {
            DB_NAME,
            DOC_SIZE_MB,
            NUM_DOCS,
            TEST_PATTERN,
            TEST_TYPE
        })

        for (let i = 0; i < NUM_DOCS; i++) {
            const { doc } = generateDocument()
            await db.put(doc)
            await logProgress('Write', i + 1)

            await db.del(doc._id)
            await logProgress('Delete', i + 1)
        }
    }

    // Main test runner
    async function runTest() {
        try {
            const startSize = await getIDBSize()
            console.log('Initial Storage:', `${startSize.usage}MB / ${startSize.quota}MB`)

            if (TEST_TYPE === 'multiple') {
                await testMultipleWrites()
            } else if (TEST_TYPE === 'cycle') {
                await testWriteDeleteCycle()
            }

            const endSize = await getIDBSize()
            console.log('\nFinal Storage:', `${endSize.usage}MB / ${endSize.quota}MB`)
        } catch (error) {
            console.error('❌ Test Error:', error)
        }
    }

    runTest()
</script>